/**
 * 次回配送スキップシナリオ
 *
 * このシナリオでは、定期購入の次回配送をスキップします。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客の定期購入情報を開く
 * 3. 次回配送をスキップ
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
  getBaseUrl,
} from './common';

// ============================================
// シナリオ関数
// ============================================

/**
 * 次回配送スキップシナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const skipNextDelivery = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`⏭️ 次回配送スキップシナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);

  // スキップ理由を取得（params から）
  const skipReason = (params?.skipReason as string) || 'お客様のご依頼によりスキップ';

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
      // TODO: 実画面に合わせてセレクタを調整
      await page.waitForSelector('.subscription-list, #subscription-content', { timeout: 10000 });
    }

    await updateProgress(45, '定期購入情報表示完了', '定期購入情報を表示しました');

    // スキップ前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-skip');

    // ============================================
    // ステップ4: 次回配送情報を確認（進捗 45-55%）
    // ============================================
    await updateProgress(50, '配送情報確認中', '次回配送情報を確認しています');

    // 次回配送日を取得
    // TODO: 実画面に合わせてセレクタを調整
    const nextDeliveryDate = await page.locator('.next-delivery-date, #next-delivery-date').textContent().catch(() => '');

    console.log(`📅 次回配送予定日: ${nextDeliveryDate}`);

    // 定期購入ステータスを確認
    // TODO: 実画面に合わせてセレクタを調整
    const subscriptionStatus = await page.locator('.subscription-status, #subscription-status').textContent().catch(() => '');

    // アクティブな定期購入があるか確認
    if (!subscriptionStatus || subscriptionStatus.includes('停止') || subscriptionStatus.includes('解約')) {
      console.log(`⚠️ アクティブな定期購入がありません: ${subscriptionStatus}`);
      return {
        success: false,
        data: {
          customerId,
          subscriptionStatus: subscriptionStatus?.trim() || '不明',
        },
        message: 'アクティブな定期購入がありません',
      };
    }

    await updateProgress(55, '配送情報確認完了', `次回配送: ${nextDeliveryDate}`);

    // ============================================
    // ステップ5: スキップ処理を実行（進捗 55-80%）
    // ============================================
    await updateProgress(60, 'スキップ処理開始', 'スキップボタンをクリックします');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // スキップボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    const skipButtonExists = await page.locator('#skip-delivery-button, .skip-next-delivery').isVisible().catch(() => false);

    if (!skipButtonExists) {
      console.log('⚠️ スキップボタンが見つかりません');
      return {
        success: false,
        message: 'スキップボタンが見つかりません。この配送はスキップできない可能性があります。',
      };
    }

    // スキップボタンをクリック
    await page.click('#skip-delivery-button, .skip-next-delivery');

    await updateProgress(65, 'スキップ確認中', 'スキップの確認を行っています');

    // スキップ理由入力フォームが表示される場合
    // TODO: 実画面に合わせてセレクタを調整
    const reasonFormVisible = await page.locator('#skip-reason-form, .skip-reason-input').isVisible().catch(() => false);

    if (reasonFormVisible) {
      console.log('📝 スキップ理由を入力します');

      // スキップ理由を入力
      // TODO: 実画面に合わせてセレクタを調整
      await page.fill('#skip-reason-input, .skip-reason-textarea', skipReason);

      // 確定ボタンをクリック
      // TODO: 実画面に合わせてセレクタを調整
      await page.click('#confirm-skip-button, .confirm-skip');
    }

    await updateProgress(75, 'スキップ実行中', 'サーバー処理を待機しています');

    // 処理完了を待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.skip-success-message, .delivery-skipped', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ スキップ完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(80, 'スキップ完了', 'スキップ処理が完了しました');

    // ============================================
    // ステップ6: 結果を確認（進捗 80-100%）
    // ============================================
    await updateProgress(85, '結果確認中', 'スキップ後の情報を確認しています');

    // 新しい次回配送日を取得
    // TODO: 実画面に合わせてセレクタを調整
    const newNextDeliveryDate = await page.locator('.next-delivery-date, #next-delivery-date').textContent().catch(() => '');

    console.log(`📅 スキップ後の次回配送予定日: ${newNextDeliveryDate}`);

    // スキップ後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-skip');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customerId,
        previousDeliveryDate: nextDeliveryDate?.trim() || '',
        newDeliveryDate: newNextDeliveryDate?.trim() || '',
        skipReason,
        skippedAt: new Date().toISOString(),
      },
      message: `次回配送をスキップしました（${nextDeliveryDate?.trim()} → ${newNextDeliveryDate?.trim()}）`,
    };

    await updateProgress(100, '完了', '次回配送スキップが完了しました');

    console.log('✅ 次回配送スキップシナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 次回配送スキップシナリオでエラー:', errorMessage);

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
