# Playwright自動化基盤

Zendeskの管理画面アプリから「たまごリピート」の画面操作を自動実行するシステムです。

## 概要

```
┌─────────────────┐     HTTP POST     ┌─────────────────┐
│   Zendesk       │ ───────────────▶ │   APIサーバー    │
│   管理画面アプリ  │                   │   (Express)     │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │   Redis         │
                                      │   (BullMQ)      │
                                      └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │   ワーカー       │
                                      │   (Playwright)  │
                                      └────────┬────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                              ▼
               ┌─────────────────┐                            ┌─────────────────┐
               │  たまごリピート   │                            │  スプレッドシート  │
               │  管理画面        │                            │  (結果記録)       │
               └─────────────────┘                            └─────────────────┘
```

## 機能

- **ジョブキュー管理**: BullMQ + Redisで最大10件の同時実行
- **自動リトライ**: 失敗時は指数バックオフで最大3回リトライ
- **進捗追跡**: リアルタイムで進捗をスプレッドシートに記録
- **エラーハンドリング**: エラー時は自動でスクリーンショット保存
- **同時実行防止**: 同一顧客+アクションの重複実行をロックで防止

## ディレクトリ構成

```
playwright-automation-queue/
├── src/
│   ├── server.ts          # APIサーバー（ジョブ受付）
│   ├── worker.ts          # ワーカー（ジョブ実行）
│   ├── queue.ts           # キュー定義（BullMQ設定）
│   ├── sheets.ts          # スプレッドシート連携
│   ├── types.ts           # 型定義
│   ├── config.ts          # 設定管理
│   ├── logger.ts          # ログ出力
│   └── scenarios/         # シナリオ（画面操作手順）
│       ├── index.ts       # シナリオ管理
│       ├── common.ts      # 共通処理（ログイン等）
│       ├── check-order-status.ts   # 注文ステータス確認
│       ├── cancel-order.ts         # 注文キャンセル
│       ├── get-customer-info.ts    # 顧客情報取得
│       ├── skip-next-delivery.ts   # 次回配送スキップ
│       ├── update-shipping.ts      # 配送情報更新
│       ├── change-delivery-date.ts # 配送日変更
│       ├── pause-subscription.ts   # 定期購入一時停止
│       └── resume-subscription.ts  # 定期購入再開
├── examples/
│   └── zendesk-app/       # Zendeskアプリ連携サンプル
│       ├── manifest.json
│       ├── assets/
│       │   ├── iframe.html
│       │   └── main.js
│       └── README.md
├── artifacts/             # スクリーンショット保存先
├── credentials/           # 認証情報
├── .env.example           # 環境変数テンプレート
├── Dockerfile             # APIサーバー用
├── Dockerfile.worker      # ワーカー用
├── docker-compose.yml     # ローカル開発環境
├── package.json
├── tsconfig.json
└── README.md
```

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
# Node.js 18以上が必要です
npm install

# Playwrightのブラウザをインストール
npx playwright install chromium
```

### 2. 環境変数の設定

```bash
# テンプレートをコピー
cp .env.example .env

# .env を編集して必要な値を設定
```

### 3. Redisのセットアップ

#### ローカル開発（Docker使用）

```bash
# Redisコンテナを起動
docker run -d --name redis-queue -p 6379:6379 redis:7-alpine

# 確認
docker ps
```

#### ローカル開発（Homebrew - Mac）

```bash
# インストール
brew install redis

# 起動
brew services start redis

# 確認
redis-cli ping
```

### 4. Googleスプレッドシートの設定

#### サービスアカウントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 新しいプロジェクトを作成（または既存のを使用）
3. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
4. サービスアカウントを作成
5. 「キーを追加」→「新しいキーを作成」→「JSON」
6. ダウンロードしたJSONを `credentials/google-service-account.json` に保存

#### スプレッドシートの準備

1. 新しいスプレッドシートを作成
2. サービスアカウントのメールアドレス（`xxxx@xxxx.iam.gserviceaccount.com`）を編集者として共有
3. スプレッドシートのURLからIDをコピー（`/d/` と `/edit` の間の文字列）
4. `.env` の `GOOGLE_SPREADSHEET_ID` に設定

### 5. たまごリピートの設定

`.env` に以下を設定:

```env
TAMAGO_BASE_URL=https://your-tenant.tamago-repeat.jp/admin
TAMAGO_LOGIN_ID=your_login_id
TAMAGO_LOGIN_PASSWORD=your_password
```

## 実行方法

### ローカル開発（Node.js直接）

```bash
# ターミナル1: APIサーバーを起動
npm run server

# ターミナル2: ワーカーを起動
npm run worker

# または両方同時に起動
npm run dev
```

### ローカル開発（Docker Compose）

```bash
# すべてのサービスを起動（Redis + API + ワーカー）
docker-compose up -d

# ログを確認
docker-compose logs -f

# 停止
docker-compose down

# 再ビルドして起動
docker-compose up -d --build

# Redis管理UI（オプション）
docker-compose --profile tools up -d
# → http://localhost:8081 でRedis Commanderにアクセス
```

### APIの使い方

#### ジョブの作成

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "12345",
    "customerId": "C-001",
    "orderNo": "ORD-2024-001",
    "action": "check_order_status",
    "operator": "田中太郎"
  }'
```

レスポンス:
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "ジョブを受け付けました"
}
```

#### ジョブの進捗確認

```bash
curl http://localhost:3000/jobs/550e8400-e29b-41d4-a716-446655440000
```

#### ジョブ一覧の取得

```bash
curl http://localhost:3000/jobs
```

#### 利用可能なアクション一覧

```bash
curl http://localhost:3000/actions
```

#### キュー状態の確認

```bash
curl http://localhost:3000/queue/status
```

## 利用可能なアクション

| アクション | 説明 | 必須パラメータ | 追加パラメータ |
|-----------|------|---------------|---------------|
| `check_order_status` | 注文ステータス確認 | customerId | orderNo（任意） |
| `cancel_order` | 注文キャンセル | customerId, orderNo | params.cancelReason |
| `get_customer_info` | 顧客情報取得 | customerId | - |
| `skip_next_delivery` | 次回配送スキップ | customerId | params.skipReason |
| `update_shipping` | 配送情報更新 | customerId, orderNo | params.recipientName, params.postalCode, params.address など |
| `change_delivery_date` | 配送日変更 | customerId | params.newDeliveryDate（YYYY-MM-DD形式） |
| `pause_subscription` | 定期購入一時停止 | customerId | params.pauseReason, params.resumeDate |
| `resume_subscription` | 定期購入再開 | customerId | params.nextDeliveryDate |

## 新しいシナリオの追加方法

1. `src/scenarios/` に新しいファイルを作成

```typescript
// src/scenarios/my-new-scenario.ts
import { Page } from 'playwright';
import { JobResult, ScenarioContext } from '../types';
import { login } from './common';

export const myNewScenario = async (
  page: Page,
  context: ScenarioContext
): Promise<JobResult> => {
  const { jobId, customerId, updateProgress } = context;

  // 1. ログイン
  await updateProgress(10, 'ログイン中');
  await login(page);

  // 2. 処理を実装
  await updateProgress(50, '処理中');
  // ... 実際の処理

  // 3. 結果を返す
  await updateProgress(100, '完了');
  return {
    success: true,
    data: { /* 結果データ */ },
    message: '処理が完了しました',
  };
};
```

2. `src/scenarios/index.ts` に登録

```typescript
import { myNewScenario } from './my-new-scenario';

const scenarioMap = {
  // ... 既存のシナリオ
  my_new_action: myNewScenario,
};
```

3. `src/types.ts` の `ActionType` に追加

```typescript
export type ActionType =
  | 'check_order_status'
  // ... 既存のアクション
  | 'my_new_action';
```

## ログイン状態の保持（storageState）

Playwrightの `storageState` 機能を使って、ログイン状態を保持できます。
これにより、毎回ログインする必要がなくなり、処理が高速化されます。

### 仕組み

1. 初回ログイン時に Cookie やセッション情報を `storageState.json` に保存
2. 次回以降は保存した状態を読み込んでセッションを復元
3. セッションが切れている場合は自動的に再ログイン

### 設定

```env
# .env
STORAGE_STATE_PATH=./storageState.json
```

### 注意点

- `storageState.json` には認証情報が含まれるため、Git にコミットしない
- セッションの有効期限に注意（定期的に再ログインが必要な場合がある）
- 複数ワーカーで同じファイルを使用する場合は競合に注意

## Cloud Run でのデプロイ

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# 依存パッケージをインストール
COPY package*.json ./
RUN npm ci --only=production

# ソースをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ポートを公開
EXPOSE 8080

# サーバーを起動
CMD ["node", "dist/server.js"]
```

### ワーカー用 Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["node", "dist/worker.js"]
```

### Cloud Run へのデプロイ

```bash
# APIサーバーをデプロイ
gcloud run deploy playwright-api \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars="REDIS_URL=redis://xxx,GOOGLE_SPREADSHEET_ID=xxx" \
  --set-secrets="GOOGLE_CREDENTIALS_JSON=google-credentials:latest"

# ワーカーをデプロイ（常時起動が必要）
gcloud run deploy playwright-worker \
  --source . \
  --dockerfile Dockerfile.worker \
  --platform managed \
  --region asia-northeast1 \
  --min-instances 1 \
  --set-env-vars="REDIS_URL=redis://xxx" \
  --set-secrets="GOOGLE_CREDENTIALS_JSON=google-credentials:latest,TAMAGO_LOGIN_PASSWORD=tamago-password:latest"
```

### Redis（Memorystore）の設定

Cloud Run から接続するには Serverless VPC Access が必要です:

1. VPC ネットワークを作成
2. Memorystore for Redis インスタンスを作成
3. Serverless VPC Access コネクタを作成
4. Cloud Run サービスに VPC コネクタを設定

## トラブルシューティング

### よくあるエラー

#### Redis接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

→ Redisが起動していません。`docker ps` で確認してください。

#### スプレッドシート権限エラー

```
Error: The caller does not have permission
```

→ サービスアカウントがスプレッドシートに共有されていません。

#### Playwrightタイムアウト

```
TimeoutError: page.click: Timeout 30000ms exceeded
```

→ セレクタが間違っているか、ページの読み込みが遅い可能性があります。

### ログの確認

```bash
# サーバーログ
npm run server 2>&1 | tee server.log

# ワーカーログ
npm run worker 2>&1 | tee worker.log
```

### スクリーンショットの確認

エラー時のスクリーンショットは `artifacts/` ディレクトリに保存されます:

```bash
ls -la artifacts/
```

## セキュリティに関する注意

- `.env` ファイルは絶対に Git にコミットしない
- `credentials/` ディレクトリも Git にコミットしない
- `storageState.json` にはセッション情報が含まれるため取り扱い注意
- 本番環境では Secret Manager 等を使用して認証情報を管理

## ライセンス

MIT
