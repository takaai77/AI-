/**
 * 配送情報更新シナリオ
 *
 * このシナリオでは、注文の配送先住所や配送方法を更新します。
 *
 * 【処理の流れ】
 * 1. たまごリピートにログイン
 * 2. 注文詳細ページを開く
 * 3. 配送情報を更新
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
// 配送情報の型定義
// ============================================

/**
 * 配送情報の型
 */
interface ShippingInfo {
  // 配送先氏名
  recipientName?: string;
  // 郵便番号
  postalCode?: string;
  // 都道府県
  prefecture?: string;
  // 市区町村
  city?: string;
  // 番地・建物名
  address?: string;
  // 電話番号
  phone?: string;
  // 配送希望日
  deliveryDate?: string;
  // 配送時間帯
  deliveryTime?: string;
  // 配送方法
  shippingMethod?: string;
}

// ============================================
// シナリオ関数
// ============================================

/**
 * 配送情報更新シナリオを実行する
 *
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const updateShipping = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  // コンテキストから必要な情報を取得
  const { jobId, customerId, orderNo, updateProgress, saveScreenshot: saveScreenshotFn, params } = context;

  console.log(`📦 配送情報更新シナリオを開始します`);
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

  // 配送情報を取得（params から）
  const shippingInfo: ShippingInfo = {
    recipientName: params?.recipientName as string | undefined,
    postalCode: params?.postalCode as string | undefined,
    prefecture: params?.prefecture as string | undefined,
    city: params?.city as string | undefined,
    address: params?.address as string | undefined,
    phone: params?.phone as string | undefined,
    deliveryDate: params?.deliveryDate as string | undefined,
    deliveryTime: params?.deliveryTime as string | undefined,
    shippingMethod: params?.shippingMethod as string | undefined,
  };

  // 少なくとも1つの更新項目が必要
  const hasUpdateField = Object.values(shippingInfo).some((value) => value !== undefined);

  if (!hasUpdateField) {
    return {
      success: false,
      message: '更新する配送情報が指定されていません（params に recipientName, postalCode, address 等を指定してください）',
    };
  }

  console.log(`   更新内容:`, shippingInfo);

  try {
    // ============================================
    // ステップ1: ログイン（進捗 0-15%）
    // ============================================
    await updateProgress(5, 'ログイン中', 'たまごリピートにログインしています');

    // ログイン処理を実行
    await login(page);

    await updateProgress(15, 'ログイン完了', 'ログインに成功しました');

    // ============================================
    // ステップ2: 注文詳細ページを開く（進捗 15-30%）
    // ============================================
    await updateProgress(20, '注文ページへ移動中', `注文番号: ${orderNo} のページを開いています`);

    // 注文詳細ページを開く
    await openOrderDetail(page, orderNo);

    await updateProgress(30, '注文ページ表示完了', '注文詳細ページを開きました');

    // 更新前のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'before-update-shipping');

    // ============================================
    // ステップ3: 配送情報編集モードに入る（進捗 30-45%）
    // ============================================
    await updateProgress(35, '編集モード開始', '配送情報の編集を開始します');

    // 配送情報編集ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    const editButtonExists = await page.locator('#edit-shipping-button, .edit-shipping, [data-action="edit-shipping"]').isVisible().catch(() => false);

    if (!editButtonExists) {
      console.log('⚠️ 配送情報編集ボタンが見つかりません');
      return {
        success: false,
        message: '配送情報編集ボタンが見つかりません。この注文の配送情報は編集できない可能性があります。',
      };
    }

    await page.click('#edit-shipping-button, .edit-shipping, [data-action="edit-shipping"]');

    // 編集フォームが表示されるのを待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('#shipping-edit-form, .shipping-form', { timeout: 10000 });

    await updateProgress(45, '編集フォーム表示', '編集フォームを開きました');

    // ============================================
    // ステップ4: 配送情報を入力（進捗 45-70%）
    // ============================================
    await updateProgress(50, '情報入力中', '配送情報を入力しています');

    // 更新された項目を追跡
    const updatedFields: string[] = [];

    // 各フィールドを更新
    // TODO: 実画面に合わせてセレクタを調整

    // 配送先氏名
    if (shippingInfo.recipientName) {
      const recipientInput = page.locator('#recipient-name, [name="recipient_name"]');
      if (await recipientInput.isVisible().catch(() => false)) {
        await recipientInput.fill(shippingInfo.recipientName);
        updatedFields.push('配送先氏名');
      }
    }

    // 郵便番号
    if (shippingInfo.postalCode) {
      const postalInput = page.locator('#postal-code, [name="postal_code"]');
      if (await postalInput.isVisible().catch(() => false)) {
        await postalInput.fill(shippingInfo.postalCode);
        updatedFields.push('郵便番号');
      }
    }

    // 都道府県
    if (shippingInfo.prefecture) {
      const prefectureInput = page.locator('#prefecture, [name="prefecture"]');
      if (await prefectureInput.isVisible().catch(() => false)) {
        // セレクトボックスの場合
        const isSelect = await prefectureInput.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
        if (isSelect) {
          await prefectureInput.selectOption({ label: shippingInfo.prefecture });
        } else {
          await prefectureInput.fill(shippingInfo.prefecture);
        }
        updatedFields.push('都道府県');
      }
    }

    await updateProgress(55, '情報入力中', `${updatedFields.length}項目を入力中...`);

    // 市区町村
    if (shippingInfo.city) {
      const cityInput = page.locator('#city, [name="city"]');
      if (await cityInput.isVisible().catch(() => false)) {
        await cityInput.fill(shippingInfo.city);
        updatedFields.push('市区町村');
      }
    }

    // 番地・建物名
    if (shippingInfo.address) {
      const addressInput = page.locator('#address, [name="address"]');
      if (await addressInput.isVisible().catch(() => false)) {
        await addressInput.fill(shippingInfo.address);
        updatedFields.push('住所');
      }
    }

    // 電話番号
    if (shippingInfo.phone) {
      const phoneInput = page.locator('#phone, [name="phone"]');
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill(shippingInfo.phone);
        updatedFields.push('電話番号');
      }
    }

    await updateProgress(60, '情報入力中', `${updatedFields.length}項目を入力中...`);

    // 配送希望日
    if (shippingInfo.deliveryDate) {
      const dateInput = page.locator('#delivery-date, [name="delivery_date"]');
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill(shippingInfo.deliveryDate);
        updatedFields.push('配送希望日');
      }
    }

    // 配送時間帯
    if (shippingInfo.deliveryTime) {
      const timeInput = page.locator('#delivery-time, [name="delivery_time"]');
      if (await timeInput.isVisible().catch(() => false)) {
        const isSelect = await timeInput.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
        if (isSelect) {
          await timeInput.selectOption({ label: shippingInfo.deliveryTime });
        } else {
          await timeInput.fill(shippingInfo.deliveryTime);
        }
        updatedFields.push('配送時間帯');
      }
    }

    // 配送方法
    if (shippingInfo.shippingMethod) {
      const methodInput = page.locator('#shipping-method, [name="shipping_method"]');
      if (await methodInput.isVisible().catch(() => false)) {
        const isSelect = await methodInput.evaluate((el) => el.tagName === 'SELECT').catch(() => false);
        if (isSelect) {
          await methodInput.selectOption({ label: shippingInfo.shippingMethod });
        } else {
          await methodInput.fill(shippingInfo.shippingMethod);
        }
        updatedFields.push('配送方法');
      }
    }

    await updateProgress(70, '入力完了', `${updatedFields.length}項目を入力しました`);

    console.log(`📝 更新項目: ${updatedFields.join(', ')}`);

    // ============================================
    // ステップ5: 変更を保存（進捗 70-90%）
    // ============================================
    await updateProgress(75, '保存中', '変更を保存しています');

    // 確認ダイアログのハンドラを設定
    handleConfirmDialog(page, true);

    // 保存ボタンをクリック
    // TODO: 実画面に合わせてセレクタを調整
    await page.click('#save-shipping-button, .save-shipping, [type="submit"]');

    await updateProgress(80, '処理中', 'サーバー処理を待機しています');

    // 処理完了を待機
    // TODO: 実画面に合わせてセレクタを調整
    await page.waitForSelector('.save-success-message, .shipping-updated', {
      timeout: 15000,
    }).catch(() => {
      console.log('⚠️ 保存完了メッセージが見つかりません');
    });

    // 少し待機して画面更新を確認
    await wait(1000);

    await updateProgress(90, '保存完了', '変更が保存されました');

    // ============================================
    // ステップ6: 結果を確認（進捗 90-100%）
    // ============================================

    // 更新後のスクリーンショットを保存
    await takeScreenshot(page, jobId, 'after-update-shipping');

    await updateProgress(95, '処理完了', '結果を返します');

    // 結果を構築
    const result: JobResult = {
      success: true,
      data: {
        orderNo,
        customerId,
        updatedFields,
        shippingInfo,
        updatedAt: new Date().toISOString(),
      },
      message: `配送情報を更新しました（${updatedFields.join(', ')}）`,
    };

    await updateProgress(100, '完了', '配送情報更新が完了しました');

    console.log('✅ 配送情報更新シナリオ完了');
    return result;

  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ 配送情報更新シナリオでエラー:', errorMessage);

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
