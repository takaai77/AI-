'use strict';

/**
 * 環境変数から全設定を読み込む設定管理モジュール
 */

const config = {
  // API Keys
  PUBMED_API_KEY: process.env.PUBMED_API_KEY || '',
  SEMANTIC_SCHOLAR_API_KEY: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  CHATWORK_API_TOKEN: process.env.CHATWORK_API_TOKEN || '',
  GOOGLE_SERVICE_ACCOUNT_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',

  // IDs
  CHATWORK_ROOM_ID: process.env.CHATWORK_ROOM_ID || '',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',

  // Settings
  NOTIFICATION_THRESHOLD: parseInt(process.env.NOTIFICATION_THRESHOLD || '7', 10),
  SEARCH_DAYS: parseInt(process.env.SEARCH_DAYS || '7', 10),
  ENABLE_BAIDU: process.env.ENABLE_BAIDU === 'true',

  // Claude API Model
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-opus-4-6',

  // Timezone
  TIMEZONE: 'Asia/Tokyo',
};

/**
 * 必須環境変数の検証
 */
function validateConfig() {
  const required = ['ANTHROPIC_API_KEY', 'GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SHEET_ID'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`必須環境変数が未設定です: ${missing.join(', ')}`);
  }

  if (!config.ANTHROPIC_API_KEY.startsWith('sk-')) {
    console.warn('[config] ANTHROPIC_API_KEY の形式を確認してください');
  }
}

/**
 * 今日の日付を Asia/Tokyo で返す（YYYY-MM-DD）
 */
function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: config.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

module.exports = { config, validateConfig, getTodayJST };
