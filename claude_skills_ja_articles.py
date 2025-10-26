#!/usr/bin/env python3
"""
Claude Skills 日本語記事取得スキル

Claude Skillsに関する日本語記事を取得・表示するスキルです。
"""

import json
from typing import List, Dict

class ClaudeSkillsJapaneseArticles:
    """Claude Skillsの日本語記事を管理するクラス"""

    def __init__(self):
        self.articles = [
            {
                "title": "Claude Skillsを使ってみた - システムプロンプト的なカスタマイズが面白い",
                "url": "https://zenn.dev/lnest_knowledge/articles/2912bc87bc83d5",
                "platform": "Zenn",
                "description": "実際にいくつかのスキルを作成・使用してみた感想と、標準で用意されているスキルについて紹介"
            },
            {
                "title": "Claude Skills の概要",
                "url": "https://note.com/npaka/n/n6e221d209d90",
                "platform": "note",
                "author": "npaka",
                "description": "Skillsは専門知識をパッケージ化できるカスタムオンボーディングマテリアルのようなもので、Claudeをユーザーにとって最も重要分野の専門家にできる"
            },
            {
                "title": "Claudeを「特定タスクの専門家」にする新機能「Skills」登場",
                "url": "https://news.yahoo.co.jp/articles/89d17f3ed0c223aeb606e7103e436edc425900b9",
                "platform": "Yahoo!ニュース (CNET Japan)",
                "description": "Claude Skillsの新機能に関するニュース記事"
            },
            {
                "title": "プロンプトだけじゃない！Claude Skillsで広がるAI活用の可能性",
                "url": "https://qiita.com/iineineno03k/items/bb9ec1ff47ace14fb57d",
                "platform": "Qiita",
                "author": "iineineno03k",
                "description": "2025年10月16日にAnthropicが発表したClaude Skillsの概要と、Claude DesktopおよびClaude Codeでの使い方について解説"
            },
            {
                "title": "「Claude Skills」を発表 ～専門技能（スキル）を追加する仕組み",
                "url": "https://forest.watch.impress.co.jp/docs/news/2055832.html",
                "platform": "窓の杜",
                "description": "Claude Skillsの発表に関するニュース記事"
            },
            {
                "title": "やさしいClaude Skills入門",
                "url": "https://www.docswell.com/s/harinezumi/5M683X-2025-10-21-003933",
                "platform": "ドクセル",
                "author": "harinezumi",
                "description": "Claudeが特定のタスクを高品質に実行するために必要に応じて読み込む、指示・スクリプト・リソースを含むベストプラクティス集のフォルダとして説明"
            },
            {
                "title": "Agent Skills - Claude Docs",
                "url": "https://docs.claude.com/ja/docs/claude-code/skills",
                "platform": "公式ドキュメント",
                "description": "Claude Skills（Agent Skills）の公式日本語ドキュメント。スキルを作成、使用、管理する方法を説明"
            },
            {
                "title": "Anthropic、Claudeのカスタマイズ機能「Skills for Skills」リリース",
                "url": "https://www.itmedia.co.jp/aiplus/articles/2510/17/news060.html",
                "platform": "ITmedia",
                "description": "Claude Skillsのリリースに関するニュース記事"
            },
            {
                "title": "Claude Skillsとは何なのか？",
                "url": "https://note.com/robothink/n/n3f9213f4dd17",
                "platform": "note",
                "author": "矢野 哲平@耳で学ぶAI",
                "description": "事前に動作してほしいタスクを登録しておくことで任意のタイミングで呼び出せる機能として紹介"
            },
            {
                "title": "Claudeの使い方をやさしく解説！回答精度が上がるプロンプトの書き方も紹介",
                "url": "https://shift-ai.co.jp/blog/11518/",
                "platform": "SHIFT AI TIMES",
                "description": "Claudeの使い方とプロンプトの書き方について解説（Claude Skills含む）"
            }
        ]

    def get_all_articles(self) -> List[Dict]:
        """すべての記事を取得"""
        return self.articles

    def get_article_by_platform(self, platform: str) -> List[Dict]:
        """プラットフォーム別に記事を取得"""
        return [article for article in self.articles if article["platform"].lower() == platform.lower()]

    def display_articles(self) -> str:
        """記事一覧を整形して表示"""
        output = "# Claude Skills 日本語記事一覧\n\n"

        for i, article in enumerate(self.articles, 1):
            output += f"## {i}. {article['title']}\n"
            output += f"- **URL**: {article['url']}\n"
            output += f"- **プラットフォーム**: {article['platform']}\n"
            if "author" in article:
                output += f"- **著者**: {article['author']}\n"
            output += f"- **説明**: {article['description']}\n\n"

        return output

    def get_official_docs(self) -> Dict:
        """公式ドキュメントを取得"""
        for article in self.articles:
            if article["platform"] == "公式ドキュメント":
                return article
        return None

    def get_tutorial_articles(self) -> List[Dict]:
        """チュートリアル記事を取得"""
        keywords = ["入門", "使ってみた", "使い方", "解説"]
        return [
            article for article in self.articles
            if any(keyword in article["title"] or keyword in article["description"] for keyword in keywords)
        ]

    def export_to_json(self, filename: str = "claude_skills_articles.json"):
        """記事データをJSONファイルに出力"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.articles, f, ensure_ascii=False, indent=2)
        return f"記事データを {filename} に出力しました"


def main():
    """メイン関数"""
    skills_articles = ClaudeSkillsJapaneseArticles()

    print("=" * 80)
    print("Claude Skills 日本語記事取得スキル")
    print("=" * 80)
    print()

    # すべての記事を表示
    print(skills_articles.display_articles())

    print("\n" + "=" * 80)
    print("公式ドキュメント")
    print("=" * 80)
    official = skills_articles.get_official_docs()
    if official:
        print(f"タイトル: {official['title']}")
        print(f"URL: {official['url']}")
        print(f"説明: {official['description']}")

    print("\n" + "=" * 80)
    print("チュートリアル記事")
    print("=" * 80)
    tutorials = skills_articles.get_tutorial_articles()
    for tutorial in tutorials:
        print(f"- {tutorial['title']}")
        print(f"  URL: {tutorial['url']}\n")

    # JSONファイルに出力
    result = skills_articles.export_to_json()
    print("\n" + result)


if __name__ == "__main__":
    main()
