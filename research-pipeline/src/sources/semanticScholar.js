'use strict';

/**
 * Semantic Scholar API モジュール
 * sea buckthorn / hippophae rhamnoides 関連論文を取得する
 */

const fetch = require('node-fetch');
const { config } = require('../utils/config');

const API_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';
const SEARCH_QUERY = 'sea buckthorn OR hippophae rhamnoides';
const FIELDS = 'title,abstract,authors,year,url,tldr,publicationDate,externalIds,journal';

/**
 * 指定ミリ秒スリープ
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff 付きfetch（429対応）
 * @param {string} url
 * @param {Object} headers
 * @param {number} maxRetries
 */
async function fetchWithBackoff(url, headers = {}, maxRetries = 5) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers });

      if (res.status === 429) {
        console.warn(`[semantic_scholar] レート制限 (試行 ${attempt}/${maxRetries}) - ${delay}ms 待機`);
        await sleep(delay);
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`[semantic_scholar] fetch失敗 (試行 ${attempt}/${maxRetries}): ${err.message}`);
      await sleep(delay);
      delay *= 2;
    }
  }
}

/**
 * 年フィルター文字列を動的生成（当年〜翌年）
 */
function getYearRange() {
  const now = new Date();
  const year = now.getFullYear();
  return `${year - 1}-${year + 1}`; // 前年〜来年で広めに取る
}

/**
 * Semantic Scholar 論文データを統一フォーマットに変換
 * @param {Object} paper
 * @returns {Object}
 */
function convertPaper(paper) {
  const doi = paper.externalIds?.DOI || '';
  const pmid = paper.externalIds?.PubMed || '';
  const arxiv = paper.externalIds?.ArXiv || '';

  // ID の優先順位: DOI > PubMed > ArXiv > SemanticScholar
  const id = doi
    ? `DOI:${doi}`
    : pmid
    ? `PMID:${pmid}`
    : arxiv
    ? `ArXiv:${arxiv}`
    : `SS:${paper.paperId}`;

  const authors = (paper.authors || []).map((a) => a.name || '').filter(Boolean);

  const journal =
    paper.journal?.name ||
    paper.publicationVenue?.name ||
    '';

  const year = paper.year || (paper.publicationDate ? parseInt(paper.publicationDate.slice(0, 4)) : null);
  const date = paper.publicationDate || (year ? `${year}-01-01` : '');

  return {
    source: 'semantic_scholar',
    id,
    title: paper.title || '',
    abstract: paper.abstract || '',
    authors,
    journal,
    year: year || new Date().getFullYear(),
    date,
    doi,
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    pmc_url: '',
    language: 'en',
    free_full_text: false,
    // Semantic Scholar 固有フィールド
    tldr: paper.tldr?.text || '',
  };
}

/**
 * 過去N年間のサジー関連論文を取得するメインエントリポイント
 * @returns {Promise<Object[]>}
 */
async function fetchRecent() {
  console.log('[semantic_scholar] 取得開始');

  const headers = {};
  if (config.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = config.SEMANTIC_SCHOLAR_API_KEY;
  }

  const yearRange = getYearRange();
  const params = new URLSearchParams({
    query: SEARCH_QUERY,
    year: yearRange,
    limit: '50',
    fields: FIELDS,
  });

  const url = `${API_BASE}?${params.toString()}`;
  console.log(`[semantic_scholar] 検索: ${SEARCH_QUERY} (年範囲: ${yearRange})`);

  let data;
  try {
    const res = await fetchWithBackoff(url, headers);
    data = await res.json();
  } catch (err) {
    console.error(`[semantic_scholar] API呼び出しエラー: ${err.message}`);
    return [];
  }

  const rawPapers = data.data || [];
  console.log(`[semantic_scholar] ${rawPapers.length} 件取得`);

  const papers = [];
  for (const paper of rawPapers) {
    try {
      if (!paper.title) continue;
      papers.push(convertPaper(paper));
    } catch (err) {
      console.warn(`[semantic_scholar] 論文変換エラー: ${err.message}`);
    }
  }

  console.log(`[semantic_scholar] 取得完了: ${papers.length} 件`);
  return papers;
}

module.exports = { fetchRecent };
