/**
 * insert-draft.js
 * ─────────────────────────────────────────────
 * 生成された下書きをChatworkの入力欄に差し込む。
 *
 * 重要:
 *   - 送信ボタンは絶対に押さない
 *   - あくまで入力欄にテキストを挿入するだけ
 *   - 最終的な送信は人間が行う
 */

// eslint-disable-next-line no-var
var CW_INSERT = (() => {
  'use strict';

  /**
   * Chatworkの入力欄に下書きテキストを挿入する
   * @param {string} draftText - 挿入する下書きテキスト
   * @returns {boolean} 成功したかどうか
   */
  function insertToChatInput(draftText) {
    if (!draftText) return false;

    const inputEl = CW_SELECTORS.getInputElement();
    if (!inputEl) {
      // 入力欄が見つからない場合
      console.warn('[AI下書き] 入力欄が見つかりません');
      return false;
    }

    // textarea の場合
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      return insertToTextarea(inputEl, draftText);
    }

    // contenteditable の場合
    if (inputEl.getAttribute('contenteditable') === 'true') {
      return insertToContentEditable(inputEl, draftText);
    }

    console.warn('[AI下書き] 入力欄の種類を判定できません');
    return false;
  }

  /**
   * textarea に下書きを挿入する
   * @param {HTMLTextAreaElement} textarea
   * @param {string} text
   * @returns {boolean}
   */
  function insertToTextarea(textarea, text) {
    try {
      // フォーカスを当てる
      textarea.focus();

      // 既存の内容の末尾に追記する（既存内容があれば改行を入れる）
      const current = textarea.value;
      const prefix = current && !current.endsWith('\n') ? '\n' : '';
      textarea.value = current + prefix + text;

      // Reactなどのフレームワークに変更を通知するためイベントを発火
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);

      const changeEvent = new Event('change', { bubbles: true });
      textarea.dispatchEvent(changeEvent);

      return true;
    } catch (e) {
      console.warn('[AI下書き] textarea挿入エラー');
      return false;
    }
  }

  /**
   * contenteditable 要素に下書きを挿入する
   * @param {HTMLElement} editableEl
   * @param {string} text
   * @returns {boolean}
   */
  function insertToContentEditable(editableEl, text) {
    try {
      editableEl.focus();

      // 既存テキストの末尾にカーソルを移動
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableEl);
      range.collapse(false); // 末尾に移動
      selection.removeAllRanges();
      selection.addRange(range);

      // 改行が必要な場合
      const current = editableEl.textContent;
      if (current && !current.endsWith('\n')) {
        document.execCommand('insertLineBreak', false, null);
      }

      // テキストを挿入（execCommand で Undo 対応）
      document.execCommand('insertText', false, text);

      // inputイベントを発火
      const inputEvent = new Event('input', { bubbles: true });
      editableEl.dispatchEvent(inputEvent);

      return true;
    } catch (e) {
      console.warn('[AI下書き] contenteditable挿入エラー');
      return false;
    }
  }

  return {
    insertToChatInput,
  };
})();
