/**
 * extract-context.js
 * ─────────────────────────────────────────────
 * Chatwork画面のDOMから直近の会話文脈を抽出する。
 * 必要最小限のデータだけを取り出し、n8nへ送る形に整形する。
 */

// eslint-disable-next-line no-var
var CW_EXTRACT = (() => {
  'use strict';

  // デフォルトで取得する最大メッセージ件数（データ最小化のため少なめ）
  const DEFAULT_LIMIT = 5;

  /**
   * 1つのメッセージ要素からテキストと話者名を抽出する
   * @param {Element} msgEl - メッセージDOM要素
   * @returns {{ speaker: string, text: string } | null}
   */
  function parseMessageElement(msgEl) {
    const sel = CW_SELECTORS.selectors;

    // 話者名の取得
    const speakerEl = msgEl.querySelector(sel.MESSAGE_SPEAKER);
    let speaker = speakerEl ? speakerEl.textContent.trim() : '不明';

    // 自分のメッセージかどうかを判定
    if (msgEl.classList.contains(sel.MY_MESSAGE_CLASS)) {
      speaker = '自分';
    }

    // メッセージ本文の取得
    const textEl = msgEl.querySelector(sel.MESSAGE_TEXT);
    if (!textEl) return null;

    let text = textEl.textContent.trim();
    if (!text) return null;

    // 長すぎるメッセージは切り詰める（データ最小化）
    const MAX_TEXT_LENGTH = 500;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '…（省略）';
    }

    return { speaker, text };
  }

  /**
   * 直近の会話文脈を配列として取得する
   * @param {number} [limit] - 取得する最大件数
   * @returns {{ speaker: string, text: string }[]}
   */
  function getRecentMessages(limit = DEFAULT_LIMIT) {
    const elements = CW_SELECTORS.getMessageElements(limit);
    const messages = [];

    for (const el of elements) {
      const parsed = parseMessageElement(el);
      if (parsed) {
        messages.push(parsed);
      }
    }

    return messages;
  }

  /**
   * n8nに送るペイロードを組み立てる
   * @param {object} params
   * @param {string} params.intent - ユーザーの意図（テキスト入力）
   * @param {string} [params.tone='neutral'] - トーン指定
   * @param {boolean} [params.retryMode=false] - 再生成かどうか
   * @param {number} [params.limit] - メッセージ取得件数
   * @returns {object} APIに送るペイロード
   */
  function buildPayload({ intent, tone = 'neutral', retryMode = false, limit }) {
    const roomName = CW_SELECTORS.getRoomName();
    const rawMessages = getRecentMessages(limit || DEFAULT_LIMIT);

    // 個人情報マスクを適用
    const maskedMessages = rawMessages.map(msg => ({
      speaker: msg.speaker === '自分' ? '自分' : CW_MASK.maskText(msg.speaker),
      text: CW_MASK.maskText(msg.text),
    }));

    return {
      roomName: CW_MASK.maskText(roomName),
      threadContext: maskedMessages,
      intent: intent || '',
      tone,
      retryMode,
    };
  }

  return {
    DEFAULT_LIMIT,
    parseMessageElement,
    getRecentMessages,
    buildPayload,
  };
})();
