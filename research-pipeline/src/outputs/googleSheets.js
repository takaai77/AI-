'use strict';

/**
 * Google Sheets 出力モジュール
 * サービスアカウント認証で Sheets API を利用する
 */

const { google } = require('googleapis');
const { config, getTodayJST } = require('../utils/config');

const SHEET_NAME = '論文リスト';
const HEADERS = [
  '取得日',
  'ソース',
  'タイトル',
  '日本語要約',
  '関連度スコア',
  'カテゴリ',
  '研究デザイン',
  '主要成分',
  '緊急度',
  '活用可能',
  '著者',
  'ジャーナル',
  '年',
  'URL',
];

let sheetsClient = null;

/**
 * Google Sheets クライアントを初期化（遅延）
 */
function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  let credentials;
  try {
    credentials = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (err) {
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY のJSONパースに失敗: ${err.message}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * シートが存在しない場合に作成し、ヘッダー行を書き込む
 */
async function ensureSheetAndHeaders() {
  const sheets = getSheetsClient();
  const spreadsheetId = config.GOOGLE_SHEET_ID;

  // スプレッドシートのメタデータ取得
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = meta.data.sheets.map((s) => s.properties.title);

  if (!sheetNames.includes(SHEET_NAME)) {
    // シートを追加
    console.log(`[sheets] シート「${SHEET_NAME}」を新規作成`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });

    // ヘッダー行を書き込む
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    console.log('[sheets] ヘッダー行を書き込みました');
  }
}

/**
 * 既存データのタイトル列を取得（重複チェック用）
 * @returns {Promise<string[]>}
 */
async function getExistingTitles() {
  const sheets = getSheetsClient();
  const spreadsheetId = config.GOOGLE_SHEET_ID;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!C2:C`,  // C列 = タイトル（1行目はヘッダー）
    });

    const rows = res.data.values || [];
    return rows.map((r) => r[0] || '').filter(Boolean);
  } catch (err) {
    // シートが存在しない場合などはから配列を返す
    console.warn(`[sheets] 既存タイトル取得失敗（初回実行の可能性）: ${err.message}`);
    return [];
  }
}

/**
 * 論文データをシートへ追記
 * @param {Object[]} papers - 要約済み論文配列
 * @returns {Promise<number>} 書き込み件数
 */
async function appendRows(papers) {
  if (!papers || papers.length === 0) {
    console.log('[sheets] 書き込む論文なし');
    return 0;
  }

  await ensureSheetAndHeaders();

  const sheets = getSheetsClient();
  const spreadsheetId = config.GOOGLE_SHEET_ID;
  const today = getTodayJST();

  const rows = papers.map((p) => [
    today,                                           // 取得日
    p.source || '',                                  // ソース
    p.title || '',                                   // タイトル
    p.summary_ja || '',                              // 日本語要約
    p.relevance_score || '',                         // 関連度スコア
    p.category || '',                               // カテゴリ
    p.study_type || '',                              // 研究デザイン
    (p.key_compounds || []).join(', '),              // 主要成分
    p.urgency || '',                                 // 緊急度
    p.actionable ? '○' : '×',                      // 活用可能
    (p.authors || []).slice(0, 3).join(', '),        // 著者（最大3名）
    p.journal || '',                                 // ジャーナル
    p.year || '',                                    // 年
    p.url || '',                                     // URL
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:N`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  console.log(`[sheets] ${rows.length} 件を書き込み完了`);
  return rows.length;
}

module.exports = { appendRows, getExistingTitles };
