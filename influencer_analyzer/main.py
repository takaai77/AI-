#!/usr/bin/env python3
"""
インフルエンサー分析ツール - メインスクリプト

X（Twitter）やnoteの投稿を分析し、動画作成のヒントやスキルを
マークダウンファイルとして出力します。
"""
import argparse
import os
import sys
from datetime import datetime

from .config import load_config, save_config_template, InfluencerConfig
from .x_analyzer import XAnalyzer
from .note_analyzer import NoteAnalyzer
from .content_analyzer import ContentAnalyzer
from .report_generator import ReportGenerator


def analyze_influencer(
    name: str,
    x_username: str = None,
    note_username: str = None,
    max_posts: int = 100,
    output_dir: str = "./output",
    keywords: list = None
) -> str:
    """
    インフルエンサーを分析してレポートを生成する

    Args:
        name: インフルエンサー名
        x_username: X（Twitter）ユーザー名
        note_username: noteユーザー名
        max_posts: 取得する最大投稿数
        output_dir: 出力ディレクトリ
        keywords: 検索キーワードリスト

    Returns:
        生成されたレポートファイルのパス
    """
    print(f"\n{'='*60}")
    print(f" {name} の分析を開始します")
    print(f"{'='*60}\n")

    x_insights = []
    note_insights = []
    x_engagement = None
    note_engagement = None

    # X分析
    if x_username:
        print(f"[1/4] X（@{x_username}）の投稿を分析中...")
        x_analyzer = XAnalyzer()
        x_analyzer.fetch_user_info(x_username)
        x_analyzer.fetch_tweets(x_username, max_results=max_posts)

        x_insights = x_analyzer.get_tips_and_insights()
        x_engagement = x_analyzer.analyze_engagement()

        if keywords:
            keyword_tweets = x_analyzer.extract_keywords(keywords)
            for kw, tweets in keyword_tweets.items():
                print(f"   - キーワード「{kw}」: {len(tweets)}件")

        print(f"   -> {len(x_analyzer.tweets)}件のツイートから{len(x_insights)}件のインサイトを抽出")
    else:
        print("[1/4] X分析: スキップ（ユーザー名未設定）")

    # note分析
    if note_username:
        print(f"\n[2/4] note（{note_username}）の記事を分析中...")
        note_analyzer = NoteAnalyzer()
        note_analyzer.fetch_user_info(note_username)
        note_analyzer.fetch_articles(note_username, max_articles=max_posts)

        note_insights = note_analyzer.get_tips_and_insights()
        note_engagement = note_analyzer.analyze_engagement()

        print(f"   -> {len(note_analyzer.articles)}件の記事から{len(note_insights)}件のインサイトを抽出")
    else:
        print("[2/4] note分析: スキップ（ユーザー名未設定）")

    # コンテンツ分析
    print("\n[3/4] コンテンツを分析中...")
    content_analyzer = ContentAnalyzer()
    result = content_analyzer.analyze(x_insights, note_insights, name)

    # 重複排除
    result.skills = content_analyzer.deduplicate_skills(result.skills)
    print(f"   -> {len(result.skills)}件のスキル・ヒントを抽出")

    # レポート生成
    print("\n[4/4] レポートを生成中...")
    report_generator = ReportGenerator(output_dir)

    # メインレポート
    report = report_generator.generate_report(result, x_engagement, note_engagement)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = name.replace(" ", "_").replace("/", "_")
    report_path = report_generator.save_report(report, f"{safe_name}_analysis_{timestamp}")

    # クイックリファレンス
    cheatsheet = report_generator.generate_quick_reference(result)
    cheatsheet_path = report_generator.save_quick_reference(
        cheatsheet, f"{safe_name}_cheatsheet_{timestamp}"
    )

    print(f"\n{'='*60}")
    print(" 分析完了!")
    print(f"{'='*60}")
    print(f"\n生成されたファイル:")
    print(f"  - レポート: {report_path}")
    print(f"  - チートシート: {cheatsheet_path}")

    return report_path


def main():
    """メインエントリーポイント"""
    parser = argparse.ArgumentParser(
        description="インフルエンサー分析ツール - X/noteの投稿からスキルを抽出"
    )

    subparsers = parser.add_subparsers(dest="command", help="コマンド")

    # analyze コマンド
    analyze_parser = subparsers.add_parser("analyze", help="インフルエンサーを分析")
    analyze_parser.add_argument("--name", "-n", required=True, help="インフルエンサー名")
    analyze_parser.add_argument("--x", "-x", help="Xユーザー名")
    analyze_parser.add_argument("--note", help="noteユーザー名")
    analyze_parser.add_argument("--max-posts", "-m", type=int, default=100, help="最大取得投稿数")
    analyze_parser.add_argument("--output", "-o", default="./output", help="出力ディレクトリ")
    analyze_parser.add_argument("--keywords", "-k", nargs="*", help="検索キーワード")

    # config コマンド
    config_parser = subparsers.add_parser("config", help="設定ファイルを管理")
    config_parser.add_argument("--init", action="store_true", help="設定テンプレートを作成")
    config_parser.add_argument("--path", default="config.yaml", help="設定ファイルパス")

    # batch コマンド
    batch_parser = subparsers.add_parser("batch", help="設定ファイルから一括分析")
    batch_parser.add_argument("--config", "-c", default="config.yaml", help="設定ファイルパス")

    # demo コマンド
    demo_parser = subparsers.add_parser("demo", help="デモモードで実行（サンプルデータ使用）")
    demo_parser.add_argument("--output", "-o", default="./output", help="出力ディレクトリ")

    args = parser.parse_args()

    if args.command == "analyze":
        if not args.x and not args.note:
            print("エラー: --x または --note のいずれかを指定してください")
            sys.exit(1)

        analyze_influencer(
            name=args.name,
            x_username=args.x,
            note_username=args.note,
            max_posts=args.max_posts,
            output_dir=args.output,
            keywords=args.keywords
        )

    elif args.command == "config":
        if args.init:
            save_config_template(args.path)
        else:
            print("--init オプションを指定して設定テンプレートを作成してください")

    elif args.command == "batch":
        config = load_config(args.config)

        if not config.influencers:
            print("エラー: 設定ファイルにインフルエンサーが登録されていません")
            sys.exit(1)

        for inf in config.influencers:
            analyze_influencer(
                name=inf.name,
                x_username=inf.x_username,
                note_username=inf.note_username,
                max_posts=config.analysis.max_posts,
                output_dir=config.output_dir,
                keywords=config.analysis.keywords
            )

    elif args.command == "demo":
        print("\nデモモードで実行します（サンプルデータを使用）\n")
        analyze_influencer(
            name="サンプルクリエイター",
            x_username="demo_creator",
            note_username="demo_creator",
            max_posts=50,
            output_dir=args.output
        )

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
