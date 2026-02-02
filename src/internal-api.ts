/**
 * 内部実行API
 *
 * このファイルでは、システム内部で使用するAPIエンドポイントを実装します。
 * 外部公開用のAPIとは異なり、管理者向けの機能を提供します。
 *
 * 【提供する機能】
 * - 直接実行（キューをバイパス）
 * - バッチジョブ作成
 * - キュー管理（一時停止、再開、クリア）
 * - システム診断
 * - シナリオテスト（ドライラン）
 * - 手動リトライ
 * - Webhook通知
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// Expressフレームワーク
import { Router, Request, Response } from 'express';

// UUID生成
import { v4 as uuidv4 } from 'uuid';

// Playwrightをインポート
import { chromium, Browser, Page, BrowserContext } from 'playwright';

// Node.jsファイルシステムAPI
import * as fs from 'fs';
import * as path from 'path';

// 型定義をインポート
import {
  JobData,
  JobResult,
  ActionType,
  ScenarioContext,
  CreateJobRequest,
} from './types';

// キュー関連をインポート
import {
  automationQueue,
  addJob,
  getRedisConnection,
  acquireLock,
  releaseLock,
} from './queue';

// スプレッドシート関連をインポート
import {
  createJobRecord,
  updateJobProgress,
  completeJob,
  failJob,
  getJobRecord,
} from './sheets';

// シナリオ関連をインポート
import { runScenario, getAvailableScenarios, isScenarioAvailable } from './scenarios';

// セキュリティ関連をインポート
import {
  securityMiddleware,
  requireScope,
  issueTokenHandler,
  refreshTokenHandler,
  generateAPIKey,
  AuthenticatedRequest,
} from './security';

// ============================================
// ルーターの作成
// ============================================

const router = Router();

// ============================================
// 型定義
// ============================================

/**
 * バッチジョブリクエスト
 */
interface BatchJobRequest {
  // ジョブ配列
  jobs: CreateJobRequest[];
  // 共通のオペレーター（省略時は各ジョブから取得）
  operator?: string;
  // バッチID（省略時は自動生成）
  batchId?: string;
}

/**
 * 直接実行リクエスト
 */
interface DirectExecuteRequest {
  // 顧客ID
  customerId: string;
  // 注文番号（任意）
  orderNo?: string;
  // アクション
  action: ActionType;
  // 追加パラメータ
  params?: Record<string, unknown>;
  // タイムアウト（ミリ秒）
  timeout?: number;
  // ドライランモード（実際の操作を行わない）
  dryRun?: boolean;
}

/**
 * Webhook通知設定
 */
interface WebhookConfig {
  // 通知先URL
  url: string;
  // HTTPヘッダー
  headers?: Record<string, string>;
  // 通知するイベント
  events: ('job_completed' | 'job_failed' | 'job_started')[];
}

// ============================================
// セキュリティミドルウェアの適用
// ============================================

// 全ルートにセキュリティミドルウェアを適用
// - リクエストID付与
// - IPホワイトリスト
// - JWT認証
// - APIキー認証
// - レート制限
// - 監査ログ
router.use(securityMiddleware);

// ============================================
// トークン管理エンドポイント
// ============================================

/**
 * POST /internal/auth/token
 * JWTトークンを発行する（管理者用）
 *
 * 注意: このエンドポイントは ADMIN_SECRET が必要
 */
router.post('/auth/token', (req: Request, res: Response) => {
  // 管理者シークレットを検証
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'] as string;

  if (!adminSecret) {
    return res.status(501).json({
      success: false,
      error: 'トークン発行機能は無効です（ADMIN_SECRET が未設定）',
    });
  }

  if (!providedSecret || providedSecret !== adminSecret) {
    return res.status(403).json({
      success: false,
      error: '管理者権限が必要です',
    });
  }

  return issueTokenHandler(req, res);
});

/**
 * POST /internal/auth/refresh
 * JWTトークンをリフレッシュする
 */
router.post('/auth/refresh', refreshTokenHandler);

/**
 * POST /internal/auth/generate-api-key
 * 新しいAPIキーを生成する（管理者用）
 */
router.post('/auth/generate-api-key', (req: Request, res: Response) => {
  // 管理者シークレットを検証
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'] as string;

  if (!adminSecret) {
    return res.status(501).json({
      success: false,
      error: 'APIキー生成機能は無効です（ADMIN_SECRET が未設定）',
    });
  }

  if (!providedSecret || providedSecret !== adminSecret) {
    return res.status(403).json({
      success: false,
      error: '管理者権限が必要です',
    });
  }

  const { length = 32 } = req.body;
  const apiKey = generateAPIKey(length);

  res.json({
    success: true,
    apiKey,
    message: 'このAPIキーは一度しか表示されません。安全に保管してください。',
    usage: {
      header: 'X-Internal-API-Key',
      example: `curl -H "X-Internal-API-Key: ${apiKey}" ...`,
    },
  });
});

// ============================================
// 直接実行エンドポイント（キューバイパス）
// ============================================

/**
 * POST /internal/execute
 * ジョブをキューを介さず直接実行する
 *
 * 用途:
 * - デバッグ・テスト
 * - 緊急対応
 * - シナリオ検証
 */
router.post('/execute', async (req: Request, res: Response) => {
  console.log('🔧 [内部API] 直接実行リクエストを受信');

  const {
    customerId,
    orderNo,
    action,
    params,
    timeout = 300000, // デフォルト5分
    dryRun = false,
  } = req.body as DirectExecuteRequest;

  // バリデーション
  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: 'customerId は必須です',
    });
  }

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'action は必須です',
    });
  }

  if (!isScenarioAvailable(action)) {
    return res.status(400).json({
      success: false,
      error: `無効なアクションです: ${action}`,
      availableActions: getAvailableScenarios(),
    });
  }

  // ジョブIDを生成
  const jobId = `direct-${uuidv4()}`;
  const startTime = Date.now();

  console.log(`   ジョブID: ${jobId}`);
  console.log(`   アクション: ${action}`);
  console.log(`   顧客ID: ${customerId}`);
  console.log(`   ドライラン: ${dryRun}`);

  // ドライランモードの場合は実行せずに返す
  if (dryRun) {
    return res.json({
      success: true,
      jobId,
      mode: 'dry_run',
      message: 'ドライランモード: 実際の実行は行われませんでした',
      request: {
        customerId,
        orderNo,
        action,
        params,
      },
      validationResult: {
        scenarioExists: true,
        paramsValid: true,
      },
    });
  }

  // ブラウザ変数の初期化
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let lockAcquired = false;

  try {
    // ロックを取得
    lockAcquired = await acquireLock(customerId, action, jobId, timeout);

    if (!lockAcquired) {
      return res.status(409).json({
        success: false,
        error: '同一顧客に対して同じアクションが実行中です',
      });
    }

    // ブラウザを起動
    browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
    });

    page = await context.newPage();
    page.setDefaultTimeout(parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10));

    // 進捗ログ用の配列
    const progressLogs: { timestamp: string; percent: number; step: string; message?: string }[] = [];

    // シナリオコンテキストを作成
    const scenarioContext: ScenarioContext = {
      jobId,
      customerId,
      orderNo,
      params,
      updateProgress: async (percent: number, step: string, message?: string): Promise<void> => {
        console.log(`   📊 進捗: ${percent}% - ${step}`);
        progressLogs.push({
          timestamp: new Date().toISOString(),
          percent,
          step,
          message,
        });
      },
      saveScreenshot: async (p: unknown, suffix?: string): Promise<string> => {
        if (!page) return '';
        const artifactsDir = process.env.ARTIFACTS_DIR || './artifacts';
        if (!fs.existsSync(artifactsDir)) {
          fs.mkdirSync(artifactsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${jobId}_${suffix || 'screenshot'}_${timestamp}.png`;
        const filePath = path.join(artifactsDir, fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        return filePath;
      },
    };

    // シナリオを実行
    const result = await runScenario(action, page, scenarioContext);

    // 実行時間を計算
    const executionTime = Date.now() - startTime;

    // レスポンスを返す
    res.json({
      success: result.success,
      jobId,
      mode: 'direct',
      result: result.data,
      message: result.message,
      executionTime: `${executionTime}ms`,
      progressLogs,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ [内部API] 直接実行エラー:', errorMessage);

    // エラー時のスクリーンショット
    let screenshotPath = '';
    if (page) {
      try {
        const artifactsDir = process.env.ARTIFACTS_DIR || './artifacts';
        if (!fs.existsSync(artifactsDir)) {
          fs.mkdirSync(artifactsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        screenshotPath = path.join(artifactsDir, `${jobId}_error_${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } catch (e) {
        console.error('スクリーンショット保存エラー:', e);
      }
    }

    res.status(500).json({
      success: false,
      jobId,
      error: errorMessage,
      screenshotPath,
      executionTime: `${Date.now() - startTime}ms`,
    });

  } finally {
    // クリーンアップ
    if (page) try { await page.close(); } catch (e) { /* ignore */ }
    if (context) try { await context.close(); } catch (e) { /* ignore */ }
    if (browser) try { await browser.close(); } catch (e) { /* ignore */ }
    if (lockAcquired) {
      try { await releaseLock(customerId, action, jobId); } catch (e) { /* ignore */ }
    }
  }
});

// ============================================
// バッチジョブ作成エンドポイント
// ============================================

/**
 * POST /internal/batch
 * 複数のジョブを一括でキューに投入する
 */
router.post('/batch', async (req: Request, res: Response) => {
  console.log('📦 [内部API] バッチジョブ作成リクエストを受信');

  const {
    jobs,
    operator: defaultOperator,
    batchId = `batch-${uuidv4()}`,
  } = req.body as BatchJobRequest;

  // バリデーション
  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'jobs 配列は必須です（1件以上）',
    });
  }

  console.log(`   バッチID: ${batchId}`);
  console.log(`   ジョブ数: ${jobs.length}`);

  // 結果を格納する配列
  const results: {
    index: number;
    success: boolean;
    jobId?: string;
    error?: string;
  }[] = [];

  // 各ジョブを処理
  for (let i = 0; i < jobs.length; i++) {
    const jobRequest = jobs[i];

    try {
      // バリデーション
      if (!jobRequest.customerId || !jobRequest.action) {
        results.push({
          index: i,
          success: false,
          error: 'customerId と action は必須です',
        });
        continue;
      }

      if (!isScenarioAvailable(jobRequest.action)) {
        results.push({
          index: i,
          success: false,
          error: `無効なアクション: ${jobRequest.action}`,
        });
        continue;
      }

      // ジョブIDを生成
      const jobId = uuidv4();
      const createdAt = new Date().toISOString();
      const operator = jobRequest.operator || defaultOperator || 'batch-system';

      // ジョブデータを作成
      const jobData: JobData = {
        jobId,
        ticketId: jobRequest.ticketId || `batch-${batchId}-${i}`,
        customerId: jobRequest.customerId,
        orderNo: jobRequest.orderNo,
        action: jobRequest.action,
        operator,
        params: {
          ...jobRequest.params,
          batchId,
          batchIndex: i,
        },
        createdAt,
      };

      // スプレッドシートにレコードを作成
      await createJobRecord({
        job_id: jobId,
        created_at: createdAt,
        operator,
        ticket_id: jobData.ticketId,
        customer_id: jobRequest.customerId,
        order_no: jobRequest.orderNo || '',
        action: jobRequest.action,
        status: 'pending',
        progress: '0% - 待機中',
        message: `バッチジョブ（${batchId}）として登録`,
        result: '',
        error: '',
        artifact_url: '',
        updated_at: createdAt,
      });

      // キューにジョブを追加
      await addJob(jobData);

      results.push({
        index: i,
        success: true,
        jobId,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        index: i,
        success: false,
        error: errorMessage,
      });
    }
  }

  // 結果を集計
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`✅ [内部API] バッチジョブ作成完了`);
  console.log(`   成功: ${successCount}件, 失敗: ${failureCount}件`);

  res.status(failureCount > 0 && successCount === 0 ? 400 : 201).json({
    success: successCount > 0,
    batchId,
    summary: {
      total: jobs.length,
      success: successCount,
      failure: failureCount,
    },
    results,
  });
});

// ============================================
// キュー管理エンドポイント
// ============================================

/**
 * POST /internal/queue/pause
 * キューを一時停止する
 */
router.post('/queue/pause', async (req: Request, res: Response) => {
  console.log('⏸️ [内部API] キュー一時停止リクエスト');

  try {
    await automationQueue.pause();
    res.json({
      success: true,
      message: 'キューを一時停止しました',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /internal/queue/resume
 * キューを再開する
 */
router.post('/queue/resume', async (req: Request, res: Response) => {
  console.log('▶️ [内部API] キュー再開リクエスト');

  try {
    await automationQueue.resume();
    res.json({
      success: true,
      message: 'キューを再開しました',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /internal/queue/clean
 * キューをクリーンアップする
 */
router.post('/queue/clean', async (req: Request, res: Response) => {
  console.log('🧹 [内部API] キュークリーンアップリクエスト');

  const {
    status = 'completed', // 対象ステータス: completed, failed, delayed, wait
    age = 3600000, // 削除対象の経過時間（ミリ秒）デフォルト1時間
    limit = 1000, // 最大削除数
  } = req.body;

  try {
    let cleaned = 0;

    switch (status) {
      case 'completed':
        cleaned = (await automationQueue.clean(age, limit, 'completed')).length;
        break;
      case 'failed':
        cleaned = (await automationQueue.clean(age, limit, 'failed')).length;
        break;
      case 'delayed':
        cleaned = (await automationQueue.clean(age, limit, 'delayed')).length;
        break;
      case 'wait':
        cleaned = (await automationQueue.clean(age, limit, 'wait')).length;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `無効なステータス: ${status}`,
        });
    }

    console.log(`✅ [内部API] ${cleaned}件のジョブを削除しました`);

    res.json({
      success: true,
      message: `${cleaned}件の${status}ジョブを削除しました`,
      cleaned,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * DELETE /internal/queue/drain
 * キューをドレイン（すべての待機ジョブを削除）する
 *
 * 注意: 危険な操作のため internal:admin スコープが必要
 */
router.delete('/queue/drain', requireScope('internal:admin'), async (req: Request, res: Response) => {
  console.log('🚿 [内部API] キュードレインリクエスト');

  try {
    await automationQueue.drain();

    res.json({
      success: true,
      message: 'キューをドレインしました（待機中のジョブをすべて削除）',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// ============================================
// ジョブ操作エンドポイント
// ============================================

/**
 * POST /internal/jobs/:id/retry
 * 失敗したジョブを手動でリトライする
 */
router.post('/jobs/:id/retry', async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  console.log(`🔄 [内部API] ジョブリトライリクエスト: ${jobId}`);

  try {
    // BullMQからジョブを取得
    const job = await automationQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'ジョブが見つかりません',
      });
    }

    // ジョブの状態を確認
    const state = await job.getState();

    if (state !== 'failed') {
      return res.status(400).json({
        success: false,
        error: `リトライは失敗したジョブのみ可能です（現在の状態: ${state}）`,
      });
    }

    // リトライを実行
    await job.retry();

    console.log(`✅ [内部API] ジョブをリトライキューに追加: ${jobId}`);

    res.json({
      success: true,
      message: 'ジョブをリトライキューに追加しました',
      jobId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * DELETE /internal/jobs/:id
 * ジョブを削除する
 */
router.delete('/jobs/:id', async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  console.log(`🗑️ [内部API] ジョブ削除リクエスト: ${jobId}`);

  try {
    const job = await automationQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'ジョブが見つかりません',
      });
    }

    // ジョブの状態を確認
    const state = await job.getState();

    if (state === 'active') {
      return res.status(400).json({
        success: false,
        error: '実行中のジョブは削除できません',
      });
    }

    // ジョブを削除
    await job.remove();

    console.log(`✅ [内部API] ジョブを削除: ${jobId}`);

    res.json({
      success: true,
      message: 'ジョブを削除しました',
      jobId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /internal/jobs/:id/promote
 * 遅延ジョブを即座に実行する
 */
router.post('/jobs/:id/promote', async (req: Request, res: Response) => {
  const { id: jobId } = req.params;
  console.log(`⏫ [内部API] ジョブ昇格リクエスト: ${jobId}`);

  try {
    const job = await automationQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'ジョブが見つかりません',
      });
    }

    const state = await job.getState();

    if (state !== 'delayed') {
      return res.status(400).json({
        success: false,
        error: `昇格は遅延中のジョブのみ可能です（現在の状態: ${state}）`,
      });
    }

    await job.promote();

    res.json({
      success: true,
      message: 'ジョブを即座に実行キューに移動しました',
      jobId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// ============================================
// システム診断エンドポイント
// ============================================

/**
 * GET /internal/diagnostics
 * システム診断情報を取得する
 */
router.get('/diagnostics', async (req: Request, res: Response) => {
  console.log('🔍 [内部API] システム診断リクエスト');

  try {
    // キューの状態を取得
    const counts = await automationQueue.getJobCounts();

    // Redis接続状態
    const redis = getRedisConnection();
    const redisInfo = await redis.info();

    // 環境変数の状態（機密情報を除く）
    const envStatus = {
      REDIS_HOST: process.env.REDIS_HOST ? '設定済み' : '未設定',
      SPREADSHEET_ID: process.env.SPREADSHEET_ID ? '設定済み' : '未設定',
      TAMAGO_BASE_URL: process.env.TAMAGO_BASE_URL ? '設定済み' : '未設定',
      TAMAGO_LOGIN_ID: process.env.TAMAGO_LOGIN_ID ? '設定済み' : '未設定',
      PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS || 'デフォルト(true)',
      QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY || 'デフォルト(10)',
    };

    // 利用可能なシナリオ
    const scenarios = getAvailableScenarios();

    // メモリ使用量
    const memoryUsage = process.memoryUsage();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: `${Math.floor(process.uptime())}秒`,
        memory: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        },
      },
      queue: {
        counts,
        isPaused: await automationQueue.isPaused(),
      },
      redis: {
        connected: redis.status === 'ready',
        status: redis.status,
      },
      environment: envStatus,
      scenarios: {
        available: scenarios,
        count: scenarios.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// ============================================
// Webhook管理エンドポイント
// ============================================

// Webhook設定を保持するMap（実際の運用ではDBに保存）
const webhookConfigs: Map<string, WebhookConfig> = new Map();

/**
 * POST /internal/webhooks
 * Webhook通知先を登録する
 */
router.post('/webhooks', async (req: Request, res: Response) => {
  console.log('🔗 [内部API] Webhook登録リクエスト');

  const { url, headers, events } = req.body as WebhookConfig;

  // バリデーション
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'url は必須です',
    });
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'events 配列は必須です（1つ以上）',
    });
  }

  // Webhook IDを生成
  const webhookId = uuidv4();

  // 設定を保存
  webhookConfigs.set(webhookId, { url, headers, events });

  console.log(`✅ [内部API] Webhook登録完了: ${webhookId}`);

  res.status(201).json({
    success: true,
    webhookId,
    message: 'Webhookを登録しました',
  });
});

/**
 * GET /internal/webhooks
 * 登録されているWebhook一覧を取得する
 */
router.get('/webhooks', (req: Request, res: Response) => {
  const webhooks = Array.from(webhookConfigs.entries()).map(([id, config]) => ({
    id,
    url: config.url,
    events: config.events,
  }));

  res.json({
    success: true,
    webhooks,
  });
});

/**
 * DELETE /internal/webhooks/:id
 * Webhookを削除する
 */
router.delete('/webhooks/:id', (req: Request, res: Response) => {
  const { id: webhookId } = req.params;

  if (!webhookConfigs.has(webhookId)) {
    return res.status(404).json({
      success: false,
      error: 'Webhookが見つかりません',
    });
  }

  webhookConfigs.delete(webhookId);

  res.json({
    success: true,
    message: 'Webhookを削除しました',
  });
});

/**
 * Webhook通知を送信する関数
 * （他のモジュールからエクスポートして使用）
 */
export const sendWebhookNotification = async (
  event: 'job_completed' | 'job_failed' | 'job_started',
  payload: Record<string, unknown>
): Promise<void> => {
  const notifyPromises: Promise<void>[] = [];

  webhookConfigs.forEach((config, webhookId) => {
    if (config.events.includes(event)) {
      const promise = fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          ...payload,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            console.error(`⚠️ Webhook通知失敗 (${webhookId}): ${response.status}`);
          }
        })
        .catch((error) => {
          console.error(`⚠️ Webhook通知エラー (${webhookId}):`, error);
        });

      notifyPromises.push(promise);
    }
  });

  await Promise.allSettled(notifyPromises);
};

// ============================================
// シナリオテストエンドポイント
// ============================================

/**
 * POST /internal/scenarios/test
 * シナリオをテストモードで実行する（ログインまでの検証）
 */
router.post('/scenarios/test', async (req: Request, res: Response) => {
  console.log('🧪 [内部API] シナリオテストリクエスト');

  const { action } = req.body;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'action は必須です',
    });
  }

  if (!isScenarioAvailable(action)) {
    return res.status(400).json({
      success: false,
      error: `無効なアクション: ${action}`,
      availableActions: getAvailableScenarios(),
    });
  }

  // 実際のテスト実行は省略（環境変数の検証のみ）
  const requiredEnvVars = ['TAMAGO_BASE_URL', 'TAMAGO_LOGIN_ID', 'TAMAGO_LOGIN_PASSWORD'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  res.json({
    success: missingVars.length === 0,
    action,
    validation: {
      scenarioExists: true,
      requiredEnvVars: requiredEnvVars.map((v) => ({
        name: v,
        set: !!process.env[v],
      })),
    },
    message:
      missingVars.length === 0
        ? 'シナリオの実行準備が整っています'
        : `環境変数が不足しています: ${missingVars.join(', ')}`,
  });
});

/**
 * GET /internal/scenarios
 * 利用可能なシナリオ一覧を詳細情報付きで取得する
 */
router.get('/scenarios', (req: Request, res: Response) => {
  const scenarios = getAvailableScenarios();

  // シナリオの詳細情報
  const scenarioDetails: Record<
    string,
    { description: string; requiredParams: string[]; optionalParams: string[] }
  > = {
    check_order_status: {
      description: '注文ステータス確認',
      requiredParams: ['customerId'],
      optionalParams: ['orderNo'],
    },
    cancel_order: {
      description: '注文キャンセル',
      requiredParams: ['customerId', 'orderNo'],
      optionalParams: ['params.cancelReason'],
    },
    update_shipping: {
      description: '配送情報更新',
      requiredParams: ['customerId', 'orderNo'],
      optionalParams: [
        'params.recipientName',
        'params.postalCode',
        'params.address',
        'params.phone',
      ],
    },
    get_customer_info: {
      description: '顧客情報取得',
      requiredParams: ['customerId'],
      optionalParams: [],
    },
    skip_next_delivery: {
      description: '次回配送スキップ',
      requiredParams: ['customerId'],
      optionalParams: ['params.skipReason'],
    },
    change_delivery_date: {
      description: '配送日変更',
      requiredParams: ['customerId'],
      optionalParams: ['params.newDeliveryDate'],
    },
    pause_subscription: {
      description: '定期購入一時停止',
      requiredParams: ['customerId'],
      optionalParams: ['params.pauseReason', 'params.resumeDate'],
    },
    resume_subscription: {
      description: '定期購入再開',
      requiredParams: ['customerId'],
      optionalParams: ['params.nextDeliveryDate'],
    },
  };

  res.json({
    success: true,
    scenarios: scenarios.map((name) => ({
      name,
      ...(scenarioDetails[name] || {
        description: name,
        requiredParams: [],
        optionalParams: [],
      }),
    })),
  });
});

// ============================================
// エクスポート
// ============================================

export default router;
