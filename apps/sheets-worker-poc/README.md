# Node.js + TypeScript PoC（ローカル実行）

この PoC は次をローカルで体験するための最小構成です。

- 内部実行API（Express）でジョブを受け付ける
- Googleスプレッドシートをジョブ台帳として使う
- Worker が `queued` ジョブを拾って Playwright を実行する
- `running/succeeded/failed` をシートへ書き戻す

## 1. 事前準備

1. Node.js 20 以上をインストールしてください。
2. このフォルダへ移動してください。  
   `cd apps/sheets-worker-poc`
3. `.env` を作成してください。  
   `copy .env.example .env`（Windows PowerShell）
4. `secrets/service-account.json` を配置してください。

## 2. Google スプレッドシート準備

1. Google Cloud で Sheets API を有効化してください。
2. サービスアカウントを作成し、JSON キーをダウンロードしてください。
3. JSON キーを `secrets/service-account.json` に保存してください。
4. Google スプレッドシートを1つ作成してください。
5. シート名を `jobs` にするか、`.env` の `JOBS_SHEET_NAME` に合わせてください。
6. 1行目ヘッダを次で固定してください。  
   `jobId, status, action, customerId, orderNo, operatorId, ticketId, idempotencyKey, createdAt, updatedAt, message`
7. スプレッドシートをサービスアカウントのメールアドレスに共有してください（編集者）。
8. スプレッドシートIDを `.env` の `SHEET_ID` に設定してください。

## 3. `.env` 設定例

`.env.example` を参照してください。主な項目は以下です。

- `API_TOKEN`: API Bearer トークン
- `ALLOWED_IPS`: カンマ区切りIP（空なら無効）
- `SHEET_ID`: スプレッドシートID
- `JOBS_SHEET_NAME`: シート名（初期値 `jobs`）
- `SERVICE_ACCOUNT_KEY_PATH`: 鍵ファイル（初期値 `secrets/service-account.json`）
- `WORKER_POLL_MS`: ポーリング間隔（2000〜5000ms推奨）
- `WORKER_BATCH_SIZE`: 1回の取得件数

## 4. インストールと起動

1. 依存関係をインストールしてください。  
   `npm install`
2. Playwright ブラウザをインストールしてください。  
   `npx playwright install`
3. API を起動してください。  
   `npm run dev:api`
4. 別ターミナルで Worker を起動してください。  
   `npm run dev:worker`

## 5. API 仕様

### POST `/internal/execute`

- Header: `Authorization: Bearer ${API_TOKEN}`
- Body:

```json
{
  "action": "create_child_order",
  "customerId": "CUST-001",
  "orderNo": "ORDER-001",
  "operatorId": "OP-001",
  "ticketId": "TICKET-001",
  "idempotencyKey": "idem-001"
}
```

- `action` は許可リスト方式です。  
  許可値: `create_child_order`, `use_points`
- `idempotencyKey` が既存と一致した場合、新規作成せず既存 `jobId` を返します。
- 新規作成時のレスポンス例:

```json
{
  "jobId": "f25775d0-6ef0-4cc6-869f-98846e1d1803",
  "status": "queued"
}
```

### GET `/internal/status/:jobId`

- Header: `Authorization: Bearer ${API_TOKEN}`
- レスポンス例:

```json
{
  "jobId": "f25775d0-6ef0-4cc6-869f-98846e1d1803",
  "status": "succeeded",
  "updatedAt": "2026-02-06T12:34:56.000Z"
}
```

## 6. curl 実行例

`<TOKEN>` と `<JOB_ID>` は実値に置き換えてください。

```bash
curl -X POST http://localhost:3000/internal/execute \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"create_child_order\",\"customerId\":\"CUST-001\",\"orderNo\":\"ORDER-001\",\"operatorId\":\"OP-001\",\"ticketId\":\"TICKET-001\",\"idempotencyKey\":\"idem-001\"}"
```

```bash
curl -X GET http://localhost:3000/internal/status/<JOB_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

## 7. セキュリティ方針（実装済み）

- Bearer token 認証（`API_TOKEN`）
- IP allowlist（`ALLOWED_IPS`、空なら無効）
- 認証情報はコード直書きしない（`.env`, `secrets/service-account.json`）
- アプリログに個人情報を出さない運用前提

## 8. Worker の動き

- 2〜5秒間隔で `status=queued` をポーリング
- `p-queue` で同時実行数 `10`
- 実行前に `queued -> running` のクレーム処理を実施
- クレームに成功したジョブだけ実行
- 成功時 `succeeded`、失敗時 `failed`
- 失敗時は `artifacts/{jobId}.png` を保存

## 9. トラブルシュート

- `Missing required env: SHEET_ID`  
  `.env` の `SHEET_ID` を設定してください。
- `Service account file not found`  
  `secrets/service-account.json` の配置パスを確認してください。
- `Sheet header mismatch`  
  シート1行目ヘッダを指定順に合わせてください。
- `403 Forbidden`  
  `ALLOWED_IPS` が設定されている場合、アクセス元IPが一致しているか確認してください。
- Workerが処理しない  
  APIとWorkerが同じ `.env` を参照しているか、シート共有権限があるか確認してください。
