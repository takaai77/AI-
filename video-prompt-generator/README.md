# Video Prompt Generator

動画URL・ローカルファイルから画像を認識し、Midjourney/Stable Diffusion用の画像生成プロンプトを自動作成するツール

## プロジェクト概要

Video Prompt Generatorは、YouTube、X (Twitter)、Instagram、TikTok等の動画URLや、ローカルの動画ファイルを入力として受け取り、Google Gemini APIを使用して動画の内容を分析し、画像生成AI（Midjourney、Stable Diffusion等）で使用できる高品質なプロンプトを自動生成するPythonツールです。

## 機能一覧

### 実装済み機能
- ✅ **マルチプラットフォーム対応**: YouTube, X (Twitter), Instagram, TikTok等に対応
- ✅ **ローカルファイル対応**: ローカルに保存された動画ファイルも処理可能
- ✅ **動画分析**: Google Gemini APIを使用した動画コンテンツの分析
- ✅ **プロンプト生成**: Midjourney/Stable Diffusion用の詳細な画像生成プロンプトを自動作成
- ✅ **要点まとめ**: 動画の内容を簡潔にまとめたサマリーを生成
- ✅ **JSON形式での出力**: 構造化されたデータ形式で結果を保存
- ✅ **カット割り検出**: OpenCVを使用したシーン変更の自動検出
- ✅ **タイムスタンプ付き出力**: 各プロンプトに対応する動画の時間情報（HH:MM:SS形式）
- ✅ **フレーム抽出**: 各シーンの代表フレームを画像として保存
- ✅ **動画メタデータ取得**: 動画の長さ、解像度、フレームレート情報の取得

### 今後実装予定の機能
- 🔲 **バッチ処理**: 複数の動画を一括処理
- 🔲 **カスタムプロンプトテンプレート**: ユーザー定義のプロンプト形式に対応
- 🔲 **ネガティブプロンプト生成**: より高品質な画像生成のための除外項目の自動生成
- 🔲 **プロンプト改善機能**: 既存プロンプトのリファインメント

## 技術スタック

- **言語**: Python 3.8+
- **AI API**: Google Gemini API (Generative AI)
- **Webインターフェース**: Streamlit (iPhone・モバイル対応)
- **動画ダウンロード**: yt-dlp (マルチプラットフォーム), pytube (YouTube)
- **動画処理**: opencv-python
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

### 💻 Webインターフェース（iPhone・モバイル対応）

**最も手軽な方法！ブラウザから直接使えます。**

#### 1. Streamlitサーバーの起動

```bash
streamlit run web_ui.py
```

#### 2. ブラウザでアクセス

起動すると、以下のようなメッセージが表示されます：

```
  Local URL: http://localhost:8501
  Network URL: http://192.168.1.100:8501
```

- **PCから:** `http://localhost:8501` にアクセス
- **iPhone/スマホから:** 同じWi-Fiに接続し、`Network URL`にアクセス

#### 3. Webインターフェースの使い方

1. **動画の入力**
   - 「URL入力」タブ: YouTube、X、Instagram等のURLを入力
   - 「ファイルアップロード」タブ: ローカルの動画ファイルを選択

2. **設定（サイドバー）**
   - プロンプト言語: 日本語または英語
   - カット割り検出: シーン変更を自動検出
   - 代表フレーム抽出: 各シーンの画像を保存

3. **実行**
   - 「🚀 プロンプトを生成」ボタンをクリック
   - 処理完了後、結果が表示されます

4. **結果の活用**
   - 各プロンプトをコピーしてMidjourney/Stable Diffusionで使用
   - JSON形式またはテキスト形式でダウンロード
   - 抽出されたフレーム画像を確認

### 🖥️ コマンドライン（CLI）

#### 基本的な使い方

```bash
python main.py <動画URL>
```

### 実行例

**YouTube動画を分析:**
```bash
python main.py https://www.youtube.com/watch?v=example_video_id
```

**X (Twitter) の動画を分析:**
```bash
python main.py https://twitter.com/user/status/123456789
```

**Instagram動画を分析:**
```bash
python main.py https://www.instagram.com/p/ABC123/
```

**ローカル動画ファイルを分析:**
```bash
python main.py /path/to/video.mp4
```

**カット割り検出を有効にする:**
```bash
python main.py https://www.youtube.com/watch?v=example_video_id --detect-scenes
```

**カット割り検出 + フレーム抽出:**
```bash
python main.py https://www.youtube.com/watch?v=example_video_id --detect-scenes --extract-frames
```

**詳細ログを表示:**
```bash
python main.py https://www.youtube.com/watch?v=example_video_id --detect-scenes --verbose
```

**カスタムファイル名で出力:**
```bash
python main.py https://www.youtube.com/watch?v=example_video_id --output my_prompts.json
```

### コマンドラインオプション

| オプション | 説明 |
|----------|------|
| `video_url_or_path` | 処理する動画のURL、またはローカルファイルパス（必須） |
| `-o, --output` | 出力JSONファイル名（省略時は自動生成） |
| `-v, --verbose` | 詳細なログを表示 |
| `--detect-scenes` | カット割り検出を有効にする |
| `--extract-frames` | 各シーンの代表フレームを抽出 |
| `--language` | プロンプトの言語（ja/en、デフォルト: ja） |

### 対応プラットフォーム

- **YouTube** - 高速ダウンロード（pytube使用）
- **X (Twitter)** - ツイートの動画
- **Instagram** - 投稿・ストーリーの動画
- **TikTok** - 短編動画
- **その他** - yt-dlp対応の1000+サイト
- **ローカルファイル** - .mp4, .avi, .mov, .mkv等

### 出力

実行すると、以下のファイルが `output/` ディレクトリに生成されます：

- `prompts_YYYYMMDD_HHMMSS.json`: 生成されたプロンプトと要点まとめ
- `output/frames/`: 各シーンの代表フレーム画像（`--extract-frames`使用時）

#### 基本的な出力例：
```json
{
  "video_url": "https://www.youtube.com/watch?v=example",
  "timestamp": "2025-01-06 12:34:56",
  "model": "gemini-1.5-flash",
  "language": "ja",
  "summary": "動画の要点まとめ...",
  "prompts": [
    {
      "scene": 1,
      "description": "シーンの説明",
      "prompt": "詳細な画像生成プロンプト...",
      "japanese_prompt": "日本語での説明的プロンプト"
    }
  ]
}
```

#### カット割り検出を使用した出力例：
```json
{
  "video_url": "https://www.youtube.com/watch?v=example",
  "timestamp": "2025-01-06 12:34:56",
  "model": "gemini-1.5-flash",
  "language": "ja",
  "summary": "動画の要点まとめ...",
  "total_scenes": 5,
  "video_metadata": {
    "duration": 120.5,
    "duration_formatted": "00:02:00",
    "width": 1920,
    "height": 1080,
    "fps": 30.0,
    "frame_count": 3615
  },
  "scenes": [
    {
      "scene_number": 1,
      "start_time": 0.0,
      "end_time": 15.3,
      "duration": 15.3,
      "timestamp": "00:00:00"
    },
    {
      "scene_number": 2,
      "start_time": 15.3,
      "end_time": 42.7,
      "duration": 27.4,
      "timestamp": "00:00:15"
    }
  ],
  "prompts": [
    {
      "scene": 1,
      "timestamp": "00:00:00",
      "description": "オープニングシーン - 都市の夜景",
      "prompt": "cinematic night cityscape, neon lights reflecting on wet streets, high angle view, cyberpunk atmosphere, detailed architecture, high quality, 8k resolution",
      "japanese_prompt": "映画的な夜の都市景観、濡れた路面に反射するネオンライト、ハイアングル視点、サイバーパンクな雰囲気"
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
├── config.py             # 設定管理（APIキー、ディレクトリ設定等）
├── main.py               # コマンドラインインターフェース（CLI）
├── web_ui.py             # Webインターフェース（Streamlit）
│                         # - iPhone・モバイル対応
│                         # - URLまたはファイルアップロード
│                         # - リアルタイム進捗表示
│                         # - 結果の可視化とダウンロード
├── video_processor.py    # 動画処理機能
│                         # - YouTube動画ダウンロード
│                         # - Gemini APIへのアップロード
│                         # - カット割り検出（OpenCV）
│                         # - フレーム抽出
│                         # - 動画メタデータ取得
├── prompt_generator.py   # プロンプト生成機能
│                         # - Gemini APIで動画分析
│                         # - 画像生成プロンプト作成
│                         # - タイムスタンプ付きプロンプト生成
│                         # - 要点まとめ生成
├── videos/               # ダウンロードした動画（自動生成、.gitignoreに含まれる）
└── output/               # 生成結果（自動生成）
    ├── prompts_*.json    # プロンプトJSON
    └── frames/           # 抽出されたフレーム画像
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

→ 以下を確認してください：
- 動画URLが正しいか
- 動画が公開されているか（非公開・限定公開の動画は処理できません）
- Xの動画の場合、ツイートが削除されていないか
- ネットワーク接続が正常か

### プラットフォーム固有の問題

**X (Twitter) の動画:**
- 一部の保護されたアカウントの動画はダウンロードできない場合があります
- yt-dlpが最新版であることを確認してください: `pip install --upgrade yt-dlp`

**Instagram の動画:**
- アカウントによっては制限がかかる場合があります
- ログインが必要な動画はダウンロードできません

**ローカルファイル:**
- ファイルパスが正しいか確認してください
- 対応形式: .mp4, .avi, .mov, .mkv, .flv, .wmv等

### API制限エラー

Google Gemini APIには無料枠の制限があります。制限に達した場合は、時間をおいて再試行してください。

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 連絡先

質問や提案がありましたら、GitHubのissueでお知らせください。
