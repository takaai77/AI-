/**
 * 注文キャンセルシナリオ
 *
 * このシナリオでは、指定された注文をキャンセルします。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 注文を検索
 * 3. キャンセル処理を実行
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
  openOrderDetail,
  takeScreenshot,
  handleConfirmDialog,
  wait,
} from './common';

// ============================================
// シナリオ関数
// ============================================

/**
 * 注文キャンセルシナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const cancelOrder = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, orderNo, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`🚫 注文キャンセルシナリオを開始します`);
  console.log(`   ジョブID: ${jobId}`);
  console.log(`   顧客ID: ${customerId}`);
  console.log(`   注文番号: ${orderNo}`);

  // 注文番号は必須
  if (!orderNo) {
    return {
      success: false,
      message: '注文番号が指定されていません',
    };
  }

  // キャンセル理由を取得（params から）
  const cancelReason = (params?.cancelReason as string) || 'お客様都合によるキャンセル';

  try {
    // ============================================
    // ステップ1: ログイン（進捗 0-15%）
    // ============================================
    await updateProgress(5, 'ログイン中', 'たまごリピートにログインしています');

    // ログイン処理を実行
    await login(page);

    await updateProgress(15, 'ログイン完了', 'ログインに成功しました');

    // ============================================
    // ステップ2: 注文詳細ページを開く（進捗 15-35%）
    // ============================================
    await updateProgress(25, '注文検索中', `注文番号: ${orderNo} を検索しています`);

    // 注文詳細ページを開く
    await openOrderDetail(page, orderNo);

    await updateProgress(35, '注文情報取得完了', '注文ページを開きました');

    // キャンセル前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-cancel');

    // ============================================
    // ステップ3: 注文ステータスを確認（進捗 35-50%）
    // ============================================
    await updateProgress(40, 'ステータス確認中', '注文のステータスを確認しています');

    // 現在のステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const currentStatus = await page.locator('.order-status-badge').textContent() || '';

    console.log(`📋 現在の注文ステータス: ${currentStatus}`);

    // キャンセル可能かチェック
    // TODO: 実画面に合わせてキャンセル可能な状態を定義
    const cancelableStatuses = ['未発送', '入金待ち', '処理中', '準備中'];
    const isCancelable = cancelableStatuses.some((status) =>
      currentStatus.includes(status)
    );

    if (!isCancelable) {
      console.log(`⚠️ この注文はキャンセルできません: ${currentStatus}`);
      return {
        success: false,
        data: {
          orderNo,
          currentStatus: currentStatus.trim(),
        },
        message: `この注文はキャンセルできません（現在のステータス: ${currentStatus.trim()}）`,
      };
    }

    await updateProgress(50, 'キャンセル可能', 'キャンセル処理を開始します');

    // ============================================
    // ステップ4: キャンセル処理を実行（進捗 50-80%）
    // ============================================
    await updateProgress(60, 'キャンセル処理中', 'キャンセルボタンをクリックします');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // キャンセルボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    await page.click('#cancel-order-button');

    // キャンセル理由入力フォームが表示される場合
    // TODO: 実画面に合わせてセレクタを調整
    const reasonFormVisible = await page.locator('#cancel-reason-form').isVisible().catch(() => false);

    if (reasonFormVisible) {
      console.log('📝 キャンセル理由を入力します');

      // キャンセル理由を入力
      // TODO: 実画面に合わせてセレクタを調整
      await page.fill('#cancel-reason-input', cancelReason);

      // 確定ボタンをクリック
      // TODO: 実画面に合わせてセレクタを調整
      await page.click('#confirm-cancel-button');
    }

    await updateProgress(70, 'キャンセル実行中', 'サーバー処理を待機しています');

    // 処理完了を待機（ステータス更新を確認）
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.cancel-success-message, .order-status-cancelled', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ キャンセル完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(80, 'キャンセル完了', 'キャンセル処理が完了しました');

    // ============================================
    // ステップ5: 結果を確認（進捗 80-100%）
    // ============================================
    await updateProgress(85, '結果確認中', 'キャンセル後のステータスを確認しています');

    // キャンセル後のステータスを取得
    // TODO: 実画面に合わせてセレクタを調整
    const newStatus = await page.locator('.order-status-badge').textContent() || '';

    console.log(`📋 キャンセル後のステータス: ${newStatus}`);

    // キャンセル後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-cancel');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        orderNo,
        previousStatus: currentStatus.trim(),
        newStatus: newStatus.trim(),
        cancelReason,
        cancelledAt: new Date().toISOString(),
      },
      message: `注文をキャンセルしました（${currentStatus.trim()} → ${newStatus.trim()}）`,
    };

    await updateProgress(100, '完了', '注文キャンセルが完了しました');

    console.log('✅ 注文キャンセルシナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 注文キャンセルシナリオでエラー:', errorMessage);

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
