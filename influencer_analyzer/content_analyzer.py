"""
コンテンツ分析・スキル抽出エンジン
"""
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class Skill:
    """抽出されたスキル・ヒント"""
    category: str
    title: str
    description: str
    source: str  # X or note
    source_url: str = ""
    engagement: int = 0
    keywords: List[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    """分析結果"""
    influencer_name: str
    skills: List[Skill] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    raw_insights: List[Dict[str, Any]] = field(default_factory=list)


class ContentAnalyzer:
    """コンテンツ分析・スキル抽出クラス"""

    # スキルカテゴリとキーワードのマッピング
    SKILL_CATEGORIES = {
        "動画編集": [
            "編集", "カット", "トランジション", "エフェクト", "テロップ",
            "字幕", "premiere", "finalcut", "davinci", "動画ソフト"
        ],
        "サムネイル作成": [
            "サムネ", "サムネイル", "thumbnail", "クリック率", "CTR",
            "デザイン", "canva", "photoshop", "画像"
        ],
        "タイトル・コピーライティング": [
            "タイトル", "コピー", "見出し", "キャッチ", "言葉",
            "パワーワード", "フック", "煽り"
        ],
        "ストーリーテリング": [
            "ストーリー", "構成", "台本", "脚本", "流れ",
            "起承転結", "展開", "シナリオ"
        ],
        "エンゲージメント戦略": [
            "エンゲージメント", "いいね", "コメント", "シェア", "拡散",
            "バズ", "炎上", "反応", "インプレッション"
        ],
        "収益化": [
            "収益", "マネタイズ", "広告", "案件", "アフィリエイト",
            "メンバーシップ", "スーパーチャット", "収入", "稼ぐ"
        ],
        "機材・ツール": [
            "カメラ", "マイク", "照明", "三脚", "機材",
            "ソフト", "アプリ", "ツール", "PC", "スマホ"
        ],
        "撮影テクニック": [
            "撮影", "アングル", "構図", "ライティング", "画角",
            "ピント", "露出", "ホワイトバランス"
        ],
        "音声・BGM": [
            "BGM", "音声", "音楽", "効果音", "SE",
            "ナレーション", "マイク", "録音", "オーディオ"
        ],
        "投稿タイミング": [
            "タイミング", "投稿時間", "曜日", "時間帯", "頻度",
            "スケジュール", "定期", "毎日"
        ],
        "アルゴリズム対策": [
            "アルゴリズム", "おすすめ", "関連動画", "検索",
            "SEO", "インプレッション", "表示回数"
        ],
        "視聴維持率": [
            "視聴維持", "離脱", "視聴者", "冒頭", "オープニング",
            "フック", "引き", "飽きさせない"
        ]
    }

    def __init__(self, skill_categories: Optional[Dict[str, List[str]]] = None):
        self.skill_categories = skill_categories or self.SKILL_CATEGORIES

    def analyze(self, x_insights: List[Dict[str, Any]],
                note_insights: List[Dict[str, Any]],
                influencer_name: str) -> AnalysisResult:
        """全インサイトを分析してスキルを抽出"""
        result = AnalysisResult(influencer_name=influencer_name)

        # すべてのインサイトを統合
        all_insights = []
        for insight in x_insights:
            insight['source'] = 'X'
            all_insights.append(insight)
        for insight in note_insights:
            insight['source'] = 'note'
            all_insights.append(insight)

        result.raw_insights = all_insights

        # スキルを抽出
        skills = self._extract_skills(all_insights)
        result.skills = skills

        # サマリーを生成
        result.summary = self._generate_summary(skills, all_insights)

        return result

    def _extract_skills(self, insights: List[Dict[str, Any]]) -> List[Skill]:
        """インサイトからスキルを抽出"""
        skills = []
        processed_texts = set()

        for insight in insights:
            text = insight.get('text', '')

            # 重複チェック
            if text in processed_texts:
                continue
            processed_texts.add(text)

            # カテゴリを判定
            categories = self._categorize_content(text)

            for category in categories:
                skill = Skill(
                    category=category,
                    title=self._generate_skill_title(text, category),
                    description=text,
                    source=insight.get('source', ''),
                    source_url=insight.get('url', ''),
                    engagement=insight.get('engagement', 0),
                    keywords=self._extract_keywords(text)
                )
                skills.append(skill)

        # カテゴリごとにソート、エンゲージメント順
        skills.sort(key=lambda s: (s.category, -s.engagement))

        return skills

    def _categorize_content(self, text: str) -> List[str]:
        """コンテンツをカテゴリ分類"""
        text_lower = text.lower()
        categories = []

        for category, keywords in self.skill_categories.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    if category not in categories:
                        categories.append(category)
                    break

        # カテゴリが見つからない場合は「その他」
        if not categories:
            categories = ["その他のヒント"]

        return categories

    def _generate_skill_title(self, text: str, category: str) -> str:
        """スキルのタイトルを生成"""
        # テキストの最初の文または最初の50文字をタイトルに
        first_sentence = text.split('。')[0] if '。' in text else text
        first_sentence = first_sentence.split('\n')[0]

        if len(first_sentence) > 50:
            first_sentence = first_sentence[:47] + "..."

        return first_sentence

    def _extract_keywords(self, text: str) -> List[str]:
        """テキストからキーワードを抽出"""
        keywords = []
        text_lower = text.lower()

        for category, kw_list in self.skill_categories.items():
            for keyword in kw_list:
                if keyword.lower() in text_lower and keyword not in keywords:
                    keywords.append(keyword)

        return keywords[:5]  # 最大5つまで

    def _generate_summary(self, skills: List[Skill],
                          insights: List[Dict[str, Any]]) -> Dict[str, Any]:
        """分析サマリーを生成"""
        # カテゴリ別集計
        category_counts = defaultdict(int)
        category_engagement = defaultdict(int)

        for skill in skills:
            category_counts[skill.category] += 1
            category_engagement[skill.category] += skill.engagement

        # ソース別集計
        source_counts = {"X": 0, "note": 0}
        for insight in insights:
            source = insight.get('source', '')
            if source in source_counts:
                source_counts[source] += 1

        # 最も多いカテゴリ
        top_categories = sorted(
            category_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        # 最もエンゲージメントが高いカテゴリ
        high_engagement_categories = sorted(
            category_engagement.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        return {
            "total_skills": len(skills),
            "total_insights": len(insights),
            "category_distribution": dict(category_counts),
            "top_categories": top_categories,
            "high_engagement_categories": high_engagement_categories,
            "source_distribution": source_counts,
        }

    def get_skills_by_category(self, skills: List[Skill]) -> Dict[str, List[Skill]]:
        """スキルをカテゴリ別に整理"""
        categorized = defaultdict(list)

        for skill in skills:
            categorized[skill.category].append(skill)

        # 各カテゴリ内でエンゲージメント順にソート
        for category in categorized:
            categorized[category].sort(key=lambda s: -s.engagement)

        return dict(categorized)

    def filter_skills(self, skills: List[Skill],
                      min_engagement: int = 0,
                      categories: Optional[List[str]] = None,
                      sources: Optional[List[str]] = None) -> List[Skill]:
        """スキルをフィルタリング"""
        filtered = skills

        if min_engagement > 0:
            filtered = [s for s in filtered if s.engagement >= min_engagement]

        if categories:
            filtered = [s for s in filtered if s.category in categories]

        if sources:
            filtered = [s for s in filtered if s.source in sources]

        return filtered

    def deduplicate_skills(self, skills: List[Skill],
                           similarity_threshold: float = 0.7) -> List[Skill]:
        """類似したスキルを重複排除"""
        if not skills:
            return []

        unique_skills = []
        seen_descriptions = []

        for skill in skills:
            is_duplicate = False
            desc_lower = skill.description.lower()

            for seen_desc in seen_descriptions:
                # 簡易的な類似度チェック（部分一致）
                if desc_lower in seen_desc or seen_desc in desc_lower:
                    is_duplicate = True
                    break

                # 共通単語数による類似度
                words1 = set(desc_lower.split())
                words2 = set(seen_desc.split())
                if words1 and words2:
                    similarity = len(words1 & words2) / max(len(words1), len(words2))
                    if similarity >= similarity_threshold:
                        is_duplicate = True
                        break

            if not is_duplicate:
                unique_skills.append(skill)
                seen_descriptions.append(desc_lower)

        return unique_skills
