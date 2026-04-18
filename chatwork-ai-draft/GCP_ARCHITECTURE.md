# GCP Application Integration + Gemini Flash アーキテクチャ設計書

## 概要

**GCP Application Integration** を中継サーバーとして採用し、
**Gemini Flash API** で下書きを生成するアーキテクチャ。

すべてのデータ処理が Google Cloud 内で完結し、社外サーバーを経由しない。

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│  社員のブラウザ (Chrome拡張)                                      │
│                                                                   │
│  ・Gemini APIキーを一切保持しない                                   │
│  ・送信前にPIIマスク済み                                           │
│  ・直近3件のメッセージのみ送信                                      │
└──────────────┬──────────────────────────────────────────────────┘
               │  HTTPS POST (JSON)
               │  認証: Google Cloud API Gateway が検証
               ▼
┌──────────────────────────────────────────┐
│  Cloud API Gateway                        │
│                                           │
│  ・APIキー検証 or OAuth2/JWT 検証          │
│  ・レートリミット (100 req/min/user)       │
│  ・CORS制御                               │
│  ・リクエストサイズ上限                     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  GCP Application Integration              │
│                                           │
│  ・リクエスト受信トリガー (REST)            │
│  ・ペイロード整形                          │
│  ・Gemini Flash API 呼び出し              │
│  ・レスポンス整形・返却                    │
│  ・エラーハンドリング                      │
│  ・Cloud Logging 連携                     │
└──────────────┬───────────────────────────┘
               │  内部通信 (Google内部ネットワーク)
               ▼
┌──────────────────────────────────────────┐
│  Gemini Flash API                         │
│  (Gemini 2.0 Flash / 1.5 Flash)          │
│                                           │
│  ・下書き生成                              │
│  ・有料プランではデータ学習に使用されない     │
│  ・高速レスポンス（Flash モデル）           │
└──────────────────────────────────────────┘
```

---

## セキュリティ設計

### 1. 機密情報（チャット内容）の漏洩防止

| 対策 | 詳細 |
|---|---|
| **GCP内完結** | データは Google Cloud の内部ネットワークのみを通過。第三者サーバーを経由しない |
| **Gemini API のデータポリシー** | 有料プランでは顧客データをモデル学習に使用しない（Google の利用規約で明記） |
| **送信前PIIマスク** | 拡張機能側でメール・電話番号等をマスクしてから送信（既存機能） |
| **最小データ送信** | 直近3件・各300文字以内のみ。全履歴は送らない |
| **Cloud Logging** | リクエスト/レスポンスのログを Cloud Logging に集約。監査可能 |
| **通信暗号化** | HTTPS/TLS 1.3 必須。GCP内部通信も暗号化済み |

### 2. APIキーの保護

| 方針 | 実装 |
|---|---|
| **拡張機能にGemini APIキーを入れない** | Gemini APIキーは GCP 側（Secret Manager / 環境変数）のみで管理 |
| **API Gateway で認証** | 拡張機能は API Gateway 用の制限付きAPIキーのみ保持（Gemini API には直接アクセスしない） |
| **APIキーの制限** | API Gateway 側で「HTTP リファラー制限」「IP制限」を設定し、用途を限定 |
| **サービスアカウント** | Application Integration → Gemini API の通信は GCP 内部のサービスアカウントで認証 |

---

## スケーラビリティ（100人同時利用）

### Application Integration の処理能力

| 項目 | 仕様 |
|---|---|
| **同時実行数** | デフォルトで数百〜数千の同時実行に対応 |
| **オートスケール** | リクエスト数に応じて自動スケール（サーバーレス） |
| **100人同時** | 問題なく処理可能（GCP のサーバーレス基盤） |

### Gemini Flash API の処理能力

| 項目 | Gemini 2.0 Flash | Gemini 1.5 Flash |
|---|---|---|
| **レートリミット** | 2,000 RPM (デフォルト) | 1,000 RPM (デフォルト) |
| **同時リクエスト** | 十分な余裕あり | 十分な余裕あり |
| **100人同時** | 全員が同じ秒にボタンを押しても処理可能 | 同上 |
| **引き上げ** | Google に申請すれば上限を引き上げ可能 | 同上 |

### 想定負荷の計算

```
100人 × 1日平均20回利用 = 2,000 req/日
ピーク: 100人が同時に1秒以内にリクエスト = 100 req/s

Gemini Flash デフォルト上限: 1,000〜2,000 RPM = 約16〜33 req/s
→ 瞬間的な100同時は超える可能性あるが、実際にはミリ秒単位で分散するため問題なし
→ 心配な場合は Google に quota 引き上げ申請（無料で可能）
```

---

## レスポンス速度（3秒以内目標）

### 各ステップの所要時間

| ステップ | 想定時間 |
|---|---|
| Chrome拡張 → API Gateway | 50〜100ms |
| API Gateway → Application Integration | 50〜100ms |
| Application Integration 処理 | 100〜200ms |
| Gemini Flash 生成 | **500ms〜2,000ms** |
| レスポンス返却 | 100〜200ms |
| **合計** | **約 800ms〜2,600ms** |

### 3秒以内を達成するための設計

| 対策 | 効果 |
|---|---|
| **Gemini Flash モデルを使用** | 最速のモデル。Pro は遅いので使わない |
| **入力トークンを削減済み** | 直近3件・各300文字 = 入力が小さいので高速 |
| **出力トークンを制限** | max_output_tokens: 500 で出力を制限 |
| **ストリーミング非使用** | シンプルな同期リクエストで十分高速 |

### 実測の目安

Gemini Flash の一般的なレイテンシ:
- 短い入力 + 短い出力: **0.5〜1.5秒**
- 中程度の入力 + 中程度の出力: **1〜3秒**

**結論: 3秒以内は十分達成可能。**

---

## 認証方式

### 推奨: API Gateway + APIキー制限

拡張機能が持つのは「API Gateway 用の制限付きAPIキー」のみ。

```
拡張機能の config.js:
  DEFAULT_ENDPOINT_URL = 'https://your-api-gateway-xxxx.gateway.dev/draft'
  DEFAULT_API_KEY = 'AIzaSy...'  ← API Gateway 専用キー（Gemini APIには使えない）
```

このAPIキーには以下の制限を設定:
- **HTTPリファラー制限**: Chatwork のドメインからのみ許可
- **API制限**: API Gateway のみに使用可能
- **IP制限**: 社内IPアドレスからのみ許可（VPN利用時）

### 代替案: OAuth2 / Identity-Aware Proxy (IAP)

より厳密な認証が必要な場合:

```
社員が Google Workspace アカウントでログイン
    → Chrome拡張が OAuth2 トークンを取得
    → API Gateway が Google アカウントを検証
    → 誰がリクエストしたか完全に特定可能
```

メリット: 個人特定、退職時の即時無効化
デメリット: 実装が複雑、ログインフローが必要

---

## GCP 構築手順（概要）

### Step 1: GCP プロジェクト作成

```bash
gcloud projects create chatwork-ai-draft --name="Chatwork AI Draft"
gcloud config set project chatwork-ai-draft
```

### Step 2: Gemini API 有効化

```bash
gcloud services enable generativelanguage.googleapis.com
```

### Step 3: Application Integration の作成

1. GCP Console → Application Integration を開く
2. 新しいインテグレーションを作成
3. **API Trigger** を追加（REST エンドポイント）
4. **Data Mapping** タスクでペイロードを整形
5. **Call REST Endpoint** タスクで Gemini Flash API を呼び出し
6. レスポンスを整形して返却

### Step 4: Gemini Flash API 呼び出し設定

Application Integration から Gemini Flash を呼び出す REST 設定:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}

Headers:
  Content-Type: application/json

Body:
{
  "contents": [{
    "role": "user",
    "parts": [{
      "text": "以下のチャット文脈に対する返信の下書きを作成してください...(整形済みプロンプト)"
    }]
  }],
  "generationConfig": {
    "maxOutputTokens": 500,
    "temperature": 0.7
  }
}
```

※ `GEMINI_API_KEY` は GCP の Secret Manager で管理し、Application Integration の変数として参照する。
拡張機能のコードには一切書かない。

### Step 5: API Gateway の設定

```yaml
# api-config.yaml
swagger: "2.0"
info:
  title: "Chatwork AI Draft API"
  version: "1.0.0"
host: "your-api-gateway.gateway.dev"
schemes:
  - "https"
paths:
  /draft:
    post:
      operationId: "generateDraft"
      x-google-backend:
        address: "https://integrations.googleapis.com/..."
      security:
        - api_key: []
securityDefinitions:
  api_key:
    type: "apiKey"
    name: "x-api-key"
    in: "header"
```

### Step 6: APIキーの作成と制限

```bash
# API Gateway 用のAPIキー作成
gcloud alpha services api-keys create --display-name="Chatwork AI Extension"

# HTTP リファラー制限
gcloud alpha services api-keys update KEY_ID \
  --allowed-referrers="https://www.chatwork.com/*,https://kcw.kddi.ne.jp/*"

# API 制限（Gateway のみ）
gcloud alpha services api-keys update KEY_ID \
  --api-target=service=apigateway.googleapis.com
```

---

## 拡張機能の変更点

### config.js

```javascript
const DEFAULT_ENDPOINT_URL = 'https://your-gateway.gateway.dev/draft';
const DEFAULT_API_KEY = '';  // API Gateway 用の制限付きキー
```

### api-client.js

```javascript
// x-api-key ヘッダーで API Gateway に認証
headers['x-api-key'] = apiKey;
```

### レスポンス形式

Application Integration 側で以下の形式に整形して返却:

```json
{
  "ok": true,
  "draft": "お世話になっております。\nご連絡いただきありがとうございます。\n...",
  "toneLabel": "丁寧",
  "notes": ""
}
```

---

## コスト見積もり

### Gemini Flash API

| 項目 | 単価 | 月間想定 |
|---|---|---|
| 入力トークン | $0.075 / 100万トークン | 100人 × 20回/日 × 22日 × 500トークン = 約22Mトークン → **約$1.65** |
| 出力トークン | $0.30 / 100万トークン | 100人 × 20回/日 × 22日 × 200トークン = 約8.8Mトークン → **約$2.64** |
| **小計** | | **約 $4.30/月（約650円）** |

※ 料金は Gemini Flash のモデル・バージョンにより変動します。最新の料金は Google の公式ページを確認してください。

### Application Integration

| 項目 | 単価 |
|---|---|
| 最初の 300 ステップ/月 | 無料 |
| 以降 | $0.0005/ステップ |
| 月間想定 (44,000リクエスト × 3ステップ) | **約 $63/月** |

### API Gateway

| 項目 | 単価 |
|---|---|
| 最初の 200万コール/月 | 無料 |
| 月間44,000コール | **無料** |

### 合計

**月額 約 $70〜$80（約10,000〜12,000円）**

※ 100人が毎日20回使った場合の最大見積もり。実際はこれより少ない可能性が高い。

---

## まとめ: ユーザーの懸念への回答

| 懸念 | 回答 |
|---|---|
| **機密情報の漏洩防止** | GCP内完結 + Gemini API 有料プランはデータ学習に使用しない + PIIマスク |
| **100人同時利用** | Application Integration はサーバーレスで自動スケール。Gemini Flash も 1,000+ RPM。問題なし |
| **3秒以内の生成** | Gemini Flash + 入力最小化で **0.8〜2.6秒** が目安。達成可能 |
| **APIキーをコードに書かない** | Gemini APIキーは GCP 内部のみ。拡張が持つのは API Gateway 用の制限付きキーのみ |
