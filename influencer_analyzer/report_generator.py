"""
マークダウンレポート生成モジュール
"""
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import defaultdict

from .content_analyzer import AnalysisResult, Skill


class ReportGenerator:
    """マークダウンレポート生成クラス"""

    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_report(self, result: AnalysisResult,
                        x_engagement: Optional[Dict[str, Any]] = None,
                        note_engagement: Optional[Dict[str, Any]] = None) -> str:
        """分析レポートをマークダウンで生成"""
        sections = []

        # ヘッダー
        sections.append(self._generate_header(result))

        # エグゼクティブサマリー
        sections.append(self._generate_executive_summary(result))

        # エンゲージメント分析
        if x_engagement or note_engagement:
            sections.append(self._generate_engagement_section(x_engagement, note_engagement))

        # カテゴリ別スキル集
        sections.append(self._generate_skills_by_category(result))

        # トップインサイト
        sections.append(self._generate_top_insights(result))

        # アクションプラン
        sections.append(self._generate_action_plan(result))

        # フッター
        sections.append(self._generate_footer())

        report = "\n\n".join(sections)
        return report

    def _generate_header(self, result: AnalysisResult) -> str:
        """ヘッダーを生成"""
        date_str = datetime.now().strftime("%Y年%m月%d日")
        return f"""# {result.influencer_name} 分析レポート

**生成日:** {date_str}

---

このレポートは、{result.influencer_name}のX（Twitter）およびnoteの投稿を分析し、
動画作成に関するヒント、スキル、知見を集約したものです。"""

    def _generate_executive_summary(self, result: AnalysisResult) -> str:
        """エグゼクティブサマリーを生成"""
        summary = result.summary
        total_skills = summary.get('total_skills', 0)
        total_insights = summary.get('total_insights', 0)
        top_categories = summary.get('top_categories', [])

        top_cat_text = ""
        if top_categories:
            top_cat_list = [f"- {cat}: {count}件" for cat, count in top_categories[:5]]
            top_cat_text = "\n".join(top_cat_list)

        source_dist = summary.get('source_distribution', {})
        x_count = source_dist.get('X', 0)
        note_count = source_dist.get('note', 0)

        return f"""## 概要サマリー

### 分析結果の要約

| 項目 | 数値 |
|------|------|
| 抽出されたスキル・ヒント総数 | {total_skills}件 |
| 分析したインサイト数 | {total_insights}件 |
| Xからの抽出数 | {x_count}件 |
| noteからの抽出数 | {note_count}件 |

### 主要カテゴリ（出現頻度順）

{top_cat_text}"""

    def _generate_engagement_section(self,
                                      x_engagement: Optional[Dict[str, Any]],
                                      note_engagement: Optional[Dict[str, Any]]) -> str:
        """エンゲージメント分析セクションを生成"""
        sections = ["## エンゲージメント分析"]

        if x_engagement:
            total_tweets = x_engagement.get('total_tweets', 0)
            avg_likes = x_engagement.get('average_likes', 0)
            avg_rt = x_engagement.get('average_retweets', 0)

            sections.append(f"""### X（Twitter）

| 指標 | 数値 |
|------|------|
| 分析ツイート数 | {total_tweets}件 |
| 平均いいね数 | {avg_likes} |
| 平均リツイート数 | {avg_rt} |""")

            # トップツイート
            top_tweets = x_engagement.get('top_tweets', [])
            if top_tweets:
                sections.append("\n**人気ツイート TOP3:**\n")
                for i, tweet in enumerate(top_tweets[:3], 1):
                    text = tweet.text[:100] + "..." if len(tweet.text) > 100 else tweet.text
                    text = text.replace("\n", " ")
                    sections.append(f"{i}. 「{text}」\n   - いいね: {tweet.like_count}, RT: {tweet.retweet_count}")

        if note_engagement:
            total_articles = note_engagement.get('total_articles', 0)
            avg_likes = note_engagement.get('average_likes', 0)
            total_likes = note_engagement.get('total_likes', 0)

            sections.append(f"""### note

| 指標 | 数値 |
|------|------|
| 分析記事数 | {total_articles}件 |
| 総いいね数 | {total_likes} |
| 平均いいね数 | {avg_likes} |""")

            # トップ記事
            top_articles = note_engagement.get('top_articles', [])
            if top_articles:
                sections.append("\n**人気記事 TOP3:**\n")
                for i, article in enumerate(top_articles[:3], 1):
                    sections.append(f"{i}. [{article.title}]({article.url})\n   - いいね: {article.like_count}")

        return "\n".join(sections)

    def _generate_skills_by_category(self, result: AnalysisResult) -> str:
        """カテゴリ別スキル集を生成"""
        sections = ["## カテゴリ別スキル・ヒント集"]

        # スキルをカテゴリ別にグループ化
        categorized = defaultdict(list)
        for skill in result.skills:
            categorized[skill.category].append(skill)

        # カテゴリごとに出力
        for category in sorted(categorized.keys()):
            skills = categorized[category]
            skills.sort(key=lambda s: -s.engagement)

            sections.append(f"\n### {category}")
            sections.append("")

            for i, skill in enumerate(skills[:10], 1):  # 各カテゴリ最大10件
                desc = skill.description.replace("\n", " ").strip()
                if len(desc) > 200:
                    desc = desc[:197] + "..."

                source_badge = f"[{skill.source}]"
                engagement_badge = f"({skill.engagement})" if skill.engagement else ""

                sections.append(f"**{i}. {source_badge} {engagement_badge}**")
                sections.append(f"> {desc}")
                sections.append("")

        return "\n".join(sections)

    def _generate_top_insights(self, result: AnalysisResult) -> str:
        """トップインサイトセクションを生成"""
        sections = ["## 最も反響の高いインサイト TOP10"]

        # エンゲージメント順にソート
        sorted_skills = sorted(result.skills, key=lambda s: -s.engagement)[:10]

        for i, skill in enumerate(sorted_skills, 1):
            desc = skill.description.replace("\n", " ").strip()
            if len(desc) > 150:
                desc = desc[:147] + "..."

            sections.append(f"""
### {i}. {skill.title}

- **カテゴリ:** {skill.category}
- **ソース:** {skill.source}
- **エンゲージメント:** {skill.engagement}

> {desc}
""")

        return "\n".join(sections)

    def _generate_action_plan(self, result: AnalysisResult) -> str:
        """アクションプランを生成"""
        # 最も多いカテゴリを抽出
        category_counts = defaultdict(int)
        for skill in result.skills:
            category_counts[skill.category] += 1

        top_categories = sorted(category_counts.items(), key=lambda x: -x[1])[:5]

        action_items = []
        for i, (category, count) in enumerate(top_categories, 1):
            # カテゴリに応じたアクションを提案
            action = self._get_action_for_category(category)
            action_items.append(f"{i}. **{category}**（{count}件の知見）\n   - {action}")

        return f"""## 推奨アクションプラン

分析結果に基づく、優先度の高い改善アクションです。

{chr(10).join(action_items)}

### 実行のポイント

- 一度にすべてを実行しようとせず、1つずつ取り組む
- 効果を測定しながら改善を繰り返す
- このインフルエンサーの投稿を定期的にチェックし、新しい知見を取り入れる"""

    def _get_action_for_category(self, category: str) -> str:
        """カテゴリに応じたアクションを返す"""
        actions = {
            "動画編集": "編集テンポを見直し、視聴者の集中力を維持する構成を心がける",
            "サムネイル作成": "A/Bテストを実施し、クリック率の高いデザインパターンを見つける",
            "タイトル・コピーライティング": "感情を動かすフレーズを意識したタイトル作成を実践する",
            "ストーリーテリング": "動画の構成を事前に設計し、視聴者を引き込む流れを作る",
            "エンゲージメント戦略": "コメント誘導やCTAを効果的に配置する",
            "収益化": "複数の収益源を検討し、収益構造を多様化する",
            "機材・ツール": "費用対効果を考慮して機材をアップグレードする",
            "撮影テクニック": "照明とアングルを工夫して映像品質を向上させる",
            "音声・BGM": "音声品質の改善とBGM選びにこだわる",
            "投稿タイミング": "分析データに基づいて最適な投稿時間を特定する",
            "アルゴリズム対策": "視聴維持率を意識したコンテンツ作りを心がける",
            "視聴維持率": "冒頭のフックと定期的な山場を設ける",
        }
        return actions.get(category, "この分野の知見を実践に活かす")

    def _generate_footer(self) -> str:
        """フッターを生成"""
        return """---

## 付録

### このレポートについて

- このレポートはインフルエンサー分析ツールによって自動生成されました
- 分析対象のデータは公開されている投稿に基づいています
- 定期的に分析を実行し、最新の知見を取り入れることをお勧めします

### 免責事項

- 抽出されたスキル・ヒントは参考情報であり、効果を保証するものではありません
- 各自の状況に合わせてアレンジしてご活用ください
"""

    def save_report(self, report: str, filename: str) -> str:
        """レポートをファイルに保存"""
        if not filename.endswith('.md'):
            filename += '.md'

        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"レポートを保存しました: {filepath}")
        return filepath

    def generate_quick_reference(self, result: AnalysisResult) -> str:
        """クイックリファレンス（チートシート）を生成"""
        sections = [f"# {result.influencer_name} スキルチートシート\n"]

        # カテゴリ別にグループ化
        categorized = defaultdict(list)
        for skill in result.skills:
            categorized[skill.category].append(skill)

        for category in sorted(categorized.keys()):
            skills = categorized[category][:5]  # 各カテゴリ最大5件
            sections.append(f"\n## {category}\n")

            for skill in skills:
                # 箇条書きで簡潔に
                desc = skill.description.split('。')[0]  # 最初の文のみ
                if len(desc) > 80:
                    desc = desc[:77] + "..."
                sections.append(f"- {desc}")

        return "\n".join(sections)

    def save_quick_reference(self, report: str, filename: str = "cheatsheet") -> str:
        """クイックリファレンスをファイルに保存"""
        if not filename.endswith('.md'):
            filename += '.md'

        filepath = os.path.join(self.output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report)

        print(f"チートシートを保存しました: {filepath}")
        return filepath
