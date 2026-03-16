/**
 * options.js
 * ─────────────────────────────────────────────
 * 設定画面のロジック。
 * Webhook URL とメッセージ取得件数を保存・読み込みする。
 *
 * 注意:
 *   - APIキーはここに保存しない
 *   - 保存するのは webhook URL と件数のみ
 */

(() => {
  'use strict';

  const webhookInput = document.getElementById('webhookUrl');
  const limitInput = document.getElementById('messageLimit');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  /**
   * 保存済み設定を読み込んでフォームに反映する
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('cwAiSettings');
      const settings = result.cwAiSettings || {};

      if (settings.webhookUrl) {
        webhookInput.value = settings.webhookUrl;
      }
      if (settings.messageLimit) {
        limitInput.value = settings.messageLimit;
      }
    } catch (e) {
      console.warn('設定の読み込みに失敗しました');
    }
  }

  /**
   * 設定を保存する
   */
  async function saveSettings() {
    const webhookUrl = webhookInput.value.trim();
    const messageLimit = parseInt(limitInput.value, 10) || 5;

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
        cwAiSettings: {
          webhookUrl,
          messageLimit,
        }
      });
      showStatus('保存しました ✓', false);
    } catch (e) {
      showStatus('保存に失敗しました', true);
    }
  }

  /**
   * ステータスメッセージを表示する
   */
  function showStatus(message, isError) {
    saveStatus.textContent = message;
    saveStatus.style.color = isError ? '#d73a49' : '#2da44e';
    // 3秒後に消す
    setTimeout(() => { saveStatus.textContent = ''; }, 3000);
  }

  /**
   * URL バリデーション
   */
  function isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // イベントリスナー
  saveBtn.addEventListener('click', saveSettings);

  // 初期読み込み
  loadSettings();
})();
