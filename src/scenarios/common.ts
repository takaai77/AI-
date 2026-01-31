/**
 * シナリオ共通処理モジュール
 *
 * このファイルでは、複数のシナリオで使用する共通処理を定義します。
 * - ログイン処理
 * - 顧客検索
 * - 注文検索
 * など
 *
 * 【なぜ共通化するのか？】
 * - 同じコードを何度も書かなくて済む
 * - 変更があった場合に1箇所修正すればOK
 * - テストがしやすい
 */

// dotenvで環境変数を読み込み
import dotenv from 'dotenv';
dotenv.config();

// Playwrightをインポート
import { Page } from 'playwright';

// Node.jsファイルシステムAPI
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 設定値の取得
// ============================================

/**
 * たまごリピートのベースURLを取得
 */
export const getBaseUrl = (): string => {
  return process.env.TAMAGO_BASE_URL || 'https://example.tamago-repeat.jp/admin';
};

/**
 * ログイン情報を取得
 */
export const getLoginCredentials = (): { loginId: string; password: string } => {
  return {
    loginId: process.env.TAMAGO_LOGIN_ID || '',
    password: process.env.TAMAGO_LOGIN_PASSWORD || '',
  };
};

/**
 * ストレージ状態ファイルのパスを取得
 */
export const getStorageStatePath = (): string => {
  return process.env.STORAGE_STATE_PATH || './storageState.json';
};

// ============================================
// ログイン処理
// ============================================

/**
 * たまごリピートにログインする
 *
 * ストレージ状態が保存されていれば、それを使ってセッションを復元します
 * なければ新規ログインを行います
 *
 * @param page - Playwrightのページオブジェクト
 * @param forceLogin - 強制的に新規ログインするかどうか
 */
export const login = async (page: Page, forceLogin: boolean = false): Promise<void> => {
  console.log('🔐 ログイン処理を開始します');

  // ベースURLを取得
  const baseUrl = getBaseUrl();

  // ストレージ状態ファイルのパスを取得
  const storageStatePath = getStorageStatePath();

  // ストレージ状態が存在し、強制ログインでなければセッション復元を試みる
  if (!forceLogin && fs.existsSync(storageStatePath)) {
    console.log('📂 保存されたセッションを読み込みます');

    try {
      // ストレージ状態を読み込む
      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));

      // Cookieをセット
      await page.context().addCookies(storageState.cookies || []);

      // ダッシュボードページにアクセス
      // TODO: 実画面に合わせてURLを調整
      await page.goto(`${baseUrl}/dashboard`);

      // ログイン状態を確認（ログインフォームが表示されていなければOK）
      // TODO: 実画面に合わせてセレクタを調整
      const isLoggedIn = await page.locator('#logout-button').isVisible().catch(() => false);

      if (isLoggedIn) {
        console.log('✅ セッション復元成功、ログイン済みです');
        return;
      }

      console.log('⚠️ セッションが無効です、再ログインします');
    } catch (error) {
      console.log('⚠️ セッション読み込みエラー、新規ログインします');
    }
  }

  // 新規ログイン処理
  await performLogin(page);
};

/**
 * 実際のログイン処理を行う
 *
 * @param page - Playwrightのページオブジェクト
 */
const performLogin = async (page: Page): Promise<void> => {
  console.log('🔑 新規ログインを実行します');

  // ベースURLとログイン情報を取得
  const baseUrl = getBaseUrl();
  const { loginId, password } = getLoginCredentials();

  // ログイン情報が設定されているか確認
  if (!loginId || !password) {
    throw new Error('ログイン情報が設定されていません（TAMAGO_LOGIN_ID, TAMAGO_LOGIN_PASSWORD）');
  }

  // ログインページにアクセス
  // TODO: 実画面に合わせてURLを調整
  await page.goto(`${baseUrl}/login`);

  // ページの読み込みを待機
  await page.waitForLoadState('networkidle');

  // ログインフォームに入力
  // TODO: 実画面に合わせてセレクタを調整
  // ログインIDを入力
  await page.fill('#login-id', loginId);

  // パスワードを入力
  await page.fill('#password', password);

  // ログインボタンをクリック
  // TODO: 実画面に合わせてセレクタを調整
  await page.click('#login-button');

  // ログイン完了を待機（ダッシュボードへの遷移を確認）
  // TODO: 実画面に合わせてセレクタを調整
  await page.waitForSelector('#dashboard-content', { timeout: 10000 });

  console.log('✅ ログイン成功');

  // セッション状態を保存
  await saveStorageState(page);
};

/**
 * ストレージ状態を保存する
 *
 * @param page - Playwrightのページオブジェクト
 */
export const saveStorageState = async (page: Page): Promise<void> => {
  const storageStatePath = getStorageStatePath();

  console.log(`💾 セッション状態を保存します: ${storageStatePath}`);

  // ストレージ状態を取得して保存
  const storageState = await page.context().storageState();
  fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));

  console.log('✅ セッション状態を保存しました');
};

// ============================================
// 顧客検索
// ============================================

/**
 * 顧客IDで顧客を検索する
 *
 * @param page - Playwrightのページオブジェクト
 * @param customerId - 顧客ID
 */
export const searchCustomer = async (page: Page, customerId: string): Promise<void> => {
  console.log(`🔍 顧客を検索します: ${customerId}`);

  const baseUrl = getBaseUrl();

  // 顧客検索ページにアクセス
  // TODO: 実画面に合わせてURLを調整
  await page.goto(`${baseUrl}/customers`);

  // ページの読み込みを待機
  await page.waitForLoadState('networkidle');

  // 検索フォームに顧客IDを入力
  // TODO: 実画面に合わせてセレクタを調整
  await page.fill('#customer-search-input', customerId);

  // 検索ボタンをクリック
  // TODO: 実画面に合わせてセレクタを調整
  await page.click('#customer-search-button');

  // 検索結果の表示を待機
  // TODO: 実画面に合わせてセレクタを調整
  await page.waitForSelector('.customer-search-results', { timeout: 10000 });

  console.log('✅ 顧客検索完了');
};

/**
 * 顧客詳細ページを開く
 *
 * @param page - Playwrightのページオブジェクト
 * @param customerId - 顧客ID
 */
export const openCustomerDetail = async (page: Page, customerId: string): Promise<void> => {
  console.log(`📄 顧客詳細ページを開きます: ${customerId}`);

  const baseUrl = getBaseUrl();

  // 顧客詳細ページに直接アクセス
  // TODO: 実画面に合わせてURLを調整
  await page.goto(`${baseUrl}/customers/${customerId}`);

  // ページの読み込みを待機
  await page.waitForLoadState('networkidle');

  // 顧客情報の表示を確認
  // TODO: 実画面に合わせてセレクタを調整
  await page.waitForSelector('.customer-detail', { timeout: 10000 });

  console.log('✅ 顧客詳細ページを開きました');
};

// ============================================
// 注文検索
// ============================================

/**
 * 注文番号で注文を検索する
 *
 * @param page - Playwrightのページオブジェクト
 * @param orderNo - 注文番号
 */
export const searchOrder = async (page: Page, orderNo: string): Promise<void> => {
  console.log(`🔍 注文を検索します: ${orderNo}`);

  const baseUrl = getBaseUrl();

  // 注文検索ページにアクセス
  // TODO: 実画面に合わせてURLを調整
  await page.goto(`${baseUrl}/orders`);

  // ページの読み込みを待機
  await page.waitForLoadState('networkidle');

  // 検索フォームに注文番号を入力
  // TODO: 実画面に合わせてセレクタを調整
  await page.fill('#order-search-input', orderNo);

  // 検索ボタンをクリック
  // TODO: 実画面に合わせてセレクタを調整
  await page.click('#order-search-button');

  // 検索結果の表示を待機
  // TODO: 実画面に合わせてセレクタを調整
  await page.waitForSelector('.order-search-results', { timeout: 10000 });

  console.log('✅ 注文検索完了');
};

/**
 * 注文詳細ページを開く
 *
 * @param page - Playwrightのページオブジェクト
 * @param orderNo - 注文番号
 */
export const openOrderDetail = async (page: Page, orderNo: string): Promise<void> => {
  console.log(`📄 注文詳細ページを開きます: ${orderNo}`);

  const baseUrl = getBaseUrl();

  // 注文詳細ページに直接アクセス
  // TODO: 実画面に合わせてURLを調整
  await page.goto(`${baseUrl}/orders/${orderNo}`);

  // ページの読み込みを待機
  await page.waitForLoadState('networkidle');

  // 注文情報の表示を確認
  // TODO: 実画面に合わせてセレクタを調整
  await page.waitForSelector('.order-detail', { timeout: 10000 });

  console.log('✅ 注文詳細ページを開きました');
};

// ============================================
// スクリーンショット
// ============================================

/**
 * スクリーンショットを保存する
 *
 * @param page - Playwrightのページオブジェクト
 * @param jobId - ジョブID
 * @param suffix - ファイル名のサフィックス（任意）
 * @returns 保存したファイルのパス
 */
export const takeScreenshot = async (
  page: Page,
  jobId: string,
  suffix?: string
): Promise<string> => {
  // 保存先ディレクトリを取得
  const artifactsDir = process.env.ARTIFACTS_DIR || './artifacts';

  // ディレクトリが存在しなければ作成
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // ファイル名を生成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = suffix
    ? `${jobId}_${suffix}_${timestamp}.png`
    : `${jobId}_${timestamp}.png`;

  // フルパスを生成
  const filePath = path.join(artifactsDir, fileName);

  // スクリーンショットを撮影
  await page.screenshot({
    path: filePath,
    fullPage: true, // ページ全体をキャプチャ
  });

  console.log(`📸 スクリーンショットを保存しました: ${filePath}`);

  return filePath;
};

// ============================================
// ユーティリティ
// ============================================

/**
 * 指定時間待機する
 *
 * @param ms - 待機時間（ミリ秒）
 */
export const wait = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * 要素が表示されるまで待機する
 *
 * @param page - Playwrightのページオブジェクト
 * @param selector - セレクタ
 * @param timeout - タイムアウト（ミリ秒）
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> => {
  await page.waitForSelector(selector, { timeout });
};

/**
 * 要素のテキストを取得する
 *
 * @param page - Playwrightのページオブジェクト
 * @param selector - セレクタ
 * @returns テキスト
 */
export const getElementText = async (page: Page, selector: string): Promise<string> => {
  const element = page.locator(selector);
  return await element.textContent() || '';
};

/**
 * 確認ダイアログを処理する
 *
 * @param page - Playwrightのページオブジェクト
 * @param accept - OKを押すかどうか
 */
export const handleConfirmDialog = async (page: Page, accept: boolean = true): Promise<void> => {
  page.on('dialog', async (dialog) => {
    console.log(`💬 ダイアログ: ${dialog.message()}`);
    if (accept) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
};
