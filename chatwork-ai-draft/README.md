# Chatwork AI返信下書きサポート Chrome拡張

Chatwork Web版のメッセージ入力欄の近くに「AI返信」ボタンを表示し、
AIが返信の下書きを作成するChrome拡張機能です。

**重要: この拡張機能は送信を自動で行いません。下書きの作成のみを行います。**
送信ボタンを押すのは必ず人間です。

## 概要

- Chatwork Web版でのみ動作
- LINEのAI返信のような軽量UIで下書きを提案
- n8n Webhook → Gemini API（またはVertex AI）で文面を生成
- 入力欄に「挿入」するだけ。送信は行わない
- 個人情報の簡易マスク機能付き

## フォルダ構成

```
chatwork-ai-draft/
├── manifest.json          # Chrome拡張マニフェスト（V3）
├── service-worker.js      # バックグラウンド Service Worker
├── content.js             # コンテンツスクリプト（メインエントリ）
├── ui/
│   ├── ai-card.js         # AIカードUIの構築・操作
│   └── ai-card.css        # AIカードのスタイル
├── lib/
│   ├── dom-selectors.js   # ChatworkのDOMセレクタ管理
│   ├── extract-context.js # 会話文脈の抽出
│   ├── mask-sensitive.js  # 個人情報の簡易マスク
│   ├── insert-draft.js    # 入力欄への下書き挿入
│   ├── storage-session.js # セッションストレージ管理
│   └── api-client.js      # n8n Webhook通信
├── options/
│   ├── options.html       # 設定画面
│   ├── options.js         # 設定画面ロジック
│   └── options.css        # 設定画面スタイル
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # このファイル
├── SECURITY.md            # セキュリティ方針
└── TODO_SELECTORS.md      # 実機確認が必要なセレクタ一覧
```

## セットアップ手順

### 前提条件

- Google Chrome ブラウザ
- n8n（またはWebhookを受けられる中継サーバー）
- Gemini API キー（n8n側で設定）

### 1. リポジトリの取得

```bash
git clone <このリポジトリのURL>
```

### 2. Chromeへの読み込み

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `chatwork-ai-draft/` フォルダを選択する
5. 拡張機能が読み込まれ、アイコンが表示される

### 3. n8n Webhook の設定

n8n側で以下のようなワークフローを作成してください。

#### リクエスト形式（この拡張から送られるJSON）

```json
{
  "roomName": "配送相談",
  "threadContext": [
    { "speaker": "相手", "text": "発送日は変更できますか？" },
    { "speaker": "自分", "text": "確認いたします。" }
  ],
  "intent": "丁寧に短く返信したい",
  "tone": "polite",
  "retryMode": false
}
```

#### レスポンス形式（n8nが返すべきJSON）

```json
{
  "ok": true,
  "draft": "お問い合わせありがとうございます。発送日変更について確認のうえご案内いたします。",
  "toneLabel": "丁寧",
  "notes": "確定情報がないため断定を避けています。"
}
```

#### tone の値

| 値 | 意味 |
|---|---|
| `neutral` | 通常 |
| `polite` | 丁寧 |
| `soft` | やわらかい |
| `short` | 短い |
| `summary` | 要点のみ |

### 4. 拡張機能の設定

1. Chromeの拡張機能アイコンをクリック → 設定画面が開く
2. **Webhook URL** に n8n の Webhook URL を入力
3. **取得メッセージ件数** を設定（推奨: 3〜5件）
4. 「設定を保存」をクリック

## Chatwork上での使い方

1. Chatwork Web版 (`https://www.chatwork.com/`) を開く
2. チャットルームを選択する
3. メッセージ入力欄の近くに「✨ AI返信」ボタンが表示される
4. ボタンをクリックするとAIカードが開く
5. 「どう返信したいですか？」にざっくり意図を入力
6. 「返信を提案」をクリック
7. 下書きプレビューが表示される
8. 必要に応じてトーンを変更（丁寧に、やわらかく、短く、要点だけ）
9. 「入力欄に挿入」をクリックすると、Chatworkの入力欄にテキストが入る
10. **内容を確認し、自分で送信ボタンを押す**

## セキュリティ方針

詳細は [SECURITY.md](./SECURITY.md) を参照してください。

### 要約

- **APIキーを拡張に置かない**: Gemini APIキーはn8nサーバー側のみで管理
- **データ最小化**: 直近数件のメッセージのみ送信、個人情報は簡易マスク
- **保存最小化**: localStorage不使用、一時データはメモリまたはsession storage
- **ログ最小化**: 会話本文をconsole.logに出力しない
- **権限最小化**: 必要なドメインのみに制限、`<all_urls>` 不使用
- **送信禁止**: 送信ボタンの自動操作は一切行わない

### なぜ永続保存を避けるか

- ブラウザのローカルストレージに業務チャットの内容が残るリスクを最小化する
- 共有PCやプロファイルからの情報漏洩を防ぐ
- データの保存期間が制御不能になることを避ける

## 制限事項

- **DOMセレクタ**: ChatworkのDOM構造が変更されると動作しなくなる可能性がある。
  `lib/dom-selectors.js` と `TODO_SELECTORS.md` を参照して更新してください。
- **個人情報マスク**: 完全ではない。正規表現ベースの簡易マスクのため、
  すべての個人情報を検出できるわけではない。
- **SPA遷移**: Chatworkはシングルページアプリケーションのため、
  ルーム切り替え時にUIの再初期化が必要。MutationObserverで対応しているが、
  稀にボタンが消える場合がある（ページリロードで復帰）。
- **n8n依存**: AI生成はn8n経由のため、n8nがダウンしていると機能しない。

## 本番運用での注意点

1. **n8n の保護**: n8n Webhook の前段に認証レイヤー（社内VPN、IP制限、
   Basic認証、OAuthなど）を設置することを強く推奨する。
2. **HTTPS必須**: Webhook URLは必ず HTTPS を使用すること。
3. **Gemini API利用規約**: 業務データをAIに送る場合、
   Gemini/Vertex AI の利用規約を確認すること。
4. **アイコン**: 現在のアイコンはプレースホルダー。
   本番では適切なアイコンに差し替えること。
5. **ロケール**: 現在 `_locales` は未実装。manifest の `default_locale` を
   削除するか、`_locales/ja/messages.json` を作成する必要がある。

## 今後の改善案

- [ ] サイドパネル対応（Chrome Side Panel API）
- [ ] ストリーミング応答対応（Server-Sent Events）
- [ ] 定型文テンプレート機能
- [ ] カスタムプロンプト設定
- [ ] 複数の中継サーバー切り替え
- [ ] ショートカットキー対応
- [ ] テーマ（ダーク/ライト）対応
- [ ] Chatwork APIとの連携（ルーム情報取得など）
- [ ] 自動テスト（Puppeteer/Playwright）
- [ ] _locales 対応
