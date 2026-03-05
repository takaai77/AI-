'use strict';

/**
 * Claude API を使った論文要約・スコアリングモジュール
 * モデル: claude-opus-4-6（デフォルト）
 * Anthropic SDK を使用しストリーミングで取得
 */

const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('../utils/config');

let client = null;

/**
 * Anthropic クライアントを遅延初期化
 */
function getClient() {
  if (!client) {
    client = new Anthropic.Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

/**
 * 指定ミリ秒スリープ
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * デフォルト要約結果（API失敗時のフォールバック）
 */
function defaultResult(paper) {
  return {
    summary_ja: `【要約取得失敗】${paper.title}`,
    relevance_score: 5,
    category: 'その他',
    key_compounds: [],
    study_type: 'その他',
    actionable: false,
    urgency: 'low',
  };
}

/**
 * Claude API プロンプトを生成
 * @param {Object} paper
 * @returns {string}
 */
function buildPrompt(paper) {
  return `以下の学術論文の抄録を分析し、JSONのみで回答してください。マークダウンのコードブロックは不要です。

【ソース】${paper.source}
【タイトル】${paper.title}
【抄録】${paper.abstract}
【言語】${paper.language || 'en'}

回答フォーマット:
{
  "summary_ja": "日本語での3行要約。研究デザイン、主要な結果、実用的な示唆を含める",
  "relevance_score": 1から10の整数（サジージュース製品の研究開発への関連度。10が最も関連が高い）,
  "category": "成分分析" | "臨床試験" | "レビュー・メタアナリシス" | "加工・品質" | "薬理・動物試験" | "その他",
  "key_compounds": ["論文で言及されている主要な栄養成分・化合物のリスト"],
  "study_type": "RCT" | "観察研究" | "in vitro" | "動物試験" | "レビュー" | "分析研究" | "その他",
  "actionable": true または false（製品開発・マーケティングに直接活かせるかの判定）,
  "urgency": "high" | "medium" | "low"（highは新規臨床エビデンスや規制変更など即対応が必要なもの）
}`;
}

/**
 * 1件の論文を Claude API で要約・スコアリング
 * @param {Object} paper
 * @returns {Promise<Object>} 要約結果
 */
async function summarizePaper(paper) {
  const anthropic = getClient();

  // 抄録なしはスキップ
  if (!paper.abstract || paper.abstract.trim().length < 50) {
    console.log(`[summarizer] 抄録なし・短すぎるためスキップ: ${paper.title?.slice(0, 60)}`);
    return defaultResult(paper);
  }

  // Semantic Scholar の TLDR がある場合は Claude API をスキップ（コスト節約）
  if (paper.tldr && paper.tldr.length > 20) {
    console.log(`[summarizer] TLDR使用（Claude省略）: ${paper.title?.slice(0, 60)}`);
    return {
      summary_ja: `[TLDR] ${paper.tldr}`,
      relevance_score: 5,
      category: 'その他',
      key_compounds: [],
      study_type: 'その他',
      actionable: false,
      urgency: 'low',
    };
  }

  const prompt = buildPrompt(paper);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[summarizer] Claude API 呼び出し: ${paper.title?.slice(0, 60)}`);

      // ストリーミングで取得（長い出力でもタイムアウトしない）
      const stream = anthropic.messages.stream({
        model: config.CLAUDE_MODEL || 'claude-opus-4-6',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: prompt }],
      });

      const message = await stream.finalMessage();
      const textBlock = message.content.find((b) => b.type === 'text');
      const rawText = textBlock?.text || '';

      // JSON パース
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSONが見つかりません');
      }

      const result = JSON.parse(jsonMatch[0]);

      // 必須フィールドの補完
      return {
        summary_ja: result.summary_ja || defaultResult(paper).summary_ja,
        relevance_score: Number.isInteger(result.relevance_score)
          ? Math.max(1, Math.min(10, result.relevance_score))
          : 5,
        category: result.category || 'その他',
        key_compounds: Array.isArray(result.key_compounds) ? result.key_compounds : [],
        study_type: result.study_type || 'その他',
        actionable: Boolean(result.actionable),
        urgency: ['high', 'medium', 'low'].includes(result.urgency) ? result.urgency : 'low',
      };
    } catch (err) {
      console.warn(`[summarizer] 試行 ${attempt}/2 失敗: ${err.message}`);
      if (attempt < 2) {
        await sleep(3000);
      }
    }
  }

  console.error(`[summarizer] 要約失敗、デフォルト値使用: ${paper.title?.slice(0, 60)}`);
  return defaultResult(paper);
}

/**
 * 論文リストをバッチ処理（1件ずつ順次、1秒間隔）
 * @param {Object[]} papers
 * @returns {Promise<Object[]>} 要約結果付き論文配列
 */
async function processBatch(papers) {
  if (!papers || papers.length === 0) return [];

  console.log(`[summarizer] バッチ処理開始: ${papers.length} 件`);
  const results = [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    console.log(`[summarizer] 処理中 ${i + 1}/${papers.length}: ${paper.title?.slice(0, 60)}`);

    const summary = await summarizePaper(paper);

    results.push({
      ...paper,
      ...summary,
    });

    // レート制限対策: 1件ごとに1秒待機（最後の1件は不要）
    if (i < papers.length - 1) {
      await sleep(1000);
    }
  }

  console.log(`[summarizer] バッチ処理完了: ${results.length} 件`);
  return results;
}

module.exports = { processBatch, summarizePaper };
