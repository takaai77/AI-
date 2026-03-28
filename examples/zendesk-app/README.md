# Zendeskアプリ連携サンプル

このディレクトリには、Zendeskのチケットサイドバーから
Playwright自動化APIを呼び出すためのサンプルアプリが含まれています。

## 概要

```
┌────────────────────────────────────────────────────────┐
│                    Zendesk Support                      │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │      チケット         │  │   サイドバーアプリ        │ │
│  │                      │  │                          │ │
│  │  顧客: 山田太郎       │  │  📋 注文ステータス確認   │ │
│  │  注文: ORD-2024-001  │  │  👤 顧客情報取得         │ │
│  │                      │  │  ⏭️ 次回配送スキップ     │ │
│  │                      │  │  ⏸️ 定期購入一時停止     │ │
│  │                      │  │                          │ │
│  │                      │  │  [実行中: 50%]           │ │
│  └──────────────────────┘  └──────────────────────────┘ │
└────────────────────────────────────────────────────────┘
                              │
                              ▼  HTTP POST
                    ┌─────────────────────┐
                    │   自動化APIサーバー   │
                    └─────────────────────┘
```

## ファイル構成

```
zendesk-app/
├── manifest.json      # アプリ定義ファイル
├── assets/
│   ├── iframe.html    # サイドバーUI
│   └── main.js        # クライアントロジック
└── README.md          # このファイル
```

## セットアップ手順

### 1. 前提条件

- Zendesk Support のアカウント
- 自動化APIサーバーがデプロイ済み
- Zendesk管理者権限

### 2. カスタムフィールドの設定

チケットに以下のカスタムフィールドを追加することを推奨します：

| フィールド名 | フィールドID（例） | 説明 |
|-------------|-------------------|------|
| 顧客ID | `customer_id` | たまごリピートの顧客ID |
| 注文番号 | `order_no` | 対象の注文番号 |

### 3. アプリのインストール

#### 方法A: ZAT（Zendesk Apps Tools）を使用

```bash
# ZATをインストール
gem install zendesk_apps_tools

# アプリをパッケージ化
cd zendesk-app
zat package

# 生成された .zip ファイルをZendeskにアップロード
```

#### 方法B: 手動アップロード

1. `zendesk-app` フォルダをZIP化
2. Zendesk Admin Center → アプリ → マーケットプレイス → プライベートアプリを管理
3. 「新しいアプリをアップロード」から ZIP をアップロード

### 4. アプリの設定

インストール後、以下を設定：

| 設定項目 | 説明 | 例 |
|---------|------|-----|
| APIエンドポイント | 自動化APIのURL | `https://api.example.com` |

## 使い方

1. Zendesk Support でチケットを開く
2. 右サイドバーに「たまごリピート自動化」アプリが表示される
3. 顧客ID・注文番号が自動で読み込まれる（カスタムフィールドから）
4. 実行したいアクションのボタンをクリック
5. 進捗がリアルタイムで表示される
6. 完了後、結果が表示される

## カスタマイズ

### カスタムフィールドの変更

`main.js` の `loadTicketInfo()` 関数で、
読み取るカスタムフィールドを変更できます：

```javascript
const ticketData = await client.get([
  'ticket.id',
  'ticket.customField:your_customer_id_field',  // ← ここを変更
  'ticket.customField:your_order_no_field',     // ← ここを変更
  // ...
]);
```

### ボタンの追加

`iframe.html` のボタンセクションに追加：

```html
<button class="action-btn secondary" data-action="your_new_action">
  🆕 新しいアクション
</button>
```

### スタイルのカスタマイズ

`iframe.html` の `<style>` セクションで CSS を編集できます。

## トラブルシューティング

### アプリが表示されない

- ブラウザのコンソールでエラーを確認
- アプリがチケットサイドバーに設定されているか確認

### APIエラーが発生する

- APIエンドポイントが正しいか確認
- CORS設定が適切か確認（APIサーバー側）
- ネットワーク接続を確認

### 顧客IDが取得できない

- カスタムフィールドが正しく設定されているか確認
- フィールドIDが `main.js` と一致しているか確認

## セキュリティ考慮事項

- APIエンドポイントはHTTPSを使用
- 必要に応じてAPI認証を追加（Bearer Token等）
- 本番環境では `private: true` を維持

## 関連ドキュメント

- [Zendesk Apps Framework](https://developer.zendesk.com/documentation/apps/)
- [ZAF SDK](https://developer.zendesk.com/api-reference/apps/apps-core-api/introduction/)
