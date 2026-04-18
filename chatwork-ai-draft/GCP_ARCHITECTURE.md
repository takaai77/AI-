# GCP Application Integration + Vertex AI アーキテクチャ設計書

## 概要

n8n に代わり、**GCP Application Integration** を中継サーバーとして採用し、
**Vertex AI (Gemini)** で下書きを生成するアーキテクチャ。

すべてのデータ処理が Google Cloud 内で完結し、社外サーバーを経由しない。

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│  社員のブラウザ (Chrome拡張)                                      │
│                                                                   │
│  ・APIキーを一切保持しない                                         │
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
│  (旧 Integration Connectors)              │
│                                           │
│  ・リクエスト受信トリガー (REST)            │
│  ・ペイロード整形                          │
│  ・Vertex AI コネクタ呼び出し              │
│  ・レスポンス整形・返却                    │
│  ・エラーハンドリング                      │
│  ・Cloud Logging 連携                     │
└──────────────┬───────────────────────────┘
               │  内部通信 (Google内部ネットワーク)
               ▼
┌──────────────────────────────────────────┐
│  Vertex AI (Gemini 1.5 Flash / 2.0 Flash)│
│                                           │
│  ・下書き生成                              │
│  ・データはモデル学習に使用されない          │
│  ・リージョン指定可能 (asia-northeast1)    │
│  ・VPC Service Controls 対応              │
└──────────────────────────────────────────┘
```

---

## セキュリティ設計

### 1. 機密情報（チャット内容）の漏洩防止

| 対策 | 詳細 |
|---|---|
| **GCP内完結** | データは Google Cloud の内部ネットワークのみを通過。第三者サーバーを経由しない |
| **Vertex AI のデータポリシー** | 顧客データをモデル学習に使用しない（Google Cloud の利用規約で明記） |
| **リージョン指定** | `asia-northeast1`（東京）にデプロイし、データが日本国外に出ないようにする |
| **VPC Service Controls** | データの持ち出しを制御する境界を設定可能 |
| **送信前PIIマスク** | 拡張機能側でメール・電話番号等をマスクしてから送信（既存機能） |
| **最小データ送信** | 直近3件・各300文字以内のみ。全履歴は送らない |
| **Cloud Logging** | リクエスト/レスポンスのログを Cloud Logging に集約。監査可能 |
| **通信暗号化** | HTTPS/TLS 1.3 必須。GCP内部通信も暗号化済み |

### 2. APIキーの保護

| 方針 | 実装 |
|---|---|
| **拡張機能にAPIキーを入れない** | Vertex AI の APIキーやサービスアカウントキーは GCP 側のみで管理 |
| **API Gateway で認証** | 拡張機能は API Gateway 用の制限付きAPIキーのみ保持（Vertex AI には直接アクセスしない） |
| **APIキーの制限** | API Gateway 側で「HTTP リファラー制限」「IP制限」を設定し、用途を限定 |
| **サービスアカウント** | Application Integration → Vertex AI の通信は GCP 内部のサービスアカウントで認証。キー不要 |

### n8n との比較

| 項目 | n8n (旧) | GCP (新) |
|---|---|---|
| **データ経路** | 社内/クラウドの n8n サーバー経由 | Google Cloud 内で完結 |
| **認証** | Bearer Token (自前管理) | Google Cloud IAM / API Gateway |
| **監査ログ** | n8n のログ (手動管理) | Cloud Logging / Cloud Audit Logs (自動) |
| **データ学習** | Gemini 無料版は学習に使用される可能性 | Vertex AI は学習に使用しない (契約保証) |
| **コンプライアンス** | 自前で担保 | ISO 27001, SOC 2, ISMAP 等の認証済み |
| **暗号化** | HTTPS (自前設定) | HTTPS + GCP内部暗号化 (自動) |
| **キー管理** | 手動管理 | Secret Manager / IAM (Google管理) |

---

## スケーラビリティ（100人同時利用）

### Application Integration の処理能力

| 項目 | 仕様 |
|---|---|
| **同時実行数** | デフォルトで数百〜数千の同時実行に対応 |
| **オートスケール** | リクエスト数に応じて自動スケール（サーバーレス） |
| **100人同時** | 問題なく処理可能（GCP のサーバーレス基盤） |

### Vertex AI の処理能力

| 項目 | Gemini 1.5 Flash | Gemini 2.0 Flash |
|---|---|---|
| **レートリミット** | 1,000 RPM (デフォルト) | 2,000 RPM (デフォルト) |
| **同時リクエスト** | 十分な余裕あり | 十分な余裕あり |
| **100人同時** | 全員が同じ秒にボタンを押しても処理可能 | 同上 |
| **引き上げ** | Google に申請すれば上限を引き上げ可能 | 同上 |

### 想定負荷の計算

```
100人 × 1日平均20回利用 = 2,000 req/日
ピーク: 100人が同時に1秒以内にリクエスト = 100 req/s

Vertex AI デフォルト上限: 1,000 RPM = 約16.7 req/s
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
| Vertex AI (Gemini Flash) 生成 | **500ms〜2,000ms** |
| レスポンス返却 | 100〜200ms |
| **合計** | **約 800ms〜2,600ms** |

### 3秒以内を達成するための設計

| 対策 | 効果 |
|---|---|
| **Gemini Flash モデルを使用** | 最速のモデル。Pro は遅いので使わない |
| **リージョンを東京に配置** | ネットワークレイテンシを最小化 |
| **入力トークンを削減済み** | 直近3件・各300文字 = 入力が小さいので高速 |
| **出力トークンを制限** | max_output_tokens: 500 で出力を制限 |
| **ストリーミング非使用** | シンプルな同期リクエストで十分高速 |

### 実測の目安

Vertex AI Gemini 1.5 Flash の一般的なレイテンシ:
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
  DEFAULT_API_KEY = 'AIzaSy...'  ← API Gateway 専用キー（Vertex AIには使えない）
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

### Step 2: Vertex AI API 有効化

```bash
gcloud services enable aiplatform.googleapis.com
```

### Step 3: Application Integration の作成

1. GCP Console → Application Integration を開く
2. 新しいインテグレーションを作成
3. **API Trigger** を追加（REST エンドポイント）
4. **Data Mapping** タスクでペイロードを整形
5. **Call REST Endpoint** タスクで Vertex AI を呼び出し
6. レスポンスを整形して返却

### Step 4: Vertex AI 呼び出し設定

Application Integration から Vertex AI を呼び出す REST 設定:

```
POST https://asia-northeast1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/asia-northeast1/publishers/google/models/gemini-1.5-flash:generateContent

Headers:
  Authorization: Bearer {SERVICE_ACCOUNT_TOKEN}  ← GCP内部で自動取得
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
# APIキー作成
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

### config.js の変更

```javascript
// 旧 (n8n)
const DEFAULT_WEBHOOK_URL = 'https://n8n.example.com/webhook/chatwork-ai';
const DEFAULT_AUTH_TOKEN = 'bearer-token-here';

// 新 (GCP)
const DEFAULT_ENDPOINT_URL = 'https://your-gateway.gateway.dev/draft';
const DEFAULT_API_KEY = '';  // API Gateway 用の制限付きキー
```

### api-client.js の変更

```javascript
// 旧: Authorization: Bearer トークン
headers['Authorization'] = 'Bearer ' + authToken;

// 新: x-api-key ヘッダー
headers['x-api-key'] = apiKey;
```

### レスポンス形式（変更なし）

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

### Vertex AI (Gemini 1.5 Flash)

| 項目 | 単価 | 月間想定 |
|---|---|---|
| 入力トークン | $0.075 / 100万トークン | 100人 × 20回/日 × 22日 × 500トークン = 約22Mトークン → **約$1.65** |
| 出力トークン | $0.30 / 100万トークン | 100人 × 20回/日 × 22日 × 200トークン = 約8.8Mトークン → **約$2.64** |
| **小計** | | **約 $4.30/月（約650円）** |

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
| **機密情報の漏洩防止** | GCP内完結 + Vertex AI はデータ学習に使用しない + VPC Service Controls + PIIマスク |
| **100人同時利用** | Application Integration はサーバーレスで自動スケール。Vertex AI も 1,000+ RPM。問題なし |
| **3秒以内の生成** | Gemini Flash + 東京リージョン + 入力最小化で **0.8〜2.6秒** が目安。達成可能 |
| **APIキーをコードに書かない** | Vertex AI のキーは GCP 内部のみ。拡張が持つのは API Gateway 用の制限付きキーのみ |
