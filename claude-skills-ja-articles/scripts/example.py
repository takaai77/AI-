#!/usr/bin/env python3
"""
Claude Skills 日本語記事取得スキルの使用例
"""

from claude_skills_ja_articles import ClaudeSkillsJapaneseArticles


def example_1_get_all_articles():
    """例1: すべての記事を取得"""
    print("\n" + "="*60)
    print("例1: すべての記事を取得")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()
    articles = skills.get_all_articles()

    print(f"全{len(articles)}件の記事があります\n")
    for i, article in enumerate(articles, 1):
        print(f"{i}. {article['title']}")
        print(f"   URL: {article['url']}")
        print(f"   プラットフォーム: {article['platform']}\n")


def example_2_get_official_docs():
    """例2: 公式ドキュメントを取得"""
    print("\n" + "="*60)
    print("例2: 公式ドキュメントを取得")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()
    official = skills.get_official_docs()

    if official:
        print(f"\nタイトル: {official['title']}")
        print(f"URL: {official['url']}")
        print(f"説明: {official['description']}")


def example_3_get_tutorials():
    """例3: チュートリアル記事だけを取得"""
    print("\n" + "="*60)
    print("例3: チュートリアル記事だけを取得")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()
    tutorials = skills.get_tutorial_articles()

    print(f"\n全{len(tutorials)}件のチュートリアル記事\n")
    for tutorial in tutorials:
        print(f"- {tutorial['title']}")
        print(f"  {tutorial['url']}\n")


def example_4_filter_by_platform():
    """例4: プラットフォーム別にフィルタリング"""
    print("\n" + "="*60)
    print("例4: プラットフォーム別にフィルタリング")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()

    platforms = ["Zenn", "note", "Qiita"]

    for platform in platforms:
        articles = skills.get_article_by_platform(platform)
        print(f"\n【{platform}】 {len(articles)}件")
        for article in articles:
            print(f"  - {article['title']}")


def example_5_export_to_json():
    """例5: JSON形式でエクスポート"""
    print("\n" + "="*60)
    print("例5: JSON形式でエクスポート")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()
    result = skills.export_to_json("my_claude_skills_articles.json")
    print(f"\n{result}")


def example_6_display_formatted():
    """例6: 整形して表示"""
    print("\n" + "="*60)
    print("例6: 整形して表示")
    print("="*60)

    skills = ClaudeSkillsJapaneseArticles()
    formatted_output = skills.display_articles()
    print(formatted_output[:500])  # 最初の500文字だけ表示
    print("... (省略)")


def interactive_menu():
    """インタラクティブメニュー"""
    skills = ClaudeSkillsJapaneseArticles()

    while True:
        print("\n" + "="*60)
        print("Claude Skills 日本語記事取得スキル - メニュー")
        print("="*60)
        print("1. すべての記事を表示")
        print("2. 公式ドキュメントを表示")
        print("3. チュートリアル記事を表示")
        print("4. プラットフォーム別に表示")
        print("5. JSON出力")
        print("0. 終了")
        print()

        choice = input("選択してください (0-5): ")

        if choice == "1":
            example_1_get_all_articles()
        elif choice == "2":
            example_2_get_official_docs()
        elif choice == "3":
            example_3_get_tutorials()
        elif choice == "4":
            example_4_filter_by_platform()
        elif choice == "5":
            example_5_export_to_json()
        elif choice == "0":
            print("\n終了します")
            break
        else:
            print("\n無効な選択です")

        input("\nEnterキーで続行...")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        # インタラクティブモード
        interactive_menu()
    else:
        # すべての例を実行
        print("\n" + "="*60)
        print("Claude Skills 日本語記事取得スキル - 使用例")
        print("="*60)

        example_1_get_all_articles()
        example_2_get_official_docs()
        example_3_get_tutorials()
        example_4_filter_by_platform()
        example_5_export_to_json()

        print("\n\nインタラクティブモードを使用するには:")
        print("python3 usage_example.py --interactive")
