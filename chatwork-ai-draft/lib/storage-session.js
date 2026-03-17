/**
 * storage-session.js
 * ─────────────────────────────────────────────
 * セッションストレージのラッパー。
 *
 * 設計方針:
 *   - localStorage は使わない（永続保存を避ける）
 *   - chrome.storage.local も基本使わない
 *   - 一時状態はメモリか chrome.storage.session を優先
 *   - 設定値（webhook URLなど）のみ chrome.storage.local を許容
 *   → SECURITY.md に理由を記載
 */

// eslint-disable-next-line no-var
var CW_STORAGE = (() => {
  'use strict';

  // ── メモリ内キャッシュ（ページ遷移で消える） ──
  const _memoryCache = new Map();

  /**
   * セッションストレージに値を保存する
   * chrome.storage.session が使えない場合はメモリに保存
   * @param {string} key
   * @param {*} value
   */
  async function setSession(key, value) {
    try {
      if (chrome?.storage?.session) {
        await chrome.storage.session.set({ [key]: value });
      } else {
        _memoryCache.set(key, value);
      }
    } catch (e) {
      // content script からは session が使えない場合がある
      _memoryCache.set(key, value);
    }
  }

  /**
   * セッションストレージから値を取得する
   * @param {string} key
   * @returns {*}
   */
  async function getSession(key) {
    try {
      if (chrome?.storage?.session) {
        const result = await chrome.storage.session.get(key);
        return result[key] ?? _memoryCache.get(key);
      }
    } catch (e) {
      // fallback
    }
    return _memoryCache.get(key);
  }

  /**
   * 設定値を保存する（webhook URLなど最小限の永続設定のみ）
   * @param {object} settings
   */
  async function saveSettings(settings) {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ cwAiSettings: settings });
      }
    } catch (e) {
      console.warn('[AI下書き] 設定保存エラー');
    }
  }

  /**
   * 設定値を取得する
   * @returns {object}
   */
  async function loadSettings() {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get('cwAiSettings');
        return result.cwAiSettings || {};
      }
    } catch (e) {
      // fallback
    }
    return {};
  }

  /**
   * メモリキャッシュをクリアする
   */
  function clearMemory() {
    _memoryCache.clear();
  }

  return {
    setSession,
    getSession,
    saveSettings,
    loadSettings,
    clearMemory,
  };
})();
