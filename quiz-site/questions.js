const ROADMAP_ITEMS = [
  {
    rank: "Step 1",
    title: "データの流れを理解する",
    why: "URL登録 -> metrics -> 閾値 -> 解析 -> テンプレ保存の一本線を最初に理解する。"
  },
  {
    rank: "Step 2",
    title: "ジョブキューと失敗時ログを理解する",
    why: "夜間運用で止まらないために、queue/job/worker と jobs.logs の読み方を先に覚える。"
  },
  {
    rank: "Step 3",
    title: "セキュリティの最低ラインを固める",
    why: "APIキー流出、危険な公開、権限漏れは後から修正コストが大きい。最初に防ぐ。"
  },
  {
    rank: "Step 4",
    title: "改善ループを回す",
    why: "テンプレを作って終わりではなく、A/Bと週次運用で勝ちパターンを増やす。"
  }
];

const TERM_CARDS = [
  {
    term: "API",
    definition: "画面と裏側が会話する窓口。",
    analogy: "レストランの注文票。客は料理場の中身を知らなくても注文できる。",
    project: "Web画面は POST /videos でAPIにURL登録を依頼する。"
  },
  {
    term: "キュー",
    definition: "後で順番に処理する待ち行列。",
    analogy: "病院の整理券。先に番号を取って呼ばれたら進む。",
    project: "解析ジョブをRedisキューに積み、Workerが順番に処理する。"
  },
  {
    term: "ワーカー",
    definition: "キューから仕事を受けて実行する処理担当。",
    analogy: "工場の作業員。指示書(ジョブ)を受けて作業する。",
    project: "Celery worker が ffmpeg/OCR/LLM を実行してDB保存する。"
  },
  {
    term: "Docker",
    definition: "同じ環境で動かすための箱。",
    analogy: "調理器具ごと運べるキッチンカー。",
    project: "api/worker/web/postgres/redis を同条件で起動できる。"
  },
  {
    term: "環境変数",
    definition: "設定値や秘密情報をコード外から渡す仕組み。",
    analogy: "金庫の暗証番号を手順書に書かず、別紙で管理する。",
    project: "OPENAI_API_KEY を .env で管理し、コードに直書きしない。"
  },
  {
    term: "JWT",
    definition: "ログイン済みかを表す署名付きトークン。",
    analogy: "改ざん防止付きの入館証。",
    project: "将来の管理画面ではJWTでユーザー認証を行う。"
  },
  {
    term: "バリデーション",
    definition: "入力がルール通りか検査すること。",
    analogy: "申込書の記入漏れチェック。",
    project: "LLMのJSONをPydanticで検証し、壊れた値を保存しない。"
  },
  {
    term: "最小権限",
    definition: "必要な操作だけ許可する考え方。",
    analogy: "店長だけが金庫を開けられる運用。",
    project: "設定変更APIは管理者だけに許可する設計へ拡張する。"
  }
];

const SECURITY_CHECKLIST = [
  "APIキーやDBパスワードをリポジトリへコミットしない",
  ".env は共有せず、.env.example だけ共有する",
  "GitHub Actions の権限は必要最小限にする",
  "外部公開URLには認証・アクセス制限を付ける（本番）",
  "ジョブログに個人情報や秘密情報を残さない",
  "依存ライブラリの脆弱性を定期チェックする",
  "手動メトリクス入力に異常値が入らないよう検証する",
  "APIのCORS設定を本番ドメインだけに絞る"
];

const QUIZ_QUESTIONS = [
  {
    id: "q01",
    focus: "security",
    category: "Secrets",
    question: "OPENAI_API_KEY を安全に扱う最適な方法はどれ？",
    options: [
      ".env や GitHub Secrets で管理し、コードへ直書きしない",
      "動作確認しやすいので app.js に直書きする",
      "READMEへ実値を書いて共有する"
    ],
    answer: 0,
    explanation: "秘密情報はコードと分離し、漏えい面積を減らすのが基本です。",
    analogy: "金庫番号を壁に書かず、店長だけが知る運用にする。"
  },
  {
    id: "q02",
    focus: "security",
    category: "GitHub Actions",
    question: "GitHub Actionsでセキュリティを高める設定として正しいのは？",
    options: [
      "permissions を最小化し、不要な write 権限を外す",
      "毎回 permissions: write-all にする",
      "誰でも workflow_dispatch で本番デプロイできるようにする"
    ],
    answer: 0,
    explanation: "CI/CDは権限を絞るほど事故時の被害を小さくできます。",
    analogy: "全員にマスターキーを配らず、必要な鍵だけ渡す。"
  },
  {
    id: "q03",
    focus: "security",
    category: "Input Validation",
    question: "手動 metrics 入力で最も重要な対策は？",
    options: [
      "views/likes/comments の型と範囲をバリデーションする",
      "フォームは自由入力のままにする",
      "API側で検証せず画面だけで検証する"
    ],
    answer: 0,
    explanation: "API側検証がないと不正値がDBへ入り、分析結果が壊れます。",
    analogy: "出荷前の最終検品を省くと不良品が市場に出る。"
  },
  {
    id: "q04",
    focus: "security",
    category: "Logs",
    question: "ジョブログに残してはいけない情報はどれ？",
    options: [
      "APIキー、個人情報、生トークン",
      "進捗パーセント",
      "処理開始時刻"
    ],
    answer: 0,
    explanation: "ログは多くの人が見られるため、秘密情報を置く場所ではありません。",
    analogy: "掲示板に金庫番号を貼るのと同じ。"
  },
  {
    id: "q05",
    focus: "architecture",
    category: "System Flow",
    question: "このMVPの基本フローとして正しい順番は？",
    options: [
      "URL登録 -> metrics収集 -> 閾値判定 -> 解析ジョブ -> テンプレ保存",
      "URL登録 -> いきなりLLM -> metrics収集",
      "metrics収集 -> URL登録 -> OCR"
    ],
    answer: 0,
    explanation: "重い解析は閾値通過後に回すことで無駄を減らします。",
    analogy: "全員面接せず、書類選考を先に行う。"
  },
  {
    id: "q06",
    focus: "architecture",
    category: "Queue",
    question: "キューを使う主な理由は？",
    options: [
      "重い処理を非同期化し、画面応答を保つため",
      "DBを不要にするため",
      "エラーをなくすため"
    ],
    answer: 0,
    explanation: "キューは速度と安定性のための仕組みで、エラー自体は別対策が必要です。",
    analogy: "レジ待ち列を作って店内混雑を抑える。"
  },
  {
    id: "q07",
    focus: "ops",
    category: "Fallback",
    question: "YouTube以外で指標APIが弱いMVP時の正解は？",
    options: [
      "手動入力を公式運用フローに入れる",
      "機能を止める",
      "推測値で自動入力する"
    ],
    answer: 0,
    explanation: "MVPは止めないことが重要。手動補完は正しい戦略です。",
    analogy: "自動釣銭機が壊れても手計算で会計を続ける。"
  },
  {
    id: "q08",
    focus: "security",
    category: "CORS",
    question: "本番CORS設定として良いのは？",
    options: [
      "許可ドメインを本番フロントURLのみに絞る",
      "allow_origins に * を使う",
      "CORS設定を無効にする"
    ],
    answer: 0,
    explanation: "不用意な * は不要な呼び出し面を広げます。",
    analogy: "誰でも入れる裏口を作らない。"
  },
  {
    id: "q09",
    focus: "security",
    category: "Access Control",
    question: "設定変更APIを守る設計で適切なのは？",
    options: [
      "認証済みかつ管理者権限のみ実行可能にする",
      "UIにボタンを隠すだけでAPIは開放する",
      "URLを難しくするだけで守る"
    ],
    answer: 0,
    explanation: "UI制御だけでは不十分。API自体に認可が必要です。",
    analogy: "レジ画面を隠しても、倉庫の鍵が開いていたら意味がない。"
  },
  {
    id: "q10",
    focus: "architecture",
    category: "LLM Output",
    question: "LLM出力をJSONスキーマで固定する目的は？",
    options: [
      "保存前に形式を検証し、壊れたデータを防ぐため",
      "トークン消費を増やすため",
      "翻訳しやすくするため"
    ],
    answer: 0,
    explanation: "形式固定は自動処理の安定性に直結します。",
    analogy: "伝票フォーマットを統一すると集計ミスが減る。"
  },
  {
    id: "q11",
    focus: "ops",
    category: "Nightly Ops",
    question: "夜間バッチの主目的は？",
    options: [
      "最新metricsを更新し、閾値通過動画を漏れなく解析へ流す",
      "画面デザインを更新する",
      "DBを毎晩削除する"
    ],
    answer: 0,
    explanation: "運用の中心はデータ更新と自動投入です。",
    analogy: "閉店後の棚卸しで翌日の欠品を防ぐ。"
  },
  {
    id: "q12",
    focus: "security",
    category: "Dependencies",
    question: "依存ライブラリに脆弱性が出たとき最初にやるべきことは？",
    options: [
      "影響範囲を確認し、更新計画を立てる",
      "無視して本番を続行する",
      "全コードを書き直す"
    ],
    answer: 0,
    explanation: "優先順位を決めた修正計画が必要です。",
    analogy: "設備故障を見つけたら、影響ラインを止めて優先修理する。"
  },
  {
    id: "q13",
    focus: "security",
    category: "Git",
    question: ".env を誤ってコミットした場合の最初の対応は？",
    options: [
      "直ちにキーを失効・再発行し、履歴も対処する",
      "次回から気をつけるだけ",
      "READMEに注意書きを追加するだけ"
    ],
    answer: 0,
    explanation: "漏えい前提で鍵を無効化するのが最優先です。",
    analogy: "鍵を落としたらまず鍵交換する。"
  },
  {
    id: "q14",
    focus: "architecture",
    category: "Media Pipeline",
    question: "ショット検出が失敗した時のMVP正解は？",
    options: [
      "固定秒分割へフォールバックして処理継続",
      "必ず失敗終了する",
      "適当に1ショットだけ保存する"
    ],
    answer: 0,
    explanation: "MVPは完璧より継続運用を優先します。",
    analogy: "自動改札が止まったら有人改札で流れを止めない。"
  },
  {
    id: "q15",
    focus: "security",
    category: "Public Exposure",
    question: "開発中トンネルURLを公開するときに必要な認識は？",
    options: [
      "試験用であり恒久本番ではない。アクセス制御を前提に使う",
      "そのまま本番URLとして固定利用する",
      "誰でも使える方が便利なので制限しない"
    ],
    answer: 0,
    explanation: "試験公開と本番公開は運用ルールが異なります。",
    analogy: "仮設足場をそのまま常設建物にしない。"
  },
  {
    id: "q16",
    focus: "ops",
    category: "A/B Testing",
    question: "A/Bテストで正しい進め方は？",
    options: [
      "1回の比較で変える要素を1つに絞る",
      "一度に全部変える",
      "数字を見ず感覚で決める"
    ],
    answer: 0,
    explanation: "1変数にしないと原因が特定できません。",
    analogy: "料理で塩と火加減を同時に変えるとどちらが効いたか分からない。"
  },
  {
    id: "q17",
    focus: "architecture",
    category: "DB Modeling",
    question: "shots テーブルに start_sec / end_sec を持つ主な価値は？",
    options: [
      "秒単位の編集再現と分析比較が可能になる",
      "動画ファイル容量が減る",
      "APIキー管理が楽になる"
    ],
    answer: 0,
    explanation: "時間情報があるとテンプレ再現精度が上がります。",
    analogy: "地図に緯度経度があると正確に同じ場所へ行ける。"
  },
  {
    id: "q18",
    focus: "security",
    category: "Auth",
    question: "JWT導入時に避けるべき実装は？",
    options: [
      "有効期限なしトークンを永続利用する",
      "短い有効期限と再認証を使う",
      "署名鍵を安全に管理する"
    ],
    answer: 0,
    explanation: "長期固定トークンは漏えい時被害が大きくなります。",
    analogy: "期限なし入館証を配り続けるのは危険。"
  },
  {
    id: "q19",
    focus: "security",
    category: "Principle",
    question: "最小権限の考え方として正しいのは？",
    options: [
      "必要な操作だけ許可し、不要権限は与えない",
      "最初は全権限で始める",
      "人ではなく端末だけで権限管理する"
    ],
    answer: 0,
    explanation: "不要権限は攻撃時の被害範囲を広げます。",
    analogy: "配達員に店の金庫鍵まで渡さない。"
  },
  {
    id: "q20",
    focus: "ops",
    category: "Failure Handling",
    question: "ジョブが failed になった時の正しい初動は？",
    options: [
      "jobs.logs を読んで失敗段階を特定し、再実行する",
      "とりあえずDBを初期化する",
      "ログを消して再投稿する"
    ],
    answer: 0,
    explanation: "ログから段階を切り分けると復旧が速くなります。",
    analogy: "事故現場で先に原因記録を確認する。"
  },
  {
    id: "q21",
    focus: "security",
    category: "Prompt Safety",
    question: "LLM入力にログ全量をそのまま渡すリスクは？",
    options: [
      "機密情報が混ざると外部送信される可能性がある",
      "処理が必ず高速化する",
      "JSON検証が不要になる"
    ],
    answer: 0,
    explanation: "送信前に機密情報マスキングが必要です。",
    analogy: "郵送前に個人情報を黒塗りせず送るのは危険。"
  },
  {
    id: "q22",
    focus: "architecture",
    category: "Purpose Split",
    question: "purpose 分岐を持つ理由として最も適切なのは？",
    options: [
      "同じ動画でも評価軸と台本口調が目的で変わるため",
      "DBテーブル数を減らすため",
      "OCR精度を上げるため"
    ],
    answer: 0,
    explanation: "法華経と健康食品では判断基準が異なります。",
    analogy: "同じ食材でも和食と洋食で味付けが変わる。"
  },
  {
    id: "q23",
    focus: "security",
    category: "Transport",
    question: "公開環境で推奨される通信設定は？",
    options: [
      "HTTPSを使い、平文HTTPを避ける",
      "内部APIキーがあるのでHTTPでよい",
      "ローカルだけHTTPSにする"
    ],
    answer: 0,
    explanation: "通信経路の盗聴・改ざん対策としてTLSは必須です。",
    analogy: "封筒なしのハガキで機密書類を送らない。"
  },
  {
    id: "q24",
    focus: "ops",
    category: "Growth Loop",
    question: "登録者1万人/再生1億に近づく運用として正しいのは？",
    options: [
      "勝ちテンプレをDB蓄積し、週次でA/B検証を回す",
      "毎回ゼロから感覚で作る",
      "当たり動画分析をしない"
    ],
    answer: 0,
    explanation: "再現可能な型を増やすほど成長速度が上がります。",
    analogy: "売れる接客トークをマニュアル化して全員で使う。"
  }
];
