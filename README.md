# Claude Skills 日本語記事取得スキル

Claude Skillsに関する日本語記事を取得・管理するPythonスキルです。

## 概要

このスキルは、Claude Skillsについて学ぶための日本語記事を簡単に取得できるようにします。公式ドキュメント、チュートリアル、ニュース記事など、様々なソースから情報を収集しています。

## 機能

- Claude Skillsに関する日本語記事一覧の取得
- 公式ドキュメントへのアクセス
- チュートリアル記事のフィルタリング
- プラットフォーム別記事の検索
- JSON形式でのエクスポート

## 使い方

### 基本的な使い方

```bash
python3 claude_skills_ja_articles.py
```

このコマンドを実行すると、以下の情報が表示されます：
- すべての記事一覧
- 公式ドキュメント
- チュートリアル記事
- JSON形式でのエクスポート

### Pythonスクリプトとして使用

```python
from claude_skills_ja_articles import ClaudeSkillsJapaneseArticles

# インスタンス作成
skills_articles = ClaudeSkillsJapaneseArticles()

# すべての記事を取得
all_articles = skills_articles.get_all_articles()

# 公式ドキュメントを取得
official_docs = skills_articles.get_official_docs()

# チュートリアル記事を取得
tutorials = skills_articles.get_tutorial_articles()

# プラットフォーム別に記事を取得
zenn_articles = skills_articles.get_article_by_platform("Zenn")
qiita_articles = skills_articles.get_article_by_platform("Qiita")

# 記事一覧を表示
print(skills_articles.display_articles())

# JSONファイルに出力
skills_articles.export_to_json("my_articles.json")
```

## 収録記事

### 公式ドキュメント
- [Agent Skills - Claude Docs](https://docs.claude.com/ja/docs/claude-code/skills)

### チュートリアル・解説記事
- [Claude Skillsを使ってみた](https://zenn.dev/lnest_knowledge/articles/2912bc87bc83d5) - Zenn
- [Claude Skills の概要](https://note.com/npaka/n/n6e221d209d90) - note
- [プロンプトだけじゃない！Claude Skillsで広がるAI活用の可能性](https://qiita.com/iineineno03k/items/bb9ec1ff47ace14fb57d) - Qiita
- [やさしいClaude Skills入門](https://www.docswell.com/s/harinezumi/5M683X-2025-10-21-003933) - ドクセル

### ニュース記事
- [Claudeを「特定タスクの専門家」にする新機能「Skills」登場](https://news.yahoo.co.jp/articles/89d17f3ed0c223aeb606e7103e436edc425900b9) - Yahoo!ニュース
- [「Claude Skills」を発表](https://forest.watch.impress.co.jp/docs/news/2055832.html) - 窓の杜
- [Anthropic、Claudeのカスタマイズ機能リリース](https://www.itmedia.co.jp/aiplus/articles/2510/17/news060.html) - ITmedia

## 出力ファイル

スクリプトを実行すると、`claude_skills_articles.json` ファイルが生成され、すべての記事情報がJSON形式で保存されます。

## 要件

- Python 3.6以上

## ライセンス

MIT License

## 貢献

記事の追加や改善の提案は歓迎します。プルリクエストをお送りください。
