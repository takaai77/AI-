/**
 * options.js
 * ─────────────────────────────────────────────
 * 設定画面のロジック。
 * Webhook URL、メッセージ件数、カスタムプロンプト、
 * テンプレートの管理（追加・編集・削除）を行う。
 *
 * 注意:
 *   - APIキーはここに保存しない
 *   - カスタムプロンプトに機密情報を書かないよう案内する
 */

(() => {
  'use strict';

  // ── DOM参照 ──
  const webhookInput = document.getElementById('webhookUrl');
  const limitInput = document.getElementById('messageLimit');
  const customPromptInput = document.getElementById('customPrompt');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const templateListEl = document.getElementById('templateList');
  const addTemplateBtn = document.getElementById('addTemplateBtn');
  const tplNameInput = document.getElementById('tplName');
  const tplIntentInput = document.getElementById('tplIntent');
  const tplIconInput = document.getElementById('tplIcon');
  const tplCategoryInput = document.getElementById('tplCategory');
  const tplToneSelect = document.getElementById('tplTone');

  // ── テンプレートストレージキー（templates.js と同じ） ──
  const STORAGE_KEY_TEMPLATES = 'cwAiTemplates';
  const STORAGE_KEY_PROMPT = 'cwAiCustomPrompt';

  // ─────────────────────────────────────────────
  // 設定の読み込み・保存
  // ─────────────────────────────────────────────

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['cwAiSettings', STORAGE_KEY_PROMPT]);
      const settings = result.cwAiSettings || {};

      if (settings.webhookUrl) webhookInput.value = settings.webhookUrl;
      if (settings.messageLimit) limitInput.value = settings.messageLimit;

      // カスタムプロンプト
      if (result[STORAGE_KEY_PROMPT]) {
        customPromptInput.value = result[STORAGE_KEY_PROMPT];
      }
    } catch (e) {
      console.warn('設定の読み込みに失敗');
    }
  }

  async function saveSettings() {
    const webhookUrl = webhookInput.value.trim();
    const messageLimit = parseInt(limitInput.value, 10) || 5;
    const customPrompt = customPromptInput.value.trim();

    // バリデーション
    if (webhookUrl && !isValidUrl(webhookUrl)) {
      showStatus('URLの形式が正しくありません', true);
      return;
    }
    if (messageLimit < 1 || messageLimit > 20) {
      showStatus('メッセージ件数は1〜20の範囲で指定してください', true);
      return;
    }

    try {
      await chrome.storage.local.set({
        cwAiSettings: { webhookUrl, messageLimit },
        [STORAGE_KEY_PROMPT]: customPrompt,
      });
      showStatus('保存しました ✓', false);
    } catch (e) {
      showStatus('保存に失敗しました', true);
    }
  }

  // ─────────────────────────────────────────────
  // テンプレート管理
  // ─────────────────────────────────────────────

  /**
   * テンプレート一覧を描画する
   */
  async function renderTemplates() {
    // 子要素クリア
    while (templateListEl.firstChild) {
      templateListEl.removeChild(templateListEl.firstChild);
    }

    // プリセット
    const presetHeader = document.createElement('h4');
    presetHeader.className = 'options-tpl-group-title';
    presetHeader.textContent = 'プリセットテンプレート（編集不可）';
    templateListEl.appendChild(presetHeader);

    // ── プリセット一覧は定数から取得 ──
    const PRESETS = [
      { id: 'preset_thanks', name: 'お礼の返信', icon: '🙏', intent: '感謝の気持ちを込めて丁寧にお礼を伝えたい', tone: 'polite', category: '基本' },
      { id: 'preset_confirm', name: '確認・承知', icon: '✅', intent: '内容を確認したことを伝え、承知した旨を返信したい', tone: 'neutral', category: '基本' },
      { id: 'preset_decline', name: 'やんわりお断り', icon: '🙇', intent: '丁寧にお断りしたい。相手を傷つけないように配慮する', tone: 'soft', category: '基本' },
      { id: 'preset_ask', name: '質問・確認依頼', icon: '❓', intent: '不明点を質問したい。相手に確認をお願いする', tone: 'polite', category: '基本' },
      { id: 'preset_schedule', name: '日程調整', icon: '📅', intent: '日程の候補を提案、または調整をお願いしたい', tone: 'polite', category: '業務' },
      { id: 'preset_report', name: '進捗報告', icon: '📊', intent: '作業の進捗状況を簡潔に報告したい', tone: 'neutral', category: '業務' },
      { id: 'preset_apologize', name: 'お詫び', icon: '💦', intent: '遅延やミスについてお詫びし、対応策を伝えたい', tone: 'polite', category: '基本' },
      { id: 'preset_request', name: '依頼・お願い', icon: '📝', intent: '相手にタスクや対応をお願いしたい。丁寧に依頼する', tone: 'polite', category: '業務' },
    ];

    for (const tpl of PRESETS) {
      templateListEl.appendChild(createTemplateRow(tpl, true));
    }

    // ユーザー定義
    let userTemplates = [];
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_TEMPLATES);
      userTemplates = result[STORAGE_KEY_TEMPLATES] || [];
    } catch (e) { /* ignore */ }

    if (userTemplates.length > 0) {
      const userHeader = document.createElement('h4');
      userHeader.className = 'options-tpl-group-title';
      userHeader.textContent = 'カスタムテンプレート';
      templateListEl.appendChild(userHeader);

      for (const tpl of userTemplates) {
        templateListEl.appendChild(createTemplateRow(tpl, false));
      }
    }
  }

  /**
   * テンプレート1行のDOM要素を作る
   */
  function createTemplateRow(tpl, isPreset) {
    const row = document.createElement('div');
    row.className = 'options-tpl-row' + (isPreset ? ' options-tpl-row--preset' : '');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'options-tpl-icon';
    iconSpan.textContent = tpl.icon || '📌';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'options-tpl-name';
    nameSpan.textContent = tpl.name;

    const intentSpan = document.createElement('span');
    intentSpan.className = 'options-tpl-intent';
    intentSpan.textContent = tpl.intent;
    intentSpan.title = tpl.intent;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'options-tpl-meta';
    metaSpan.textContent = (tpl.category || '') + (tpl.tone ? ' / ' + toneLabel(tpl.tone) : '');

    const infoDiv = document.createElement('div');
    infoDiv.className = 'options-tpl-info';
    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(intentSpan);
    infoDiv.appendChild(metaSpan);

    row.appendChild(iconSpan);
    row.appendChild(infoDiv);

    if (!isPreset) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'options-btn options-btn--danger options-btn--small';
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => handleDeleteTemplate(tpl.id));
      row.appendChild(deleteBtn);
    }

    return row;
  }

  /**
   * テンプレート追加ハンドラ
   */
  async function handleAddTemplate() {
    const name = tplNameInput.value.trim();
    const intent = tplIntentInput.value.trim();
    const icon = tplIconInput.value.trim() || '📌';
    const category = tplCategoryInput.value.trim() || 'カスタム';
    const tone = tplToneSelect.value;

    if (!name) {
      showStatus('テンプレート名を入力してください', true);
      return;
    }
    if (!intent) {
      showStatus('AIへの指示を入力してください', true);
      return;
    }

    try {
      let templates = [];
      const result = await chrome.storage.local.get(STORAGE_KEY_TEMPLATES);
      templates = result[STORAGE_KEY_TEMPLATES] || [];

      const newTemplate = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name,
        intent,
        tone,
        isPreset: false,
        icon,
        category,
      };

      templates.push(newTemplate);
      await chrome.storage.local.set({ [STORAGE_KEY_TEMPLATES]: templates });

      // フォームクリア
      tplNameInput.value = '';
      tplIntentInput.value = '';
      tplIconInput.value = '';
      tplCategoryInput.value = '';
      tplToneSelect.value = 'neutral';

      showStatus('テンプレートを追加しました ✓', false);
      renderTemplates();
    } catch (e) {
      showStatus('テンプレートの追加に失敗しました', true);
    }
  }

  /**
   * テンプレート削除ハンドラ
   */
  async function handleDeleteTemplate(id) {
    if (!confirm('このテンプレートを削除しますか？')) return;

    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_TEMPLATES);
      let templates = result[STORAGE_KEY_TEMPLATES] || [];
      templates = templates.filter(t => t.id !== id);
      await chrome.storage.local.set({ [STORAGE_KEY_TEMPLATES]: templates });

      showStatus('テンプレートを削除しました', false);
      renderTemplates();
    } catch (e) {
      showStatus('削除に失敗しました', true);
    }
  }

  // ─────────────────────────────────────────────
  // ユーティリティ
  // ─────────────────────────────────────────────

  function toneLabel(tone) {
    const map = { neutral: '通常', polite: '丁寧', soft: 'やわらかい', short: '短い', summary: '要点のみ' };
    return map[tone] || tone;
  }

  function showStatus(message, isError) {
    saveStatus.textContent = message;
    saveStatus.style.color = isError ? '#d73a49' : '#2da44e';
    setTimeout(() => { saveStatus.textContent = ''; }, 3000);
  }

  function isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // イベントリスナー
  // ─────────────────────────────────────────────
  saveBtn.addEventListener('click', saveSettings);
  addTemplateBtn.addEventListener('click', handleAddTemplate);

  // ─────────────────────────────────────────────
  // 初期読み込み
  // ─────────────────────────────────────────────
  loadSettings();
  renderTemplates();
})();
