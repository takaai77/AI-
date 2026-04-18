/**
 * api-client.js
 * ─────────────────────────────────────────────
 * GCP Application Integration との通信を担当するモジュール。
 *
 * セキュリティ方針:
 *   - Vertex AI のAPIキーを拡張に埋め込まない
 *   - 拡張が持つのは API Gateway 用の制限付きキーのみ
 *   - 通信先は GCP API Gateway のみ
 *   - タイムアウト・エラーハンドリングを実装
 *   - ログに会話本文を出力しない
 */

// eslint-disable-next-line no-var
var CW_API = (() => {
  'use strict';

  const DEFAULT_TIMEOUT = 20000;
  const DEBUG_LOG = false;

  /**
   * エンドポイントURLを取得する（ユーザー設定 → デフォルト の優先順位）
   */
  async function getEndpointUrl() {
    const settings = await CW_STORAGE.loadSettings();

    // 新しい設定キー (endpointUrl) を優先
    const userUrl = settings.endpointUrl || settings.webhookUrl || '';
    if (userUrl) return userUrl;

    if (typeof CW_CONFIG !== 'undefined') {
      if (CW_CONFIG.DEFAULT_ENDPOINT_URL) return CW_CONFIG.DEFAULT_ENDPOINT_URL;
      // 旧設定との後方互換
      if (CW_CONFIG.DEFAULT_WEBHOOK_URL) return CW_CONFIG.DEFAULT_WEBHOOK_URL;
    }
    return '';
  }

  /**
   * APIキーまたは認証トークンを取得する（ユーザー設定 → デフォルト の優先順位）
   */
  async function getApiKey() {
    const settings = await CW_STORAGE.loadSettings();

    // 新しい設定キー (apiKey) を優先
    const userKey = settings.apiKey || settings.authToken || '';
    if (userKey) return userKey;

    if (typeof CW_CONFIG !== 'undefined') {
      if (CW_CONFIG.DEFAULT_API_KEY) return CW_CONFIG.DEFAULT_API_KEY;
      // 旧設定との後方互換
      if (CW_CONFIG.DEFAULT_AUTH_TOKEN) return CW_CONFIG.DEFAULT_AUTH_TOKEN;
    }
    return '';
  }

  /**
   * 下書き生成リクエストを送る
   * @param {object} payload - CW_EXTRACT.buildPayload() の戻り値
   * @returns {Promise<object>} レスポンスオブジェクト
   */
  async function requestDraft(payload) {
    const endpointUrl = await getEndpointUrl();

    if (!endpointUrl) {
      return {
        ok: false,
        error: 'エンドポイントURLが設定されていません。拡張機能の設定画面でURLを入力してください。',
      };
    }

    if (!isValidUrl(endpointUrl)) {
      return {
        ok: false,
        error: 'エンドポイントURLの形式が正しくありません。https:// で始まるURLを設定してください。',
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

      const apiKey = await getApiKey();
      if (apiKey) {
        // GCP API Gateway: x-api-key ヘッダー
        // Bearer Token (後方互換): Authorization ヘッダー
        if (apiKey.startsWith('AIza')) {
          headers['x-api-key'] = apiKey;
        } else {
          headers['Authorization'] = 'Bearer ' + apiKey;
        }
      }

      const response = await fetch(endpointUrl, {
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

      if (!data || typeof data !== 'object') {
        return {
          ok: false,
          error: 'サーバーからの応答形式が不正です。',
        };
      }

      if (data.ok && data.draft) {
        return {
          ok: true,
          draft: String(data.draft),
          toneLabel: data.toneLabel || '',
          notes: data.notes || '',
        };
      }

      return {
        ok: false,
        error: data.error || 'AIからの応答を取得できませんでした。',
      };

    } catch (e) {
      if (e.name === 'AbortError') {
        return {
          ok: false,
          error: '応答がタイムアウトしました。ネットワーク接続を確認してください。',
        };
      }

      if (e instanceof TypeError && e.message.includes('fetch')) {
        return {
          ok: false,
          error: 'ネットワークエラー。エンドポイントURLが正しいか確認してください。',
        };
      }

      if (e instanceof SyntaxError) {
        return {
          ok: false,
          error: 'サーバーからの応答を解析できませんでした。',
        };
      }

      return {
        ok: false,
        error: '予期しないエラーが発生しました。',
      };
    }
  }

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
    getEndpointUrl,
    getApiKey,
    requestDraft,
    isValidUrl,
  };
})();
