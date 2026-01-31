/**
 * 注文ステータス確認シナリオ
 *
 * このシナリオでは、指定された顧客の注文ステータスを確認します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客を検索
 * 3. 注文一覧を取得
 * 4. ステータス情報を返す
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
  getBaseUrl,
} from './common';

// ============================================
// シナリオ関数
// ============================================

/**
 * 注文ステータス確認シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const checkOrderStatus = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, orderNo, updateProgress, saveScreenshot: saveScreenshotFn } = context;

  console.log(`📋 注文ステータス確認シナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);
  console.log(`   注文番号: ${orderNo || '(指定なし)'}`);

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
    await updateProgress(30, '顧客検索中', `顧客ID: ${customerId} を検索しています`);

    // 顧客詳細ページを開く
    await openCustomerDetail(page, customerId);

    await updateProgress(40, '顧客情報取得完了', '顧客ページを開きました');

    // ============================================
    // ステップ3: 注文一覧を取得（進捗 40-70%）
    // ============================================
    await updateProgress(50, '注文一覧取得中', '注文履歴を読み込んでいます');

    // 注文一覧タブをクリック（存在する場合）
    // TODO: 実画面に合わせてセレクタを調整
    const orderTabExists = await page.locator('#order-history-tab').isVisible().catch(() => false);

    if (orderTabExists) {
      await page.click('#order-history-tab');
      await page.waitForSelector('.order-list', { timeout: 10000 });
    }

    await updateProgress(60, '注文データ取得中', '注文情報を取得しています');

    // 注文データを取得
    // TODO: 実画面に合わせてセレクタを調整
    const orders = await extractOrderData(page, orderNo);

    await updateProgress(70, '注文データ取得完了', `${orders.length}件の注文を取得しました`);

    // ============================================
    // ステップ4: 結果をまとめる（進捗 70-100%）
    // ============================================
    await updateProgress(80, '結果整理中', 'データを整理しています');

    // 確認用にスクリーンショットを保存
    await takeScreenshot(page, jobId, 'order-status');

    await updateProgress(90, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customerId,
        orderNo,
        orders,
        checkedAt: new Date().toISOString(),
      },
      message: `注文ステータスを確認しました（${orders.length}件）`,
    };

    await updateProgress(100, '完了', '注文ステータス確認が完了しました');

    console.log('✅ 注文ステータス確認シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 注文ステータス確認シナリオでエラー:', errorMessage);

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
 * 注文データを抽出する
 *
 * @param page - Playwrightのページオブジェクト
 * @param orderNo - 特定の注文番号（指定時はその注文のみ）
 * @returns 注文データの配列
 */
const extractOrderData = async (
  page: Page,
  orderNo?: string
): Promise<Array<{
  orderNo: string;
  status: string;
  orderDate: string;
  totalAmount: string;
  items: string[];
}>> => {
  console.log('📊 注文データを抽出します');

  // TODO: 実画面に合わせてセレクタを調整
  // 注文行を取得
  const orderRows = await page.locator('.order-row').all();

  const orders: Array<{
    orderNo: string;
    status: string;
    orderDate: string;
    totalAmount: string;
    items: string[];
  }> = [];

  for (const row of orderRows) {
    // TODO: 実画面に合わせてセレクタを調整
    // 各セルからデータを取得
    const orderNumber = await row.locator('.order-number').textContent() || '';
    const status = await row.locator('.order-status').textContent() || '';
    const orderDate = await row.locator('.order-date').textContent() || '';
    const totalAmount = await row.locator('.order-total').textContent() || '';

    // 特定の注文番号が指定されている場合はフィルタ
    if (orderNo && !orderNumber.includes(orderNo)) {
      continue;
    }

    orders.push({
      orderNo: orderNumber.trim(),
      status: status.trim(),
      orderDate: orderDate.trim(),
      totalAmount: totalAmount.trim(),
      items: [], // TODO: 必要に応じて商品情報も取得
    });
  }

  console.log(`✅ ${orders.length}件の注文データを抽出しました`);
  return orders;
};
