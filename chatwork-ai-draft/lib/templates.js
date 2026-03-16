/**
 * templates.js
 * ─────────────────────────────────────────────
 * テンプレート（定型文）とカスタムプロンプトの管理モジュール。
 *
 * 機能:
 *   - プリセットテンプレート（組み込み）
 *   - ユーザー定義テンプレート（chrome.storage.local に保存）
 *   - カスタムシステムプロンプト（n8n に送る追加指示）
 *
 * テンプレートの構造:
 *   {
 *     id:          string  - 一意のID（プリセットは 'preset_xxx'、ユーザー定義は 'user_xxx'）
 *     name:        string  - 表示名（例: 「お礼の返信」）
 *     intent:      string  - AIに渡す意図テキスト
 *     tone:        string  - デフォルトトーン（省略可）
 *     isPreset:    boolean - プリセットかユーザー定義か
 *     icon:        string  - 表示用アイコン（絵文字1文字）
 *     category:    string  - カテゴリ（表示グループ分け用）
 *   }
 *
 * 保存方針:
 *   - テンプレートは設定値として chrome.storage.local に保存（永続）
 *   - テンプレート自体に機密情報は含まれない想定
 *   - テンプレート本文にはユーザーの意図だけが入る（チャット内容は入らない）
 */

// eslint-disable-next-line no-var
var CW_TEMPLATES = (() => {
  'use strict';

  // ── ストレージキー ──
  const STORAGE_KEY_TEMPLATES = 'cwAiTemplates';
  const STORAGE_KEY_PROMPT = 'cwAiCustomPrompt';

  // ── プリセットテンプレート ──
  const PRESET_TEMPLATES = [
    {
      id: 'preset_thanks',
      name: 'お礼の返信',
      intent: '感謝の気持ちを込めて丁寧にお礼を伝えたい',
      tone: 'polite',
      isPreset: true,
      icon: '🙏',
      category: '基本',
    },
    {
      id: 'preset_confirm',
      name: '確認・承知',
      intent: '内容を確認したことを伝え、承知した旨を返信したい',
      tone: 'neutral',
      isPreset: true,
      icon: '✅',
      category: '基本',
    },
    {
      id: 'preset_decline',
      name: 'やんわりお断り',
      intent: '丁寧にお断りしたい。相手を傷つけないように配慮する',
      tone: 'soft',
      isPreset: true,
      icon: '🙇',
      category: '基本',
    },
    {
      id: 'preset_ask',
      name: '質問・確認依頼',
      intent: '不明点を質問したい。相手に確認をお願いする',
      tone: 'polite',
      isPreset: true,
      icon: '❓',
      category: '基本',
    },
    {
      id: 'preset_schedule',
      name: '日程調整',
      intent: '日程の候補を提案、または調整をお願いしたい',
      tone: 'polite',
      isPreset: true,
      icon: '📅',
      category: '業務',
    },
    {
      id: 'preset_report',
      name: '進捗報告',
      intent: '作業の進捗状況を簡潔に報告したい',
      tone: 'neutral',
      isPreset: true,
      icon: '📊',
      category: '業務',
    },
    {
      id: 'preset_apologize',
      name: 'お詫び',
      intent: '遅延やミスについてお詫びし、対応策を伝えたい',
      tone: 'polite',
      isPreset: true,
      icon: '💦',
      category: '基本',
    },
    {
      id: 'preset_request',
      name: '依頼・お願い',
      intent: '相手にタスクや対応をお願いしたい。丁寧に依頼する',
      tone: 'polite',
      isPreset: true,
      icon: '📝',
      category: '業務',
    },
  ];

  // ── デフォルトのカスタムプロンプト ──
  const DEFAULT_CUSTOM_PROMPT = '';

  /**
   * ユーザー定義テンプレートを読み込む
   * @returns {Promise<Array>}
   */
  async function loadUserTemplates() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(STORAGE_KEY_TEMPLATES);
        return result[STORAGE_KEY_TEMPLATES] || [];
      }
    } catch (e) {
      // fallback
    }
    return [];
  }

  /**
   * ユーザー定義テンプレートを保存する
   * @param {Array} templates
   */
  async function saveUserTemplates(templates) {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY_TEMPLATES]: templates });
      }
    } catch (e) {
      console.warn('[AI下書き] テンプレート保存エラー');
    }
  }

  /**
   * 全テンプレートを取得する（プリセット + ユーザー定義）
   * @returns {Promise<Array>}
   */
  async function getAllTemplates() {
    const userTemplates = await loadUserTemplates();
    return [...PRESET_TEMPLATES, ...userTemplates];
  }

  /**
   * カテゴリ別にグループ化したテンプレートを取得する
   * @returns {Promise<Map<string, Array>>}
   */
  async function getTemplatesByCategory() {
    const all = await getAllTemplates();
    const grouped = new Map();
    for (const tpl of all) {
      const cat = tpl.category || 'その他';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat).push(tpl);
    }
    return grouped;
  }

  /**
   * ユーザー定義テンプレートを追加する
   * @param {{ name: string, intent: string, tone?: string, icon?: string, category?: string }} data
   * @returns {Promise<object>} 追加されたテンプレート
   */
  async function addUserTemplate(data) {
    const templates = await loadUserTemplates();
    const newTemplate = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: data.name || '無題のテンプレート',
      intent: data.intent || '',
      tone: data.tone || 'neutral',
      isPreset: false,
      icon: data.icon || '📌',
      category: data.category || 'カスタム',
    };
    templates.push(newTemplate);
    await saveUserTemplates(templates);
    return newTemplate;
  }

  /**
   * ユーザー定義テンプレートを更新する
   * @param {string} id
   * @param {object} updates
   * @returns {Promise<boolean>}
   */
  async function updateUserTemplate(id, updates) {
    const templates = await loadUserTemplates();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return false;

    // プリセットは編集不可
    if (templates[index].isPreset) return false;

    templates[index] = { ...templates[index], ...updates, id, isPreset: false };
    await saveUserTemplates(templates);
    return true;
  }

  /**
   * ユーザー定義テンプレートを削除する
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async function deleteUserTemplate(id) {
    const templates = await loadUserTemplates();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) return false;
    await saveUserTemplates(filtered);
    return true;
  }

  /**
   * カスタムシステムプロンプトを読み込む
   * @returns {Promise<string>}
   */
  async function loadCustomPrompt() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(STORAGE_KEY_PROMPT);
        return result[STORAGE_KEY_PROMPT] || DEFAULT_CUSTOM_PROMPT;
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_CUSTOM_PROMPT;
  }

  /**
   * カスタムシステムプロンプトを保存する
   * @param {string} prompt
   */
  async function saveCustomPrompt(prompt) {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY_PROMPT]: prompt });
      }
    } catch (e) {
      console.warn('[AI下書き] カスタムプロンプト保存エラー');
    }
  }

  return {
    PRESET_TEMPLATES,
    loadUserTemplates,
    saveUserTemplates,
    getAllTemplates,
    getTemplatesByCategory,
    addUserTemplate,
    updateUserTemplate,
    deleteUserTemplate,
    loadCustomPrompt,
    saveCustomPrompt,
  };
})();
