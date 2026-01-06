# Video Prompt Generator

動画URLから画像を認識し、Midjourney/Stable Diffusion用の画像生成プロンプトを自動作成するツール

## プロジェクト概要

Video Prompt Generatorは、YouTube動画などの動画URLを入力として受け取り、Google Gemini APIを使用して動画の内容を分析し、画像生成AI（Midjourney、Stable Diffusion等）で使用できる高品質なプロンプトを自動生成するPythonツールです。

## 機能一覧

### 実装済み機能
- ✅ **動画URL入力**: YouTubeなどの動画URLを入力として受け付け
- ✅ **動画分析**: Google Gemini APIを使用した動画コンテンツの分析
- ✅ **プロンプト生成**: Midjourney/Stable Diffusion用の詳細な画像生成プロンプトを自動作成
- ✅ **要点まとめ**: 動画の内容を簡潔にまとめたサマリーを生成
- ✅ **JSON形式での出力**: 構造化されたデータ形式で結果を保存

### 今後実装予定の機能
- 🔲 **カット割り検出**: シーン変更の自動検出
- 🔲 **タイムスタンプ付き出力**: 各プロンプトに対応する動画の時間情報
- 🔲 **バッチ処理**: 複数の動画を一括処理
- 🔲 **カスタムプロンプトテンプレート**: ユーザー定義のプロンプト形式に対応

## 技術スタック

- **言語**: Python 3.8+
- **AI API**: Google Gemini API (Generative AI)
- **動画処理**: pytube, opencv-python
- **その他**: python-dotenv, requests

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd video-prompt-generator
```

### 2. 仮想環境の作成（推奨）

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# または
venv\Scripts\activate  # Windows
```

### 3. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 4. Google AI Studio APIキーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリックしてAPIキーを生成
4. 生成されたAPIキーをコピー

### 5. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを開き、取得したAPIキーを設定：

```
GOOGLE_API_KEY=your_actual_api_key_here
```

## 使用方法

### 基本的な使い方

```bash
python main.py <動画URL>
```

### 実行例

```bash
python main.py https://www.youtube.com/watch?v=example_video_id
```

### 出力

実行すると、以下のファイルが `output/` ディレクトリに生成されます：

- `prompts_YYYYMMDD_HHMMSS.json`: 生成されたプロンプトと要点まとめ

出力例：
```json
{
  "video_url": "https://www.youtube.com/watch?v=example",
  "timestamp": "2025-01-06 12:34:56",
  "summary": "動画の要点まとめ...",
  "prompts": [
    {
      "scene": 1,
      "description": "シーンの説明",
      "prompt": "詳細な画像生成プロンプト..."
    }
  ]
}
```

## プロジェクト構成

```
video-prompt-generator/
├── README.md              # このファイル
├── requirements.txt       # Pythonパッケージの依存関係
├── .env.example          # 環境変数のテンプレート
├── .gitignore            # Gitで無視するファイル
├── config.py             # 設定管理
├── main.py               # メインエントリーポイント
├── video_processor.py    # 動画処理機能
├── prompt_generator.py   # プロンプト生成機能
├── videos/               # ダウンロードした動画（自動生成）
└── output/               # 生成結果（自動生成）
```

## トラブルシューティング

### APIキーエラー

```
Error: GOOGLE_API_KEY not found in environment variables
```

→ `.env`ファイルが正しく設定されているか確認してください。

### 動画のダウンロードエラー

```
Error downloading video: ...
```

→ 動画URLが正しいか、動画が公開されているか確認してください。

### API制限エラー

Google Gemini APIには無料枠の制限があります。制限に達した場合は、時間をおいて再試行してください。

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 連絡先

質問や提案がありましたら、GitHubのissueでお知らせください。
