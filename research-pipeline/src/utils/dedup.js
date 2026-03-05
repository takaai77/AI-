'use strict';

/**
 * 重複排除モジュール
 * DOI一致 → タイトル正規化完全一致 → 先頭50文字一致 の順で判定
 * PubMed > Semantic Scholar > Baidu Scholar の優先順位で統合
 */

const SOURCE_PRIORITY = ['pubmed', 'semantic_scholar', 'baidu_scholar'];

/**
 * タイトルを正規化する（小文字化、記号除去、空白正規化）
 * @param {string} title
 * @returns {string}
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // 記号をスペースに
    .replace(/\s+/g, ' ')       // 連続スペースを1つに
    .trim();
}

/**
 * DOIを正規化（前後のスペース・小文字化）
 * @param {string} doi
 * @returns {string}
 */
function normalizeDoi(doi) {
  if (!doi) return '';
  return doi.toLowerCase().trim();
}

/**
 * 論文配列の重複を排除して統合する
 * @param {Array<Object>} papers - 統一フォーマットの論文配列
 * @returns {Array<Object>} 重複排除済み論文配列
 */
function dedup(papers) {
  if (!papers || papers.length === 0) return [];

  console.log(`[dedup] 重複排除開始: 入力 ${papers.length} 件`);

  // ソース優先順位でソート（高優先度が前に来るよう）
  const sorted = [...papers].sort((a, b) => {
    const pa = SOURCE_PRIORITY.indexOf(a.source);
    const pb = SOURCE_PRIORITY.indexOf(b.source);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  const seen = {
    dois: new Set(),
    titles: new Set(),
    titlePrefixes: new Set(),
  };

  const unique = [];

  for (const paper of sorted) {
    const doi = normalizeDoi(paper.doi);
    const title = normalizeTitle(paper.title);
    const titlePrefix = title.slice(0, 50);

    // 一次判定: DOI一致
    if (doi && seen.dois.has(doi)) {
      console.log(`[dedup] DOI重複スキップ: ${paper.title?.slice(0, 60)}`);
      continue;
    }

    // 二次判定: タイトル正規化完全一致
    if (title && seen.titles.has(title)) {
      console.log(`[dedup] タイトル重複スキップ: ${paper.title?.slice(0, 60)}`);
      continue;
    }

    // 三次判定: タイトル先頭50文字一致
    if (titlePrefix && titlePrefix.length >= 20 && seen.titlePrefixes.has(titlePrefix)) {
      console.log(`[dedup] タイトル前半重複スキップ: ${paper.title?.slice(0, 60)}`);
      continue;
    }

    // 重複なし → 追加
    if (doi) seen.dois.add(doi);
    if (title) seen.titles.add(title);
    if (titlePrefix && titlePrefix.length >= 20) seen.titlePrefixes.add(titlePrefix);

    unique.push(paper);
  }

  console.log(`[dedup] 重複排除完了: ${unique.length} 件（${papers.length - unique.length} 件除去）`);
  return unique;
}

/**
 * Sheets既存タイトルと照合して新規論文のみを返す
 * @param {Array<Object>} papers
 * @param {Array<string>} existingTitles
 * @returns {Array<Object>}
 */
function filterNew(papers, existingTitles) {
  const existingNormalized = new Set(existingTitles.map(normalizeTitle));
  return papers.filter((p) => !existingNormalized.has(normalizeTitle(p.title)));
}

module.exports = { dedup, filterNew, normalizeTitle };
