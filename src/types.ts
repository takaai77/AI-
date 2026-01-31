/**
 * Playwright自動化基盤 - 型定義ファイル
 *
 * このファイルでは、システム全体で使用する型を定義しています。
 * TypeScriptの型システムを活用して、開発時のミスを防ぎます。
 */

// ============================================
// ジョブ関連の型定義
// ============================================

/**
 * ジョブのステータス
 * - pending: キューに入って待機中
 * - running: 実行中
 * - completed: 正常完了
 * - failed: 失敗（リトライ上限到達）
 * - retrying: リトライ中
 */
export type JobStatus =
  | 'pending'    // 待機中
  | 'running'    // 実行中
  | 'completed'  // 完了
  | 'failed'     // 失敗
  | 'retrying';  // リトライ中

/**
 * 実行可能なアクション（シナリオ）の種類
 * 新しいアクションを追加する場合は、ここに追加してください
 */
export type ActionType =
  | 'check_order_status'    // 注文ステータス確認
  | 'cancel_order'          // 注文キャンセル
  | 'update_shipping'       // 配送情報更新
  | 'get_customer_info'     // 顧客情報取得
  | 'skip_next_delivery'    // 次回配送スキップ
  | 'change_delivery_date'  // 配送日変更
  | 'pause_subscription'    // 定期購入一時停止
  | 'resume_subscription';  // 定期購入再開

/**
 * ジョブ作成時のリクエストボディ
 * POST /jobs で受け取るデータの型
 */
export interface CreateJobRequest {
  // ZendeskチケットID（必須）
  ticketId: string;

  // 顧客ID（必須）
  customerId: string;

  // 注文番号（任意 - アクションによっては必要）
  orderNo?: string;

  // 実行するアクション（必須）
  action: ActionType;

  // 操作者の名前またはID（必須）
  operator: string;

  // 追加パラメータ（アクション固有のデータ）
  params?: Record<string, unknown>;
}

/**
 * ジョブ作成後のレスポンス
 */
export interface CreateJobResponse {
  // 成功したかどうか
  success: boolean;

  // 生成されたジョブID
  jobId: string;

  // メッセージ
  message: string;
}

/**
 * ジョブの進捗情報
 */
export interface JobProgress {
  // 進捗パーセント（0-100）
  percent: number;

  // 現在のステップ名
  step: string;

  // 詳細メッセージ
  message?: string;
}

/**
 * BullMQに渡すジョブデータ
 */
export interface JobData {
  // ジョブID（UUID）
  jobId: string;

  // ZendeskチケットID
  ticketId: string;

  // 顧客ID
  customerId: string;

  // 注文番号（任意）
  orderNo?: string;

  // 実行するアクション
  action: ActionType;

  // 操作者
  operator: string;

  // 追加パラメータ
  params?: Record<string, unknown>;

  // ジョブ作成日時
  createdAt: string;
}

/**
 * ジョブの実行結果
 */
export interface JobResult {
  // 成功したかどうか
  success: boolean;

  // 結果データ（アクションによって異なる）
  data?: Record<string, unknown>;

  // メッセージ
  message: string;
}

// ============================================
// スプレッドシート関連の型定義
// ============================================

/**
 * スプレッドシートに記録するジョブレコード
 */
export interface JobRecord {
  // ジョブID
  job_id: string;

  // 作成日時（ISO形式）
  created_at: string;

  // 操作者
  operator: string;

  // ZendeskチケットID
  ticket_id: string;

  // 顧客ID
  customer_id: string;

  // 注文番号
  order_no: string;

  // アクション名
  action: string;

  // ステータス
  status: JobStatus;

  // 進捗（例: "50% - ログイン完了"）
  progress: string;

  // メッセージ
  message: string;

  // 実行結果（JSON文字列）
  result: string;

  // エラー情報
  error: string;

  // スクリーンショットのURL/パス
  artifact_url: string;

  // 更新日時
  updated_at: string;
}

// ============================================
// シナリオ関連の型定義
// ============================================

/**
 * シナリオ実行時のコンテキスト
 * シナリオ内で使用する共通データ
 */
export interface ScenarioContext {
  // ジョブID
  jobId: string;

  // 顧客ID
  customerId: string;

  // 注文番号（任意）
  orderNo?: string;

  // 追加パラメータ
  params?: Record<string, unknown>;

  // 進捗更新用のコールバック関数
  updateProgress: (percent: number, step: string, message?: string) => Promise<void>;

  // スクリーンショット保存用のコールバック関数
  saveScreenshot: (page: unknown, suffix?: string) => Promise<string>;
}

/**
 * シナリオ関数の型
 * 各アクションのシナリオはこの型に従って実装する
 */
export type ScenarioFunction = (
  // Playwrightのページオブジェクト
  page: unknown,

  // シナリオのコンテキスト
  context: ScenarioContext
) => Promise<JobResult>;

/**
 * シナリオの登録マップ
 */
export type ScenarioMap = {
  [key in ActionType]: ScenarioFunction;
};

// ============================================
// API関連の型定義
// ============================================

/**
 * GET /jobs/:id のレスポンス
 */
export interface GetJobResponse {
  // 成功したかどうか
  success: boolean;

  // ジョブ情報
  job?: JobRecord;

  // エラーメッセージ
  error?: string;
}

/**
 * GET /jobs のレスポンス（ジョブ一覧）
 */
export interface ListJobsResponse {
  // 成功したかどうか
  success: boolean;

  // ジョブ一覧
  jobs: JobRecord[];

  // 総件数
  total: number;
}

// ============================================
// 設定関連の型定義
// ============================================

/**
 * アプリケーション設定
 */
export interface AppConfig {
  // サーバーポート
  port: number;

  // Redis設定
  redis: {
    host: string;
    port: number;
    password?: string;
  };

  // スプレッドシートID
  spreadsheetId: string;

  // たまごリピートの設定
  tamago: {
    baseUrl: string;
    loginId: string;
    loginPassword: string;
  };

  // Playwright設定
  playwright: {
    headless: boolean;
    browser: 'chromium' | 'firefox' | 'webkit';
    timeout: number;
  };

  // ジョブ設定
  job: {
    concurrency: number;
    maxAttempts: number;
    backoffDelay: number;
  };

  // ファイルパス
  paths: {
    artifacts: string;
    storageState: string;
  };
}

// ============================================
// ロック関連の型定義
// ============================================

/**
 * 分散ロックの情報
 */
export interface LockInfo {
  // ロックキー
  key: string;

  // ロックを取得したジョブID
  jobId: string;

  // ロックの有効期限（Unix timestamp）
  expiresAt: number;
}
