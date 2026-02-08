/**
 * AI Media Library - Main Application
 * メディア図書館のUI制御・ビジネスロジック
 */

// ── Globals ─────────────────────────────────────────────────

let currentView = 'dashboard';
let editingMediaId = null;
let editingCategoryId = null;
let editingCollectionId = null;
let editingTemplateId = null;
let currentRating = 0;
let currentColors = [];
let currentThumbnail = '';
let libraryLayout = 'grid';

// Shot type / camera angle label maps
const SHOT_LABELS = {
  'extreme-long': 'エクストリームロングショット',
  'long': 'ロングショット',
  'full': 'フルショット',
  'medium-long': 'ミディアムロング',
  'medium': 'ミディアムショット',
  'medium-close': 'ミディアムクローズアップ',
  'close-up': 'クローズアップ',
  'extreme-close': 'エクストリームクローズアップ',
  'over-shoulder': 'オーバーザショルダー',
  'pov': 'POV (主観)',
  'aerial': '空撮・鳥瞰',
  'dutch': 'ダッチアングル',
};

const ANGLE_LABELS = {
  'eye-level': 'アイレベル',
  'high': 'ハイアングル',
  'low': 'ローアングル',
  'birds-eye': 'バードアイ',
  'worms-eye': 'ワームアイ',
  'tilted': 'ティルト',
  'overhead': '俯瞰',
};

const MOVEMENT_LABELS = {
  'static': 'スタティック',
  'pan': 'パン',
  'tilt': 'ティルト',
  'dolly': 'ドリー',
  'truck': 'トラック',
  'zoom': 'ズーム',
  'crane': 'クレーン',
  'handheld': 'ハンドヘルド',
  'steadicam': 'ステディカム',
  'drone': 'ドローン',
  'orbit': 'オービット',
  'whip-pan': 'ウィップパン',
  'rack-focus': 'ラックフォーカス',
};

// ── Initialization ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await mediaDB.open();
  await mediaDB.seedDefaultCategories();
  initNavigation();
  initModals();
  initSearch();
  initLibraryToolbar();
  initMediaForm();
  initSettings();
  await refreshCurrentView();
  await updateStorageInfo();
});

// ── Navigation ──────────────────────────────────────────────

function initNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar on overlay click (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('btn-sidebar-toggle');
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
      sidebar.classList.remove('open');
    }
  });
}

function switchView(viewName) {
  currentView = viewName;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(`view-${viewName}`);
  if (view) view.classList.add('active');

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  refreshCurrentView();
}

async function refreshCurrentView() {
  switch (currentView) {
    case 'dashboard': await renderDashboard(); break;
    case 'library': await renderLibrary(); break;
    case 'favorites': await renderFavorites(); break;
    case 'categories': await renderCategories(); break;
    case 'collections': await renderCollections(); break;
    case 'tags': await renderTags(); break;
    case 'templates': await renderTemplates(); break;
  }
  await updateNavBadges();
}

async function updateNavBadges() {
  const count = await mediaDB.getMediaCount();
  document.getElementById('nav-media-count').textContent = count;
}

async function updateStorageInfo() {
  const stats = await mediaDB.getStats();
  document.getElementById('storage-info').textContent =
    `${stats.totalMedia} メディア | ${stats.totalCategories} カテゴリ | ${stats.totalTemplates} テンプレート`;
}

// ── Toast ───────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Search ──────────────────────────────────────────────────

function initSearch() {
  const input = document.getElementById('global-search');
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length > 0) {
        switchView('library');
        const results = await mediaDB.searchMedia(q);
        renderMediaGrid(results, 'library-content');
        document.getElementById('library-count').textContent = `${results.length} 件の検索結果`;
      } else if (currentView === 'library') {
        await renderLibrary();
      }
    }, 300);
  });
}

// ── Library Toolbar ─────────────────────────────────────────

function initLibraryToolbar() {
  // Filter toggle
  document.getElementById('btn-toggle-filters').addEventListener('click', () => {
    document.getElementById('filters-panel').classList.toggle('open');
  });

  // Layout toggle
  document.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      libraryLayout = btn.dataset.layout;
      renderLibrary();
    });
  });

  // Sort
  document.getElementById('filter-sort').addEventListener('change', () => renderLibrary());

  // Apply filters
  document.getElementById('btn-apply-filters').addEventListener('click', () => renderLibrary());
  document.getElementById('btn-clear-filters').addEventListener('click', () => {
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-tool').value = '';
    document.getElementById('filter-rating').value = '';
    document.getElementById('filter-shot').value = '';
    document.getElementById('filter-angle').value = '';
    renderLibrary();
  });

  // Add media button
  document.getElementById('btn-add-media').addEventListener('click', () => openMediaModal());
}

// ── Dashboard Rendering ─────────────────────────────────────

async function renderDashboard() {
  const stats = await mediaDB.getStats();

  // Stats cards
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">🗂️</div>
      <div class="stat-value">${stats.totalMedia}</div>
      <div class="stat-label">登録メディア数</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🖼️</div>
      <div class="stat-value">${stats.totalImages}</div>
      <div class="stat-label">画像</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🎬</div>
      <div class="stat-value">${stats.totalVideos}</div>
      <div class="stat-label">動画</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⭐</div>
      <div class="stat-value">${stats.totalFavorites}</div>
      <div class="stat-label">お気に入り</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📁</div>
      <div class="stat-value">${stats.totalCategories}</div>
      <div class="stat-label">カテゴリ</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📝</div>
      <div class="stat-value">${stats.totalTemplates}</div>
      <div class="stat-label">テンプレート</div>
    </div>
  `;

  // Top tags
  const tagsDiv = document.getElementById('dashboard-top-tags');
  if (stats.topTags.length === 0) {
    tagsDiv.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">まだタグがありません</span>';
  } else {
    tagsDiv.innerHTML = stats.topTags.map(t =>
      `<div class="tag-item">${escapeHtml(t.name)} <span class="tag-count">(${t.count})</span></div>`
    ).join('');
  }

  // Tool usage
  const toolDiv = document.getElementById('dashboard-tool-usage');
  if (stats.toolUsage.length === 0) {
    toolDiv.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">まだデータがありません</span>';
  } else {
    const maxCount = Math.max(...stats.toolUsage.map(t => t.count));
    toolDiv.innerHTML = stats.toolUsage.map(t => `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <span style="width:120px; font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(t.name)}</span>
        <div style="flex:1; height:24px; background:var(--bg-tertiary); border-radius:4px; overflow:hidden;">
          <div style="width:${(t.count / maxCount * 100)}%; height:100%; background:linear-gradient(90deg, var(--accent), #a855f7); border-radius:4px; display:flex; align-items:center; padding-left:8px;">
            <span style="font-size:0.75rem; color:white; font-weight:600;">${t.count}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Recent media
  const allMedia = await mediaDB.getAllMedia();
  const recent = allMedia.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  renderMediaGrid(recent, 'dashboard-recent');
}

// ── Library Rendering ───────────────────────────────────────

async function renderLibrary() {
  // Populate filter options
  await populateFilterOptions();

  const sortVal = document.getElementById('filter-sort').value;
  const [sortBy, sortDir] = sortVal.split('-');

  const filters = {
    type: document.getElementById('filter-type').value || undefined,
    categoryId: document.getElementById('filter-category').value || undefined,
    aiTool: document.getElementById('filter-tool').value || undefined,
    rating: document.getElementById('filter-rating').value ? parseInt(document.getElementById('filter-rating').value) : undefined,
    shotType: document.getElementById('filter-shot').value || undefined,
    cameraAngle: document.getElementById('filter-angle').value || undefined,
    sortBy,
    sortDir,
  };

  const results = await mediaDB.filterMedia(filters);
  document.getElementById('library-count').textContent = `${results.length} 件`;

  if (libraryLayout === 'grid') {
    renderMediaGrid(results, 'library-content');
  } else {
    renderMediaList(results, 'library-content');
  }
}

async function populateFilterOptions() {
  // Categories
  const cats = await mediaDB.getAllCategories();
  const catSelect = document.getElementById('filter-category');
  const currentCat = catSelect.value;
  catSelect.innerHTML = '<option value="">すべて</option>' +
    cats.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');
  catSelect.value = currentCat;

  // AI Tools - from existing data
  const allMedia = await mediaDB.getAllMedia();
  const tools = [...new Set(allMedia.map(m => m.aiTool).filter(Boolean))];
  const toolSelect = document.getElementById('filter-tool');
  const currentTool = toolSelect.value;
  toolSelect.innerHTML = '<option value="">すべて</option>' +
    tools.map(t => `<option value="${t}">${escapeHtml(t)}</option>`).join('');
  toolSelect.value = currentTool;

  // Shot types used
  const shots = [...new Set(allMedia.map(m => m.composition?.shotType).filter(Boolean))];
  const shotSelect = document.getElementById('filter-shot');
  const currentShot = shotSelect.value;
  shotSelect.innerHTML = '<option value="">すべて</option>' +
    shots.map(s => `<option value="${s}">${SHOT_LABELS[s] || s}</option>`).join('');
  shotSelect.value = currentShot;

  // Camera angles used
  const angles = [...new Set(allMedia.map(m => m.composition?.cameraAngle).filter(Boolean))];
  const angleSelect = document.getElementById('filter-angle');
  const currentAngle = angleSelect.value;
  angleSelect.innerHTML = '<option value="">すべて</option>' +
    angles.map(a => `<option value="${a}">${ANGLE_LABELS[a] || a}</option>`).join('');
  angleSelect.value = currentAngle;
}

// ── Media Grid / List Rendering ─────────────────────────────

function renderMediaGrid(items, containerId) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>メディアがありません</h3>
        <p>「+ 新規登録」ボタンからAI生成メディアを登録しましょう</p>
        <button class="btn btn-primary" onclick="openMediaModal()">+ 新規登録</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="media-grid">${items.map(m => renderMediaCard(m)).join('')}</div>`;

  // Attach events
  container.querySelectorAll('.media-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-favorite')) return;
      showMediaDetail(card.dataset.id);
    });
  });

  container.querySelectorAll('.card-favorite').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.media-card').dataset.id;
      const media = await mediaDB.getMedia(id);
      media.isFavorite = !media.isFavorite;
      await mediaDB.saveMedia(media);
      btn.textContent = media.isFavorite ? '★' : '☆';
      showToast(media.isFavorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました', 'success');
    });
  });
}

function renderMediaCard(m) {
  const thumbnail = m.thumbnailDataUrl
    ? `<img src="${m.thumbnailDataUrl}" alt="${escapeHtml(m.title)}" loading="lazy">`
    : `<span class="placeholder-icon">${m.type === 'video' ? '🎬' : '🖼️'}</span>`;

  const tags = (m.tags || []).slice(0, 3).map(t =>
    `<span class="tag">${escapeHtml(t)}</span>`
  ).join('');

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < m.rating ? 'filled' : ''}">★</span>`
  ).join('');

  return `
    <div class="media-card" data-id="${m.id}">
      <div class="card-thumbnail">
        ${thumbnail}
        <span class="card-type-badge">${m.type === 'video' ? '動画' : '画像'}</span>
        <button class="card-favorite">${m.isFavorite ? '★' : '☆'}</button>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(m.title || '無題')}</div>
        <div class="card-meta">
          ${m.aiTool ? `<span class="tool-badge">${escapeHtml(m.aiTool)}</span>` : ''}
          <span>${formatDate(m.createdAt)}</span>
        </div>
        <div class="card-tags">${tags}</div>
        <div class="card-rating">${stars}</div>
      </div>
    </div>
  `;
}

function renderMediaList(items, containerId) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>メディアがありません</h3>
        <p>「+ 新規登録」ボタンからAI生成メディアを登録しましょう</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="media-list">${items.map(m => {
    const thumb = m.thumbnailDataUrl
      ? `<img src="${m.thumbnailDataUrl}" alt="" loading="lazy">`
      : '';
    const stars = m.rating > 0 ? '★'.repeat(m.rating) : '';
    const tags = (m.tags || []).slice(0, 3).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    return `
      <div class="media-list-item" data-id="${m.id}">
        <div class="list-thumb">${thumb}</div>
        <div class="list-info">
          <div class="list-title">${escapeHtml(m.title || '無題')}</div>
          <div class="list-meta">${m.aiTool || ''} | ${m.type === 'video' ? '動画' : '画像'} | ${formatDate(m.createdAt)}</div>
        </div>
        <div class="list-tags">${tags}</div>
        <div class="list-rating">${stars}</div>
      </div>
    `;
  }).join('')}</div>`;

  container.querySelectorAll('.media-list-item').forEach(item => {
    item.addEventListener('click', () => showMediaDetail(item.dataset.id));
  });
}

// ── Media Detail ────────────────────────────────────────────

async function showMediaDetail(id) {
  const m = await mediaDB.getMedia(id);
  if (!m) return;

  const category = m.categoryId ? await mediaDB.getCategory(m.categoryId) : null;
  const container = document.getElementById('detail-content');

  const thumbnail = m.thumbnailDataUrl
    ? `<img src="${m.thumbnailDataUrl}" alt="${escapeHtml(m.title)}">`
    : `<span class="placeholder-icon">${m.type === 'video' ? '🎬' : '🖼️'}</span>`;

  const tags = (m.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < m.rating ? 'filled' : ''}">★</span>`
  ).join('');

  container.innerHTML = `
    <div class="detail-view">
      <div>
        <div class="detail-preview">
          <div class="preview-area">${thumbnail}</div>
        </div>

        ${m.promptPositive ? `
          <div class="info-section" style="margin-top: 16px;">
            <h3>プロンプト</h3>
            <div class="prompt-label">ポジティブ</div>
            <div class="prompt-display">${escapeHtml(m.promptPositive)}</div>
            <button class="btn btn-sm prompt-copy-btn" onclick="copyToClipboard('${escapeJs(m.promptPositive)}')">📋 コピー</button>
            ${m.promptNegative ? `
              <div class="prompt-label" style="margin-top: 12px;">ネガティブ</div>
              <div class="prompt-display">${escapeHtml(m.promptNegative)}</div>
              <button class="btn btn-sm prompt-copy-btn" onclick="copyToClipboard('${escapeJs(m.promptNegative)}')">📋 コピー</button>
            ` : ''}
          </div>
        ` : ''}

        ${m.notes ? `
          <div class="info-section" style="margin-top: 16px;">
            <h3>メモ</h3>
            <div style="font-size:0.85rem; color:var(--text-secondary); white-space:pre-wrap;">${escapeHtml(m.notes)}</div>
          </div>
        ` : ''}

        ${m.learnings ? `
          <div class="info-section" style="margin-top: 16px;">
            <h3>学び・気づき</h3>
            <div style="font-size:0.85rem; color:var(--text-secondary); white-space:pre-wrap;">${escapeHtml(m.learnings)}</div>
          </div>
        ` : ''}
      </div>

      <div class="detail-info">
        <div class="info-section">
          <h3>基本情報</h3>
          <div style="font-size:1.2rem; font-weight:700; margin-bottom: 8px;">${escapeHtml(m.title || '無題')}</div>
          ${m.description ? `<div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">${escapeHtml(m.description)}</div>` : ''}
          <div class="card-rating" style="margin-bottom: 12px;">${stars}</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom: 12px;">${tags}</div>
          <div class="info-row"><span class="label">タイプ</span><span class="value">${m.type === 'video' ? '動画' : '画像'}</span></div>
          ${m.aiTool ? `<div class="info-row"><span class="label">AI ツール</span><span class="value">${escapeHtml(m.aiTool)}</span></div>` : ''}
          ${m.model ? `<div class="info-row"><span class="label">モデル</span><span class="value">${escapeHtml(m.model)}</span></div>` : ''}
          ${category ? `<div class="info-row"><span class="label">カテゴリ</span><span class="value">${category.icon} ${escapeHtml(category.name)}</span></div>` : ''}
          <div class="info-row"><span class="label">作成日</span><span class="value">${formatDate(m.createdAt)}</span></div>
          <div class="info-row"><span class="label">更新日</span><span class="value">${formatDate(m.updatedAt)}</span></div>
        </div>

        ${(m.composition && (m.composition.shotType || m.composition.cameraAngle || m.composition.cameraMovement || m.composition.lighting || m.composition.mood)) ? `
          <div class="info-section">
            <h3>カット割・構図</h3>
            ${m.composition.shotType ? `<div class="info-row"><span class="label">ショット</span><span class="value">${SHOT_LABELS[m.composition.shotType] || m.composition.shotType}</span></div>` : ''}
            ${m.composition.cameraAngle ? `<div class="info-row"><span class="label">アングル</span><span class="value">${ANGLE_LABELS[m.composition.cameraAngle] || m.composition.cameraAngle}</span></div>` : ''}
            ${m.composition.cameraMovement ? `<div class="info-row"><span class="label">カメラワーク</span><span class="value">${MOVEMENT_LABELS[m.composition.cameraMovement] || m.composition.cameraMovement}</span></div>` : ''}
            ${m.composition.lighting ? `<div class="info-row"><span class="label">ライティング</span><span class="value">${escapeHtml(m.composition.lighting)}</span></div>` : ''}
            ${m.composition.mood ? `<div class="info-row"><span class="label">ムード</span><span class="value">${escapeHtml(m.composition.mood)}</span></div>` : ''}
            ${m.composition.sceneDescription ? `<div style="margin-top:8px; font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(m.composition.sceneDescription)}</div>` : ''}
            ${m.composition.colorPalette && m.composition.colorPalette.length > 0 ? `
              <div style="margin-top:8px; display:flex; gap:4px;">
                ${m.composition.colorPalette.map(c => `<div style="width:24px;height:24px;border-radius:50%;background:${c};border:2px solid var(--border);"></div>`).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${hasParameters(m.parameters) ? `
          <div class="info-section">
            <h3>パラメータ</h3>
            ${m.parameters.seed ? `<div class="info-row"><span class="label">Seed</span><span class="value">${m.parameters.seed}</span></div>` : ''}
            ${m.parameters.steps ? `<div class="info-row"><span class="label">Steps</span><span class="value">${m.parameters.steps}</span></div>` : ''}
            ${m.parameters.cfgScale ? `<div class="info-row"><span class="label">CFG Scale</span><span class="value">${m.parameters.cfgScale}</span></div>` : ''}
            ${m.parameters.sampler ? `<div class="info-row"><span class="label">サンプラー</span><span class="value">${escapeHtml(m.parameters.sampler)}</span></div>` : ''}
            ${m.parameters.scheduler ? `<div class="info-row"><span class="label">スケジューラー</span><span class="value">${escapeHtml(m.parameters.scheduler)}</span></div>` : ''}
            ${m.parameters.denoise ? `<div class="info-row"><span class="label">Denoise</span><span class="value">${m.parameters.denoise}</span></div>` : ''}
            ${m.parameters.resolution ? `<div class="info-row"><span class="label">解像度</span><span class="value">${escapeHtml(m.parameters.resolution)}</span></div>` : ''}
            ${m.parameters.aspectRatio ? `<div class="info-row"><span class="label">アスペクト比</span><span class="value">${escapeHtml(m.parameters.aspectRatio)}</span></div>` : ''}
            ${m.parameters.fps ? `<div class="info-row"><span class="label">FPS</span><span class="value">${m.parameters.fps}</span></div>` : ''}
            ${m.parameters.duration ? `<div class="info-row"><span class="label">長さ</span><span class="value">${m.parameters.duration}秒</span></div>` : ''}
          </div>
        ` : ''}

        ${(m.referenceUrls && m.referenceUrls.length > 0) ? `
          <div class="info-section">
            <h3>参考リンク</h3>
            ${m.referenceUrls.map(u => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" style="display:block; font-size:0.85rem; color:var(--accent-light); margin-bottom:4px; word-break:break-all;">${escapeHtml(u)}</a>`).join('')}
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="openMediaModal('${m.id}')" style="flex:1;">編集</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMediaConfirm('${m.id}')" style="flex:1;">削除</button>
        </div>
      </div>
    </div>
  `;

  // Switch view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-detail').classList.add('active');

  document.getElementById('btn-back-to-library').onclick = () => {
    switchView('library');
  };
}

function hasParameters(p) {
  if (!p) return false;
  return p.seed || p.steps || p.cfgScale || p.sampler || p.scheduler ||
    p.denoise || p.resolution || p.aspectRatio || p.fps || p.duration;
}

async function deleteMediaConfirm(id) {
  if (confirm('このメディアを削除しますか？この操作は取り消せません。')) {
    await mediaDB.deleteMedia(id);
    showToast('メディアを削除しました', 'success');
    switchView('library');
  }
}

// ── Favorites Rendering ─────────────────────────────────────

async function renderFavorites() {
  const favs = await mediaDB.getFavorites();
  const container = document.getElementById('favorites-grid');
  if (favs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>お気に入りはまだありません</h3>
        <p>メディアカードの★をクリックしてお気に入りに追加しましょう</p>
      </div>
    `;
    return;
  }
  renderMediaGrid(favs, 'favorites-grid');
}

// ── Categories Rendering ────────────────────────────────────

async function renderCategories() {
  const cats = await mediaDB.getAllCategories();
  const allMedia = await mediaDB.getAllMedia();
  const container = document.getElementById('category-list');

  if (cats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>カテゴリがありません</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = cats.map(c => {
    const count = allMedia.filter(m => m.categoryId === c.id).length;
    return `
      <div class="category-item" data-id="${c.id}">
        <div class="cat-icon" style="background: ${c.color}20; color: ${c.color};">${c.icon}</div>
        <div class="cat-info">
          <div class="cat-name">${escapeHtml(c.name)}</div>
          <div class="cat-count">${count} メディア</div>
        </div>
        <div class="cat-actions">
          <button class="btn btn-ghost btn-sm cat-edit" title="編集">✏️</button>
          <button class="btn btn-ghost btn-sm cat-delete" title="削除">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Events
  container.querySelectorAll('.category-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.cat-edit') || e.target.closest('.cat-delete')) return;
      // Show media for this category
      document.getElementById('filter-category').value = item.dataset.id;
      switchView('library');
    });
  });

  container.querySelectorAll('.cat-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.category-item').dataset.id;
      openCategoryModal(id);
    });
  });

  container.querySelectorAll('.cat-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.category-item').dataset.id;
      if (confirm('このカテゴリを削除しますか？')) {
        await mediaDB.deleteCategory(id);
        showToast('カテゴリを削除しました', 'success');
        await renderCategories();
        await updateStorageInfo();
      }
    });
  });

  // Add button
  document.getElementById('btn-add-category').onclick = () => openCategoryModal();
}

// ── Collections Rendering ───────────────────────────────────

async function renderCollections() {
  const collections = await mediaDB.getAllCollections();
  const container = document.getElementById('collection-grid');

  if (collections.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>コレクションがありません</h3>
        <p>関連するメディアをグループ化して管理しましょう</p>
        <button class="btn btn-primary" onclick="openCollectionModal()">+ コレクション作成</button>
      </div>
    `;
    return;
  }

  let html = '';
  for (const col of collections) {
    const mediaItems = await mediaDB.getCollectionMedia(col.id);
    const thumbs = mediaItems.slice(0, 4).map(m =>
      m.thumbnailDataUrl
        ? `<div class="preview-thumb"><img src="${m.thumbnailDataUrl}" alt="" loading="lazy"></div>`
        : `<div class="preview-thumb"></div>`
    ).join('');

    html += `
      <div class="collection-card" data-id="${col.id}">
        <div class="col-header">
          <span class="col-name">${escapeHtml(col.name)}</span>
          <span class="col-count">${col.mediaIds.length} 件</span>
        </div>
        ${col.description ? `<div class="col-description">${escapeHtml(col.description)}</div>` : ''}
        <div class="col-preview">${thumbs}</div>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('click', () => {
      openCollectionModal(card.dataset.id);
    });
  });

  document.getElementById('btn-add-collection').onclick = () => openCollectionModal();
}

// ── Tags Rendering ──────────────────────────────────────────

async function renderTags() {
  const allMedia = await mediaDB.getAllMedia();
  const tagMap = {};
  allMedia.forEach(m => {
    (m.tags || []).forEach(t => {
      tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });

  const tags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
  const container = document.getElementById('tags-cloud');

  if (tags.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="width:100%;">
        <div class="empty-icon">🏷️</div>
        <h3>タグがありません</h3>
        <p>メディアにタグを追加するとここに表示されます</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tags.map(([name, count]) => {
    const size = Math.max(0.8, Math.min(1.5, 0.8 + count * 0.15));
    return `<div class="tag-item" style="font-size:${size}rem;" data-tag="${escapeHtml(name)}">${escapeHtml(name)} <span class="tag-count">(${count})</span></div>`;
  }).join('');

  container.querySelectorAll('.tag-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('global-search').value = item.dataset.tag;
      document.getElementById('global-search').dispatchEvent(new Event('input'));
    });
  });
}

// ── Templates Rendering ─────────────────────────────────────

async function renderTemplates() {
  const templates = await mediaDB.getAllPromptTemplates();
  const container = document.getElementById('template-list');

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>テンプレートがありません</h3>
        <p>よく使うプロンプトパターンをテンプレートとして保存しましょう</p>
        <button class="btn btn-primary" onclick="openTemplateModal()">+ テンプレート追加</button>
      </div>
    `;
    return;
  }

  container.innerHTML = templates.map(t => `
    <div class="template-card" data-id="${t.id}">
      <div class="tmpl-header">
        <span class="tmpl-name">${escapeHtml(t.name)}</span>
        ${t.aiTool ? `<span class="tmpl-tool">${escapeHtml(t.aiTool)}</span>` : ''}
      </div>
      ${t.category ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">カテゴリ: ${escapeHtml(t.category)}</div>` : ''}
      <div class="tmpl-prompt">${escapeHtml(t.promptPositive || '')}</div>
      ${t.notes ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">${escapeHtml(t.notes)}</div>` : ''}
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-sm tmpl-copy" title="プロンプトをコピー">📋 コピー</button>
        <button class="btn btn-sm tmpl-edit" title="編集">✏️ 編集</button>
        <button class="btn btn-sm btn-danger tmpl-delete" title="削除">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.tmpl-copy').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.template-card').dataset.id;
      const t = await mediaDB.getPromptTemplate(id);
      copyToClipboard(t.promptPositive);
    });
  });

  container.querySelectorAll('.tmpl-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.closest('.template-card').dataset.id;
      openTemplateModal(id);
    });
  });

  container.querySelectorAll('.tmpl-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.template-card').dataset.id;
      if (confirm('このテンプレートを削除しますか？')) {
        await mediaDB.deletePromptTemplate(id);
        showToast('テンプレートを削除しました', 'success');
        await renderTemplates();
        await updateStorageInfo();
      }
    });
  });

  document.getElementById('btn-add-template').onclick = () => openTemplateModal();
}

// ── Modal Management ────────────────────────────────────────

function initModals() {
  // Close handlers
  ['media', 'category', 'collection', 'template'].forEach(name => {
    const overlay = document.getElementById(`modal-${name}`);
    document.getElementById(`modal-${name}-close`).addEventListener('click', () => closeModal(name));
    document.getElementById(`modal-${name}-cancel`).addEventListener('click', () => closeModal(name));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(name);
    });
  });

  // Save handlers
  document.getElementById('modal-media-save').addEventListener('click', saveMedia);
  document.getElementById('modal-category-save').addEventListener('click', saveCategory);
  document.getElementById('modal-collection-save').addEventListener('click', saveCollection);
  document.getElementById('modal-template-save').addEventListener('click', saveTemplate);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabGroup = tab.parentElement;
      const contentParent = tabGroup.parentElement;
      tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      contentParent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      contentParent.querySelector(`.tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
    });
  });
}

function openModal(name) {
  document.getElementById(`modal-${name}`).classList.add('open');
}

function closeModal(name) {
  document.getElementById(`modal-${name}`).classList.remove('open');
}

// ── Media Form ──────────────────────────────────────────────

function initMediaForm() {
  // Thumbnail upload
  const upload = document.getElementById('thumbnail-upload');
  const input = document.getElementById('thumbnail-input');

  upload.addEventListener('click', () => input.click());
  upload.addEventListener('dragover', (e) => { e.preventDefault(); upload.style.borderColor = 'var(--accent)'; });
  upload.addEventListener('dragleave', () => { upload.style.borderColor = ''; });
  upload.addEventListener('drop', (e) => {
    e.preventDefault();
    upload.style.borderColor = '';
    if (e.dataTransfer.files[0]) handleThumbnailFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handleThumbnailFile(input.files[0]);
  });

  // Rating
  document.querySelectorAll('#media-rating .star').forEach(star => {
    star.addEventListener('click', () => {
      currentRating = parseInt(star.dataset.value);
      updateRatingDisplay();
    });
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.value);
      document.querySelectorAll('#media-rating .star').forEach((s, i) => {
        s.classList.toggle('filled', i < val);
      });
    });
  });

  document.getElementById('media-rating').addEventListener('mouseleave', () => {
    updateRatingDisplay();
  });

  // Color palette
  const colorPicker = document.getElementById('color-picker');
  document.getElementById('add-color-btn').addEventListener('click', () => colorPicker.click());
  colorPicker.addEventListener('change', () => {
    if (currentColors.length < 8) {
      currentColors.push(colorPicker.value);
      renderColorPalette();
    }
  });
}

function handleThumbnailFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('画像ファイルを選択してください', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // Resize for storage efficiency
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = h * maxDim / w; w = maxDim; }
        else { w = w * maxDim / h; h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      currentThumbnail = canvas.toDataURL('image/jpeg', 0.85);
      const upload = document.getElementById('thumbnail-upload');
      upload.innerHTML = `<img src="${currentThumbnail}" alt="thumbnail">`;
      upload.classList.add('has-image');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateRatingDisplay() {
  document.querySelectorAll('#media-rating .star').forEach((s, i) => {
    s.classList.toggle('filled', i < currentRating);
  });
}

function renderColorPalette() {
  const palette = document.getElementById('color-palette');
  const swatches = currentColors.map((c, i) =>
    `<div class="color-swatch" style="background:${c}" data-index="${i}" title="クリックで削除"></div>`
  ).join('');
  palette.innerHTML = swatches +
    '<div class="color-swatch add-color" id="add-color-btn" title="色を追加">+</div>';

  // Re-bind
  document.getElementById('add-color-btn').addEventListener('click', () =>
    document.getElementById('color-picker').click()
  );
  palette.querySelectorAll('.color-swatch:not(.add-color)').forEach(swatch => {
    swatch.addEventListener('click', () => {
      currentColors.splice(parseInt(swatch.dataset.index), 1);
      renderColorPalette();
    });
  });
}

async function openMediaModal(id = null) {
  editingMediaId = id;
  document.getElementById('modal-media-title').textContent = id ? 'メディアを編集' : 'メディアを登録';

  // Reset form
  currentRating = 0;
  currentColors = [];
  currentThumbnail = '';

  // Reset tabs
  document.querySelectorAll('#media-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  document.querySelectorAll('#modal-media .tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));

  // Populate category select
  const cats = await mediaDB.getAllCategories();
  const catSelect = document.getElementById('media-category');
  catSelect.innerHTML = '<option value="">なし</option>' +
    cats.map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');

  if (id) {
    const m = await mediaDB.getMedia(id);
    if (!m) return;

    document.getElementById('media-title').value = m.title || '';
    document.getElementById('media-type').value = m.type || 'image';
    document.getElementById('media-description').value = m.description || '';
    document.getElementById('media-tool').value = m.aiTool || '';
    document.getElementById('media-model').value = m.model || '';
    document.getElementById('media-category').value = m.categoryId || '';
    document.getElementById('media-tags').value = (m.tags || []).join(', ');
    document.getElementById('media-file-url').value = m.fileUrl || '';

    document.getElementById('media-prompt-pos').value = m.promptPositive || '';
    document.getElementById('media-prompt-neg').value = m.promptNegative || '';

    document.getElementById('media-shot-type').value = m.composition?.shotType || '';
    document.getElementById('media-camera-angle').value = m.composition?.cameraAngle || '';
    document.getElementById('media-camera-movement').value = m.composition?.cameraMovement || '';
    document.getElementById('media-lighting').value = m.composition?.lighting || '';
    document.getElementById('media-mood').value = m.composition?.mood || '';
    document.getElementById('media-scene').value = m.composition?.sceneDescription || '';

    document.getElementById('param-seed').value = m.parameters?.seed || '';
    document.getElementById('param-steps').value = m.parameters?.steps || '';
    document.getElementById('param-cfg').value = m.parameters?.cfgScale || '';
    document.getElementById('param-sampler').value = m.parameters?.sampler || '';
    document.getElementById('param-scheduler').value = m.parameters?.scheduler || '';
    document.getElementById('param-denoise').value = m.parameters?.denoise || '';
    document.getElementById('param-resolution').value = m.parameters?.resolution || '';
    document.getElementById('param-aspect').value = m.parameters?.aspectRatio || '';
    document.getElementById('param-fps').value = m.parameters?.fps || '';
    document.getElementById('param-duration').value = m.parameters?.duration || '';

    document.getElementById('media-notes').value = m.notes || '';
    document.getElementById('media-learnings').value = m.learnings || '';
    document.getElementById('media-ref-urls').value = (m.referenceUrls || []).join('\n');

    currentRating = m.rating || 0;
    currentColors = m.composition?.colorPalette || [];
    currentThumbnail = m.thumbnailDataUrl || '';
  } else {
    // Clear form
    ['media-title', 'media-description', 'media-model', 'media-tags', 'media-file-url',
      'media-prompt-pos', 'media-prompt-neg', 'media-lighting', 'media-mood', 'media-scene',
      'param-seed', 'param-steps', 'param-cfg', 'param-sampler', 'param-scheduler',
      'param-denoise', 'param-resolution', 'param-aspect', 'param-fps', 'param-duration',
      'media-notes', 'media-learnings', 'media-ref-urls'
    ].forEach(id => document.getElementById(id).value = '');
    document.getElementById('media-type').value = 'image';
    document.getElementById('media-tool').value = '';
    document.getElementById('media-category').value = '';
    document.getElementById('media-shot-type').value = '';
    document.getElementById('media-camera-angle').value = '';
    document.getElementById('media-camera-movement').value = '';
  }

  // Update displays
  updateRatingDisplay();
  renderColorPalette();

  const upload = document.getElementById('thumbnail-upload');
  if (currentThumbnail) {
    upload.innerHTML = `<img src="${currentThumbnail}" alt="thumbnail">`;
    upload.classList.add('has-image');
  } else {
    upload.innerHTML = '<span class="upload-icon">📷</span><span class="upload-text">クリックまたはドラッグ&ドロップで画像をアップロード</span>';
    upload.classList.remove('has-image');
  }

  openModal('media');
}

async function saveMedia() {
  const title = document.getElementById('media-title').value.trim();
  if (!title) {
    showToast('タイトルは必須です', 'error');
    return;
  }

  const refUrlsRaw = document.getElementById('media-ref-urls').value.trim();
  const referenceUrls = refUrlsRaw ? refUrlsRaw.split('\n').map(u => u.trim()).filter(Boolean) : [];

  const tagsRaw = document.getElementById('media-tags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const data = {
    id: editingMediaId || undefined,
    title,
    type: document.getElementById('media-type').value,
    description: document.getElementById('media-description').value.trim(),
    aiTool: document.getElementById('media-tool').value,
    model: document.getElementById('media-model').value.trim(),
    categoryId: document.getElementById('media-category').value,
    tags,
    rating: currentRating,
    fileUrl: document.getElementById('media-file-url').value.trim(),
    thumbnailDataUrl: currentThumbnail,

    promptPositive: document.getElementById('media-prompt-pos').value.trim(),
    promptNegative: document.getElementById('media-prompt-neg').value.trim(),

    composition: {
      shotType: document.getElementById('media-shot-type').value,
      cameraAngle: document.getElementById('media-camera-angle').value,
      cameraMovement: document.getElementById('media-camera-movement').value,
      lighting: document.getElementById('media-lighting').value.trim(),
      mood: document.getElementById('media-mood').value.trim(),
      sceneDescription: document.getElementById('media-scene').value.trim(),
      colorPalette: currentColors,
    },

    parameters: {
      seed: document.getElementById('param-seed').value ? parseInt(document.getElementById('param-seed').value) : null,
      steps: document.getElementById('param-steps').value ? parseInt(document.getElementById('param-steps').value) : null,
      cfgScale: document.getElementById('param-cfg').value ? parseFloat(document.getElementById('param-cfg').value) : null,
      sampler: document.getElementById('param-sampler').value.trim(),
      scheduler: document.getElementById('param-scheduler').value.trim(),
      denoise: document.getElementById('param-denoise').value ? parseFloat(document.getElementById('param-denoise').value) : null,
      resolution: document.getElementById('param-resolution').value.trim(),
      aspectRatio: document.getElementById('param-aspect').value.trim(),
      fps: document.getElementById('param-fps').value ? parseInt(document.getElementById('param-fps').value) : null,
      duration: document.getElementById('param-duration').value ? parseFloat(document.getElementById('param-duration').value) : null,
    },

    notes: document.getElementById('media-notes').value.trim(),
    learnings: document.getElementById('media-learnings').value.trim(),
    referenceUrls,
  };

  // Preserve existing fields when editing
  if (editingMediaId) {
    const existing = await mediaDB.getMedia(editingMediaId);
    if (existing) {
      data.isFavorite = existing.isFavorite;
      data.collectionIds = existing.collectionIds;
      data.createdAt = existing.createdAt;
    }
  }

  await mediaDB.saveMedia(data);
  closeModal('media');
  showToast(editingMediaId ? 'メディアを更新しました' : 'メディアを登録しました', 'success');
  await refreshCurrentView();
  await updateStorageInfo();
}

// ── Category Modal ──────────────────────────────────────────

async function openCategoryModal(id = null) {
  editingCategoryId = id;
  document.getElementById('modal-category-title').textContent = id ? 'カテゴリを編集' : 'カテゴリを追加';

  // Populate parent select
  const cats = await mediaDB.getAllCategories();
  const parentSelect = document.getElementById('cat-parent');
  parentSelect.innerHTML = '<option value="">なし (トップレベル)</option>' +
    cats.filter(c => c.id !== id).map(c => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');

  if (id) {
    const cat = await mediaDB.getCategory(id);
    document.getElementById('cat-name').value = cat.name || '';
    document.getElementById('cat-icon').value = cat.icon || '📁';
    document.getElementById('cat-color').value = cat.color || '#6366f1';
    document.getElementById('cat-parent').value = cat.parentId || '';
    document.getElementById('cat-description').value = cat.description || '';
  } else {
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = '📁';
    document.getElementById('cat-color').value = '#6366f1';
    document.getElementById('cat-parent').value = '';
    document.getElementById('cat-description').value = '';
  }

  openModal('category');
}

async function saveCategory() {
  const name = document.getElementById('cat-name').value.trim();
  if (!name) {
    showToast('カテゴリ名は必須です', 'error');
    return;
  }

  const data = {
    id: editingCategoryId || undefined,
    name,
    icon: document.getElementById('cat-icon').value || '📁',
    color: document.getElementById('cat-color').value,
    parentId: document.getElementById('cat-parent').value || null,
    description: document.getElementById('cat-description').value.trim(),
  };

  if (editingCategoryId) {
    const existing = await mediaDB.getCategory(editingCategoryId);
    data.order = existing.order;
  } else {
    const cats = await mediaDB.getAllCategories();
    data.order = cats.length + 1;
  }

  await mediaDB.saveCategory(editingCategoryId ? data : mediaDB.createCategory(data));
  closeModal('category');
  showToast(editingCategoryId ? 'カテゴリを更新しました' : 'カテゴリを追加しました', 'success');
  await renderCategories();
  await updateStorageInfo();
}

// ── Collection Modal ────────────────────────────────────────

async function openCollectionModal(id = null) {
  editingCollectionId = id;
  document.getElementById('modal-collection-title').textContent = id ? 'コレクションを編集' : 'コレクションを作成';

  if (id) {
    const col = await mediaDB.getCollection(id);
    document.getElementById('col-name').value = col.name || '';
    document.getElementById('col-description').value = col.description || '';
  } else {
    document.getElementById('col-name').value = '';
    document.getElementById('col-description').value = '';
  }

  openModal('collection');
}

async function saveCollection() {
  const name = document.getElementById('col-name').value.trim();
  if (!name) {
    showToast('コレクション名は必須です', 'error');
    return;
  }

  const data = {
    id: editingCollectionId || undefined,
    name,
    description: document.getElementById('col-description').value.trim(),
  };

  if (editingCollectionId) {
    const existing = await mediaDB.getCollection(editingCollectionId);
    data.mediaIds = existing.mediaIds;
    data.coverMediaId = existing.coverMediaId;
    data.createdAt = existing.createdAt;
  }

  await mediaDB.saveCollection(editingCollectionId ? data : mediaDB.createCollection(data));
  closeModal('collection');
  showToast(editingCollectionId ? 'コレクションを更新しました' : 'コレクションを作成しました', 'success');
  await renderCollections();
  await updateStorageInfo();
}

// ── Template Modal ──────────────────────────────────────────

async function openTemplateModal(id = null) {
  editingTemplateId = id;
  document.getElementById('modal-template-title').textContent = id ? 'テンプレートを編集' : 'テンプレートを追加';

  if (id) {
    const t = await mediaDB.getPromptTemplate(id);
    document.getElementById('tmpl-name').value = t.name || '';
    document.getElementById('tmpl-tool').value = t.aiTool || '';
    document.getElementById('tmpl-category').value = t.category || '';
    document.getElementById('tmpl-prompt-pos').value = t.promptPositive || '';
    document.getElementById('tmpl-prompt-neg').value = t.promptNegative || '';
    document.getElementById('tmpl-notes').value = t.notes || '';
  } else {
    ['tmpl-name', 'tmpl-category', 'tmpl-prompt-pos', 'tmpl-prompt-neg', 'tmpl-notes'].forEach(
      id => document.getElementById(id).value = ''
    );
    document.getElementById('tmpl-tool').value = '';
  }

  openModal('template');
}

async function saveTemplate() {
  const name = document.getElementById('tmpl-name').value.trim();
  if (!name) {
    showToast('テンプレート名は必須です', 'error');
    return;
  }

  const data = {
    id: editingTemplateId || undefined,
    name,
    aiTool: document.getElementById('tmpl-tool').value,
    category: document.getElementById('tmpl-category').value.trim(),
    promptPositive: document.getElementById('tmpl-prompt-pos').value.trim(),
    promptNegative: document.getElementById('tmpl-prompt-neg').value.trim(),
    notes: document.getElementById('tmpl-notes').value.trim(),
  };

  if (editingTemplateId) {
    const existing = await mediaDB.getPromptTemplate(editingTemplateId);
    data.createdAt = existing.createdAt;
    data.usageCount = existing.usageCount;
  }

  await mediaDB.savePromptTemplate(
    editingTemplateId ? data : mediaDB.createPromptTemplate(data)
  );
  closeModal('template');
  showToast(editingTemplateId ? 'テンプレートを更新しました' : 'テンプレートを追加しました', 'success');
  await renderTemplates();
  await updateStorageInfo();
}

// ── Settings / Import / Export ───────────────────────────────

function initSettings() {
  // Export
  document.getElementById('btn-export').addEventListener('click', async () => {
    const data = await mediaDB.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-media-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('エクスポートが完了しました', 'success');
  });

  // Import
  const importFile = document.getElementById('import-file');
  document.getElementById('btn-import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const mode = document.getElementById('import-mode').value;

      if (mode === 'replace' && !confirm('既存のすべてのデータが削除されます。続行しますか？')) {
        return;
      }

      const result = await mediaDB.importAll(json, mode);
      showToast(
        `インポート完了: ${result.media}メディア, ${result.categories}カテゴリ, ${result.collections}コレクション, ${result.promptTemplates}テンプレート`,
        'success'
      );
      await refreshCurrentView();
      await updateStorageInfo();
    } catch (err) {
      showToast('インポートに失敗しました: ' + err.message, 'error');
    }
    importFile.value = '';
  });

  // Clear all
  document.getElementById('btn-clear-all').addEventListener('click', async () => {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      if (confirm('本当に削除しますか？（2回目の確認）')) {
        await mediaDB.importAll({ version: 1, data: { media: [], categories: [], collections: [], promptTemplates: [] } }, 'replace');
        await mediaDB.seedDefaultCategories();
        showToast('すべてのデータを削除しました', 'success');
        await refreshCurrentView();
        await updateStorageInfo();
      }
    }
  });
}

// ── Utility Functions ───────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeJs(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('クリップボードにコピーしました', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('クリップボードにコピーしました', 'success');
  });
}
