# サジー論文リサーチパイプライン

サジー（sea buckthorn / *Hippophae rhamnoides*）に関する最新の学術論文を毎晩自動収集し、Claude AI で日本語要約・スコアリングして Google Sheets に記録、Chatwork に通知するシステムです。

## 概要

```
[夜間 AM2:00]
Cloud Scheduler
    ↓
Cloud Functions (Node.js)
    ↓ 並行取得
┌────────────┬──────────────────┐
│ PubMed API │ Semantic Scholar │
└────────────┴──────────────────┘
    ↓ 重複排除 + 新規フィルタ
Claude AI (claude-opus-4-6)
    ↓ 日本語要約・スコアリング
┌──────────────┬──────────────┐
│ Google Sheets │ Chatwork通知 │
└──────────────┴──────────────┘
```

## 前提条件

- **Node.js**: 18.x 以上
- **GCPプロジェクト**: Cloud Functions Gen2、Cloud Scheduler が有効
- **取得が必要な APIキー**: 下記セットアップ参照

## ディレクトリ構成

```
research-pipeline/
├── package.json
├── index.js                  # Cloud Functions エントリポイント
├── src/
│   ├── sources/
│   │   ├── pubmed.js         # PubMed E-utilities API
│   │   └── semanticScholar.js # Semantic Scholar API
│   ├── ai/
│   │   └── summarizer.js     # Claude API で要約・スコアリング
│   ├── outputs/
│   │   ├── googleSheets.js   # Google Sheets 書き込み
│   │   └── chatwork.js       # Chatwork 通知
│   └── utils/
│       ├── dedup.js          # 重複排除
│       └── config.js         # 環境変数管理
├── .env.example              # 環境変数一覧（テンプレート）
└── README.md
```

## セットアップ手順

### 1. APIキーの取得

| サービス | 取得方法 | 費用 |
|---------|---------|------|
| PubMed API Key | https://www.ncbi.nlm.nih.gov/account/ → Settings → API Key Management | 無料 |
| Semantic Scholar API Key | https://www.semanticscholar.org/product/api | 無料 |
| Anthropic API Key | https://console.anthropic.com/ → API Keys | 従量課金（月500円程度） |
| Chatwork API Token | Chatwork設定 → API Token | 無料 |
| Google サービスアカウント | GCPコンソール → IAM → サービスアカウント → JSONキー作成 | 無料枠内 |

### 2. Google Sheets の初期セットアップ

1. [Google Sheets](https://sheets.google.com) で空のスプレッドシートを新規作成
2. URLから **スプレッドシートID** をコピー（`/spreadsheets/d/{ここ}/edit`）
3. サービスアカウントのメールアドレス（`xxx@xxx.iam.gserviceaccount.com`）を**編集者**として共有
4. GCPコンソールで **Sheets API** と **Drive API** を有効化

### 3. 環境変数の設定

```bash
cp .env.example .env
# .env を編集して実際の値を設定
```

### 4. ローカルでのテスト

```bash
cd research-pipeline
npm install

# 環境変数を読み込んでローカル実行
node -r dotenv/config index.js

# または npm script で実行
npm test
```

## GCPへのデプロイ

### Cloud Functions (Gen2) にデプロイ

```bash
# GCP プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID

# Cloud Functions にデプロイ
gcloud functions deploy research-pipeline \
  --gen2 \
  --runtime=nodejs18 \
  --region=asia-northeast1 \
  --source=. \
  --entry-point=researchPipeline \
  --trigger=http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=540s \
  --set-env-vars="ANTHROPIC_API_KEY=sk-ant-xxx,GOOGLE_SHEET_ID=xxx,CHATWORK_API_TOKEN=xxx,CHATWORK_ROOM_ID=xxx" \
  --set-secrets="GOOGLE_SERVICE_ACCOUNT_KEY=google-sa-key:latest"
```

> **Note**: 機密情報は `--set-env-vars` よりも **Secret Manager** (`--set-secrets`) での管理を推奨

### Cloud Scheduler の設定

```bash
# 毎日 AM2:00 (JST) に実行
gcloud scheduler jobs create http saji-research-nightly \
  --location=asia-northeast1 \
  --schedule="0 17 * * *" \
  --uri="https://asia-northeast1-YOUR_PROJECT.cloudfunctions.net/research-pipeline" \
  --http-method=GET \
  --time-zone="UTC"
```

> `0 17 * * *` は UTC で AM2:00 JST（UTC+9の17:00 = 翌日02:00 JST）

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API キー |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | ✅ | GCS サービスアカウント JSON（1行） |
| `GOOGLE_SHEET_ID` | ✅ | 出力先スプレッドシート ID |
| `CHATWORK_API_TOKEN` | ✅ | Chatwork API トークン |
| `CHATWORK_ROOM_ID` | ✅ | 通知先ルーム ID |
| `PUBMED_API_KEY` | 推奨 | PubMed API キー（レート制限緩和） |
| `SEMANTIC_SCHOLAR_API_KEY` | 推奨 | Semantic Scholar API キー |
| `CLAUDE_MODEL` | - | Claude モデル（デフォルト: `claude-opus-4-6`） |
| `NOTIFICATION_THRESHOLD` | - | Chatwork通知の最低スコア（デフォルト: 7） |
| `SEARCH_DAYS` | - | 取得する過去日数（デフォルト: 7） |
| `ENABLE_BAIDU` | - | Baidu Scholar 有効化（Phase 2） |

## Google Sheets の出力フォーマット

シート名「論文リスト」に以下の列が追記されます：

| 列 | 内容 |
|----|------|
| A | 取得日 |
| B | ソース（pubmed / semantic_scholar） |
| C | タイトル（原文） |
| D | 日本語要約（3行） |
| E | 関連度スコア（1-10） |
| F | カテゴリ |
| G | 研究デザイン |
| H | 主要成分 |
| I | 緊急度（high/medium/low） |
| J | 活用可能（○/×） |
| K | 著者 |
| L | ジャーナル |
| M | 年 |
| N | URL |

## Chatwork 通知例

スコア 7以上（`NOTIFICATION_THRESHOLD`）の論文が取得された際に通知されます：

```
🔬 サジー新着論文レポート（2026-03-05）
本日 15件の新着論文を検出しました。
うち重要度の高い 3件をお知らせします。

---

【臨床試験】スコア: 9/10 🔴
サジーベリー果汁（400mL/日, 8週間）の摂取が...
主要成分: ビタミンC, フラボノイド, パルミトレイン酸
https://pubmed.ncbi.nlm.nih.gov/xxxxx/

---

📊 全件はスプレッドシートで確認できます:
https://docs.google.com/spreadsheets/d/xxxxxx
```

## トラブルシューティング

### `GOOGLE_SERVICE_ACCOUNT_KEY の JSON パースに失敗`

- サービスアカウント JSON を1行の文字列として設定しているか確認
- 改行は `\n` にエスケープされているか確認

```bash
# JSONを1行に変換するコマンド例
cat service-account.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))"
```

### `HTTP 403: PERMISSION_DENIED`（Sheets API）

- サービスアカウントのメールアドレスをスプレッドシートに**編集者**として共有したか確認
- GCPで **Sheets API** と **Drive API** が有効か確認

### PubMed から結果が返ってこない

- 検索日数（`SEARCH_DAYS`）を広げてみる（例: 30）
- API Keyなしでの実行はレート制限（3 req/sec）があるため、取得に時間がかかることがある

### Claude API でタイムアウト

- Cloud Functions のタイムアウトを `--timeout=540s`（9分）に設定
- 論文数が多い場合は `SEARCH_DAYS` を短くして1回の処理量を減らす

## コスト見込み（月次）

| サービス | 費用 |
|---------|------|
| Cloud Functions（月30回実行） | 無料枠内（月200万回まで無料） |
| Cloud Scheduler（月30回） | 無料枠内（月3ジョブまで無料） |
| Claude API（月約1,500トークン/論文 × 50論文 × 30日） | 約 **200〜500円** |
| Google Sheets API | 無料 |
| Chatwork API | 無料 |
| **合計** | **月 200〜500円程度** |

## Phase 2 予定機能

- [ ] Baidu Scholar スクレイピング（中国語論文取得）
- [ ] Chatwork 通知の完全実装（現在は基本実装済み）
- [ ] Google Sheets ダッシュボードシート（週次集計）
- [ ] Cloud Run での Playwright 実行環境

## ライセンス

MIT
