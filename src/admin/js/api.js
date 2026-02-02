/**
 * APIクライアント
 *
 * バックエンドAPIとの通信を担当するモジュールです。
 */

// ============================================
// 設定
// ============================================

// APIのベースURL（同一オリジン）
const API_BASE = '';

// ============================================
// HTTPリクエスト
// ============================================

/**
 * GETリクエストを送信
 *
 * @param {string} path - エンドポイントパス
 * @param {Object} params - クエリパラメータ
 * @returns {Promise<Object>} レスポンスデータ
 */
async function apiGet(path, params = {}) {
  // クエリ文字列を構築
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API GET エラー: ${path}`, error);
    throw error;
  }
}

/**
 * POSTリクエストを送信
 *
 * @param {string} path - エンドポイントパス
 * @param {Object} data - リクエストボディ
 * @returns {Promise<Object>} レスポンスデータ
 */
async function apiPost(path, data = {}) {
  const url = `${API_BASE}${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API POST エラー: ${path}`, error);
    throw error;
  }
}

// ============================================
// API関数
// ============================================

/**
 * ヘルスチェック
 *
 * @returns {Promise<Object>} ヘルスステータス
 */
async function getHealth() {
  return await apiGet('/health');
}

/**
 * キュー状態を取得
 *
 * @returns {Promise<Object>} キュー状態
 */
async function getQueueStatus() {
  return await apiGet('/queue/status');
}

/**
 * ジョブ一覧を取得
 *
 * @param {Object} options - オプション
 * @param {number} options.limit - 取得件数
 * @param {string} options.status - ステータスフィルタ
 * @param {string} options.customerId - 顧客IDフィルタ
 * @param {string} options.operator - オペレーターフィルタ
 * @returns {Promise<Object>} ジョブ一覧
 */
async function getJobs(options = {}) {
  const params = {};

  if (options.limit) params.limit = options.limit;
  if (options.status) params.status = options.status;
  if (options.customerId) params.customerId = options.customerId;
  if (options.operator) params.operator = options.operator;

  return await apiGet('/jobs', params);
}

/**
 * ジョブ詳細を取得
 *
 * @param {string} jobId - ジョブID
 * @returns {Promise<Object>} ジョブ詳細
 */
async function getJob(jobId) {
  return await apiGet(`/jobs/${jobId}`);
}

/**
 * ジョブを作成
 *
 * @param {Object} data - ジョブデータ
 * @returns {Promise<Object>} 作成結果
 */
async function createJob(data) {
  return await apiPost('/jobs', data);
}

/**
 * 利用可能なアクション一覧を取得
 *
 * @returns {Promise<Object>} アクション一覧
 */
async function getActions() {
  return await apiGet('/actions');
}

// ============================================
// エクスポート（グローバル）
// ============================================

window.API = {
  getHealth,
  getQueueStatus,
  getJobs,
  getJob,
  createJob,
  getActions,
};
