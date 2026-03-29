# Phone AI Agent

このアプリは、定期便の停止・変更を受け付ける電話 AI の土台です。

電話そのものの経路は Twilio に残しつつ、開発中はブラウザから同じ業務ロジックを試せるようにしてあります。  
ブラウザ版では次の3つを操作できます。

- AI モデルの切替: `OpenAI / Gemini`
- エージェント追加指示: プロンプト入力欄
- 会話設計: ノード型シナリオフロー

## まず理解したい人へ

非エンジニア向けの学習ドキュメントを `docs` に追加しています。

- `docs/01-start-here.md`
  - このアプリを部品単位で理解するための入口
- `docs/02-design-playbook.md`
  - 設計力を鍛えるための考え方とチェックリスト
- `docs/03-glossary.md`
  - よく出る専門用語の意味

## できること

- 本人確認
  - 氏名
  - 生年月日
  - 登録電話番号
- 停止系
  - 次回スキップ
  - 指定日まで一時停止
  - 定期停止
- 変更系
  - 次回配送日変更
  - 配送間隔変更
  - 数量変更
  - 住所変更
- 確認
  - DTMF 的な `1 / 2` 確認
- 監査
  - 本人確認
  - 提案
  - 反映
  - キャンセル
  - エスカレーション

## 開発時の使い分け

### 1. ブラウザ版

`http://localhost:3000/browser-demo` を開いて使います。

向いている場面:

- 通話料をかけたくない
- モデルを OpenAI / Gemini で比べたい
- プロンプトを試行錯誤したい
- ノードフローを作りたい

注意:

- Twilio の通話料はかかりません
- ただし OpenAI / Gemini の推論料金はかかります

### 2. 電話版

Twilio の Voice webhook を `POST /twilio/voice` に向けます。

向いている場面:

- 実電話に近い確認
- 本番寄りの動作検証

現時点の構成:

- 電話版: OpenAI
- ブラウザ版: OpenAI / Gemini

## 重要な入口

- `GET /browser-demo`
- `GET /browser/config`
- `POST /browser/openai/session`
- `GET /browser/gemini/live`
- `GET /browser/session/:sessionId/state`
- `POST /browser/session/:sessionId/digit`
- `DELETE /browser/session/:sessionId`
- `POST /twilio/voice`
- `GET /twilio/media-stream`

## フォルダ構成

- `src/server.ts`
  - サーバー本体
- `src/agent/build-call-agent.ts`
  - OpenAI / Gemini 共通の業務ツール
- `src/agent/system-prompt.ts`
  - ベースの指示文を組み立てる
- `src/scenario.ts`
  - ノードフローの検証
- `src/services/call-session.ts`
  - 通話ごとの状態
- `src/services/gemini-live-session.ts`
  - Gemini Live API のサーバー側ブリッジ
- `src/services/subscription-store.ts`
  - モックの定期便データ
- `public/browser-demo.*`
  - ブラウザ UI
- `tests/`
  - 基本テスト

## セットアップ

1. `.env` を作る

```powershell
Copy-Item .env.example .env
```

2. 最低限これを入れる

- `OPENAI_API_KEY`
- `GEMINI_API_KEY` を使うなら設定
- `PUBLIC_URL` は電話版を試すときだけ必要

3. 依存関係を入れる

```powershell
npm.cmd install
```

4. 開発サーバーを起動する

```powershell
npm.cmd run dev
```

## サンプル顧客

- `cust_001`
  - birth date: `1988-04-16`
  - phone: `09012345678`
- `cust_002`
  - birth date: `1979-12-02`
  - phone: `08012341234`

## 検証コマンド

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
```
