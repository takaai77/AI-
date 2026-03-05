'use strict';

/**
 * Chatwork 通知モジュール
 * Phase 1: スタブ実装（Phase 2 で完全実装）
 * Phase 2 で Baidu Scholar と合わせて実装予定
 */

const fetch = require('node-fetch');
const { config, getTodayJST } = require('../utils/config');

const API_BASE = 'https://api.chatwork.com/v2';

/**
 * urgency に対応する絵文字
 */
function urgencyEmoji(urgency) {
  if (urgency === 'high') return '🔴';
  if (urgency === 'medium') return '🟡';
  return '🟢';
}

/**
 * 通知メッセージを構築
 * @param {Object[]} papers - スコア閾値以上の論文
 * @param {number} totalCount - 全論文取得数
 * @returns {string}
 */
function buildMessage(papers, totalCount) {
  const today = getTodayJST();

  let msg = `[info][title]🔬 サジー新着論文レポート（${today}）[/title]\n`;
  msg += `本日 ${totalCount}件の新着論文を検出しました。\n`;
  msg += `うち重要度の高い ${papers.length}件をお知らせします。\n`;

  for (const p of papers) {
    msg += '\n---\n\n';
    msg += `【${p.category || 'その他'}】スコア: ${p.relevance_score}/10 ${urgencyEmoji(p.urgency)}\n`;
    msg += `${p.summary_ja}\n`;
    if (p.key_compounds && p.key_compounds.length > 0) {
      msg += `主要成分: ${p.key_compounds.join(', ')}\n`;
    }
    msg += `${p.url}\n`;
  }

  msg += '\n---\n\n';
  msg += `📊 全件はスプレッドシートで確認できます:\n`;
  msg += `https://docs.google.com/spreadsheets/d/${config.GOOGLE_SHEET_ID}\n`;
  msg += '[/info]';

  return msg;
}

/**
 * Chatwork にメッセージを送信
 * @param {Object[]} papers - 要約済み論文（全件）
 * @returns {Promise<void>}
 */
async function notify(papers) {
  if (!papers || papers.length === 0) {
    console.log('[chatwork] 通知対象論文なし（スキップ）');
    return;
  }

  if (!config.CHATWORK_API_TOKEN) {
    console.warn('[chatwork] CHATWORK_API_TOKEN 未設定 - 通知をスキップ');
    return;
  }

  if (!config.CHATWORK_ROOM_ID) {
    console.warn('[chatwork] CHATWORK_ROOM_ID 未設定 - 通知をスキップ');
    return;
  }

  // 閾値以上の論文を対象にするのはメイン側で行うので、ここでは全件受け取り
  const message = buildMessage(papers, papers.length);

  try {
    const url = `${API_BASE}/rooms/${config.CHATWORK_ROOM_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-chatworktoken': config.CHATWORK_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ body: message }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log(`[chatwork] 通知送信完了 (message_id: ${data.message_id})`);
  } catch (err) {
    // 通知失敗はエラーログのみ（パイプライン全体を止めない）
    console.error(`[chatwork] 通知送信失敗: ${err.message}`);
  }
}

module.exports = { notify, buildMessage };
