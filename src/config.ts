/**
 * 設定管理モジュール
 *
 * このファイルでは、アプリケーション全体の設定を管理します。
 * 環境変数から設定を読み込み、型安全に提供します。
 *
 * 【使い方】
 * import config from './config';
 * console.log(config.redis.host);
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// 型定義をインポート
import { AppConfig } from './types';

// ============================================
// 環境変数のバリデーション
// ============================================

/**
 * 必須の環境変数をチェックする
 *
 * @param name - 環境変数名
 * @param defaultValue - デフォルト値（任意）
 * @returns 環境変数の値
 */
const getEnv = (name: string, defaultValue?: string): string => {
  const value = process.env[name];

  if (value === undefined && defaultValue === undefined) {
    console.warn(`⚠️ 環境変数 ${name} が設定されていません`);
    return '';
  }

  return value || defaultValue || '';
};

/**
 * 数値の環境変数を取得する
 *
 * @param name - 環境変数名
 * @param defaultValue - デフォルト値
 * @returns 数値
 */
const getEnvNumber = (name: string, defaultValue: number): number => {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    console.warn(`⚠️ 環境変数 ${name} が数値ではありません: ${value}`);
    return defaultValue;
  }

  return parsed;
};

/**
 * 真偽値の環境変数を取得する
 *
 * @param name - 環境変数名
 * @param defaultValue - デフォルト値
 * @returns 真偽値
 */
const getEnvBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
};

// ============================================
// 設定オブジェクトの構築
// ============================================

/**
 * アプリケーション設定
 */
const config: AppConfig = {
  // サーバーポート
  port: getEnvNumber('PORT', 3000),

  // Redis設定
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // スプレッドシートID
  spreadsheetId: getEnv('GOOGLE_SPREADSHEET_ID'),

  // たまごリピートの設定
  tamago: {
    baseUrl: getEnv('TAMAGO_BASE_URL', 'https://example.tamago-repeat.jp/admin'),
    loginId: getEnv('TAMAGO_LOGIN_ID'),
    loginPassword: getEnv('TAMAGO_LOGIN_PASSWORD'),
  },

  // Playwright設定
  playwright: {
    headless: getEnvBoolean('PLAYWRIGHT_HEADLESS', true),
    browser: (getEnv('PLAYWRIGHT_BROWSER', 'chromium') as 'chromium' | 'firefox' | 'webkit'),
    timeout: getEnvNumber('PLAYWRIGHT_TIMEOUT', 30000),
  },

  // ジョブ設定
  job: {
    concurrency: getEnvNumber('QUEUE_CONCURRENCY', 10),
    maxAttempts: getEnvNumber('JOB_MAX_ATTEMPTS', 3),
    backoffDelay: getEnvNumber('JOB_BACKOFF_DELAY', 5000),
  },

  // ファイルパス
  paths: {
    artifacts: getEnv('ARTIFACTS_DIR', './artifacts'),
    storageState: getEnv('STORAGE_STATE_PATH', './storageState.json'),
  },
};

// ============================================
// 設定のバリデーション
// ============================================

/**
 * 必須設定が揃っているかチェックする
 */
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // スプレッドシートIDは必須
  if (!config.spreadsheetId) {
    errors.push('GOOGLE_SPREADSHEET_ID が設定されていません');
  }

  // たまごリピートのログイン情報（ワーカーでは必須）
  if (!config.tamago.loginId) {
    errors.push('TAMAGO_LOGIN_ID が設定されていません');
  }

  if (!config.tamago.loginPassword) {
    errors.push('TAMAGO_LOGIN_PASSWORD が設定されていません');
  }

  // Google認証情報
  if (!process.env.GOOGLE_CREDENTIALS_PATH && !process.env.GOOGLE_CREDENTIALS_JSON) {
    errors.push('Google認証情報（GOOGLE_CREDENTIALS_PATH または GOOGLE_CREDENTIALS_JSON）が設定されていません');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 設定をコンソールに出力する（デバッグ用）
 * パスワード等の機密情報はマスクされます
 */
export const printConfig = (): void => {
  console.log('📋 現在の設定:');
  console.log('  サーバー:');
  console.log(`    ポート: ${config.port}`);
  console.log('  Redis:');
  console.log(`    ホスト: ${config.redis.host}`);
  console.log(`    ポート: ${config.redis.port}`);
  console.log(`    パスワード: ${config.redis.password ? '********' : '(なし)'}`);
  console.log('  たまごリピート:');
  console.log(`    URL: ${config.tamago.baseUrl}`);
  console.log(`    ログインID: ${config.tamago.loginId ? '********' : '(未設定)'}`);
  console.log(`    パスワード: ${config.tamago.loginPassword ? '********' : '(未設定)'}`);
  console.log('  Playwright:');
  console.log(`    ヘッドレス: ${config.playwright.headless}`);
  console.log(`    ブラウザ: ${config.playwright.browser}`);
  console.log(`    タイムアウト: ${config.playwright.timeout}ms`);
  console.log('  ジョブ:');
  console.log(`    同時実行数: ${config.job.concurrency}`);
  console.log(`    最大リトライ: ${config.job.maxAttempts}`);
  console.log(`    バックオフ: ${config.job.backoffDelay}ms`);
  console.log('  パス:');
  console.log(`    スクリーンショット: ${config.paths.artifacts}`);
  console.log(`    ストレージ状態: ${config.paths.storageState}`);
};

// ============================================
// デフォルトエクスポート
// ============================================

export default config;
