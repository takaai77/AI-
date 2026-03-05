'use strict';

/**
 * サジー論文リサーチパイプライン - Cloud Functions エントリポイント
 *
 * 処理フロー:
 *   1. PubMed + Semantic Scholar から並行取得
 *   2. 重複排除
 *   3. Google Sheets の既存タイトルと照合 → 新規のみ抽出
 *   4. Claude API で要約・スコアリング（順次処理）
 *   5. Google Sheets に書き込み
 *   6. スコア閾値以上の論文を Chatwork 通知
 *   7. 処理結果を返却
 */

const pubmed = require('./src/sources/pubmed');
const semanticScholar = require('./src/sources/semanticScholar');
const summarizer = require('./src/ai/summarizer');
const sheets = require('./src/outputs/googleSheets');
const chatwork = require('./src/outputs/chatwork');
const { dedup, filterNew } = require('./src/utils/dedup');
const { config, validateConfig } = require('./src/utils/config');

/**
 * メインパイプライン関数
 * Cloud Functions の HTTPトリガーまたはローカルテストで呼び出す
 *
 * @param {Object} req - HTTPリクエスト
 * @param {Object} res - HTTPレスポンス
 */
async function researchPipeline(req, res) {
  const startTime = Date.now();
  console.log('[pipeline] ===== サジー論文リサーチパイプライン 開始 =====');

  // 環境変数バリデーション
  try {
    validateConfig();
  } catch (err) {
    console.error(`[pipeline] 設定エラー: ${err.message}`);
    return res.status(500).json({ error: `設定エラー: ${err.message}` });
  }

  const stats = {
    total_fetched: 0,
    unique: 0,
    new: 0,
    notified: 0,
    errors: [],
  };

  // ===== STEP 1: 各ソースから並行取得 =====
  console.log('[pipeline] STEP 1: 論文取得開始');

  const sourceTasks = [
    pubmed.fetchRecent().catch((err) => {
      const msg = `PubMed取得エラー: ${err.message}`;
      console.error(`[pipeline] ${msg}`);
      stats.errors.push(msg);
      return [];
    }),
    semanticScholar.fetchRecent().catch((err) => {
      const msg = `Semantic Scholar取得エラー: ${err.message}`;
      console.error(`[pipeline] ${msg}`);
      stats.errors.push(msg);
      return [];
    }),
  ];

  // Phase 2: Baidu Scholar (ENABLE_BAIDU=true の場合のみ)
  if (config.ENABLE_BAIDU) {
    try {
      const baiduScholar = require('./src/sources/baiduScholar');
      sourceTasks.push(
        baiduScholar.fetchRecent().catch((err) => {
          const msg = `Baidu Scholar取得エラー: ${err.message}`;
          console.error(`[pipeline] ${msg}`);
          stats.errors.push(msg);
          return [];
        })
      );
    } catch (err) {
      console.warn('[pipeline] baiduScholar モジュール未実装（Phase 2 で追加予定）');
    }
  }

  const results = await Promise.allSettled(sourceTasks);
  const allPapers = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  stats.total_fetched = allPapers.length;
  console.log(`[pipeline] STEP 1 完了: 合計 ${stats.total_fetched} 件取得`);

  if (allPapers.length === 0) {
    console.log('[pipeline] 取得論文が0件。処理終了。');
    return res.json({ ...stats, message: '取得論文なし' });
  }

  // ===== STEP 2: 重複排除 =====
  console.log('[pipeline] STEP 2: 重複排除');
  const uniquePapers = dedup(allPapers);
  stats.unique = uniquePapers.length;
  console.log(`[pipeline] STEP 2 完了: ${stats.unique} 件（重複 ${stats.total_fetched - stats.unique} 件除去）`);

  // ===== STEP 3: Sheets 既存データと照合 → 新規のみ抽出 =====
  console.log('[pipeline] STEP 3: 新規論文フィルタリング');
  let newPapers = uniquePapers;
  try {
    const existingTitles = await sheets.getExistingTitles();
    console.log(`[pipeline] Sheets 既存タイトル: ${existingTitles.length} 件`);
    newPapers = filterNew(uniquePapers, existingTitles);
  } catch (err) {
    const msg = `Sheets既存データ取得エラー（全件処理継続）: ${err.message}`;
    console.warn(`[pipeline] ${msg}`);
    stats.errors.push(msg);
  }

  stats.new = newPapers.length;
  console.log(`[pipeline] STEP 3 完了: 新規 ${stats.new} 件`);

  if (newPapers.length === 0) {
    console.log('[pipeline] 新規論文なし。処理終了。');
    return res.json({ ...stats, message: '新規論文なし' });
  }

  // ===== STEP 4: Claude API で要約・スコアリング =====
  console.log('[pipeline] STEP 4: AI要約・スコアリング開始');
  let summarizedPapers = [];
  try {
    summarizedPapers = await summarizer.processBatch(newPapers);
    console.log(`[pipeline] STEP 4 完了: ${summarizedPapers.length} 件の要約完了`);
  } catch (err) {
    const msg = `要約処理エラー: ${err.message}`;
    console.error(`[pipeline] ${msg}`);
    stats.errors.push(msg);
    // 要約失敗時はスコアなしで元データを使う
    summarizedPapers = newPapers;
  }

  // ===== STEP 5: Google Sheets に書き込み =====
  console.log('[pipeline] STEP 5: Sheets 書き込み');
  try {
    const written = await sheets.appendRows(summarizedPapers);
    console.log(`[pipeline] STEP 5 完了: ${written} 件書き込み`);
  } catch (err) {
    const msg = `Sheets書き込みエラー: ${err.message}`;
    console.error(`[pipeline] ${msg}`);
    stats.errors.push(msg);
  }

  // ===== STEP 6: Chatwork 通知 =====
  console.log('[pipeline] STEP 6: Chatwork 通知');
  const threshold = config.NOTIFICATION_THRESHOLD || 7;
  const notifyPapers = summarizedPapers.filter(
    (p) => (p.relevance_score || 0) >= threshold
  );
  stats.notified = notifyPapers.length;

  if (notifyPapers.length > 0) {
    try {
      await chatwork.notify(notifyPapers);
      console.log(`[pipeline] STEP 6 完了: ${notifyPapers.length} 件通知`);
    } catch (err) {
      const msg = `Chatwork通知エラー: ${err.message}`;
      console.error(`[pipeline] ${msg}`);
      stats.errors.push(msg);
    }
  } else {
    console.log(`[pipeline] STEP 6: 通知閾値（スコア${threshold}以上）の論文なし`);
  }

  // ===== 完了 =====
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[pipeline] ===== 処理完了 (${elapsed}秒) =====`);
  console.log(`[pipeline] 取得: ${stats.total_fetched} → 重複排除: ${stats.unique} → 新規: ${stats.new} → 通知: ${stats.notified}`);

  if (stats.errors.length > 0) {
    console.warn(`[pipeline] エラー ${stats.errors.length} 件発生:`, stats.errors);
  }

  return res.json({
    ...stats,
    elapsed_seconds: parseFloat(elapsed),
    message: `完了: ${stats.new} 件の新規論文を処理、${stats.notified} 件を通知`,
  });
}

// Cloud Functions エクスポート
exports.researchPipeline = researchPipeline;

// ローカル実行サポート
if (require.main === module) {
  const mockReq = { method: 'GET' };
  const mockRes = {
    json: (data) => {
      console.log('\n[result]', JSON.stringify(data, null, 2));
      process.exit(0);
    },
    status: (code) => ({
      json: (data) => {
        console.error(`\n[error ${code}]`, JSON.stringify(data, null, 2));
        process.exit(1);
      },
    }),
  };

  researchPipeline(mockReq, mockRes).catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
  });
}
