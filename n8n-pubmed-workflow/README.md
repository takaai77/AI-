# サジー論文 自動取得・要約・通知ワークフロー（n8n）

PubMed API からサジー（sea buckthorn / Hippophae rhamnoides）関連の新着論文を定期取得し、
Gemini API で日本語要約・重要度判定を行い、HTMLメールで通知する n8n ワークフローです。

---

## 1. ワークフロー全体設計

### ノード構成図（テキスト）

```
⏰ 毎朝6時に実行
  ↓
⚙️ 検索条件・設定（検索クエリ、テーマ、閾値などの変数管理）
  ↓
🔍 検索URL構築（日付範囲計算、esearch URL組み立て）
  ↓
📡 PubMed検索 esearch（HTTP Request → PMID一覧取得）
  ↓
📋 PMID取得・efetchURL構築（PMIDリスト抽出、0件判定）
  ↓
❓ 論文あり？（IF分岐）
  ├─ YES → 📄 論文詳細取得 efetch（HTTP Request → XML取得）
  │         ↓
  │       📝 論文データ整形・重複除外（XML解析、構造化データに変換）
  │         ↓  ← 各論文ごとにループ処理
  │       🤖 Gemini要約・分析（HTTP Request → Gemini API呼び出し）
  │         ↓
  │       📊 要約結果パース（JSONパース、フォールバック処理）
  │         ↓
  │       💾 Google Sheetsに保存（全件記録）
  │         ↓
  │       ⭐ 重要論文？（重要度スコアでフィルタ）
  │         ├─ YES → ✉️ メール本文HTML構築 → 📧 メール送信
  │         └─ NO  → ⏭️ 通知スキップ
  │
  └─ NO  → 📭 結果なし（ログ出力）

🚨 エラー整形 → 📧 エラー通知送信（エラーワークフロー経由で起動）
```

### 処理フロー概要

| ステップ | ノード名 | 役割 |
|---------|---------|------|
| 1 | ⏰ 毎朝6時に実行 | Schedule Trigger。毎日06:00にワークフロー開始 |
| 2 | ⚙️ 検索条件・設定 | 検索キーワード、テーマ一覧、取得件数上限、重要度閾値、Geminiモデル名、通知先メールアドレスなどを一元管理 |
| 3 | 🔍 検索URL構築 | daysBack日前〜今日の日付範囲を計算し、PubMed esearch APIのURLを組み立て |
| 4 | 📡 PubMed検索 | esearch APIを実行し、条件に一致するPMID一覧を取得（リトライあり） |
| 5 | 📋 PMID取得 | レスポンスからPMIDリストを抽出し、efetch用URLを構築。0件なら分岐 |
| 6 | ❓ 論文あり？ | 結果が0件なら「結果なし」へ、1件以上なら詳細取得へ |
| 7 | 📄 論文詳細取得 | efetch APIでPubMed XMLを一括取得（リトライあり） |
| 8 | 📝 論文データ整形 | XMLを正規表現で解析し、タイトル・要旨・著者・掲載誌・出版日・URLを構造化。PMID重複除外 |
| 9 | 🤖 Gemini要約 | 各論文をGemini APIに送信し、日本語要約・研究タイプ・商品訴求との近さ・注意点・重要度スコアを生成 |
| 10 | 📊 要約結果パース | Gemini応答のJSONをパース。失敗時はフォールバック値で継続 |
| 11 | 💾 Google Sheets保存 | 全論文の分析結果をスプレッドシートに追記 |
| 12 | ⭐ 重要論文？ | 重要度スコアが閾値以上、または全件通知モードならメール送信へ |
| 13 | ✉️ メール構築 | HTMLメール本文を構築（色分け、構造化された表示） |
| 14 | 📧 メール送信 | SMTP経由でメール送信 |

---

## 2. 環境変数一覧

n8n の Settings → Environment Variables で以下を設定してください。

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GEMINI_API_KEY` | Google Gemini API のAPIキー | `AIzaSy...` |
| `PUBMED_API_KEY` | PubMed E-utilities APIキー（任意だが推奨） | `abcdef123456` |
| `NOTIFICATION_EMAIL` | 論文通知の送信先メールアドレス | `rd-team@example.com` |
| `ADMIN_EMAIL` | エラー通知の送信先（管理者）メールアドレス | `admin@example.com` |
| `GOOGLE_SHEET_ID` | 保存先Google SheetsのスプレッドシートID | `1BxiMVs0XRA5nF...` |

### APIキーの取得方法

**Gemini API キー:**
1. https://aistudio.google.com/apikey にアクセス
2. 「Create API Key」でキーを生成
3. 無料枠あり（1分あたり15リクエスト）

**PubMed API キー（任意）:**
1. https://www.ncbi.nlm.nih.gov/account/ でNCBIアカウント作成
2. Settings → API Key Management でキーを生成
3. APIキーがあると、レート制限が3→10リクエスト/秒に緩和

---

## 3. セットアップ手順

### 3.1 前提条件
- n8n がインストール・稼働済み（Self-hosted または n8n Cloud）
- Gemini API キーを取得済み
- Gmail または SMTP メールサーバーへのアクセス

### 3.2 ワークフローのインポート

1. n8n のダッシュボードを開く
2. 左メニュー「Workflows」→ 右上「Import from File」
3. `pubmed-seabuckthorn-workflow.json` を選択してインポート
4. ワークフローが「【R&D】サジー論文 自動取得・要約・通知」として追加される

### 3.3 環境変数の設定

**Self-hosted の場合：**
`docker-compose.yml` または起動コマンドに以下を追加：
```yaml
environment:
  - GEMINI_API_KEY=your_gemini_api_key
  - PUBMED_API_KEY=your_pubmed_api_key
  - NOTIFICATION_EMAIL=rd-team@example.com
  - ADMIN_EMAIL=admin@example.com
  - GOOGLE_SHEET_ID=your_spreadsheet_id
```

**n8n Cloud の場合：**
Settings → Environment Variables で上記を追加。

### 3.4 SMTPクレデンシャルの設定

1. n8n 左メニュー「Credentials」→「Add Credential」
2. 「SMTP」を検索して選択
3. 以下を入力：

**Gmailの場合：**
| 項目 | 値 |
|------|-----|
| Host | `smtp.gmail.com` |
| Port | `465` |
| SSL/TLS | `true` |
| User | Gmailアドレス |
| Password | **アプリパスワード**（※通常のパスワードではない） |

**Gmailアプリパスワードの取得手順：**
1. Googleアカウント → セキュリティ → 2段階認証をONにする
2. セキュリティ → アプリパスワードに移動
3. アプリ名「n8n」を入力して生成
4. 表示された16文字のパスワードをn8nに入力

4. 「📧 メール送信」と「📧 エラー通知送信」ノードを開き、SMTP Credentialを上で作成したものに設定

### 3.5 Google Sheets の設定

1. n8n で「Credentials」→「Add Credential」→「Google Sheets OAuth2 API」を追加
   - Google Cloud Console でOAuth2クライアントIDを作成し、Client ID / Client Secret を入力
   - または Google Sheets API (Service Account) を使用
2. Google Sheets で新しいスプレッドシートを作成
3. シート名を「論文データ」に変更
4. 1行目にヘッダーを入力（下記「列設計」参照）
5. スプレッドシートのURLからIDをコピー
   - URL例: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
6. 環境変数 `GOOGLE_SHEET_ID` にIDを設定
7. 「💾 Google Sheetsに保存」ノードを開き、Credentialを設定

### 3.6 検索条件のカスタマイズ

「⚙️ 検索条件・設定」ノードを開いて、以下を調整できます：

| パラメータ | 初期値 | 説明 |
|-----------|--------|------|
| `searchQuery` | `("sea buckthorn" OR "hippophae rhamnoides")` | PubMed検索式 |
| `themes` | `["fatigue", "iron", ...]` | テーマ一覧（将来の拡張用） |
| `maxResults` | `50` | 1回あたり最大取得件数 |
| `importanceThreshold` | `4` | メール通知する重要度の下限 |
| `notifyAll` | `false` | `true`にすると全件通知 |
| `geminiModel` | `gemini-2.0-flash` | Geminiモデル名 |
| `daysBack` | `7` | 何日前まで遡って検索するか |

### 3.7 動作確認

1. ワークフローを開き、「Test Workflow」ボタンを押す
2. 各ノードの出力を順に確認
3. PubMed検索が成功し、PMIDが返ることを確認
4. Gemini APIが要約を返すことを確認
5. メールが届くことを確認
6. 問題なければ、ワークフロー右上のトグルを「Active」にする

---

## 4. Google Sheets 列設計

シート名: `論文データ`

| 列 | ヘッダー名 | データ型 | 説明 |
|----|-----------|---------|------|
| A | PMID | テキスト | PubMed固有ID（重複チェック用） |
| B | タイトル | テキスト | 論文タイトル（英語原文） |
| C | 要旨 | テキスト | アブストラクト（英語原文） |
| D | 著者 | テキスト | 著者名（最大5名+et al.） |
| E | 掲載誌 | テキスト | ジャーナル名 |
| F | 出版日 | テキスト | YYYY-MM-DD形式 |
| G | PubMedURL | テキスト | PubMedへのリンク |
| H | 日本語要約 | テキスト | Geminiによる3〜5行の日本語要約 |
| I | 研究タイプ | テキスト | RCT/観察研究/レビュー/メタ分析 等 |
| J | 商品訴求との近さ | テキスト | 高/中/低＋理由 |
| K | 注意点 | テキスト | 研究の限界・注意事項 |
| L | 重要度スコア | 数値 | 1〜5（5が最重要） |
| M | 取得日時 | 日時 | ワークフロー実行日時（ISO 8601） |

**運用Tips:**
- Google Sheetsのフィルタ機能で重要度スコアや研究タイプで絞り込みが可能
- 条件付き書式で重要度5を赤、4をオレンジに色分けするとさらに見やすい
- PMID列でソート・フィルタして重複確認も可能

---

## 5. 運用フロー

### 通常運用
```
毎朝6:00 → 自動実行 → 新着あれば要約・保存・通知
                     → 新着なければ何もしない
```

### 手動実行
- n8n画面で「Test Workflow」を押せばいつでも手動実行可能
- daysBack を大きくすれば過去の論文も取得可能

### 週次レビュー（推奨）
1. Google Sheets を開いて週間の新着論文を確認
2. 重要度スコアでフィルタ
3. 必要な論文は原文を確認
4. テーマや検索式の調整が必要なら「⚙️ 検索条件・設定」ノードを更新

---

## 6. エラー時の確認ポイント

| エラー箇所 | よくある原因 | 確認方法 |
|-----------|------------|---------|
| 📡 PubMed検索 | APIキー不正、レート制限 | HTTP応答コード確認。429なら時間を空けて再実行 |
| 📄 論文詳細取得 | PMID数が多すぎ、タイムアウト | maxResultsを減らす。タイムアウト値を増やす |
| 🤖 Gemini要約 | APIキー不正、クォータ超過、モデル名誤り | GeminiコンソールでAPIキーの状態確認 |
| 📊 要約結果パース | Geminiが不正なJSONを返した | フォールバック処理で継続するが、ログで確認 |
| 💾 Google Sheets | 認証切れ、シート名不一致 | Credentialの再認証、シート名が「論文データ」か確認 |
| 📧 メール送信 | SMTP設定不備、アプリパスワード失効 | Credentialを再設定。Gmailならアプリパスワード再生成 |

### エラー発生時の対処フロー
1. 管理者にエラー通知メールが届く（エラーワークフロー設定時）
2. n8n の Executions 画面で失敗した実行を開く
3. 赤くなっているノードをクリックしてエラー詳細を確認
4. 上記の表を参考に対処
5. 「Test Workflow」で修正確認

### エラーワークフローの有効化
1. ワークフロー設定（歯車アイコン）を開く
2. 「Error Workflow」セクションで自身のワークフロー（現在のワークフロー）を選択
3. これにより、エラー発生時に「🚨 エラー整形」→「📧 エラー通知送信」が起動

---

## 7. 将来拡張案

### 7.1 Slack通知の追加
- 「📧 メール送信」の後に Slack ノードを追加
- Incoming Webhook または Slack API で通知
- 重要度5の論文は `@channel` メンション付きにする

### 7.2 NotebookLM投入
- Google Sheetsに蓄積した論文データをNotebookLMのソースとして追加
- 定期的にNotebookLMへ論文PDFを投入するワークフローを別途構築

### 7.3 テーマ別配信
- `themes` 配列をループして、テーマごとに検索を実行
- 例: `("sea buckthorn" OR "hippophae rhamnoides") AND fatigue`
- テーマごとに異なる配信先を設定可能に

### 7.4 承認フロー
- 重要度4以上の論文を社内Wikiやレポートに掲載する前に、マネージャー承認を挟む
- n8n の Wait ノード + Webhook で承認/却下の仕組みを実装

### 7.5 PDF自動ダウンロード
- PubMed Central (PMC) にオープンアクセスで全文がある論文はPDFを自動取得
- Google Driveに保存して共有

### 7.6 類似論文クラスタリング
- 蓄積した論文データをEmbedding APIでベクトル化
- 類似論文を自動グルーピングしてトレンド分析

### 7.7 二重通知防止の強化
- 現在: XML解析時のPMID重複除外（同一実行内）
- 拡張: Google Sheetsの既存PMIDを事前取得し、新規のみ処理するステップを追加
- さらに: n8n Static Data を使って前回実行のPMIDを記憶

---

## 8. ファイル一覧

| ファイル | 説明 |
|---------|------|
| `pubmed-seabuckthorn-workflow.json` | n8nワークフローJSON（インポート用） |
| `README.md` | 本ドキュメント |

---

## 9. 補足: 検索式のカスタマイズ例

### テーマを追加する場合
「⚙️ 検索条件・設定」ノードの `searchQuery` を変更:

```
# 基本（現在の設定）
("sea buckthorn" OR "hippophae rhamnoides")

# 特定テーマに絞る場合
("sea buckthorn" OR "hippophae rhamnoides") AND (fatigue OR iron OR anemia)

# ビタミンC関連を追加
("sea buckthorn" OR "hippophae rhamnoides") AND (vitamin C OR ascorbic acid)

# サジーオイル関連を追加
("sea buckthorn" OR "hippophae rhamnoides" OR "sea buckthorn oil")
```

### テーマ配列の活用
`themes` 配列は将来のテーマ別検索用に予約されています。
テーマ別に検索を分割する拡張を行う場合は、Codeノードで `themes` をループして
各テーマに対応する検索URLを生成する処理を追加してください。
