/**
 * dom-selectors.js
 * ─────────────────────────────────────────────
 * ChatworkのDOM要素を取得するセレクタを一元管理する。
 * ChatworkのDOM構造が変わった場合、ここだけ修正すればよい。
 *
 * 重要: セレクタは実機で確認して更新する必要がある。
 *       未確定のセレクタには TODO コメントを付けている。
 *       → TODO_SELECTORS.md も参照。
 */

// eslint-disable-next-line no-var
var CW_SELECTORS = (() => {
  'use strict';

  // ── チャット入力欄 ──
  // TODO: 実機で確認。Chatworkは textarea と contenteditable の両方の
  //       パターンがある。両方のセレクタを用意しておく。
  const INPUT_TEXTAREA = '#_chatText';
  const INPUT_CONTENTEDITABLE = '[role="textbox"][contenteditable="true"]';

  // ── メッセージ一覧 ──
  // TODO: 実機で確認。クラス名はChatworkのビルドで変わる可能性がある。
  const MESSAGE_LIST = '#_timeLine, [aria-label="タイムライン"], .chatTimeLineBody';
  const MESSAGE_ITEM = '[data-mid], ._message, .chatTimeLineMessage';

  // ── メッセージ内のテキスト本文 ──
  const MESSAGE_TEXT = '._messageText, .chatTimeLineMessageArea__messageText, pre';

  // ── メッセージ送信者名 ──
  const MESSAGE_SPEAKER = '._speakerName, .chatTimeLineMessageArea__name';

  // ── 自分のメッセージかどうかを判定するクラス/属性 ──
  // TODO: 実機で確認。自分のメッセージには myMessage クラスが付く想定。
  const MY_MESSAGE_CLASS = 'myMessage';

  // ── 送信ボタン（※絶対に押さない。参考情報として残す） ──
  const SEND_BUTTON = '#_sendButton, [data-testid="send-button"]';

  // ── チャットルーム名 ──
  const ROOM_NAME = '#_roomTitle, ._roomTitle, [data-testid="room-name"]';

  // ── 入力欄の親コンテナ（ボタン配置の基準点） ──
  const INPUT_CONTAINER = '#_chatSendArea, ._chatSendArea, .chatInput';

  /**
   * 複数セレクタから最初に見つかった要素を返す
   * @param {string} selectorString - カンマ区切りのセレクタ
   * @returns {Element|null}
   */
  function queryFirst(selectorString) {
    try {
      return document.querySelector(selectorString);
    } catch (e) {
      // セレクタ構文エラー時は null を返す
      return null;
    }
  }

  /**
   * 複数セレクタからマッチする全要素を返す
   * @param {string} selectorString - カンマ区切りのセレクタ
   * @param {Element} [scope=document] - 検索スコープ
   * @returns {Element[]}
   */
  function queryAll(selectorString, scope = document) {
    try {
      return Array.from(scope.querySelectorAll(selectorString));
    } catch (e) {
      return [];
    }
  }

  /**
   * チャット入力欄を取得する
   * textarea と contenteditable の両方をサポート
   */
  function getInputElement() {
    return queryFirst(INPUT_TEXTAREA) || queryFirst(INPUT_CONTENTEDITABLE);
  }

  /**
   * 入力欄の親コンテナを取得する（UIボタン配置の基準）
   */
  function getInputContainer() {
    const input = getInputElement();
    if (!input) return queryFirst(INPUT_CONTAINER);
    // 入力欄から親方向に探す
    return input.closest(INPUT_CONTAINER.split(',').map(s => s.trim()).join(','))
      || input.parentElement;
  }

  /**
   * チャットルーム名を取得する
   */
  function getRoomName() {
    const el = queryFirst(ROOM_NAME);
    return el ? el.textContent.trim() : '';
  }

  /**
   * タイムライン上のメッセージ要素一覧を取得する
   * @param {number} limit - 最大取得件数
   */
  function getMessageElements(limit = 10) {
    const timeline = queryFirst(MESSAGE_LIST);
    if (!timeline) return [];
    const items = queryAll(MESSAGE_ITEM, timeline);
    // 最新 limit 件を返す
    return items.slice(-limit);
  }

  return {
    // セレクタ文字列（テストやデバッグ用に公開）
    selectors: {
      INPUT_TEXTAREA,
      INPUT_CONTENTEDITABLE,
      MESSAGE_LIST,
      MESSAGE_ITEM,
      MESSAGE_TEXT,
      MESSAGE_SPEAKER,
      MY_MESSAGE_CLASS,
      SEND_BUTTON,
      ROOM_NAME,
      INPUT_CONTAINER,
    },
    // ユーティリティ関数
    queryFirst,
    queryAll,
    getInputElement,
    getInputContainer,
    getRoomName,
    getMessageElements,
  };
})();
