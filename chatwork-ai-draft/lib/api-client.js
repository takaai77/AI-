/**
 * api-client.js
 * ─────────────────────────────────────────────
 * n8n Webhook との通信を担当するモジュール。
 *
 * セキュリティ方針:
 *   - APIキーを拡張に埋め込まない
 *   - 通信先は n8n Webhook のみ（options画面で設定）
 *   - タイムアウト・エラーハンドリングを実装
 *   - レスポンスの検証を行う
 *   - ログに会話本文を出力しない
 */

// eslint-disable-next-line no-var
var CW_API = (() => {
  'use strict';

  // デフォルトタイムアウト（ミリ秒）- 速度重視で20秒に短縮
  const DEFAULT_TIMEOUT = 20000;

  // 開発用ログフラグ（本番では false にする）
  const DEBUG_LOG = false;

  /**
   * webhook URL を取得する（ユーザー設定 → デフォルト の優先順位）
   * @returns {Promise<string>} webhook URL
   */
  async function getWebhookUrl() {
    const settings = await CW_STORAGE.loadSettings();
    const userUrl = settings.webhookUrl || '';
    if (userUrl) return userUrl;

    // config.js のデフォルトにフォールバック
    if (typeof CW_CONFIG !== 'undefined' && CW_CONFIG.DEFAULT_WEBHOOK_URL) {
      return CW_CONFIG.DEFAULT_WEBHOOK_URL;
    }
    return '';
  }

  /**
   * 認証トークンを取得する（ユーザー設定 → デフォルト の優先順位）
   * @returns {Promise<string>} Bearer token（空文字なら認証なし）
   */
  async function getAuthToken() {
    const settings = await CW_STORAGE.loadSettings();
    const userToken = settings.authToken || '';
    if (userToken) return userToken;

    if (typeof CW_CONFIG !== 'undefined' && CW_CONFIG.DEFAULT_AUTH_TOKEN) {
      return CW_CONFIG.DEFAULT_AUTH_TOKEN;
    }
    return '';
  }

  /**
   * n8n Webhook に下書き生成リクエストを送る
   * @param {object} payload - CW_EXTRACT.buildPayload() の戻り値
   * @returns {Promise<object>} レスポンスオブジェクト
   */
  async function requestDraft(payload) {
    const webhookUrl = await getWebhookUrl();

    if (!webhookUrl) {
      return {
        ok: false,
        error: 'Webhook URLが設定されていません。拡張機能の設定画面でURLを入力してください。',
      };
    }

    // URL の基本的なバリデーション
    if (!isValidUrl(webhookUrl)) {
      return {
        ok: false,
        error: 'Webhook URLの形式が正しくありません。https:// で始まるURLを設定してください。',
      };
    }

    if (DEBUG_LOG) {
      console.log('[AI下書き] リクエスト送信（ペイロード詳細は省略）');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const headers = {
        'Content-Type': 'application/json',
      };

      // 認証トークンがあれば Authorization ヘッダーを追加
      const authToken = await getAuthToken();
      if (authToken) {
        headers['Authorization'] = 'Bearer ' + authToken;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          error: `サーバーエラー（${response.status}）。しばらく待ってから再試行してください。`,
        };
      }

      const data = await response.json();

      // レスポンスの基本検証
      if (!data || typeof data !== 'object') {
        return {
          ok: false,
          error: 'サーバーからの応答形式が不正です。',
        };
      }

      // 正常レスポンス
      if (data.ok && data.draft) {
        return {
          ok: true,
          draft: String(data.draft),
          toneLabel: data.toneLabel || '',
          notes: data.notes || '',
        };
      }

      // サーバー側エラー
      return {
        ok: false,
        error: data.error || 'AIからの応答を取得できませんでした。',
      };

    } catch (e) {
      // タイムアウト
      if (e.name === 'AbortError') {
        return {
          ok: false,
          error: '応答がタイムアウトしました。ネットワーク接続を確認してください。',
        };
      }

      // ネットワークエラー
      if (e instanceof TypeError && e.message.includes('fetch')) {
        return {
          ok: false,
          error: 'ネットワークエラー。Webhook URLが正しいか確認してください。',
        };
      }

      // JSON パースエラー
      if (e instanceof SyntaxError) {
        return {
          ok: false,
          error: 'サーバーからの応答を解析できませんでした。',
        };
      }

      // その他
      return {
        ok: false,
        error: '予期しないエラーが発生しました。',
      };
    }
  }

  /**
   * URL のバリデーション
   * @param {string} url
   * @returns {boolean}
   */
  function isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  return {
    DEFAULT_TIMEOUT,
    getWebhookUrl,
    getAuthToken,
    requestDraft,
    isValidUrl,
  };
})();
