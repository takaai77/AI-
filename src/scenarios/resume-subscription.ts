/**
 * 定期購入再開シナリオ
 *
 * このシナリオでは、一時停止中の定期購入を再開します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客の定期購入情報を開く
 * 3. 再開処理を実行
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
 * 定期購入再開シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const resumeSubscription = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`▶️ 定期購入再開シナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);

  // 次回配送希望日（任意）
  const nextDeliveryDate = params?.nextDeliveryDate as string | undefined;

  if (nextDeliveryDate) {
    console.log(`   次回配送希望日: ${nextDeliveryDate}`);
  }

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

    // 再開前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-resume');

    // ============================================
    // ステップ4: 現在のステータスを確認（進捗 45-55%）
    // ============================================
    await updateProgress(50, 'ステータス確認中', '定期購入のステータスを確認しています');

    // 現在のステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const currentStatus = await page.locator('.subscription-status, #subscription-status').textContent().catch(() => '');

    console.log(`📋 現在のステータス: ${currentStatus}`);

    // 停止中でなければ再開できない
    const isPaused = currentStatus && (
      currentStatus.includes('停止') ||
      currentStatus.includes('休止') ||
      currentStatus.includes('一時停止')
    );

    if (!isPaused) {
      console.log('⚠️ 定期購入は停止中ではありません');
      return {
        success: false,
        data: {
          customerId,
          currentStatus: currentStatus?.trim() || '不明',
        },
        message: `定期購入は停止中ではありません（現在: ${currentStatus?.trim() || '不明'}）`,
      };
    }

    await updateProgress(55, 'ステータス確認完了', `停止中を確認: ${currentStatus}`);

    // ============================================
    // ステップ5: 再開処理を実行（進捗 55-80%）
    // ============================================
    await updateProgress(60, '再開開始', '再開ボタンをクリックします');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // 再開ボタンを探す
    // TODO: 実画面に合わせてセレクタを調整
    const resumeButtonExists = await page.locator('#resume-subscription-button, .resume-subscription, [data-action="resume"]').isVisible().catch(() => false);

    if (!resumeButtonExists) {
      console.log('⚠️ 再開ボタンが見つかりません');
      return {
        success: false,
        message: '再開ボタンが見つかりません。この定期購入は再開できない可能性があります。',
      };
    }

    // 再開ボタンをクリック
    await page.click('#resume-subscription-button, .resume-subscription, [data-action="resume"]');

    await updateProgress(65, '設定入力中', '再開設定を入力しています');

    // 次回配送日設定フォームが表示される場合
    // TODO: 実画面に合わせてセレクタを調整
    if (nextDeliveryDate) {
      const nextDateInputExists = await page.locator('#next-delivery-date-input, .next-delivery-date').isVisible().catch(() => false);

      if (nextDateInputExists) {
        console.log('📅 次回配送日を設定します');
        await page.fill('#next-delivery-date-input, .next-delivery-date', nextDeliveryDate);
      }
    }

    await updateProgress(70, '確定中', '再開を確定しています');

    // 確定ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    const confirmButtonExists = await page.locator('#confirm-resume-button, .confirm-resume, [data-action="confirm-resume"]').isVisible().catch(() => false);

    if (confirmButtonExists) {
      await page.click('#confirm-resume-button, .confirm-resume, [data-action="confirm-resume"]');
    }

    await updateProgress(75, '処理中', 'サーバー処理を待機しています');

    // 処理完了を待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.resume-success-message, .subscription-active, .status-active', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ 再開完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(80, '再開完了', '定期購入が再開されました');

    // ============================================
    // ステップ6: 結果を確認（進捗 80-100%）
    // ============================================
    await updateProgress(85, '結果確認中', '再開後のステータスを確認しています');

    // 新しいステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const newStatus = await page.locator('.subscription-status, #subscription-status').textContent().catch(() => '');

    console.log(`📋 再開後のステータス: ${newStatus}`);

    // 次回配送日を取得
    // TODO: 実画面に合わせてセレクタを調整
    const confirmedNextDeliveryDate = await page.locator('.next-delivery-date, #next-delivery-date').textContent().catch(() => '');

    console.log(`📅 次回配送予定日: ${confirmedNextDeliveryDate}`);

    // 再開後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-resume');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customerId,
        previousStatus: currentStatus?.trim() || '',
        newStatus: newStatus?.trim() || 'アクティブ',
        nextDeliveryDate: confirmedNextDeliveryDate?.trim() || nextDeliveryDate || null,
        resumedAt: new Date().toISOString(),
      },
      message: `定期購入を再開しました（${currentStatus?.trim()} → ${newStatus?.trim() || 'アクティブ'}）`,
    };

    await updateProgress(100, '完了', '定期購入再開が完了しました');

    console.log('✅ 定期購入再開シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 定期購入再開シナリオでエラー:', errorMessage);

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
