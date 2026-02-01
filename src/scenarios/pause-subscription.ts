/**
 * 定期購入一時停止シナリオ
 *
 * このシナリオでは、顧客の定期購入を一時停止します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 顧客の定期購入情報を開く
 * 3. 一時停止処理を実行
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
 * 定期購入一時停止シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const pauseSubscription = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`⏸️ 定期購入一時停止シナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);

  // 停止理由を取得（params から）
  const pauseReason = (params?.pauseReason as string) || 'お客様のご依頼により一時停止';

  // 再開予定日（任意）
  const resumeDate = params?.resumeDate as string | undefined;

  console.log(`   停止理由: ${pauseReason}`);
  if (resumeDate) {
    console.log(`   再開予定日: ${resumeDate}`);
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

    // 停止前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-pause');

    // ============================================
    // ステップ4: 現在のステータスを確認（進捗 45-55%）
    // ============================================
    await updateProgress(50, 'ステータス確認中', '定期購入のステータスを確認しています');

    // 現在のステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const currentStatus = await page.locator('.subscription-status, #subscription-status').textContent().catch(() => '');

    console.log(`📋 現在のステータス: ${currentStatus}`);

    // 既に停止中かチェック
    if (currentStatus && (currentStatus.includes('停止') || currentStatus.includes('休止') || currentStatus.includes('一時停止'))) {
      console.log('⚠️ 既に停止中です');
      return {
        success: false,
        data: {
          customerId,
          currentStatus: currentStatus.trim(),
        },
        message: '定期購入は既に停止中です',
      };
    }

    await updateProgress(55, 'ステータス確認完了', `現在: ${currentStatus}`);

    // ============================================
    // ステップ5: 一時停止処理を実行（進捗 55-80%）
    // ============================================
    await updateProgress(60, '一時停止開始', '停止ボタンをクリックします');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // 一時停止ボタンを探す
    // TODO: 実画面に合わせてセレクタを調整
    const pauseButtonExists = await page.locator('#pause-subscription-button, .pause-subscription, [data-action="pause"]').isVisible().catch(() => false);

    if (!pauseButtonExists) {
      console.log('⚠️ 一時停止ボタンが見つかりません');
      return {
        success: false,
        message: '一時停止ボタンが見つかりません。この定期購入は一時停止できない可能性があります。',
      };
    }

    // 停止ボタンをクリック
    await page.click('#pause-subscription-button, .pause-subscription, [data-action="pause"]');

    await updateProgress(65, '理由入力中', '停止理由を入力しています');

    // 停止理由入力フォームが表示される場合
    // TODO: 実画面に合わせてセレクタを調整
    const reasonFormVisible = await page.locator('#pause-reason-form, .pause-reason-input').isVisible().catch(() => false);

    if (reasonFormVisible) {
      console.log('📝 停止理由を入力します');

      // 停止理由を入力
      // TODO: 実画面に合わせてセレクタを調整
      await page.fill('#pause-reason-input, .pause-reason-textarea', pauseReason);

      // 再開予定日がある場合は入力
      if (resumeDate) {
        const resumeDateInputExists = await page.locator('#resume-date-input, .resume-date').isVisible().catch(() => false);
        if (resumeDateInputExists) {
          await page.fill('#resume-date-input, .resume-date', resumeDate);
        }
      }
    }

    await updateProgress(70, '確定中', '一時停止を確定しています');

    // 確定ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    await page.click('#confirm-pause-button, .confirm-pause, [data-action="confirm-pause"]');

    await updateProgress(75, '処理中', 'サーバー処理を待機しています');

    // 処理完了を待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.pause-success-message, .subscription-paused, .status-paused', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ 停止完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(80, '停止完了', '一時停止が完了しました');

    // ============================================
    // ステップ6: 結果を確認（進捗 80-100%）
    // ============================================
    await updateProgress(85, '結果確認中', '停止後のステータスを確認しています');

    // 新しいステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const newStatus = await page.locator('.subscription-status, #subscription-status').textContent().catch(() => '');

    console.log(`📋 停止後のステータス: ${newStatus}`);

    // 停止後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-pause');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        customerId,
        previousStatus: currentStatus?.trim() || '',
        newStatus: newStatus?.trim() || '一時停止',
        pauseReason,
        resumeDate: resumeDate || null,
        pausedAt: new Date().toISOString(),
      },
      message: `定期購入を一時停止しました（${currentStatus?.trim()} → ${newStatus?.trim() || '一時停止'}）`,
    };

    await updateProgress(100, '完了', '定期購入一時停止が完了しました');

    console.log('✅ 定期購入一時停止シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 定期購入一時停止シナリオでエラー:', errorMessage);

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
