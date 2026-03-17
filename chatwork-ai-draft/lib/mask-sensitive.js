/**
 * mask-sensitive.js
 * ─────────────────────────────────────────────
 * 個人情報らしき文字列を簡易的にマスクする。
 *
 * 注意:
 *   - 完全な個人情報検出は不可能。あくまで「簡易マスク」。
 *   - 誤検出・見逃しは起こりうる。
 *   - 本番運用ではサーバー側でも追加のサニタイズを推奨。
 *   → SECURITY.md に限界を記載。
 */

// eslint-disable-next-line no-var
var CW_MASK = (() => {
  'use strict';

  // ── マスクパターン定義 ──
  // 各パターンは { regex, replacement, label } で構成
  const PATTERNS = [
    {
      // メールアドレス
      regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      replacement: '[メール]',
      label: 'email',
    },
    {
      // 電話番号（日本の一般的な形式）
      regex: /0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g,
      replacement: '[電話番号]',
      label: 'phone',
    },
    {
      // 携帯電話番号（ハイフン無し含む）
      regex: /(?:090|080|070)\d{8}/g,
      replacement: '[携帯番号]',
      label: 'mobile',
    },
    {
      // 郵便番号
      regex: /〒?\d{3}[-ー]\d{4}/g,
      replacement: '[郵便番号]',
      label: 'zipcode',
    },
    {
      // クレジットカード番号らしき16桁数字列
      regex: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
      replacement: '[カード番号]',
      label: 'credit_card',
    },
    {
      // 注文番号・管理番号らしき長い数字列（8桁以上の連続数字）
      regex: /\b\d{8,}\b/g,
      replacement: '[番号]',
      label: 'long_number',
    },
    {
      // マイナンバーらしき12桁
      regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
      replacement: '[個人番号]',
      label: 'my_number',
    },
  ];

  /**
   * テキストに含まれる個人情報らしき文字列をマスクする
   * @param {string} text - 元のテキスト
   * @returns {string} マスク済みテキスト
   */
  function maskText(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;
    for (const pattern of PATTERNS) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    return result;
  }

  /**
   * テキストにマスク対象が含まれるかチェックする（UI表示用）
   * @param {string} text
   * @returns {boolean}
   */
  function containsSensitive(text) {
    if (!text || typeof text !== 'string') return false;
    for (const pattern of PATTERNS) {
      // regex はグローバルフラグ付きなので lastIndex をリセット
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(text)) return true;
    }
    return false;
  }

  return {
    PATTERNS,
    maskText,
    containsSensitive,
  };
})();
