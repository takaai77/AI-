/**
 * config.js
 * ─────────────────────────────────────────────
 * 拡張機能のデフォルト設定。
 *
 * 管理者がここでデフォルトの Webhook URL を設定しておくことで、
 * 社員は個別に URL を入力する必要がなくなる。
 *
 * URL を変更したい場合は、このファイルを更新して拡張を再配布する。
 */

// eslint-disable-next-line no-var
var CW_CONFIG = (() => {
  'use strict';

  // ──────────────────────────────────────────
  //  管理者設定: ここを書き換えて配布してください
  // ──────────────────────────────────────────

  /**
   * デフォルトの Webhook URL
   * 空文字の場合は設定画面での入力が必要になる。
   * 社内配布時はここに n8n の URL を設定しておくと、
   * 社員は設定なしで使い始められる。
   *
   * 例: 'https://n8n.example.com/webhook/chatwork-ai'
   */
  const DEFAULT_WEBHOOK_URL = '';

  /**
   * デフォルトの認証トークン
   * n8n 側で Header Auth を設定している場合に使用。
   * 空文字の場合は認証ヘッダーを送信しない。
   *
   * 例: 'your-secret-token-here'
   */
  const DEFAULT_AUTH_TOKEN = '';

  /**
   * デフォルトの取得メッセージ件数
   */
  const DEFAULT_MESSAGE_LIMIT = 3;

  return {
    DEFAULT_WEBHOOK_URL,
    DEFAULT_AUTH_TOKEN,
    DEFAULT_MESSAGE_LIMIT,
  };
})();
