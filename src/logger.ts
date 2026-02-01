/**
 * ログ出力モジュール
 *
 * このファイルでは、アプリケーション全体で使用する
 * ログ出力機能を提供します。
 *
 * 【ログレベル】
 * - debug: デバッグ情報（開発時のみ）
 * - info: 一般的な情報
 * - warn: 警告（処理は続行）
 * - error: エラー（処理が失敗）
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// ============================================
// ログレベル定義
// ============================================

/**
 * ログレベルの列挙型
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * ログレベル名のマッピング
 */
const LOG_LEVEL_NAMES: { [key in LogLevel]: string } = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * ログレベルのアイコン
 */
const LOG_LEVEL_ICONS: { [key in LogLevel]: string } = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

// ============================================
// 設定
// ============================================

/**
 * 環境変数からログレベルを取得
 */
const getConfiguredLogLevel = (): LogLevel => {
  const levelStr = process.env.LOG_LEVEL?.toLowerCase() || 'info';

  switch (levelStr) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
};

// 現在のログレベル
const currentLogLevel = getConfiguredLogLevel();

// ============================================
// ログ出力関数
// ============================================

/**
 * ログを出力する内部関数
 *
 * @param level - ログレベル
 * @param message - メッセージ
 * @param context - コンテキスト情報（任意）
 */
const log = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void => {
  // 設定されたログレベル未満は出力しない
  if (level < currentLogLevel) {
    return;
  }

  // タイムスタンプを生成
  const timestamp = new Date().toISOString();

  // レベル名とアイコンを取得
  const levelName = LOG_LEVEL_NAMES[level];
  const icon = LOG_LEVEL_ICONS[level];

  // ログメッセージを構築
  let logMessage = `[${timestamp}] ${icon} ${levelName}: ${message}`;

  // コンテキストがあれば追加
  if (context && Object.keys(context).length > 0) {
    logMessage += '\n' + JSON.stringify(context, null, 2);
  }

  // コンソールに出力
  switch (level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(logMessage);
      break;
    case LogLevel.WARN:
      console.warn(logMessage);
      break;
    case LogLevel.ERROR:
      console.error(logMessage);
      break;
  }
};

// ============================================
// 公開関数
// ============================================

/**
 * デバッグログを出力
 *
 * @param message - メッセージ
 * @param context - コンテキスト情報（任意）
 */
export const debug = (message: string, context?: Record<string, unknown>): void => {
  log(LogLevel.DEBUG, message, context);
};

/**
 * 情報ログを出力
 *
 * @param message - メッセージ
 * @param context - コンテキスト情報（任意）
 */
export const info = (message: string, context?: Record<string, unknown>): void => {
  log(LogLevel.INFO, message, context);
};

/**
 * 警告ログを出力
 *
 * @param message - メッセージ
 * @param context - コンテキスト情報（任意）
 */
export const warn = (message: string, context?: Record<string, unknown>): void => {
  log(LogLevel.WARN, message, context);
};

/**
 * エラーログを出力
 *
 * @param message - メッセージ
 * @param error - エラーオブジェクト（任意）
 * @param context - コンテキスト情報（任意）
 */
export const error = (
  message: string,
  err?: Error | unknown,
  context?: Record<string, unknown>
): void => {
  // エラー情報をコンテキストに追加
  const errorContext: Record<string, unknown> = {
    ...context,
  };

  if (err instanceof Error) {
    errorContext.errorName = err.name;
    errorContext.errorMessage = err.message;
    errorContext.errorStack = err.stack;
  } else if (err) {
    errorContext.error = String(err);
  }

  log(LogLevel.ERROR, message, errorContext);
};

// ============================================
// ジョブログ用のヘルパー
// ============================================

/**
 * ジョブ開始ログを出力
 *
 * @param jobId - ジョブID
 * @param action - アクション名
 * @param customerId - 顧客ID
 */
export const jobStart = (
  jobId: string,
  action: string,
  customerId: string
): void => {
  info('ジョブ開始', {
    jobId,
    action,
    customerId,
  });
};

/**
 * ジョブ完了ログを出力
 *
 * @param jobId - ジョブID
 * @param success - 成功したかどうか
 * @param message - メッセージ
 */
export const jobComplete = (
  jobId: string,
  success: boolean,
  message: string
): void => {
  if (success) {
    info('ジョブ完了', { jobId, success, message });
  } else {
    warn('ジョブ失敗', { jobId, success, message });
  }
};

/**
 * ジョブ進捗ログを出力
 *
 * @param jobId - ジョブID
 * @param percent - 進捗パーセント
 * @param step - ステップ名
 */
export const jobProgress = (
  jobId: string,
  percent: number,
  step: string
): void => {
  debug('ジョブ進捗', { jobId, percent, step });
};

// ============================================
// デフォルトエクスポート
// ============================================

export default {
  debug,
  info,
  warn,
  error,
  jobStart,
  jobComplete,
  jobProgress,
};
