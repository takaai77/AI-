/**
 * config.js
 * ─────────────────────────────────────────────
 * 拡張機能のデフォルト設定。
 *
 * 管理者がここでデフォルトのエンドポイントURLを設定しておくことで、
 * 社員は個別にURLを入力する必要がなくなる。
 *
 * GCP Application Integration + Gemini Flash 構成に対応。
 */

// eslint-disable-next-line no-var
var CW_CONFIG = (() => {
  'use strict';

  // ──────────────────────────────────────────
  //  管理者設定: ここを書き換えて配布してください
  // ──────────────────────────────────────────

  /**
   * デフォルトのエンドポイントURL
   * GCP API Gateway のURLを設定する。
   * 空文字の場合は設定画面での入力が必要になる。
   *
   * 例: 'https://your-api-gateway-xxxx.gateway.dev/draft'
   */
  const DEFAULT_ENDPOINT_URL = '';

  /**
   * デフォルトのAPIキー
   * GCP API Gateway 用の制限付きAPIキー。
   * Gemini APIキーではない（Gemini APIキーは GCP 内部で管理）。
   * 空文字の場合は設定画面での入力が必要になる。
   *
   * 例: 'AIzaSy...'
   */
  const DEFAULT_API_KEY = '';

  /**
   * デフォルトの取得メッセージ件数
   */
  const DEFAULT_MESSAGE_LIMIT = 3;

  return {
    DEFAULT_ENDPOINT_URL,
    DEFAULT_API_KEY,
    DEFAULT_MESSAGE_LIMIT,
  };
})();
