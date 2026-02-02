/**
 * 管理画面アプリケーション
 *
 * ダッシュボード、ジョブ一覧、キュー状態などの
 * UIロジックを担当するメインモジュールです。
 */

// ============================================
// グローバル変数
// ============================================

// 現在のページ
let currentPage = 'dashboard';

// 自動更新のインターバルID
let autoRefreshInterval = null;

// ジョブ一覧のページネーション
let jobsCurrentPage = 1;
const jobsPerPage = 20;
let allJobs = [];
let filteredJobs = [];

// アクション一覧
let availableActions = [];

// ============================================
// 初期化
// ============================================

/**
 * アプリケーションの初期化
 */
async function init() {
  console.log('管理画面を初期化中...');

  // Feather Iconsを初期化
  feather.replace();

  // イベントリスナーを設定
  setupEventListeners();

  // アクション一覧を取得
  await loadActions();

  // 初期データを読み込み
  await refreshData();

  // 自動更新を開始
  startAutoRefresh();

  // 接続状態を確認
  await checkConnection();

  console.log('初期化完了');
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
  // ナビゲーション
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;
      navigateTo(page);
    });
  });

  // ページ内リンク
  document.querySelectorAll('[data-page]').forEach(item => {
    if (!item.classList.contains('nav-item')) {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        navigateTo(page);
      });
    }
  });

  // 更新ボタン
  document.getElementById('refresh-btn').addEventListener('click', () => {
    refreshData();
  });

  // 自動更新トグル
  document.getElementById('auto-refresh-toggle').addEventListener('change', (e) => {
    if (e.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  // フィルター
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('filter-action').addEventListener('change', applyFilters);
  document.getElementById('filter-search').addEventListener('input', debounce(applyFilters, 300));
  document.getElementById('clear-filters').addEventListener('click', clearFilters);

  // ページネーション
  document.getElementById('prev-page').addEventListener('click', () => {
    if (jobsCurrentPage > 1) {
      jobsCurrentPage--;
      renderJobsTable();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    if (jobsCurrentPage < totalPages) {
      jobsCurrentPage++;
      renderJobsTable();
    }
  });

  // ジョブ作成フォーム
  document.getElementById('create-job-form').addEventListener('submit', handleCreateJob);
  document.getElementById('create-action').addEventListener('change', handleActionChange);

  // モーダル
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  document.getElementById('job-detail-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  // Escキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// ============================================
// ナビゲーション
// ============================================

/**
 * ページに移動
 *
 * @param {string} page - ページ名
 */
function navigateTo(page) {
  currentPage = page;

  // ナビゲーションのアクティブ状態を更新
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // ページを切り替え
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden');
  });
  document.getElementById(`page-${page}`).classList.remove('hidden');

  // ヘッダータイトルを更新
  const titles = {
    dashboard: { title: 'ダッシュボード', subtitle: 'システムの概要を確認' },
    jobs: { title: 'ジョブ一覧', subtitle: 'すべてのジョブを管理' },
    queue: { title: 'キュー状態', subtitle: 'リアルタイムのキュー状況' },
    create: { title: 'ジョブ作成', subtitle: '新しいジョブを投入' },
  };

  document.getElementById('page-title').textContent = titles[page]?.title || page;
  document.getElementById('page-subtitle').textContent = titles[page]?.subtitle || '';

  // アイコンを再描画
  feather.replace();
}

// ============================================
// データ取得・更新
// ============================================

/**
 * データを更新
 */
async function refreshData() {
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.classList.add('rotating');

  try {
    switch (currentPage) {
      case 'dashboard':
        await Promise.all([loadQueueStatus(), loadRecentJobs()]);
        break;
      case 'jobs':
        await loadAllJobs();
        break;
      case 'queue':
        await loadQueueStatus();
        break;
    }
  } catch (error) {
    console.error('データ更新エラー:', error);
    showToast('error', 'エラー', 'データの更新に失敗しました');
  } finally {
    refreshBtn.classList.remove('rotating');
  }
}

/**
 * キュー状態を読み込み
 */
async function loadQueueStatus() {
  try {
    const data = await API.getQueueStatus();

    if (data.success) {
      // 統計を更新
      document.getElementById('stat-waiting').textContent = data.counts?.waiting || 0;
      document.getElementById('stat-active').textContent = data.counts?.active || 0;
      document.getElementById('stat-completed').textContent = data.counts?.completed || 0;
      document.getElementById('stat-failed').textContent = data.counts?.failed || 0;

      // キューページの情報を更新
      document.getElementById('waiting-count').textContent = data.counts?.waiting || 0;
      document.getElementById('active-count').textContent = data.counts?.active || 0;
      document.getElementById('queue-total-completed').textContent = data.counts?.completed || 0;
      document.getElementById('queue-total-failed').textContent = data.counts?.failed || 0;

      // 待機中のジョブリストを更新
      renderQueueList('waiting-jobs-list', data.waiting || []);

      // 実行中のジョブリストを更新
      renderQueueList('running-jobs-list', data.active || [], true);

      // ダッシュボードの実行中ジョブも更新
      renderActiveJobs(data.active || []);
    }
  } catch (error) {
    console.error('キュー状態取得エラー:', error);
  }
}

/**
 * 最近のジョブを読み込み
 */
async function loadRecentJobs() {
  try {
    const data = await API.getJobs({ limit: 10 });

    if (data.success) {
      renderRecentJobs(data.jobs || []);
    }
  } catch (error) {
    console.error('ジョブ取得エラー:', error);
  }
}

/**
 * 全ジョブを読み込み
 */
async function loadAllJobs() {
  try {
    const data = await API.getJobs({ limit: 500 });

    if (data.success) {
      allJobs = data.jobs || [];
      applyFilters();
    }
  } catch (error) {
    console.error('ジョブ取得エラー:', error);
  }
}

/**
 * アクション一覧を読み込み
 */
async function loadActions() {
  try {
    const data = await API.getActions();

    if (data.success) {
      availableActions = data.actions || [];

      // フィルターのセレクトボックスを更新
      const filterSelect = document.getElementById('filter-action');
      filterSelect.innerHTML = '<option value="">すべて</option>';
      availableActions.forEach(action => {
        filterSelect.innerHTML += `<option value="${action.name}">${action.description}</option>`;
      });

      // 作成フォームのセレクトボックスを更新
      const createSelect = document.getElementById('create-action');
      createSelect.innerHTML = '<option value="">選択してください</option>';
      availableActions.forEach(action => {
        createSelect.innerHTML += `<option value="${action.name}">${action.description}</option>`;
      });
    }
  } catch (error) {
    console.error('アクション取得エラー:', error);
  }
}

/**
 * 接続状態を確認
 */
async function checkConnection() {
  const statusEl = document.getElementById('connection-status');

  try {
    const data = await API.getHealth();

    if (data.status === 'ok') {
      statusEl.className = 'connection-status connected';
      statusEl.innerHTML = '<i data-feather="wifi"></i><span>接続中</span>';
    } else {
      throw new Error('サーバーエラー');
    }
  } catch (error) {
    statusEl.className = 'connection-status disconnected';
    statusEl.innerHTML = '<i data-feather="wifi-off"></i><span>接続エラー</span>';
  }

  feather.replace();
}

// ============================================
// レンダリング
// ============================================

/**
 * 実行中のジョブを描画（ダッシュボード）
 *
 * @param {Array} jobs - ジョブ配列
 */
function renderActiveJobs(jobs) {
  const container = document.getElementById('active-jobs-list');

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-feather="inbox"></i>
        <p>実行中のジョブはありません</p>
      </div>
    `;
    feather.replace();
    return;
  }

  container.innerHTML = jobs.map(job => {
    const progress = job.progress?.percent || 0;
    return `
      <div class="job-item cursor-pointer" data-job-id="${job.id}">
        <div class="job-item-icon stat-icon running">
          <i data-feather="loader"></i>
        </div>
        <div class="job-item-content">
          <div class="job-item-title">${getActionLabel(job.action)}</div>
          <div class="job-item-subtitle">
            顧客: ${job.customerId} | ${job.operator}
          </div>
          <div class="progress-bar-mini" style="margin-top: 6px;">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="job-item-time">${progress}%</div>
      </div>
    `;
  }).join('');

  // クリックイベントを設定
  container.querySelectorAll('.job-item').forEach(item => {
    item.addEventListener('click', () => {
      showJobDetail(item.dataset.jobId);
    });
  });

  feather.replace();
}

/**
 * 最近のジョブを描画（ダッシュボード）
 *
 * @param {Array} jobs - ジョブ配列
 */
function renderRecentJobs(jobs) {
  const container = document.getElementById('recent-jobs-list');

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-feather="inbox"></i>
        <p>ジョブがありません</p>
      </div>
    `;
    feather.replace();
    return;
  }

  container.innerHTML = jobs.map(job => {
    const iconClass = getStatusIconClass(job.status);
    const iconName = getStatusIcon(job.status);
    return `
      <div class="job-item cursor-pointer" data-job-id="${job.job_id}">
        <div class="job-item-icon stat-icon ${iconClass}">
          <i data-feather="${iconName}"></i>
        </div>
        <div class="job-item-content">
          <div class="job-item-title">${getActionLabel(job.action)}</div>
          <div class="job-item-subtitle">
            ${job.customer_id} | ${job.operator}
          </div>
        </div>
        <div class="job-item-time">${formatTimeAgo(job.created_at)}</div>
      </div>
    `;
  }).join('');

  // クリックイベントを設定
  container.querySelectorAll('.job-item').forEach(item => {
    item.addEventListener('click', () => {
      showJobDetail(item.dataset.jobId);
    });
  });

  feather.replace();
}

/**
 * キューリストを描画
 *
 * @param {string} containerId - コンテナID
 * @param {Array} jobs - ジョブ配列
 * @param {boolean} showProgress - 進捗を表示するか
 */
function renderQueueList(containerId, jobs, showProgress = false) {
  const container = document.getElementById(containerId);

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-feather="inbox"></i>
        <p>ジョブがありません</p>
      </div>
    `;
    feather.replace();
    return;
  }

  container.innerHTML = jobs.map(job => {
    const progress = job.progress?.percent || 0;
    return `
      <div class="queue-item cursor-pointer" data-job-id="${job.id}">
        <div class="queue-item-info">
          <div class="queue-item-action">${getActionLabel(job.action)}</div>
          <div class="queue-item-meta">
            ${job.customerId} | ${job.operator}
          </div>
        </div>
        ${showProgress ? `
          <div class="queue-item-progress">
            <div class="progress-bar-mini">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // クリックイベントを設定
  container.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', () => {
      showJobDetail(item.dataset.jobId);
    });
  });

  feather.replace();
}

/**
 * ジョブテーブルを描画
 */
function renderJobsTable() {
  const tbody = document.getElementById('jobs-table-body');

  if (!filteredJobs || filteredJobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="loading-cell">
          <div class="empty-state">
            <i data-feather="inbox"></i>
            <p>ジョブがありません</p>
          </div>
        </td>
      </tr>
    `;
    feather.replace();
    updatePagination();
    return;
  }

  // ページネーション計算
  const startIndex = (jobsCurrentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const pageJobs = filteredJobs.slice(startIndex, endIndex);

  tbody.innerHTML = pageJobs.map(job => `
    <tr>
      <td>${formatDateTime(job.created_at)}</td>
      <td>
        <span class="text-truncate" style="max-width: 120px; display: inline-block;" title="${job.job_id}">
          ${job.job_id.substring(0, 8)}...
        </span>
      </td>
      <td>${getActionLabel(job.action)}</td>
      <td>${job.customer_id}</td>
      <td>${job.operator}</td>
      <td><span class="badge badge-${job.status}">${getStatusLabel(job.status)}</span></td>
      <td>${job.progress || '-'}</td>
      <td>
        <button class="btn btn-icon" onclick="showJobDetail('${job.job_id}')" title="詳細を表示">
          <i data-feather="eye"></i>
        </button>
      </td>
    </tr>
  `).join('');

  feather.replace();
  updatePagination();
}

/**
 * ページネーションを更新
 */
function updatePagination() {
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage) || 1;

  document.getElementById('page-info').textContent = `${jobsCurrentPage} / ${totalPages}`;
  document.getElementById('prev-page').disabled = jobsCurrentPage <= 1;
  document.getElementById('next-page').disabled = jobsCurrentPage >= totalPages;
}

// ============================================
// フィルター
// ============================================

/**
 * フィルターを適用
 */
function applyFilters() {
  const status = document.getElementById('filter-status').value;
  const action = document.getElementById('filter-action').value;
  const search = document.getElementById('filter-search').value.toLowerCase();

  filteredJobs = allJobs.filter(job => {
    // ステータスフィルター
    if (status && job.status !== status) return false;

    // アクションフィルター
    if (action && job.action !== action) return false;

    // 検索フィルター
    if (search) {
      const searchFields = [
        job.job_id,
        job.customer_id,
        job.order_no,
        job.operator,
        job.action,
        job.message,
      ].map(f => (f || '').toLowerCase());

      if (!searchFields.some(f => f.includes(search))) return false;
    }

    return true;
  });

  // ページをリセットして再描画
  jobsCurrentPage = 1;
  renderJobsTable();
}

/**
 * フィルターをクリア
 */
function clearFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-action').value = '';
  document.getElementById('filter-search').value = '';
  applyFilters();
}

// ============================================
// ジョブ詳細モーダル
// ============================================

/**
 * ジョブ詳細を表示
 *
 * @param {string} jobId - ジョブID
 */
async function showJobDetail(jobId) {
  const modal = document.getElementById('job-detail-modal');
  const content = document.getElementById('job-detail-content');

  // ローディング表示
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
  `;
  modal.classList.remove('hidden');

  try {
    const data = await API.getJob(jobId);

    if (!data.success || !data.job) {
      throw new Error('ジョブが見つかりません');
    }

    const job = data.job;

    // 進捗パーセントを抽出
    const progressMatch = (job.progress || '').match(/(\d+)%/);
    const progressPercent = progressMatch ? parseInt(progressMatch[1], 10) : 0;

    content.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">基本情報</div>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">ジョブID</span>
            <span class="detail-value monospace">${job.job_id}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">ステータス</span>
            <span class="detail-value"><span class="badge badge-${job.status}">${getStatusLabel(job.status)}</span></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">アクション</span>
            <span class="detail-value">${getActionLabel(job.action)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">オペレーター</span>
            <span class="detail-value">${job.operator}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">顧客ID</span>
            <span class="detail-value">${job.customer_id}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">注文番号</span>
            <span class="detail-value">${job.order_no || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">チケットID</span>
            <span class="detail-value">${job.ticket_id || '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">作成日時</span>
            <span class="detail-value">${formatDateTime(job.created_at)}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">進捗</div>
        <div class="detail-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-text">${job.progress || '-'}</div>
        </div>
        <div style="margin-top: 12px;">
          <span class="detail-label">メッセージ</span>
          <p class="detail-value">${job.message || '-'}</p>
        </div>
      </div>

      ${job.result ? `
        <div class="detail-section">
          <div class="detail-section-title">実行結果</div>
          <pre class="detail-result">${formatJson(job.result)}</pre>
        </div>
      ` : ''}

      ${job.error ? `
        <div class="detail-section">
          <div class="detail-section-title">エラー</div>
          <pre class="detail-result detail-error">${job.error}</pre>
        </div>
      ` : ''}

      ${job.artifact_url ? `
        <div class="detail-section">
          <div class="detail-section-title">スクリーンショット</div>
          <p class="detail-value monospace">${job.artifact_url}</p>
        </div>
      ` : ''}
    `;

  } catch (error) {
    content.innerHTML = `
      <div class="empty-state">
        <i data-feather="alert-circle"></i>
        <p>ジョブの取得に失敗しました</p>
      </div>
    `;
  }

  feather.replace();
}

/**
 * モーダルを閉じる
 */
function closeModal() {
  document.getElementById('job-detail-modal').classList.add('hidden');
}

// ============================================
// ジョブ作成
// ============================================

/**
 * アクション変更時のハンドラ
 */
function handleActionChange(e) {
  const action = e.target.value;
  const paramsSection = document.getElementById('params-section');
  const paramsFields = document.getElementById('params-fields');

  // アクション固有のパラメータフィールドを表示
  const actionParams = {
    'cancel_order': [
      { name: 'cancelReason', label: 'キャンセル理由', type: 'text', placeholder: 'お客様都合' }
    ],
    'skip_next_delivery': [
      { name: 'skipReason', label: 'スキップ理由', type: 'text', placeholder: 'お客様のご依頼' }
    ],
    'change_delivery_date': [
      { name: 'newDeliveryDate', label: '新しい配送日', type: 'date', required: true }
    ],
    'pause_subscription': [
      { name: 'pauseReason', label: '停止理由', type: 'text', placeholder: 'お客様のご依頼' },
      { name: 'resumeDate', label: '再開予定日', type: 'date' }
    ],
    'resume_subscription': [
      { name: 'nextDeliveryDate', label: '次回配送希望日', type: 'date' }
    ],
    'update_shipping': [
      { name: 'recipientName', label: '配送先氏名', type: 'text' },
      { name: 'postalCode', label: '郵便番号', type: 'text', placeholder: '123-4567' },
      { name: 'address', label: '住所', type: 'text' },
      { name: 'phone', label: '電話番号', type: 'text' }
    ]
  };

  const params = actionParams[action];

  if (params && params.length > 0) {
    paramsSection.style.display = 'block';
    paramsFields.innerHTML = params.map(p => `
      <div class="form-group">
        <label for="param-${p.name}">
          ${p.label}
          ${p.required ? '<span class="required">*</span>' : ''}
        </label>
        <input
          type="${p.type}"
          id="param-${p.name}"
          data-param="${p.name}"
          ${p.required ? 'required' : ''}
          ${p.placeholder ? `placeholder="${p.placeholder}"` : ''}
        >
      </div>
    `).join('');
  } else {
    paramsSection.style.display = 'none';
    paramsFields.innerHTML = '';
  }
}

/**
 * ジョブ作成フォームのハンドラ
 */
async function handleCreateJob(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const resultSection = document.getElementById('create-result');
  const resultContent = document.getElementById('create-result-content');

  // ボタンを無効化
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></div> 作成中...';

  try {
    // フォームデータを取得
    const data = {
      ticketId: document.getElementById('create-ticket-id').value,
      customerId: document.getElementById('create-customer-id').value,
      orderNo: document.getElementById('create-order-no').value || undefined,
      action: document.getElementById('create-action').value,
      operator: document.getElementById('create-operator').value,
    };

    // 追加パラメータを取得
    const paramInputs = document.querySelectorAll('#params-fields input');
    if (paramInputs.length > 0) {
      data.params = {};
      paramInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
          data.params[input.dataset.param] = value;
        }
      });
    }

    // API呼び出し
    const result = await API.createJob(data);

    if (result.success) {
      resultSection.classList.remove('hidden');
      resultContent.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <i data-feather="check-circle" style="color: var(--running);"></i>
          <p style="color: var(--running); font-weight: 500;">ジョブを作成しました</p>
          <p style="margin-top: 8px;">ジョブID: <code>${result.jobId}</code></p>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="showJobDetail('${result.jobId}')">
            詳細を確認
          </button>
        </div>
      `;

      showToast('success', '成功', 'ジョブを作成しました');

      // フォームをリセット
      form.reset();
      document.getElementById('params-section').style.display = 'none';
      document.getElementById('params-fields').innerHTML = '';

    } else {
      throw new Error(result.message || '作成に失敗しました');
    }

  } catch (error) {
    resultSection.classList.remove('hidden');
    resultContent.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <i data-feather="x-circle" style="color: var(--failed);"></i>
        <p style="color: var(--failed); font-weight: 500;">作成に失敗しました</p>
        <p style="margin-top: 8px;">${error.message}</p>
      </div>
    `;

    showToast('error', 'エラー', error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-feather="play"></i> ジョブを作成';
    feather.replace();
  }
}

// ============================================
// 自動更新
// ============================================

/**
 * 自動更新を開始
 */
function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshInterval = setInterval(() => {
    refreshData();
    checkConnection();
  }, 10000);
}

/**
 * 自動更新を停止
 */
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ============================================
// トースト通知
// ============================================

/**
 * トースト通知を表示
 *
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {string} title - タイトル
 * @param {string} message - メッセージ
 */
function showToast(type, title, message) {
  const container = document.getElementById('toast-container');

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    info: 'info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i data-feather="${icons[type]}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <i data-feather="x"></i>
    </button>
  `;

  container.appendChild(toast);
  feather.replace();

  // 閉じるボタン
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  // 5秒後に自動で消える
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * ステータスのラベルを取得
 */
function getStatusLabel(status) {
  const labels = {
    pending: '待機中',
    running: '実行中',
    completed: '完了',
    failed: '失敗',
    retrying: 'リトライ中',
  };
  return labels[status] || status;
}

/**
 * ステータスのアイコンクラスを取得
 */
function getStatusIconClass(status) {
  const classes = {
    pending: 'pending',
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    retrying: 'pending',
  };
  return classes[status] || 'pending';
}

/**
 * ステータスのアイコン名を取得
 */
function getStatusIcon(status) {
  const icons = {
    pending: 'clock',
    running: 'loader',
    completed: 'check-circle',
    failed: 'x-circle',
    retrying: 'refresh-cw',
  };
  return icons[status] || 'circle';
}

/**
 * アクションのラベルを取得
 */
function getActionLabel(action) {
  const found = availableActions.find(a => a.name === action);
  return found ? found.description : action;
}

/**
 * 日時をフォーマット
 */
function formatDateTime(isoString) {
  if (!isoString) return '-';

  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 相対時間をフォーマット
 */
function formatTimeAgo(isoString) {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  return `${diffDay}日前`;
}

/**
 * JSONを整形
 */
function formatJson(str) {
  if (!str) return '';
  try {
    const obj = typeof str === 'string' ? JSON.parse(str) : str;
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
}

/**
 * デバウンス
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================
// CSSアニメーション用のスタイルを追加
// ============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .rotating svg {
    animation: rotate 1s linear infinite;
  }
`;
document.head.appendChild(style);

// ============================================
// 起動
// ============================================

document.addEventListener('DOMContentLoaded', init);
