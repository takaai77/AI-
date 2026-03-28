/**
 * 顧客情報取得シナリオ
 *
 * このシナリオでは、指定された顧客の詳細情報を取得します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客詳細ページを開く
 * 3. 顧客情報を抽出
 * 4. 結果を返す
 */

// Playwrightのページ型をインポート
import { Page } from 'playwright';

// 型定義をインポート
import { JobResult, ScenarioContext } from '../types';

// 共通処理をインポート
import {
  login,
  openCustomerDetail,
  takeScreenshot,
  getElementText,
} from './common';

// ============================================
// 顧客情報の型定義
// ============================================

/**
 * 顧客情報の型
 */
interface CustomerInfo {
  // 顧客ID
  customerId: string;
  // 顧客名
  name: string;
  // メールアドレス
  email: string;
  // 電話番号
  phone: string;
  // 郵便番号
  postalCode: string;
  // 住所
  address: string;
  // 登録日
  registeredAt: string;
  // 累計購入金額
  totalPurchaseAmount: string;
  // 購入回数
  purchaseCount: string;
  // 定期購入状況
  subscriptionStatus: string;
  // メモ
  memo: string;
}

// ============================================
// シナリオ関数
// ============================================

/**
 * 顧客情報取得シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const getCustomerInfo = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, updateProgress, saveScreenshot: saveScreenshotFn } = context;

  console.log(`👤 顧客情報取得シナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);

  try {
    // ============================================
    // ステップ1: ログイン（進捗 0-20%）
    // ============================================
    await updateProgress(10, 'ログイン中', 'たまごリピートにログインしています');

    // ログイン処理を実行
    await login(page);

    await updateProgress(20, 'ログイン完了', 'ログインに成功しました');

    // ============================================
    // ステップ2: 顧客詳細ページを開く（進捗 20-40%）
    // ============================================
    await updateProgress(30, '顧客ページへ移動中', `顧客ID: ${customerId} のページを開いています`);

    // 顧客詳細ページを開く
    await openCustomerDetail(page, customerId);

    await updateProgress(40, '顧客ページ表示完了', '顧客詳細ページを開きました');

    // ============================================
    // ステップ3: 顧客情報を抽出（進捗 40-80%）
    // ============================================
    await updateProgress(50, '情報抽出中', '顧客情報を読み取っています');

    // 顧客情報を抽出
    const customerInfo = await extractCustomerInfo(page, customerId);

    await updateProgress(70, '情報抽出完了', '顧客情報を取得しました');

    // 確認用にスクリーンショットを保存
    await takeScreenshot(page, jobId, 'customer-info');

    await updateProgress(80, 'スクリーンショット保存完了', '画面キャプチャを保存しました');

    // ============================================
    // ステップ4: 結果をまとめる（進捗 80-100%）
    // ============================================
    await updateProgress(90, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customer: customerInfo,
        retrievedAt: new Date().toISOString(),
      },
      message: `顧客情報を取得しました: ${customerInfo.name}`,
    };

    await updateProgress(100, '完了', '顧客情報取得が完了しました');

    console.log('✅ 顧客情報取得シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 顧客情報取得シナリオでエラー:', errorMessage);

    // エラー時のスクリーンショットを保存
    try {
      await saveScreenshotFn(page, 'error');
    } catch (screenshotError) {
      console.error('スクリーンショット保存エラー:', screenshotError);
    }

    return {
      success: false,
      message: `エラーが発生しました: ${errorMessage}`,
    };
  }
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * 顧客情報を抽出する
 *
 * @param page - Playwrightのページオブジェクト
 * @param customerId - 顧客ID
 * @returns 顧客情報
 */
const extractCustomerInfo = async (
  page: Page,
  customerId: string
): Promise<CustomerInfo> => {
  console.log('📊 顧客情報を抽出します');

  // TODO: 実画面に合わせてセレクタを調整
  // 各フィールドから情報を取得

  // 顧客名
  // TODO: 実画面に合わせてセレクタを調整
  const name = await getTextSafe(page, '.customer-name, #customer-name');

  // メールアドレス
  // TODO: 実画面に合わせてセレクタを調整
  const email = await getTextSafe(page, '.customer-email, #customer-email');

  // 電話番号
  // TODO: 実画面に合わせてセレクタを調整
  const phone = await getTextSafe(page, '.customer-phone, #customer-phone');

  // 郵便番号
  // TODO: 実画面に合わせてセレクタを調整
  const postalCode = await getTextSafe(page, '.customer-postal-code, #postal-code');

  // 住所
  // TODO: 実画面に合わせてセレクタを調整
  const address = await getTextSafe(page, '.customer-address, #customer-address');

  // 登録日
  // TODO: 実画面に合わせてセレクタを調整
  const registeredAt = await getTextSafe(page, '.customer-registered-at, #registered-at');

  // 累計購入金額
  // TODO: 実画面に合わせてセレクタを調整
  const totalPurchaseAmount = await getTextSafe(page, '.total-purchase-amount, #total-amount');

  // 購入回数
  // TODO: 実画面に合わせてセレクタを調整
  const purchaseCount = await getTextSafe(page, '.purchase-count, #purchase-count');

  // 定期購入状況
  // TODO: 実画面に合わせてセレクタを調整
  const subscriptionStatus = await getTextSafe(page, '.subscription-status, #subscription-status');

  // メモ
  // TODO: 実画面に合わせてセレクタを調整
  const memo = await getTextSafe(page, '.customer-memo, #customer-memo');

  const customerInfo: CustomerInfo = {
    customerId,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    postalCode: postalCode.trim(),
    address: address.trim(),
    registeredAt: registeredAt.trim(),
    totalPurchaseAmount: totalPurchaseAmount.trim(),
    purchaseCount: purchaseCount.trim(),
    subscriptionStatus: subscriptionStatus.trim(),
    memo: memo.trim(),
  };

  console.log('✅ 顧客情報の抽出完了');
  console.log(`   名前: ${customerInfo.name}`);
  console.log(`   メール: ${customerInfo.email}`);

  return customerInfo;
};

/**
 * 要素のテキストを安全に取得する
 * 要素が見つからない場合は空文字を返す
 *
 * @param page - Playwrightのページオブジェクト
 * @param selector - セレクタ
 * @returns テキスト
 */
const getTextSafe = async (page: Page, selector: string): Promise<string> => {
  try {
    // 複数のセレクタをカンマ区切りで受け取れるようにする
    const selectors = selector.split(',').map((s) => s.trim());

    for (const sel of selectors) {
      const element = page.locator(sel).first();
      const isVisible = await element.isVisible().catch(() => false);

      if (isVisible) {
        const text = await element.textContent();
        if (text) {
          return text;
        }
      }
    }

    return '';
  } catch {
    return '';
  }
};
