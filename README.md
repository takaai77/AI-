# インフルエンサー分析ツール

X（Twitter）やnoteのアカウントを分析し、過去の投稿から動画作成のヒントやスキルを集約してマークダウンファイルとして出力するツールです。

## 機能

- **X（Twitter）分析**: ツイートからヒント・ノウハウを抽出
- **note分析**: 記事からスキル・テクニックを抽出
- **スキル分類**: 12のカテゴリに自動分類
  - 動画編集
  - サムネイル作成
  - タイトル・コピーライティング
  - ストーリーテリング
  - エンゲージメント戦略
  - 収益化
  - 機材・ツール
  - 撮影テクニック
  - 音声・BGM
  - 投稿タイミング
  - アルゴリズム対策
  - 視聴維持率
- **レポート生成**: 分析結果をマークダウン形式で出力
- **チートシート生成**: 簡潔なスキル一覧を生成

## インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/AI-.git
cd AI-

# 依存パッケージをインストール
pip install -r requirements.txt
```

## 使い方

### デモモード（サンプルデータで実行）

APIキーなしで動作確認できます。

```bash
python -m influencer_analyzer.main demo
```

### 単一インフルエンサーの分析

```bash
python -m influencer_analyzer.main analyze \
  --name "クリエイター名" \
  --x "x_username" \
  --note "note_username" \
  --max-posts 100 \
  --output ./output
```

### 設定ファイルから一括分析

```bash
# 設定テンプレートを作成
python -m influencer_analyzer.main config --init

# config.yaml を編集して分析対象を設定

# 一括分析実行
python -m influencer_analyzer.main batch --config config.yaml
```

## 設定ファイル（config.yaml）

```yaml
# 分析対象のインフルエンサー
influencers:
  - name: "クリエイター名"
    x_username: "x_username"
    note_username: "note_username"

# 分析設定
analysis:
  max_posts: 100
  keywords:
    - "動画編集"
    - "サムネイル"

# 出力ディレクトリ
output_dir: "./output"
```

## 環境変数

X APIを使用する場合は、以下の環境変数を設定してください。

```bash
export X_BEARER_TOKEN="your_bearer_token"
```

**注意**: APIトークンが設定されていない場合、ツールはサンプルデータを使用してデモ動作します。

## 出力ファイル

### 分析レポート（`*_analysis_*.md`）

- 概要サマリー
- エンゲージメント分析
- カテゴリ別スキル・ヒント集
- トップインサイト
- 推奨アクションプラン

### チートシート（`*_cheatsheet_*.md`）

- 各カテゴリの主要スキルを箇条書きでまとめた簡潔なリファレンス

## プロジェクト構造

```
influencer_analyzer/
├── __init__.py           # パッケージ初期化
├── main.py               # メインエントリーポイント
├── config.py             # 設定管理
├── x_analyzer.py         # X（Twitter）分析モジュール
├── note_analyzer.py      # note分析モジュール
├── content_analyzer.py   # コンテンツ分析・スキル抽出
└── report_generator.py   # マークダウンレポート生成
```

## 使用例

### Python APIとして使用

```python
from influencer_analyzer.main import analyze_influencer

# 分析を実行
report_path = analyze_influencer(
    name="お気に入りクリエイター",
    x_username="creator_x",
    note_username="creator_note",
    max_posts=50,
    output_dir="./my_output"
)
```

### 個別モジュールを使用

```python
from influencer_analyzer.x_analyzer import XAnalyzer
from influencer_analyzer.note_analyzer import NoteAnalyzer
from influencer_analyzer.content_analyzer import ContentAnalyzer
from influencer_analyzer.report_generator import ReportGenerator

# X分析
x = XAnalyzer()
x.fetch_tweets("username", max_results=100)
x_insights = x.get_tips_and_insights()

# note分析
note = NoteAnalyzer()
note.fetch_articles("username", max_articles=50)
note_insights = note.get_tips_and_insights()

# 統合分析
analyzer = ContentAnalyzer()
result = analyzer.analyze(x_insights, note_insights, "インフルエンサー名")

# レポート生成
generator = ReportGenerator("./output")
report = generator.generate_report(result)
generator.save_report(report, "my_report")
```

## ライセンス

MIT License

## 注意事項

- このツールは公開された投稿のみを分析対象としています
- APIの利用制限に注意してください
- 抽出されたスキル・ヒントは参考情報です
