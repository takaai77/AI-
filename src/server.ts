/**
 * Express APIサーバー
 *
 * このファイルでは、ジョブを受け付けるAPIサーバーを実装します。
 *
 * 【このサーバーの役割】
 * - Zendeskの管理画面アプリからHTTP POSTでジョブを受け付ける
 * - ジョブをBullMQのキューに投入
 * - ジョブの進捗/結果を返すAPIを提供
 *
 * 【エンドポイント】
 * - POST /jobs : 新しいジョブを作成
 * - GET /jobs/:id : ジョブの詳細を取得
 * - GET /jobs : ジョブ一覧を取得
 * - GET /health : ヘルスチェック
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// Expressフレームワーク
import express, { Request, Response, NextFunction } from 'express';

// CORS（クロスオリジンリクエスト）対応
import cors from 'cors';

// UUID生成
import { v4 as uuidv4 } from 'uuid';

// 型定義をインポート
import {
  CreateJobRequest,
  CreateJobResponse,
  GetJobResponse,
  ListJobsResponse,
  JobData,
  ActionType,
} from './types';

// キュー関連をインポート
import {
  addJob,
  getJobState,
  checkLock,
  automationQueue,
} from './queue';

// スプレッドシート関連をインポート
import {
  initializeSheet,
  createJobRecord,
  getJobRecord,
  listJobRecords,
} from './sheets';

// シナリオ関連をインポート
import { getAvailableScenarios, isScenarioAvailable } from './scenarios';

// ============================================
// Express アプリケーションの作成
// ============================================

// Expressアプリを作成
const app = express();

// JSONリクエストボディをパース
app.use(express.json());

// CORSを有効化（Zendeskアプリからのリクエストを許可）
app.use(cors());

// リクエストログ
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// ヘルスチェックエンドポイント
// ============================================

/**
 * GET /health
 * サーバーの稼働状態を確認するエンドポイント
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // キューの状態を取得
    const counts = await automationQueue.getJobCounts();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
      },
    });
  } catch (error) {
    console.error('ヘルスチェックエラー:', error);
    res.status(500).json({
      status: 'error',
      message: 'サーバーエラーが発生しました',
    });
  }
});

// ============================================
// ジョブ作成エンドポイント
// ============================================

/**
 * POST /jobs
 * 新しいジョブを作成してキューに投入する
 *
 * リクエストボディ:
 * - ticketId: ZendeskチケットID（必須）
 * - customerId: 顧客ID（必須）
 * - orderNo: 注文番号（任意）
 * - action: 実行するアクション（必須）
 * - operator: 操作者名（必須）
 * - params: 追加パラメータ（任意）
 */
app.post('/jobs', async (req: Request, res: Response) => {
  console.log('📥 ジョブ作成リクエストを受信しました');
  console.log('   リクエストボディ:', JSON.stringify(req.body, null, 2));

  try {
    // リクエストボディを取得
    const {
      ticketId,
      customerId,
      orderNo,
      action,
      operator,
      params,
    } = req.body as CreateJobRequest;

    // ============================================
    // バリデーション
    // ============================================

    // 必須パラメータのチェック
    const errors: string[] = [];

    if (!ticketId) {
      errors.push('ticketId は必須です');
    }

    if (!customerId) {
      errors.push('customerId は必須です');
    }

    if (!action) {
      errors.push('action は必須です');
    }

    if (!operator) {
      errors.push('operator は必須です');
    }

    // エラーがあればレスポンス
    if (errors.length > 0) {
      console.log('❌ バリデーションエラー:', errors);
      return res.status(400).json({
        success: false,
        jobId: '',
        message: `入力エラー: ${errors.join(', ')}`,
      } as CreateJobResponse);
    }

    // アクションが有効かチェック
    if (!isScenarioAvailable(action as ActionType)) {
      console.log(`❌ 無効なアクション: ${action}`);
      return res.status(400).json({
        success: false,
        jobId: '',
        message: `無効なアクションです: ${action}。利用可能: ${getAvailableScenarios().join(', ')}`,
      } as CreateJobResponse);
    }

    // ============================================
    // 重複チェック（簡易ロック確認）
    // ============================================

    // 同一顧客+アクションが既に実行中かチェック
    const existingLock = await checkLock(customerId, action);

    if (existingLock) {
      console.log(`⚠️ 同一顧客+アクションが実行中: ${customerId}/${action}`);
      return res.status(409).json({
        success: false,
        jobId: existingLock,
        message: `同じ顧客に対して同じアクションが既に実行中です（ジョブID: ${existingLock}）`,
      } as CreateJobResponse);
    }

    // ============================================
    // ジョブの作成
    // ============================================

    // ジョブIDを生成
    const jobId = uuidv4();

    // 現在日時
    const createdAt = new Date().toISOString();

    // ジョブデータを作成
    const jobData: JobData = {
      jobId,
      ticketId,
      customerId,
      orderNo,
      action: action as ActionType,
      operator,
      params,
      createdAt,
    };

    console.log(`📝 ジョブを作成します: ${jobId}`);

    // スプレッドシートにレコードを作成
    await createJobRecord({
      job_id: jobId,
      created_at: createdAt,
      operator,
      ticket_id: ticketId,
      customer_id: customerId,
      order_no: orderNo || '',
      action,
      status: 'pending',
      progress: '0% - 待機中',
      message: 'ジョブがキューに追加されました',
      result: '',
      error: '',
      artifact_url: '',
      updated_at: createdAt,
    });

    // キューにジョブを追加
    await addJob(jobData);

    console.log(`✅ ジョブをキューに追加しました: ${jobId}`);

    // レスポンスを返す
    res.status(201).json({
      success: true,
      jobId,
      message: 'ジョブを受け付けました',
    } as CreateJobResponse);

  } catch (error) {
    // エラーハンドリング
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ ジョブ作成エラー:', errorMessage);

    res.status(500).json({
      success: false,
      jobId: '',
      message: `サーバーエラー: ${errorMessage}`,
    } as CreateJobResponse);
  }
});

// ============================================
// ジョブ詳細取得エンドポイント
// ============================================

/**
 * GET /jobs/:id
 * 指定されたジョブの詳細情報を取得する
 */
app.get('/jobs/:id', async (req: Request, res: Response) => {
  const { id: jobId } = req.params;

  console.log(`🔍 ジョブ詳細を取得します: ${jobId}`);

  try {
    // スプレッドシートからジョブレコードを取得
    const jobRecord = await getJobRecord(jobId);

    if (!jobRecord) {
      // BullMQからも確認
      const bullJob = await getJobState(jobId);

      if (!bullJob) {
        console.log(`⚠️ ジョブが見つかりません: ${jobId}`);
        return res.status(404).json({
          success: false,
          error: 'ジョブが見つかりません',
        } as GetJobResponse);
      }

      // BullMQのデータから簡易レスポンスを作成
      return res.json({
        success: true,
        job: {
          job_id: bullJob.id || jobId,
          created_at: new Date(bullJob.timestamp || 0).toISOString(),
          operator: bullJob.data?.operator || '',
          ticket_id: bullJob.data?.ticketId || '',
          customer_id: bullJob.data?.customerId || '',
          order_no: bullJob.data?.orderNo || '',
          action: bullJob.data?.action || '',
          status: bullJob.state || 'unknown',
          progress: JSON.stringify(bullJob.progress || {}),
          message: '',
          result: JSON.stringify(bullJob.returnvalue || {}),
          error: bullJob.failedReason || '',
          artifact_url: '',
          updated_at: new Date().toISOString(),
        },
      } as GetJobResponse);
    }

    // スプレッドシートのデータを返す
    res.json({
      success: true,
      job: jobRecord,
    } as GetJobResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ ジョブ詳細取得エラー:', errorMessage);

    res.status(500).json({
      success: false,
      error: `サーバーエラー: ${errorMessage}`,
    } as GetJobResponse);
  }
});

// ============================================
// ジョブ一覧取得エンドポイント
// ============================================

/**
 * GET /jobs
 * ジョブ一覧を取得する
 *
 * クエリパラメータ:
 * - limit: 取得件数（デフォルト: 50）
 * - status: ステータスでフィルタ
 * - customerId: 顧客IDでフィルタ
 * - operator: オペレーターでフィルタ
 */
app.get('/jobs', async (req: Request, res: Response) => {
  console.log('🔍 ジョブ一覧を取得します');

  try {
    // クエリパラメータを取得
    const limit = parseInt(req.query.limit as string) || 50;
    const statusFilter = req.query.status as string;
    const customerIdFilter = req.query.customerId as string;
    const operatorFilter = req.query.operator as string;

    // スプレッドシートからジョブ一覧を取得
    let jobs = await listJobRecords(limit * 2); // フィルタ用に多めに取得

    // フィルタリング
    if (statusFilter) {
      jobs = jobs.filter((job) => job.status === statusFilter);
    }

    if (customerIdFilter) {
      jobs = jobs.filter((job) => job.customer_id === customerIdFilter);
    }

    if (operatorFilter) {
      jobs = jobs.filter((job) => job.operator === operatorFilter);
    }

    // 件数制限
    jobs = jobs.slice(0, limit);

    console.log(`✅ ${jobs.length}件のジョブを取得しました`);

    res.json({
      success: true,
      jobs,
      total: jobs.length,
    } as ListJobsResponse);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ ジョブ一覧取得エラー:', errorMessage);

    res.status(500).json({
      success: false,
      jobs: [],
      total: 0,
    } as ListJobsResponse);
  }
});

// ============================================
// 利用可能なアクション一覧エンドポイント
// ============================================

/**
 * GET /actions
 * 利用可能なアクション（シナリオ）一覧を取得する
 */
app.get('/actions', (req: Request, res: Response) => {
  const actions = getAvailableScenarios();

  // アクションの説明を追加
  const actionDescriptions: Record<string, string> = {
    check_order_status: '注文ステータス確認',
    cancel_order: '注文キャンセル',
    update_shipping: '配送情報更新',
    get_customer_info: '顧客情報取得',
    skip_next_delivery: '次回配送スキップ',
    change_delivery_date: '配送日変更',
    pause_subscription: '定期購入一時停止',
    resume_subscription: '定期購入再開',
  };

  res.json({
    success: true,
    actions: actions.map((action) => ({
      name: action,
      description: actionDescriptions[action] || action,
    })),
  });
});

// ============================================
// キュー状態取得エンドポイント
// ============================================

/**
 * GET /queue/status
 * キューの状態を取得する
 */
app.get('/queue/status', async (req: Request, res: Response) => {
  try {
    // キューのカウントを取得
    const counts = await automationQueue.getJobCounts();

    // 待機中のジョブを取得
    const waitingJobs = await automationQueue.getJobs(['waiting'], 0, 10);

    // 実行中のジョブを取得
    const activeJobs = await automationQueue.getJobs(['active'], 0, 10);

    res.json({
      success: true,
      counts,
      waiting: waitingJobs.map((job) => ({
        id: job.id,
        action: job.data.action,
        customerId: job.data.customerId,
        operator: job.data.operator,
      })),
      active: activeJobs.map((job) => ({
        id: job.id,
        action: job.data.action,
        customerId: job.data.customerId,
        operator: job.data.operator,
        progress: job.progress,
      })),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ キュー状態取得エラー:', errorMessage);

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// ============================================
// エラーハンドリング
// ============================================

// 404エラー
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません',
  });
});

// 500エラー
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ サーバーエラー:', err);

  res.status(500).json({
    success: false,
    error: 'サーバー内部エラーが発生しました',
  });
});

// ============================================
// サーバー起動
// ============================================

/**
 * サーバーを起動する
 */
const startServer = async (): Promise<void> => {
  // ポート番号を取得
  const port = parseInt(process.env.PORT || '3000', 10);

  console.log('═'.repeat(60));
  console.log('🚀 Playwright自動化APIサーバーを起動します');
  console.log('═'.repeat(60));

  try {
    // スプレッドシートを初期化
    console.log('📊 スプレッドシートを初期化します...');
    await initializeSheet();

    // サーバーを起動
    app.listen(port, () => {
      console.log('═'.repeat(60));
      console.log(`✅ サーバーが起動しました`);
      console.log(`   URL: http://localhost:${port}`);
      console.log('');
      console.log('📌 エンドポイント一覧:');
      console.log(`   POST /jobs       - ジョブ作成`);
      console.log(`   GET  /jobs/:id   - ジョブ詳細`);
      console.log(`   GET  /jobs       - ジョブ一覧`);
      console.log(`   GET  /actions    - アクション一覧`);
      console.log(`   GET  /queue/status - キュー状態`);
      console.log(`   GET  /health     - ヘルスチェック`);
      console.log('═'.repeat(60));
    });

  } catch (error) {
    console.error('❌ サーバー起動エラー:', error);
    process.exit(1);
  }
};

// サーバーを起動
startServer();
