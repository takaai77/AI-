/**
 * BullMQワーカー
 *
 * このファイルでは、キューに入ったジョブを処理するワーカーを実装します。
 *
 * 【ワーカーとは？】
 * - キューに入ったジョブを取り出して実際に処理する役割
 * - 複数のワーカーを起動することで並列処理が可能
 * - このワーカーはPlaywrightを使ってブラウザ操作を行う
 *
 * 【処理の流れ】
 * 1. Redisからジョブを取得
 * 2. Playwrightでブラウザを起動
 * 3. シナリオを実行
 * 4. 結果をスプレッドシートに記録
 * 5. 成功/失敗を報告
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// BullMQのWorkerクラスをインポート
import { Worker, Job } from 'bullmq';

// Playwrightをインポート
import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';

// Node.jsファイルシステムAPI
import * as fs from 'fs';
import * as path from 'path';

// 型定義をインポート
import { JobData, JobResult, ScenarioContext } from './types';

// キュー関連をインポート
import {
  QUEUE_NAME,
  getRedisConnection,
  acquireLock,
  releaseLock,
} from './queue';

// スプレッドシート関連をインポート
import {
  initializeSheet,
  updateJobProgress,
  completeJob,
  failJob,
} from './sheets';

// シナリオ実行関数をインポート
import { runScenario } from './scenarios';

// ============================================
// 設定値の取得
// ============================================

/**
 * Playwright設定を取得する
 */
const getPlaywrightConfig = () => {
  return {
    // ヘッドレスモード（true: ブラウザ非表示）
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',

    // ブラウザタイプ
    browser: (process.env.PLAYWRIGHT_BROWSER || 'chromium') as 'chromium' | 'firefox' | 'webkit',

    // タイムアウト
    timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10),
  };
};

/**
 * 同時実行数を取得する
 */
const getConcurrency = (): number => {
  return parseInt(process.env.QUEUE_CONCURRENCY || '10', 10);
};

/**
 * スクリーンショット保存先を取得する
 */
const getArtifactsDir = (): string => {
  return process.env.ARTIFACTS_DIR || './artifacts';
};

/**
 * ロックのTTLを取得する
 */
const getLockTTL = (): number => {
  return parseInt(process.env.LOCK_TTL || '300000', 10);
};

// ============================================
// ブラウザ管理
// ============================================

/**
 * ブラウザを起動する
 *
 * @returns ブラウザインスタンス
 */
const launchBrowser = async (): Promise<Browser> => {
  const config = getPlaywrightConfig();

  console.log(`🌐 ブラウザを起動します: ${config.browser}`);
  console.log(`   ヘッドレスモード: ${config.headless}`);

  // ブラウザタイプに応じて起動
  let browser: Browser;

  switch (config.browser) {
    case 'firefox':
      browser = await firefox.launch({
        headless: config.headless,
      });
      break;
    case 'webkit':
      browser = await webkit.launch({
        headless: config.headless,
      });
      break;
    case 'chromium':
    default:
      browser = await chromium.launch({
        headless: config.headless,
        // Cloud Run等でのサンドボックス無効化
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      break;
  }

  console.log('✅ ブラウザを起動しました');
  return browser;
};

/**
 * ブラウザコンテキストを作成する
 *
 * @param browser - ブラウザインスタンス
 * @returns ブラウザコンテキスト
 */
const createContext = async (browser: Browser): Promise<BrowserContext> => {
  const config = getPlaywrightConfig();

  // コンテキストオプション
  const contextOptions = {
    // ビューポートサイズ
    viewport: { width: 1280, height: 720 },

    // タイムアウト
    navigationTimeout: config.timeout,

    // 日本語環境
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  };

  // ストレージ状態ファイルがあれば読み込む
  const storageStatePath = process.env.STORAGE_STATE_PATH || './storageState.json';

  if (fs.existsSync(storageStatePath)) {
    console.log(`📂 ストレージ状態を読み込みます: ${storageStatePath}`);
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    return await browser.newContext({
      ...contextOptions,
      storageState,
    });
  }

  return await browser.newContext(contextOptions);
};

// ============================================
// スクリーンショット保存
// ============================================

/**
 * エラー時のスクリーンショットを保存する
 *
 * @param page - Playwrightのページオブジェクト
 * @param jobId - ジョブID
 * @param suffix - ファイル名のサフィックス
 * @returns 保存したファイルのパス
 */
const saveErrorScreenshot = async (
  page: Page,
  jobId: string,
  suffix: string = 'error'
): Promise<string> => {
  const artifactsDir = getArtifactsDir();

  // ディレクトリが存在しなければ作成
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // ファイル名を生成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${jobId}_${suffix}_${timestamp}.png`;
  const filePath = path.join(artifactsDir, fileName);

  try {
    // スクリーンショットを撮影
    await page.screenshot({
      path: filePath,
      fullPage: true,
    });

    console.log(`📸 スクリーンショットを保存しました: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('❌ スクリーンショット保存エラー:', error);
    return '';
  }
};

// ============================================
// ジョブ処理関数
// ============================================

/**
 * ジョブを処理するメイン関数
 *
 * @param job - BullMQのジョブオブジェクト
 * @returns 処理結果
 */
const processJob = async (job: Job<JobData>): Promise<JobResult> => {
  // ジョブデータを取得
  const { jobId, customerId, orderNo, action, operator, params } = job.data;

  console.log('═'.repeat(60));
  console.log(`🚀 ジョブ処理を開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   アクション: ${action}`);
  console.log(`   顧客ID: ${customerId}`);
  console.log(`   オペレーター: ${operator}`);
  console.log('═'.repeat(60));

  // 変数の初期化
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let lockAcquired = false;

  try {
    // ============================================
    // ロックの取得
    // ============================================
    console.log('🔒 ロックを取得します...');

    lockAcquired = await acquireLock(customerId, action, jobId, getLockTTL());

    if (!lockAcquired) {
      // ロック取得失敗 = 同じ顧客+アクションが実行中
      console.log('⏳ 同一顧客に対して同じアクションが実行中です');

      return {
        success: false,
        message: '同一顧客に対して同じアクションが既に実行中です。しばらくお待ちください。',
      };
    }

    // ============================================
    // ブラウザ起動
    // ============================================
    console.log('🌐 ブラウザを起動します...');

    browser = await launchBrowser();
    context = await createContext(browser);
    page = await context.newPage();

    // タイムアウト設定
    const config = getPlaywrightConfig();
    page.setDefaultTimeout(config.timeout);

    // ============================================
    // シナリオコンテキストの作成
    // ============================================

    // 進捗更新用のコールバック関数
    const updateProgress = async (
      percent: number,
      step: string,
      message?: string
    ): Promise<void> => {
      console.log(`📊 進捗: ${percent}% - ${step}${message ? ` (${message})` : ''}`);

      // BullMQの進捗を更新
      await job.updateProgress({
        percent,
        step,
        message,
      });

      // スプレッドシートの進捗を更新
      try {
        await updateJobProgress(jobId, percent, step, message);
      } catch (error) {
        console.error('⚠️ スプレッドシート更新エラー:', error);
      }
    };

    // スクリーンショット保存用のコールバック関数
    const saveScreenshot = async (p: unknown, suffix?: string): Promise<string> => {
      if (page) {
        return await saveErrorScreenshot(page, jobId, suffix);
      }
      return '';
    };

    // シナリオコンテキスト
    const scenarioContext: ScenarioContext = {
      jobId,
      customerId,
      orderNo,
      params,
      updateProgress,
      saveScreenshot,
    };

    // ============================================
    // シナリオ実行
    // ============================================
    console.log(`🎬 シナリオを実行します: ${action}`);

    const result = await runScenario(action, page, scenarioContext);

    // ============================================
    // 結果の記録
    // ============================================
    if (result.success) {
      console.log('✅ シナリオが正常に完了しました');

      // スプレッドシートに完了を記録
      await completeJob(jobId, result.data || {});
    } else {
      console.log('❌ シナリオが失敗しました');

      // エラー時のスクリーンショットを保存
      const artifactPath = await saveErrorScreenshot(page, jobId, 'failed');

      // スプレッドシートに失敗を記録
      await failJob(jobId, result.message, artifactPath);
    }

    return result;

  } catch (error) {
    // 予期しないエラー
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ ジョブ処理中に予期しないエラー:', errorMessage);

    // エラー時のスクリーンショットを保存
    let artifactPath = '';
    if (page) {
      artifactPath = await saveErrorScreenshot(page, jobId, 'error');
    }

    // スプレッドシートに失敗を記録
    try {
      await failJob(jobId, errorMessage, artifactPath);
    } catch (sheetError) {
      console.error('⚠️ スプレッドシート更新エラー:', sheetError);
    }

    // エラーを再スロー（BullMQがリトライを処理）
    throw error;

  } finally {
    // ============================================
    // クリーンアップ
    // ============================================
    console.log('🧹 クリーンアップ処理を行います');

    // ブラウザを閉じる
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('ページクローズエラー:', e);
      }
    }

    if (context) {
      try {
        await context.close();
      } catch (e) {
        console.error('コンテキストクローズエラー:', e);
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('ブラウザクローズエラー:', e);
      }
    }

    // ロックを解放
    if (lockAcquired) {
      try {
        await releaseLock(customerId, action, jobId);
      } catch (e) {
        console.error('ロック解放エラー:', e);
      }
    }

    console.log('═'.repeat(60));
    console.log(`🏁 ジョブ処理完了: ${jobId}`);
    console.log('═'.repeat(60));
  }
};

// ============================================
// ワーカーの作成と起動
// ============================================

/**
 * ワーカーを作成する
 */
const createWorker = (): Worker<JobData, JobResult> => {
  console.log('🏭 ワーカーを作成します');

  // Redis接続を取得
  const connection = getRedisConnection();

  // 同時実行数を取得
  const concurrency = getConcurrency();

  console.log(`   同時実行数: ${concurrency}`);

  // ワーカーを作成
  const worker = new Worker<JobData, JobResult>(
    QUEUE_NAME,
    processJob,
    {
      connection,
      concurrency,
      // ジョブのロックタイムアウト（長いシナリオに対応）
      lockDuration: 600000, // 10分
    }
  );

  // イベントハンドラを設定
  setupWorkerEventHandlers(worker);

  return worker;
};

/**
 * ワーカーのイベントハンドラを設定する
 */
const setupWorkerEventHandlers = (worker: Worker<JobData, JobResult>): void => {
  // ジョブ完了イベント
  worker.on('completed', (job, result) => {
    console.log(`✅ ジョブ完了: ${job.id}`);
    console.log(`   結果: ${result.success ? '成功' : '失敗'}`);
    console.log(`   メッセージ: ${result.message}`);
  });

  // ジョブ失敗イベント
  worker.on('failed', (job, error) => {
    console.log(`❌ ジョブ失敗: ${job?.id}`);
    console.log(`   エラー: ${error.message}`);
    console.log(`   試行回数: ${job?.attemptsMade}/${job?.opts?.attempts}`);
  });

  // エラーイベント
  worker.on('error', (error) => {
    console.error('❌ ワーカーエラー:', error);
  });

  // 準備完了イベント
  worker.on('ready', () => {
    console.log('🟢 ワーカーが準備完了しました');
  });

  // 一時停止イベント
  worker.on('paused', () => {
    console.log('⏸️ ワーカーが一時停止しました');
  });

  // 再開イベント
  worker.on('resumed', () => {
    console.log('▶️ ワーカーが再開しました');
  });
};

// ============================================
// メイン処理
// ============================================

/**
 * ワーカーを起動する
 */
const startWorker = async (): Promise<void> => {
  console.log('═'.repeat(60));
  console.log('🚀 Playwright自動化ワーカーを起動します');
  console.log('═'.repeat(60));

  try {
    // スプレッドシートを初期化
    console.log('📊 スプレッドシートを初期化します...');
    await initializeSheet();

    // ワーカーを作成
    const worker = createWorker();

    // シャットダウンハンドラを設定
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n📛 シグナル ${signal} を受信しました`);
      console.log('🛑 ワーカーを停止します...');

      try {
        // ワーカーを閉じる
        await worker.close();
        console.log('✅ ワーカーを正常に停止しました');
      } catch (error) {
        console.error('❌ ワーカー停止エラー:', error);
      }

      process.exit(0);
    };

    // シグナルハンドラを登録
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log('✅ ワーカーが起動しました');
    console.log('💡 Ctrl+C で停止できます');

  } catch (error) {
    console.error('❌ ワーカー起動エラー:', error);
    process.exit(1);
  }
};

// ワーカーを起動
startWorker();
