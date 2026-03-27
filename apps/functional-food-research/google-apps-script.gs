// ============================================================
// 機能性表示食品リサーチシステム — Google Apps Script
// ============================================================
// 【セットアップ手順】
// 1. Google スプレッドシートを新規作成
// 2. 拡張機能 → Apps Script を開く
// 3. このコードを全文コピー＆ペースト
// 4. 「デプロイ」→「新しいデプロイ」→ ウェブアプリ
//    - 実行ユーザー: 自分
//    - アクセス: 全員
// 5. デプロイURLをリサーチシステムの設定画面に貼り付け
// ============================================================

// シート名の定数
const SHEET_NAMES = {
  PAPERS: '論文データ',
  OPPORTUNITIES: '商品化チャンス',
  TRENDS: 'トレンド分析',
  CAA: '消費者庁DB',
  KEYWORDS: 'キーワード管理',
  CONFIG: '設定',
  LOG: '同期ログ'
};

// ============================================================
// 初回セットアップ: シートとヘッダーを自動作成
// ============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 論文データ
  getOrCreateSheet(ss, SHEET_NAMES.PAPERS, [
    'ID', 'ソース', 'タイトル', '著者', 'ジャーナル', '発表日',
    'アブストラクト', 'URL', 'キーワード', 'カテゴリ',
    '総合スコア', 'エビデンス', '市場性', '新規性',
    '取得日時', 'メモ'
  ]);

  // 商品化チャンス
  getOrCreateSheet(ss, SHEET_NAMES.OPPORTUNITIES, [
    '順位', 'タイトル', 'ソース', 'カテゴリ',
    '総合スコア', 'エビデンス', '市場性', '新規性',
    '関連届出数', 'URL', '推奨アクション', '担当者メモ', 'ステータス'
  ]);

  // トレンド分析
  getOrCreateSheet(ss, SHEET_NAMES.TRENDS, [
    'カテゴリ', '論文数', '直近論文数(2024年〜)', 'データソース', '更新日時'
  ]);

  // 消費者庁DB
  getOrCreateSheet(ss, SHEET_NAMES.CAA, [
    '成分名', '届出件数', '機能性表示', '競争度', 'トレンド', '更新日時'
  ]);

  // キーワード管理
  const kwSheet = getOrCreateSheet(ss, SHEET_NAMES.KEYWORDS, [
    'キーワード', '有効', '追加日', 'メモ'
  ]);
  // デフォルトキーワードがなければ追加
  if (kwSheet.getLastRow() <= 1) {
    const defaultKeywords = [
      '機能性表示食品', 'functional food', 'GABA', 'ルテイン',
      'ビフィズス菌', 'イヌリン', 'EPA DHA', 'クルクミン',
      'NMN', 'プロテオグリカン', 'ラクトフェリン', 'HMB',
      'アスタキサンチン', 'テアニン', 'イミダゾールジペプチド',
      'β-グルカン', 'プラズマローゲン'
    ];
    const rows = defaultKeywords.map(kw => [kw, 'TRUE', new Date().toISOString(), '']);
    kwSheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  // 設定
  const configSheet = getOrCreateSheet(ss, SHEET_NAMES.CONFIG, [
    '設定名', '値', '説明'
  ]);
  if (configSheet.getLastRow() <= 1) {
    configSheet.getRange(2, 1, 4, 3).setValues([
      ['auto_sync', 'TRUE', 'リサーチ後に自動でスプレッドシートに同期'],
      ['notify_high_score', 'TRUE', 'スコア80以上の論文発見時にメール通知'],
      ['notify_email', '', '通知先メールアドレス（空欄=自分）'],
      ['score_threshold', '70', '商品化チャンスに表示する最低スコア']
    ]);
  }

  // 同期ログ
  getOrCreateSheet(ss, SHEET_NAMES.LOG, [
    '日時', '種別', 'メッセージ', '件数'
  ]);

  // シートの書式設定
  formatSheets(ss);

  SpreadsheetApp.getUi().alert(
    'セットアップ完了',
    'すべてのシートが作成されました。\n次に「デプロイ」→「新しいデプロイ」でウェブアプリとして公開してください。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a1a2e')
      .setFontColor('#e2e8f0')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatSheets(ss) {
  // 論文データシートの列幅
  const papersSheet = ss.getSheetByName(SHEET_NAMES.PAPERS);
  if (papersSheet) {
    papersSheet.setColumnWidth(1, 120);  // ID
    papersSheet.setColumnWidth(2, 80);   // ソース
    papersSheet.setColumnWidth(3, 400);  // タイトル
    papersSheet.setColumnWidth(4, 200);  // 著者
    papersSheet.setColumnWidth(5, 150);  // ジャーナル
    papersSheet.setColumnWidth(11, 80);  // スコア
  }

  // 商品化チャンスシートの条件付き書式
  const oppSheet = ss.getSheetByName(SHEET_NAMES.OPPORTUNITIES);
  if (oppSheet) {
    oppSheet.setColumnWidth(2, 400);   // タイトル
    oppSheet.setColumnWidth(11, 300);  // 推奨アクション
  }
}

// ============================================================
// Web App エンドポイント (GET/POST)
// ============================================================

function doGet(e) {
  const action = e.parameter.action || 'ping';
  let result;

  try {
    switch (action) {
      case 'ping':
        result = { status: 'ok', message: 'Google Sheets連携が有効です', timestamp: new Date().toISOString() };
        break;
      case 'getKeywords':
        result = getKeywords();
        break;
      case 'getConfig':
        result = getConfig();
        break;
      default:
        result = { status: 'error', message: `不明なアクション: ${action}` };
    }
  } catch (err) {
    result = { status: 'error', message: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', message: '同時アクセスが多すぎます。少し待ってから再試行してください。'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let result;
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case 'syncPapers':
        result = syncPapers(payload.papers || []);
        break;
      case 'syncOpportunities':
        result = syncOpportunities(payload.opportunities || []);
        break;
      case 'syncTrends':
        result = syncTrends(payload.trends || {});
        break;
      case 'syncCAA':
        result = syncCAA(payload.caaEntries || []);
        break;
      case 'syncAll':
        result = syncAll(payload);
        break;
      default:
        result = { status: 'error', message: `不明なアクション: ${action}` };
    }
  } catch (err) {
    result = { status: 'error', message: err.message };
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// データ同期
// ============================================================

function syncPapers(papers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PAPERS);
  if (!sheet) return { status: 'error', message: 'シートが見つかりません。setupSheets()を実行してください。' };

  // 既存IDを取得
  const existingIds = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    ids.forEach(id => existingIds.add(id));
  }

  // 新規論文のみ追加
  const newPapers = papers.filter(p => !existingIds.has(p.id));
  if (newPapers.length === 0) {
    return { status: 'ok', message: '新規論文なし', added: 0 };
  }

  const now = new Date().toISOString();
  const rows = newPapers.map(p => [
    p.id,
    p.source || '',
    p.title || '',
    p.authors || '',
    p.journal || '',
    p.date || '',
    p.abstract || '',
    p.url || '',
    p.keyword || '',
    (p.categories || []).join(', '),
    p.score?.total || 0,
    p.score?.evidence || 0,
    p.score?.market || 0,
    p.score?.novelty || 0,
    now,
    ''
  ]);

  sheet.getRange(lastRow + 1, 1, rows.length, 16).setValues(rows);
  addSyncLog('論文同期', `${newPapers.length}件の新規論文を追加`, newPapers.length);

  // 高スコア論文の通知
  const config = getConfig();
  if (config.notify_high_score === 'TRUE') {
    const highScorePapers = newPapers.filter(p => (p.score?.total || 0) >= 80);
    if (highScorePapers.length > 0) {
      sendHighScoreNotification(highScorePapers, config.notify_email);
    }
  }

  return { status: 'ok', message: `${newPapers.length}件追加`, added: newPapers.length };
}

function syncOpportunities(opportunities) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.OPPORTUNITIES);
  if (!sheet) return { status: 'error', message: 'シートが見つかりません' };

  // 既存データをクリア（ヘッダー以外）— ステータスとメモは保持
  const lastRow = sheet.getLastRow();
  const existingMemos = {};
  if (lastRow > 1) {
    const data = sheet.getRange(2, 2, lastRow - 1, 12).getValues();
    data.forEach(row => {
      if (row[0]) { // タイトルがある行
        existingMemos[row[0]] = { memo: row[10], status: row[11] };
      }
    });
    sheet.getRange(2, 1, lastRow - 1, 13).clearContent();
  }

  const rows = opportunities.map((opp, i) => {
    const title = opp.paper?.title || opp.title || '';
    const prev = existingMemos[title] || {};
    return [
      i + 1,
      title,
      opp.paper?.source || opp.source || '',
      (opp.paper?.categories || opp.categories || []).join(', '),
      opp.score?.total || 0,
      opp.score?.evidence || 0,
      opp.score?.market || 0,
      opp.score?.novelty || 0,
      opp.score?.relatedFilings || 0,
      opp.paper?.url || opp.url || '',
      getRecommendationText(opp.score),
      prev.memo || '',
      prev.status || '未着手'
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 13).setValues(rows);
  }

  addSyncLog('商品化チャンス同期', `${rows.length}件更新`, rows.length);
  return { status: 'ok', updated: rows.length };
}

function syncTrends(trends) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.TRENDS);
  if (!sheet) return { status: 'error', message: 'シートが見つかりません' };

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 5).clearContent();

  const now = new Date().toISOString();
  const rows = Object.entries(trends)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, t]) => [
      t.name || key,
      t.count || 0,
      t.recentCount || 0,
      (t.sources || []).join(', '),
      now
    ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  addSyncLog('トレンド同期', `${rows.length}カテゴリ更新`, rows.length);
  return { status: 'ok', updated: rows.length };
}

function syncCAA(entries) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CAA);
  if (!sheet) return { status: 'error', message: 'シートが見つかりません' };

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 6).clearContent();

  const now = new Date().toISOString();
  const rows = entries.map(e => [
    e.ingredient || '',
    e.filings || 0,
    (e.claims || []).join(', '),
    e.competition === 'high' ? 'レッドオーシャン' : e.competition === 'medium' ? '成長市場' : 'ブルーオーシャン',
    e.trend === 'emerging' ? '新興' : e.trend === 'growing' ? '成長中' : '確立',
    now
  ]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }

  addSyncLog('消費者庁DB同期', `${rows.length}成分更新`, rows.length);
  return { status: 'ok', updated: rows.length };
}

function syncAll(payload) {
  const results = {};
  if (payload.papers) results.papers = syncPapers(payload.papers);
  if (payload.opportunities) results.opportunities = syncOpportunities(payload.opportunities);
  if (payload.trends) results.trends = syncTrends(payload.trends);
  if (payload.caaEntries) results.caa = syncCAA(payload.caaEntries);
  return { status: 'ok', results };
}

// ============================================================
// キーワード管理 (スプレッドシートから読み込み)
// ============================================================

function getKeywords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.KEYWORDS);
  if (!sheet) return { status: 'error', keywords: [] };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: 'ok', keywords: [] };

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const keywords = data
    .filter(row => row[0] && row[1] !== 'FALSE' && row[1] !== false)
    .map(row => row[0].toString().trim());

  return { status: 'ok', keywords };
}

// ============================================================
// 設定読み込み
// ============================================================

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.CONFIG);
  if (!sheet) return {};

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return {};

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const config = {};
  data.forEach(row => {
    if (row[0]) config[row[0].toString().trim()] = row[1]?.toString() || '';
  });
  return config;
}

// ============================================================
// メール通知
// ============================================================

function sendHighScoreNotification(papers, email) {
  const recipient = email || Session.getActiveUser().getEmail();
  if (!recipient) return;

  const paperList = papers.map(p =>
    `- [スコア${p.score?.total}] ${p.title}\n  ${p.url || ''}`
  ).join('\n\n');

  const subject = `【リサーチ通知】高スコア論文 ${papers.length}件を発見`;
  const body = `機能性表示食品リサーチシステムが高スコアの論文を発見しました。\n\n` +
    `発見日時: ${new Date().toLocaleString('ja-JP')}\n` +
    `件数: ${papers.length}件\n\n` +
    `--- 論文一覧 ---\n\n${paperList}\n\n` +
    `詳細はスプレッドシートの「商品化チャンス」シートをご確認ください。`;

  try {
    MailApp.sendEmail(recipient, subject, body);
  } catch (e) {
    addSyncLog('通知エラー', e.message, 0);
  }
}

// ============================================================
// 同期ログ
// ============================================================

function addSyncLog(type, message, count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.LOG);
  if (!sheet) return;
  sheet.insertRowAfter(1);
  sheet.getRange(2, 1, 1, 4).setValues([
    [new Date().toLocaleString('ja-JP'), type, message, count]
  ]);
}

// ============================================================
// ユーティリティ
// ============================================================

function getRecommendationText(score) {
  if (!score) return '';
  if (score.market >= 80 && score.evidence >= 60) {
    return 'ブルーオーシャン × 十分なエビデンス。先行者利益が期待。新規届出を検討。';
  }
  if (score.evidence >= 80) {
    return 'エビデンス強固。SR作成による機能性表示の根拠構築を推奨。';
  }
  if (score.novelty >= 80) {
    return '最新の研究成果。追加のヒト試験で差別化した商品開発が可能。';
  }
  return 'エビデンス蓄積中。研究動向を継続ウォッチし、タイミングを見て商品化を検討。';
}

// ============================================================
// メニュー追加
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('リサーチツール')
    .addItem('初回セットアップ', 'setupSheets')
    .addItem('キーワード一覧確認', 'showKeywords')
    .addSeparator()
    .addItem('高スコア論文レポート', 'generateReport')
    .addToUi();
}

function showKeywords() {
  const result = getKeywords();
  SpreadsheetApp.getUi().alert(
    'アクティブなキーワード',
    result.keywords.join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function generateReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.OPPORTUNITIES);
  if (!sheet || sheet.getLastRow() <= 1) {
    SpreadsheetApp.getUi().alert('まだデータがありません。リサーチシステムからデータを同期してください。');
    return;
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 11).getValues();
  const highScore = data.filter(row => row[4] >= 70);

  let report = `📊 高スコア論文レポート (${new Date().toLocaleDateString('ja-JP')})\n\n`;
  report += `総件数: ${data.length}件\nスコア70以上: ${highScore.length}件\n\n`;

  highScore.forEach(row => {
    report += `[${row[4]}点] ${row[1]}\n`;
    report += `  カテゴリ: ${row[3]} / ${row[10]}\n\n`;
  });

  SpreadsheetApp.getUi().alert('高スコア論文レポート', report, SpreadsheetApp.getUi().ButtonSet.OK);
}
