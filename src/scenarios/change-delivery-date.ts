/**
 * 配送日変更シナリオ
 *
 * このシナリオでは、定期購入の次回配送日を変更します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客の定期購入情報を開く
 * 3. 配送日を変更
 * 4. 結果を確認
 *
 * 【注意】
 * このシナリオは実際にデータを変更します。
 * テスト時は必ずテスト環境で実行してください。
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
  handleConfirmDialog,
  wait,
} from './common';

// ============================================
// シナリオ関数
// ============================================

/**
 * 配送日変更シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const changeDeliveryDate = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`📅 配送日変更シナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);

  // 新しい配送日を取得（params から）
  const newDeliveryDate = params?.newDeliveryDate as string;

  // 配送日は必須パラメータ
  if (!newDeliveryDate) {
    return {
      success: false,
      message: '新しい配送日が指定されていません（params.newDeliveryDate）',
    };
  }

  // 日付形式のバリデーション（YYYY-MM-DD形式を想定）
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(newDeliveryDate)) {
    return {
      success: false,
      message: '配送日の形式が正しくありません（YYYY-MM-DD形式で指定してください）',
    };
  }

  console.log(`   新しい配送日: ${newDeliveryDate}`);

  try {
    // ============================================
    // ステップ1: ログイン（進捗 0-15%）
    // ============================================
    await updateProgress(5, 'ログイン中', 'たまごリピートにログインしています');

    // ログイン処理を実行
    await login(page);

    await updateProgress(15, 'ログイン完了', 'ログインに成功しました');

    // ============================================
    // ステップ2: 顧客詳細ページを開く（進捗 15-30%）
    // ============================================
    await updateProgress(20, '顧客ページへ移動中', `顧客ID: ${customerId} のページを開いています`);

    // 顧客詳細ページを開く
    await openCustomerDetail(page, customerId);

    await updateProgress(30, '顧客ページ表示完了', '顧客詳細ページを開きました');

    // ============================================
    // ステップ3: 定期購入タブを開く（進捗 30-45%）
    // ============================================
    await updateProgress(35, '定期購入情報へ移動中', '定期購入タブを開いています');

    // 定期購入タブをクリック
    // TODO: 実画面に合わせてセレクタを調整
    const subscriptionTabExists = await page.locator('#subscription-tab, .subscription-tab').isVisible().catch(() => false);

    if (subscriptionTabExists) {
      await page.click('#subscription-tab, .subscription-tab');
      await page.waitForSelector('.subscription-list, #subscription-content', { timeout: 10000 });
    }

    await updateProgress(45, '定期購入情報表示完了', '定期購入情報を表示しました');

    // 変更前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-change-date');

    // ============================================
    // ステップ4: 現在の配送日を確認（進捗 45-55%）
    // ============================================
    await updateProgress(50, '配送情報確認中', '現在の配送日を確認しています');

    // 現在の配送日を取得
    // TODO: 実画面に合わせてセレクタを調整
    const currentDeliveryDate = await page.locator('.next-delivery-date, #next-delivery-date').textContent().catch(() => '');

    console.log(`📅 現在の配送予定日: ${currentDeliveryDate}`);

    await updateProgress(55, '配送日確認完了', `現在の配送日: ${currentDeliveryDate}`);

    // ============================================
    // ステップ5: 配送日変更処理を実行（進捗 55-80%）
    // ============================================
    await updateProgress(60, '配送日変更開始', '変更ボタンをクリックします');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // 配送日変更ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    const changeDateButtonExists = await page.locator('#change-delivery-date-button, .change-date-btn').isVisible().catch(() => false);

    if (!changeDateButtonExists) {
      console.log('⚠️ 配送日変更ボタンが見つかりません');
      return {
        success: false,
        message: '配送日変更ボタンが見つかりません。この顧客の配送日は変更できない可能性があります。',
      };
    }

    // 変更ボタンをクリック
    await page.click('#change-delivery-date-button, .change-date-btn');

    await updateProgress(65, '日付選択中', '新しい配送日を入力しています');

    // 日付入力フォームが表示されるのを待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('#new-delivery-date-input, .delivery-date-picker', { timeout: 10000 });

    // 新しい配送日を入力
    // TODO: 実画面に合わせてセレクタを調整
    // 日付入力欄をクリア
    await page.fill('#new-delivery-date-input, .delivery-date-picker', '');

    // 新しい日付を入力
    await page.fill('#new-delivery-date-input, .delivery-date-picker', newDeliveryDate);

    await updateProgress(70, '変更確定中', '変更を確定しています');

    // 確定ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    await page.click('#confirm-date-change-button, .confirm-change');

    await updateProgress(75, '処理中', 'サーバー処理を待機しています');

    // 処理完了を待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.change-success-message, .date-changed', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ 変更完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(80, '変更完了', '配送日変更が完了しました');

    // ============================================
    // ステップ6: 結果を確認（進捗 80-100%）
    // ============================================
    await updateProgress(85, '結果確認中', '変更後の配送日を確認しています');

    // 新しい配送日を取得
    // TODO: 実画面に合わせてセレクタを調整
    const updatedDeliveryDate = await page.locator('.next-delivery-date, #next-delivery-date').textContent().catch(() => '');

    console.log(`📅 変更後の配送予定日: ${updatedDeliveryDate}`);

    // 変更後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-change-date');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customerId,
        previousDeliveryDate: currentDeliveryDate?.trim() || '',
        newDeliveryDate: updatedDeliveryDate?.trim() || newDeliveryDate,
        requestedDate: newDeliveryDate,
        changedAt: new Date().toISOString(),
      },
      message: `配送日を変更しました（${currentDeliveryDate?.trim()} → ${updatedDeliveryDate?.trim() || newDeliveryDate}）`,
    };

    await updateProgress(100, '完了', '配送日変更が完了しました');

    console.log('✅ 配送日変更シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 配送日変更シナリオでエラー:', errorMessage);

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
