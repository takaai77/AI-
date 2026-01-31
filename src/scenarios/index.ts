/**
 * シナリオ管理モジュール
 *
 * このファイルでは、各アクションに対応するシナリオを管理します。
 * 新しいアクション（シナリオ）を追加する場合は：
 * 1. scenarios/フォルダに新しいファイルを作成
 * 2. このファイルでインポートして登録
 *
 * 【シナリオとは？】
 * Playwrightを使って「たまごリピート」の画面を操作する一連の手順です。
 * 例：ログイン → 顧客検索 → 注文確認 → 結果取得
 */

// Playwrightのページ型をインポート
import { Page } from 'playwright';

// 型定義をインポート
import { ActionType, JobResult, ScenarioContext } from '../types';

// 各シナリオをインポート
import { checkOrderStatus } from './check-order-status';
import { cancelOrder } from './cancel-order';
import { getCustomerInfo } from './get-customer-info';
import { skipNextDelivery } from './skip-next-delivery';

// ============================================
// シナリオ登録マップ
// ============================================

/**
 * アクション名とシナリオ関数のマッピング
 *
 * 新しいシナリオを追加する場合は、ここにエントリを追加してください
 */
const scenarioMap: {
  [key in ActionType]?: (page: Page, context: ScenarioContext) => Promise<JobResult>;
} = {
  // 注文ステータス確認シナリオ
  check_order_status: checkOrderStatus,

  // 注文キャンセルシナリオ
  cancel_order: cancelOrder,

  // 顧客情報取得シナリオ
  get_customer_info: getCustomerInfo,

  // 次回配送スキップシナリオ
  skip_next_delivery: skipNextDelivery,

  // TODO: 以下のシナリオは未実装
  // update_shipping: updateShipping,
  // change_delivery_date: changeDeliveryDate,
  // pause_subscription: pauseSubscription,
  // resume_subscription: resumeSubscription,
};

// ============================================
// シナリオ実行関数
// ============================================

/**
 * 指定されたアクションのシナリオを実行する
 *
 * @param action - 実行するアクション名
 * @param page - Playwrightのページオブジェクト
 * @param context - シナリオコンテキスト
 * @returns 実行結果
 */
export const runScenario = async (
  action: ActionType,
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  console.log(`🎬 シナリオを開始します: ${action}`);

  // 対応するシナリオ関数を取得
  const scenario = scenarioMap[action];

  // シナリオが登録されていない場合はエラー
  if (!scenario) {
    console.error(`❌ 未登録のアクション: ${action}`);
    return {
      success: false,
      message: `シナリオが見つかりません: ${action}`,
    };
  }

  try {
    // シナリオを実行
    const result = await scenario(page, context);
    console.log(`✅ シナリオ完了: ${action}`);
    return result;
  } catch (error) {
    // エラー発生時
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ シナリオエラー: ${action}`, errorMessage);

    return {
      success: false,
      message: `シナリオ実行中にエラーが発生しました: ${errorMessage}`,
    };
  }
};

/**
 * 登録されているシナリオ一覧を取得する
 *
 * @returns 登録済みアクション名の配列
 */
export const getAvailableScenarios = (): ActionType[] => {
  return Object.keys(scenarioMap) as ActionType[];
};

/**
 * シナリオが登録されているかチェックする
 *
 * @param action - アクション名
 * @returns 登録されていればtrue
 */
export const isScenarioAvailable = (action: ActionType): boolean => {
  return action in scenarioMap;
};
