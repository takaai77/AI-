'use strict';

/**
 * PubMed E-utilities API モジュール
 * 過去N日間のサジー関連論文を取得する
 */

const fetch = require('node-fetch');
const xml2js = require('xml2js');
const { config } = require('../utils/config');

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

// 成分研究特化クエリ
const SEARCH_QUERY = '(hippophae[MeSH] OR "sea buckthorn"[tiab] OR "Elaeagnus rhamnoides"[tiab]) AND ("nutritional composition"[tiab] OR "fatty acids"[MeSH] OR "carotenoids"[MeSH] OR "ascorbic acid"[MeSH] OR "flavonoids"[MeSH] OR "tocopherols"[MeSH] OR "phytosterols"[tiab] OR "bioactive compounds"[tiab] OR "palmitoleic acid"[tiab] OR "isorhamnetin"[tiab] OR "omega-7"[tiab])';

/**
 * 指定ミリ秒スリープ
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付きfetch
 * @param {string} url
 * @param {number} retries
 * @param {number} delayMs
 */
async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res;
    } catch (err) {
      console.warn(`[pubmed] fetch失敗 (試行 ${attempt}/${retries}): ${err.message}`);
      if (attempt < retries) {
        await sleep(delayMs * attempt);
      } else {
        throw err;
      }
    }
  }
}

/**
 * PubMed esearch で PMID リストを取得
 * @param {number} days 過去何日分を取得するか
 * @returns {Promise<string[]>} PMIDの配列
 */
async function searchPmids(days) {
  const apiKeyParam = config.PUBMED_API_KEY ? `&api_key=${config.PUBMED_API_KEY}` : '';
  const url = `${ESEARCH_URL}?db=pubmed&term=${encodeURIComponent(SEARCH_QUERY)}&datetype=edat&reldate=${days}&retmax=50&retmode=json${apiKeyParam}`;

  console.log(`[pubmed] esearch 実行中... (過去${days}日間)`);
  const res = await fetchWithRetry(url);
  const data = await res.json();

  const ids = data.esearchresult?.idlist || [];
  console.log(`[pubmed] ${ids.length} 件の PMID 取得`);
  return ids;
}

/**
 * XML を JS オブジェクトにパース
 * @param {string} xmlStr
 */
async function parseXml(xmlStr) {
  return xml2js.parseStringPromise(xmlStr, { explicitArray: false, ignoreAttrs: false });
}

/**
 * PubMed efetch で論文詳細を取得
 * @param {string[]} pmids
 * @returns {Promise<Object[]>} 統一フォーマットの論文配列
 */
async function fetchDetails(pmids) {
  if (pmids.length === 0) return [];

  const apiKeyParam = config.PUBMED_API_KEY ? `&api_key=${config.PUBMED_API_KEY}` : '';
  // 50件まで一括取得
  const ids = pmids.join(',');
  const url = `${EFETCH_URL}?db=pubmed&id=${ids}&retmode=xml&rettype=abstract${apiKeyParam}`;

  console.log(`[pubmed] efetch 実行中... (${pmids.length} 件)`);
  await sleep(1000); // レート制限対策
  const res = await fetchWithRetry(url);
  const xmlStr = await res.text();
  const parsed = await parseXml(xmlStr);

  const articles = parsed?.PubmedArticleSet?.PubmedArticle;
  if (!articles) return [];

  const list = Array.isArray(articles) ? articles : [articles];
  const papers = [];

  for (const item of list) {
    try {
      const medline = item.MedlineCitation;
      const article = medline?.Article;
      if (!article) continue;

      const pmid = medline.PMID?._ || medline.PMID || '';
      const title = article.ArticleTitle?._ || article.ArticleTitle || '';

      // 抄録テキスト取得（構造化抄録にも対応）
      let abstract = '';
      const abstractText = article.Abstract?.AbstractText;
      if (Array.isArray(abstractText)) {
        abstract = abstractText.map((t) => t._ || t || '').join(' ');
      } else if (abstractText) {
        abstract = abstractText._ || abstractText || '';
      }

      // 著者リスト
      const authorList = article.AuthorList?.Author;
      const authors = [];
      if (authorList) {
        const authArr = Array.isArray(authorList) ? authorList : [authorList];
        for (const a of authArr) {
          const lastName = a.LastName || '';
          const firstName = a.ForeName || '';
          if (lastName) authors.push(`${lastName} ${firstName}`.trim());
        }
      }

      // ジャーナル
      const journal = article.Journal?.Title || article.Journal?.ISOAbbreviation || '';

      // 公開日
      const pubDate = article.Journal?.JournalIssue?.PubDate;
      const year = pubDate?.Year || new Date().getFullYear();
      const month = pubDate?.Month || '01';
      const day = pubDate?.Day || '01';
      const monthNum = isNaN(month) ? new Date(`${month} 1`).getMonth() + 1 : parseInt(month);
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // DOI
      const articleIds = item.PubmedData?.ArticleIdList?.ArticleId;
      let doi = '';
      let pmcId = '';
      if (articleIds) {
        const idArr = Array.isArray(articleIds) ? articleIds : [articleIds];
        for (const aid of idArr) {
          const type = aid.$?.IdType || '';
          const val = aid._ || aid || '';
          if (type === 'doi') doi = val;
          if (type === 'pmc') pmcId = val;
        }
      }

      const pmcUrl = pmcId ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/` : '';

      papers.push({
        source: 'pubmed',
        id: `PMID:${pmid}`,
        title: String(title),
        abstract: String(abstract),
        authors,
        journal: String(journal),
        year: parseInt(year),
        date: dateStr,
        doi: doi || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        pmc_url: pmcUrl,
        language: 'en',
        free_full_text: !!pmcUrl,
      });
    } catch (err) {
      console.warn(`[pubmed] 論文パースエラー: ${err.message}`);
    }
  }

  console.log(`[pubmed] ${papers.length} 件の論文詳細取得完了`);
  return papers;
}

/**
 * 過去N日間のサジー関連論文を取得するメインエントリポイント
 * @returns {Promise<Object[]>}
 */
async function fetchRecent() {
  console.log('[pubmed] 取得開始');
  const days = config.SEARCH_DAYS || 7;

  const pmids = await searchPmids(days);
  if (pmids.length === 0) {
    console.log('[pubmed] 新着論文なし');
    return [];
  }

  const papers = await fetchDetails(pmids);
  console.log(`[pubmed] 取得完了: ${papers.length} 件`);
  return papers;
}

module.exports = { fetchRecent };
