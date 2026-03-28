/**
 * たまごリピート自動化 - Zendeskアプリ
 *
 * このスクリプトは、Zendeskのチケットサイドバーから
 * Playwright自動化APIを呼び出すためのクライアントコードです。
 *
 * 【機能】
 * - チケット情報から顧客ID・注文番号を取得
 * - 自動化ジョブを投入
 * - 進捗をリアルタイム表示
 * - 結果を表示
 */

// ============================================
// グローバル変数
// ============================================

// Zendesk Apps Framework クライアント
let client;

// API エンドポイント（設定から取得）
let apiEndpoint = '';

// 現在のチケット情報
let ticketId = '';
let customerId = '';
let orderNo = '';
let operator = '';

// 進捗確認用のインターバル
let progressInterval = null;

// ============================================
// 初期化
// ============================================

/**
 * アプリの初期化
 */
async function init() {
  console.log('たまごリピート自動化アプリを初期化中...');

  try {
    // ZAFクライアントを初期化
    client = ZAFClient.init();

    // アプリの高さを自動調整
    client.invoke('resize', { width: '100%', height: '500px' });

    // 設定からAPIエンドポイントを取得
    const metadata = await client.metadata();
    apiEndpoint = metadata.settings.apiEndpoint || '';

    if (!apiEndpoint) {
      showError('APIエンドポイントが設定されていません');
      return;
    }

    console.log('APIエンドポイント:', apiEndpoint);

    // チケット情報を取得
    await loadTicketInfo();

    // アクションボタンのイベントを設定
    setupActionButtons();

    console.log('初期化完了');

  } catch (error) {
    console.error('初期化エラー:', error);
    showError('アプリの初期化に失敗しました: ' + error.message);
  }
}

/**
 * チケット情報を読み込む
 */
async function loadTicketInfo() {
  try {
    // チケット情報を取得
    const ticketData = await client.get([
      'ticket.id',
      'ticket.requester.id',
      'ticket.requester.name',
      'ticket.customField:customer_id',  // カスタムフィールド（例）
      'ticket.customField:order_no',     // カスタムフィールド（例）
      'currentUser.name'
    ]);

    // チケットID
    ticketId = ticketData['ticket.id'] || '';

    // 顧客ID（カスタムフィールドから取得、なければrequester.idを使用）
    customerId = ticketData['ticket.customField:customer_id'] ||
                 ticketData['ticket.requester.id'] ||
                 '';

    // 注文番号（カスタムフィールドから取得）
    orderNo = ticketData['ticket.customField:order_no'] || '';

    // オペレーター（現在のユーザー）
    operator = ticketData['currentUser.name'] || 'unknown';

    // 画面に表示
    document.getElementById('customer-id').textContent = customerId || '未設定';
    document.getElementById('order-no').textContent = orderNo || '未設定';
    document.getElementById('operator').textContent = operator;

    console.log('チケット情報:', { ticketId, customerId, orderNo, operator });

  } catch (error) {
    console.error('チケット情報取得エラー:', error);
    // エラーでも続行（手動入力を許可）
  }
}

// ============================================
// アクションボタン
// ============================================

/**
 * アクションボタンのイベントを設定
 */
function setupActionButtons() {
  // すべてのアクションボタンを取得
  const buttons = document.querySelectorAll('.action-btn');

  buttons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;

      if (!action) return;

      // バリデーション
      if (!customerId) {
        showError('顧客IDが設定されていません');
        return;
      }

      // 注文関連のアクションには注文番号が必要
      if (['cancel_order', 'update_shipping'].includes(action) && !orderNo) {
        showError('注文番号が設定されていません');
        return;
      }

      // 確認ダイアログ（危険なアクションの場合）
      if (['cancel_order', 'pause_subscription'].includes(action)) {
        const actionName = e.target.textContent.trim();
        const confirmed = confirm(`「${actionName}」を実行しますか？\n\n顧客ID: ${customerId}\n注文番号: ${orderNo || '(なし)'}`);

        if (!confirmed) return;
      }

      // ジョブを実行
      await executeJob(action);
    });
  });
}

// ============================================
// ジョブ実行
// ============================================

/**
 * ジョブを実行する
 *
 * @param {string} action - 実行するアクション
 */
async function executeJob(action) {
  console.log('ジョブを実行:', action);

  // ボタンを無効化
  setButtonsEnabled(false);

  // 進捗セクションを表示
  showProgress();
  hideResult();

  try {
    // ジョブを作成
    const response = await fetch(`${apiEndpoint}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticketId,
        customerId,
        orderNo: orderNo || undefined,
        action,
        operator,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'ジョブの作成に失敗しました');
    }

    console.log('ジョブ作成成功:', data.jobId);

    // 進捗を監視
    await monitorJobProgress(data.jobId);

  } catch (error) {
    console.error('ジョブ実行エラー:', error);
    showError('エラー: ' + error.message);
  } finally {
    // ボタンを有効化
    setButtonsEnabled(true);
  }
}

/**
 * ジョブの進捗を監視する
 *
 * @param {string} jobId - ジョブID
 */
async function monitorJobProgress(jobId) {
  return new Promise((resolve, reject) => {
    // 定期的に進捗を確認（2秒ごと）
    progressInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiEndpoint}/jobs/${jobId}`);
        const data = await response.json();

        if (!data.success || !data.job) {
          throw new Error('ジョブ情報の取得に失敗しました');
        }

        const job = data.job;

        // 進捗を更新
        updateProgressDisplay(job.progress, job.message);

        // 完了または失敗した場合
        if (job.status === 'completed') {
          clearInterval(progressInterval);
          hideProgress();
          showSuccess('完了: ' + job.message, job.result);
          resolve(job);
        } else if (job.status === 'failed') {
          clearInterval(progressInterval);
          hideProgress();
          showError('失敗: ' + (job.error || job.message));
          reject(new Error(job.error || job.message));
        }

      } catch (error) {
        console.error('進捗確認エラー:', error);
        clearInterval(progressInterval);
        hideProgress();
        showError('進捗確認エラー: ' + error.message);
        reject(error);
      }
    }, 2000);

    // タイムアウト（10分）
    setTimeout(() => {
      if (progressInterval) {
        clearInterval(progressInterval);
        hideProgress();
        showError('タイムアウト: ジョブが10分以内に完了しませんでした');
        reject(new Error('タイムアウト'));
      }
    }, 600000);
  });
}

// ============================================
// UI更新
// ============================================

/**
 * ボタンの有効/無効を切り替える
 *
 * @param {boolean} enabled - 有効にするかどうか
 */
function setButtonsEnabled(enabled) {
  const buttons = document.querySelectorAll('.action-btn');
  buttons.forEach(button => {
    button.disabled = !enabled;
  });
}

/**
 * 進捗表示を表示する
 */
function showProgress() {
  document.getElementById('progress-section').classList.add('active');
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '開始中...';
}

/**
 * 進捗表示を非表示にする
 */
function hideProgress() {
  document.getElementById('progress-section').classList.remove('active');
}

/**
 * 進捗表示を更新する
 *
 * @param {string} progress - 進捗文字列（例: "50% - ログイン完了"）
 * @param {string} message - メッセージ
 */
function updateProgressDisplay(progress, message) {
  // 進捗パーセントを抽出
  const match = progress?.match(/(\d+)%/);
  const percent = match ? parseInt(match[1], 10) : 0;

  document.getElementById('progress-bar').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = message || progress || '処理中...';
}

/**
 * 成功結果を表示する
 *
 * @param {string} message - メッセージ
 * @param {string} result - 結果データ（JSON文字列）
 */
function showSuccess(message, result) {
  const section = document.getElementById('result-section');
  section.className = 'result-section active success';
  document.getElementById('result-title').textContent = '✅ 成功';
  document.getElementById('result-message').textContent = message;

  // 結果データがあれば表示
  if (result) {
    try {
      const resultData = typeof result === 'string' ? JSON.parse(result) : result;
      const formatted = JSON.stringify(resultData, null, 2);
      document.getElementById('result-message').innerHTML =
        message + '<br><br><pre style="font-size:10px;overflow:auto;max-height:100px;">' + formatted + '</pre>';
    } catch (e) {
      // JSON解析失敗時はそのまま表示
    }
  }
}

/**
 * エラー結果を表示する
 *
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
  const section = document.getElementById('result-section');
  section.className = 'result-section active error';
  document.getElementById('result-title').textContent = '❌ エラー';
  document.getElementById('result-message').textContent = message;
}

/**
 * 結果表示を非表示にする
 */
function hideResult() {
  document.getElementById('result-section').classList.remove('active');
}

// ============================================
// アプリ起動
// ============================================

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', init);
