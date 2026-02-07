#!/usr/bin/env python3
"""
Generate remaining chapter HTML files for CODEX MASTERY
"""

import os

# Chapter data
chapters = [
    # Stage 1: Fundamentals (6-10)
    {"id": 6, "title": "コンテキストウィンドウ", "xp": 70, "prev": "トークンとは何か", "next": "APIの基礎知識",
     "terms": [
         {"name": "コンテキストウィンドウ", "english": "Context Window", "icon": "📦",
          "def": "AIモデルが一度に処理できるトークンの最大範囲。この「窓」の中にある情報だけをモデルは参照できる。GPT-4は8K〜128K、GPT-5は更に大きなコンテキストに対応。"},
         {"name": "コンテキスト長", "english": "Context Length", "icon": "📏",
          "def": "現在の会話やプロンプトで使用しているトークン数。長すぎると古い情報が切り捨てられる可能性がある。"},
         {"name": "ロングコンテキスト", "english": "Long Context", "icon": "📜",
          "def": "非常に長いテキスト（書籍全体、大規模コードベースなど）を処理する能力。最新モデルでは100K以上のトークンに対応。"}
     ],
     "quiz": {"q": "コンテキストウィンドウが大きいとどんなメリットがある？",
              "options": ["処理が速くなる", "より多くの情報を参照できる", "コストが下がる", "エラーが減る"],
              "correct": 1}},

    {"id": 7, "title": "APIの基礎知識", "xp": 80, "prev": "コンテキストウィンドウ", "next": "モデルの種類と特徴",
     "terms": [
         {"name": "API", "english": "Application Programming Interface", "icon": "🔌",
          "def": "異なるソフトウェア間でデータをやり取りするための仕組み。Codex APIを使えば、自分のアプリからCodexの機能を呼び出せる。"},
         {"name": "エンドポイント", "english": "Endpoint", "icon": "🎯",
          "def": "APIにリクエストを送る特定のURL。例: /v1/chat/completions"},
         {"name": "リクエスト/レスポンス", "english": "Request/Response", "icon": "↔️",
          "def": "APIとの通信の基本形式。リクエスト（要求）を送り、レスポンス（応答）を受け取る。"},
         {"name": "APIキー", "english": "API Key", "icon": "🔑",
          "def": "APIにアクセスするための認証情報。秘密に保管し、コードにハードコードしてはいけない。"}
     ],
     "quiz": {"q": "APIキーの取り扱いで正しいものは？",
              "options": ["GitHubに公開する", "コードに直接書く", "環境変数で管理する", "SNSで共有する"],
              "correct": 2}},

    {"id": 8, "title": "モデルの種類と特徴", "xp": 80, "prev": "APIの基礎知識", "next": "最初のプロンプトを書く",
     "terms": [
         {"name": "GPT-4", "english": "Generative Pre-trained Transformer 4", "icon": "🧠",
          "def": "OpenAIの主力モデル。高い推論能力と広い知識を持つ。コード生成、分析、創造的タスクに優れる。"},
         {"name": "GPT-5-Codex", "english": "Codex Specialized Model", "icon": "💻",
          "def": "GPT-5をベースにコーディングタスクに特化したモデル。長時間の自律作業、大規模リファクタリングに対応。"},
         {"name": "Temperature", "english": "Temperature Parameter", "icon": "🌡️",
          "def": "出力のランダム性を制御するパラメータ。0に近いほど決定的、1に近いほど創造的な出力になる。コード生成では0〜0.2推奨。"}
     ],
     "quiz": {"q": "コード生成に推奨されるTemperature値は？",
              "options": ["0.8〜1.0", "0.5〜0.7", "0〜0.2", "関係ない"],
              "correct": 2}},

    {"id": 9, "title": "最初のプロンプトを書く", "xp": 100, "prev": "モデルの種類と特徴", "next": "基礎編まとめクイズ",
     "terms": [
         {"name": "インストラクション", "english": "Instruction", "icon": "📝",
          "def": "AIに与える明確な命令。「〜してください」「〜を作成して」など、期待するアクションを指示する部分。"},
         {"name": "コンテキスト", "english": "Context", "icon": "📋",
          "def": "背景情報や前提条件。「Reactプロジェクトで」「初心者向けに」など、状況を説明する部分。"},
         {"name": "制約", "english": "Constraints", "icon": "🚧",
          "def": "出力に対する条件や制限。「TypeScriptで」「100行以内で」「外部ライブラリなしで」など。"}
     ],
     "quiz": {"q": "良いプロンプトに含めるべき要素は？",
              "options": ["曖昧な表現", "具体的な要件と例", "長い前置き", "感情的な訴え"],
              "correct": 1}},

    {"id": 10, "title": "基礎編まとめクイズ", "xp": 150, "prev": "最初のプロンプトを書く", "next": "プロンプトエンジニアリング入門",
     "terms": [],
     "quiz": {"q": "Codexの主な学習データソースは？",
              "options": ["Wikipedia", "ニュース記事", "GitHubのコード", "書籍"],
              "correct": 2}},

    # Stage 2: Intermediate (11-20)
    {"id": 11, "title": "プロンプトエンジニアリング入門", "xp": 100, "prev": "基礎編まとめクイズ", "next": "Few-Shot Learning",
     "terms": [
         {"name": "プロンプトエンジニアリング", "english": "Prompt Engineering", "icon": "🔧",
          "def": "AIから最適な出力を得るためにプロンプトを設計・最適化する技術。2020年代に登場した新しい専門分野。"},
         {"name": "プロンプトテンプレート", "english": "Prompt Template", "icon": "📄",
          "def": "再利用可能なプロンプトのひな形。変数を埋め込んで様々なタスクに応用できる。"}
     ],
     "quiz": {"q": "プロンプトエンジニアリングの目的は？",
              "options": ["AIを作ること", "最適な出力を得るためにプロンプトを設計すること", "プログラミングを学ぶこと", "データを収集すること"],
              "correct": 1}},

    {"id": 12, "title": "Few-Shot Learning", "xp": 120, "prev": "プロンプトエンジニアリング入門", "next": "Zero-Shot Learning",
     "terms": [
         {"name": "Few-Shot Learning", "english": "Few-Shot Learning", "icon": "🎯",
          "def": "プロンプト内にいくつかの例を含めて、AIにパターンを学習させる手法。2-5個の例が効果的。"},
         {"name": "In-Context Learning", "english": "In-Context Learning", "icon": "📚",
          "def": "プロンプト内の例からパターンを学習する能力。事前学習済みモデルの特徴的な能力。"}
     ],
     "quiz": {"q": "Few-Shot Learningで推奨される例の数は？",
              "options": ["0個", "2-5個", "10個以上", "100個以上"],
              "correct": 1}},

    {"id": 13, "title": "Zero-Shot Learning", "xp": 120, "prev": "Few-Shot Learning", "next": "Chain of Thought",
     "terms": [
         {"name": "Zero-Shot", "english": "Zero-Shot Learning", "icon": "🎲",
          "def": "例を与えずに指示だけでタスクを実行させる手法。シンプルなタスクや、モデルが得意なタスクで有効。"},
         {"name": "Zero-Shot CoT", "english": "Zero-Shot Chain of Thought", "icon": "💭",
          "def": "「ステップバイステップで考えて」と付け加えるだけで推論精度が上がるテクニック。"}
     ],
     "quiz": {"q": "Zero-Shotが効果的なのは？",
              "options": ["非常に複雑なタスク", "シンプルで一般的なタスク", "特殊なドメイン知識が必要なタスク", "大量のデータ処理"],
              "correct": 1}},

    {"id": 14, "title": "Chain of Thought", "xp": 130, "prev": "Zero-Shot Learning", "next": "システムプロンプト設計",
     "terms": [
         {"name": "Chain of Thought (CoT)", "english": "Chain of Thought Prompting", "icon": "🔗",
          "def": "AIに思考プロセスを段階的に説明させる手法。複雑な推論タスクで精度が大幅に向上する。"},
         {"name": "ステップバイステップ推論", "english": "Step-by-Step Reasoning", "icon": "📊",
          "def": "問題を小さなステップに分解して順番に解決する思考法。AIに明示的に指示することで精度向上。"}
     ],
     "quiz": {"q": "Chain of Thoughtが特に効果的なのは？",
              "options": ["単純な質問", "複雑な推論タスク", "データ入力", "ファイル操作"],
              "correct": 1}},

    {"id": 15, "title": "システムプロンプト設計", "xp": 140, "prev": "Chain of Thought", "next": "コード生成のベストプラクティス",
     "terms": [
         {"name": "システムプロンプト", "english": "System Prompt", "icon": "⚙️",
          "def": "AIの振る舞いや役割を定義する特別なプロンプト。ユーザーメッセージより先に処理され、全体の動作に影響。"},
         {"name": "ロール設定", "english": "Role Setting", "icon": "🎭",
          "def": "AIに特定の役割（シニアエンジニア、コードレビュアーなど）を与えること。一貫した応答スタイルを実現。"}
     ],
     "quiz": {"q": "システムプロンプトの主な役割は？",
              "options": ["コードを実行する", "AIの振る舞いを定義する", "ファイルを保存する", "ネットワーク接続する"],
              "correct": 1}},

    {"id": 16, "title": "コード生成のベストプラクティス", "xp": 150, "prev": "システムプロンプト設計", "next": "デバッグ支援テクニック",
     "terms": [
         {"name": "具体性", "english": "Specificity", "icon": "🎯",
          "def": "プロンプトの明確さ。関数名、引数、戻り値、エラーハンドリングなどを具体的に指定する。"},
         {"name": "制約の明示", "english": "Explicit Constraints", "icon": "📋",
          "def": "言語、フレームワーク、スタイルガイド、パフォーマンス要件などを明確に伝える。"}
     ],
     "quiz": {"q": "コード生成プロンプトで最も重要なのは？",
              "options": ["長さ", "具体的な仕様の記述", "感謝の言葉", "絵文字"],
              "correct": 1}},

    {"id": 17, "title": "デバッグ支援テクニック", "xp": 140, "prev": "コード生成のベストプラクティス", "next": "リファクタリング依頼術",
     "terms": [
         {"name": "エラーコンテキスト", "english": "Error Context", "icon": "🐛",
          "def": "エラーメッセージ、スタックトレース、関連コードなど、デバッグに必要な情報セット。"},
         {"name": "再現手順", "english": "Reproduction Steps", "icon": "🔄",
          "def": "バグを再現するための手順。これを伝えることでAIの診断精度が向上する。"}
     ],
     "quiz": {"q": "効果的なデバッグ依頼に含めるべき情報は？",
              "options": ["感想だけ", "エラーメッセージと関連コード", "プロジェクト全体", "個人情報"],
              "correct": 1}},

    {"id": 18, "title": "リファクタリング依頼術", "xp": 130, "prev": "デバッグ支援テクニック", "next": "テスト生成の極意",
     "terms": [
         {"name": "リファクタリング", "english": "Refactoring", "icon": "🔧",
          "def": "外部から見た動作を変えずに、コードの内部構造を改善すること。可読性、保守性、パフォーマンスの向上が目的。"},
         {"name": "コードスメル", "english": "Code Smell", "icon": "👃",
          "def": "コードに問題がある可能性を示す兆候。重複コード、長すぎる関数、不適切な命名など。"}
     ],
     "quiz": {"q": "リファクタリングの目的として正しいのは？",
              "options": ["新機能を追加する", "バグを修正する", "内部構造を改善する", "ドキュメントを書く"],
              "correct": 2}},

    {"id": 19, "title": "テスト生成の極意", "xp": 140, "prev": "リファクタリング依頼術", "next": "中級編まとめクイズ",
     "terms": [
         {"name": "ユニットテスト", "english": "Unit Test", "icon": "🧪",
          "def": "個々の関数やメソッドを独立してテストすること。最小単位のテスト。"},
         {"name": "テストカバレッジ", "english": "Test Coverage", "icon": "📊",
          "def": "コードのうちテストでカバーされている割合。高いほど品質が担保される。"},
         {"name": "エッジケース", "english": "Edge Case", "icon": "⚠️",
          "def": "境界値や例外的な入力。空配列、null、最大値などをテストで確認すべき。"}
     ],
     "quiz": {"q": "テスト生成で特に重要なのは？",
              "options": ["正常系のみテスト", "エッジケースも含めてテスト", "テストは不要", "手動テストのみ"],
              "correct": 1}},

    {"id": 20, "title": "中級編まとめクイズ", "xp": 200, "prev": "テスト生成の極意", "next": "高度なプロンプトパターン",
     "terms": [],
     "quiz": {"q": "Few-Shot Learningとは？",
              "options": ["例なしで学習", "少数の例から学習", "大量データで学習", "強化学習"],
              "correct": 1}},

    # Stage 3: Advanced (21-30)
    {"id": 21, "title": "高度なプロンプトパターン", "xp": 180, "prev": "中級編まとめクイズ", "next": "メタプロンプティング",
     "terms": [
         {"name": "プロンプトチェーン", "english": "Prompt Chaining", "icon": "🔗",
          "def": "複数のプロンプトを連鎖させて複雑なタスクを実行する手法。前のステップの出力を次の入力に使う。"},
         {"name": "Tree of Thoughts", "english": "Tree of Thoughts", "icon": "🌳",
          "def": "複数の思考パスを探索し、最良の解決策を見つける高度な推論手法。"}
     ],
     "quiz": {"q": "プロンプトチェーンの利点は？",
              "options": ["シンプルになる", "複雑なタスクを段階的に処理できる", "コストが下がる", "速度が上がる"],
              "correct": 1}},

    {"id": 22, "title": "メタプロンプティング", "xp": 200, "prev": "高度なプロンプトパターン", "next": "自己修正プロンプト",
     "terms": [
         {"name": "メタプロンプト", "english": "Meta-Prompt", "icon": "🔮",
          "def": "プロンプト自体を生成させるプロンプト。AIにプロンプトを最適化させる高度なテクニック。"},
         {"name": "自己改善", "english": "Self-Improvement", "icon": "📈",
          "def": "AIが自身の出力を評価し、より良い結果を生成するよう調整する能力。"}
     ],
     "quiz": {"q": "メタプロンプトとは？",
              "options": ["メタデータを扱う", "プロンプトを生成するプロンプト", "メタバースで使う", "特に意味はない"],
              "correct": 1}},

    {"id": 23, "title": "自己修正プロンプト", "xp": 190, "prev": "メタプロンプティング", "next": "マルチターン会話設計",
     "terms": [
         {"name": "自己修正", "english": "Self-Correction", "icon": "🔄",
          "def": "AIに自身の出力をレビューさせ、エラーを見つけて修正させる手法。"},
         {"name": "批判的レビュー", "english": "Critical Review", "icon": "🔍",
          "def": "生成したコードを別の観点から評価させること。「このコードの問題点を指摘して」など。"}
     ],
     "quiz": {"q": "自己修正プロンプトの効果は？",
              "options": ["速度向上", "出力品質の向上", "コスト削減", "セキュリティ向上"],
              "correct": 1}},

    {"id": 24, "title": "マルチターン会話設計", "xp": 200, "prev": "自己修正プロンプト", "next": "コンテキスト管理術",
     "terms": [
         {"name": "マルチターン", "english": "Multi-Turn Conversation", "icon": "💬",
          "def": "複数回のやり取りを通じてタスクを進める会話形式。コンテキストが蓄積される。"},
         {"name": "会話履歴", "english": "Conversation History", "icon": "📜",
          "def": "過去のやり取りの記録。これを適切に管理しないとコンテキストが混乱する。"}
     ],
     "quiz": {"q": "マルチターン会話で注意すべきは？",
              "options": ["1回で終わらせる", "コンテキストの管理", "必ず英語を使う", "絵文字を多用する"],
              "correct": 1}},

    {"id": 25, "title": "コンテキスト管理術", "xp": 210, "prev": "マルチターン会話設計", "next": "エラーハンドリング戦略",
     "terms": [
         {"name": "コンテキスト圧縮", "english": "Context Compression", "icon": "🗜️",
          "def": "長い会話履歴を要約して、重要な情報だけを保持するテクニック。トークン節約に有効。"},
         {"name": "選択的コンテキスト", "english": "Selective Context", "icon": "✂️",
          "def": "タスクに必要な情報だけを選んで含める手法。無関係な情報は除外する。"}
     ],
     "quiz": {"q": "コンテキスト管理が重要な理由は？",
              "options": ["見た目のため", "トークン制限とコスト", "特に理由はない", "セキュリティのため"],
              "correct": 1}},

    {"id": 26, "title": "エラーハンドリング戦略", "xp": 180, "prev": "コンテキスト管理術", "next": "パフォーマンス最適化",
     "terms": [
         {"name": "フォールバック", "english": "Fallback Strategy", "icon": "🔙",
          "def": "AIの出力が期待通りでない場合の代替処理。再試行、別のプロンプト、人間への委譲など。"},
         {"name": "バリデーション", "english": "Output Validation", "icon": "✅",
          "def": "AIの出力を検証するプロセス。形式チェック、構文チェック、意味的検証など。"}
     ],
     "quiz": {"q": "AI出力のエラーハンドリングで重要なのは？",
              "options": ["エラーを無視する", "出力を検証しフォールバックを用意する", "常に手動で確認", "エラーは起きない"],
              "correct": 1}},

    {"id": 27, "title": "パフォーマンス最適化", "xp": 200, "prev": "エラーハンドリング戦略", "next": "セキュリティ考慮事項",
     "terms": [
         {"name": "レイテンシ", "english": "Latency", "icon": "⏱️",
          "def": "リクエストを送ってから応答を受け取るまでの時間。トークン数、モデルサイズ、サーバー負荷に依存。"},
         {"name": "スループット", "english": "Throughput", "icon": "📊",
          "def": "単位時間あたりに処理できるリクエスト数。並列処理で向上可能。"}
     ],
     "quiz": {"q": "レイテンシを下げる方法は？",
              "options": ["プロンプトを長くする", "プロンプトを簡潔にする", "画像を追加する", "履歴を増やす"],
              "correct": 1}},

    {"id": 28, "title": "セキュリティ考慮事項", "xp": 220, "prev": "パフォーマンス最適化", "next": "レート制限と対策",
     "terms": [
         {"name": "プロンプトインジェクション", "english": "Prompt Injection", "icon": "💉",
          "def": "悪意あるユーザーがプロンプトを操作してAIの動作を乗っ取る攻撃。入力のサニタイズが必須。"},
         {"name": "機密情報漏洩", "english": "Data Leakage", "icon": "🔓",
          "def": "プロンプトやAIの応答に機密情報が含まれてしまうリスク。APIキー、パスワードなど。"}
     ],
     "quiz": {"q": "プロンプトインジェクション対策として正しいのは？",
              "options": ["ユーザー入力をそのまま使う", "入力をサニタイズする", "対策は不要", "AIに任せる"],
              "correct": 1}},

    {"id": 29, "title": "レート制限と対策", "xp": 180, "prev": "セキュリティ考慮事項", "next": "上級編まとめクイズ",
     "terms": [
         {"name": "レート制限", "english": "Rate Limiting", "icon": "🚦",
          "def": "一定時間内のAPIリクエスト数の制限。過負荷防止と公平性確保のため。"},
         {"name": "指数バックオフ", "english": "Exponential Backoff", "icon": "⏳",
          "def": "リトライ間隔を指数的に増やす戦略。1秒→2秒→4秒→8秒のように待機時間を増やす。"}
     ],
     "quiz": {"q": "レート制限に達した時の対策は？",
              "options": ["諦める", "指数バックオフでリトライ", "別のアカウントを使う", "サーバーを攻撃する"],
              "correct": 1}},

    {"id": 30, "title": "上級編まとめクイズ", "xp": 250, "prev": "レート制限と対策", "next": "プロジェクト統合入門",
     "terms": [],
     "quiz": {"q": "プロンプトインジェクションとは？",
              "options": ["コードを注入する攻撃", "悪意ある入力でAIを操作する攻撃", "ウイルス", "ハードウェア攻撃"],
              "correct": 1}},

    # Stage 4: Real-world (31-40)
    {"id": 31, "title": "プロジェクト統合入門", "xp": 200, "prev": "上級編まとめクイズ", "next": "IDE連携テクニック",
     "terms": [
         {"name": "SDK", "english": "Software Development Kit", "icon": "📦",
          "def": "特定のプラットフォームやサービスと連携するためのツールキット。OpenAI SDKなど。"},
         {"name": "クライアントライブラリ", "english": "Client Library", "icon": "📚",
          "def": "APIを簡単に呼び出すためのプログラミング言語別のライブラリ。"}
     ],
     "quiz": {"q": "SDKを使う利点は？",
              "options": ["コストが下がる", "API呼び出しが簡単になる", "速度が上がる", "セキュリティが向上する"],
              "correct": 1}},

    {"id": 32, "title": "IDE連携テクニック", "xp": 180, "prev": "プロジェクト統合入門", "next": "Git操作の自動化",
     "terms": [
         {"name": "IDE", "english": "Integrated Development Environment", "icon": "💻",
          "def": "統合開発環境。VS Code、IntelliJ、Cursorなど。コード編集、デバッグ、ビルドを統合。"},
         {"name": "拡張機能", "english": "Extension/Plugin", "icon": "🔌",
          "def": "IDEに機能を追加するアドオン。GitHub Copilot、Cursor AIなどがCodex連携を提供。"}
     ],
     "quiz": {"q": "IDE連携の主なメリットは？",
              "options": ["オフラインで使える", "コード補完がリアルタイムで得られる", "無料になる", "インターネット不要"],
              "correct": 1}},

    {"id": 33, "title": "Git操作の自動化", "xp": 190, "prev": "IDE連携テクニック", "next": "CI/CDパイプライン統合",
     "terms": [
         {"name": "コミットメッセージ生成", "english": "Commit Message Generation", "icon": "📝",
          "def": "変更内容からAIがコミットメッセージを自動生成する機能。"},
         {"name": "PR説明生成", "english": "PR Description Generation", "icon": "📋",
          "def": "プルリクエストの説明文をAIが変更差分から自動生成する機能。"}
     ],
     "quiz": {"q": "AIによるコミットメッセージ生成の利点は？",
              "options": ["完璧な文法", "一貫したフォーマットと時間節約", "Git不要", "履歴が不要"],
              "correct": 1}},

    {"id": 34, "title": "CI/CDパイプライン統合", "xp": 220, "prev": "Git操作の自動化", "next": "チーム開発での活用",
     "terms": [
         {"name": "CI/CD", "english": "Continuous Integration/Continuous Deployment", "icon": "🔄",
          "def": "継続的インテグレーション/継続的デプロイメント。コード変更を自動でテスト・デプロイする仕組み。"},
         {"name": "自動コードレビュー", "english": "Automated Code Review", "icon": "🔍",
          "def": "AIがプルリクエストを自動でレビューし、問題点を指摘する機能。"}
     ],
     "quiz": {"q": "CI/CDでのAI活用例は？",
              "options": ["手動デプロイ", "自動コードレビュー", "サーバー監視", "ログ削除"],
              "correct": 1}},

    {"id": 35, "title": "チーム開発での活用", "xp": 200, "prev": "CI/CDパイプライン統合", "next": "コードレビュー自動化",
     "terms": [
         {"name": "コーディング規約", "english": "Coding Standards", "icon": "📏",
          "def": "チーム内でのコードスタイルのルール。AIにこれを教えることで一貫したコード生成が可能。"},
         {"name": "ナレッジベース", "english": "Knowledge Base", "icon": "🧠",
          "def": "チームの知識を集約したデータベース。AIのコンテキストとして活用可能。"}
     ],
     "quiz": {"q": "チームでAIを活用する際に重要なのは？",
              "options": ["個人で秘密にする", "コーディング規約を共有する", "各自バラバラに使う", "使わないようにする"],
              "correct": 1}},

    {"id": 36, "title": "コードレビュー自動化", "xp": 210, "prev": "チーム開発での活用", "next": "ドキュメント生成",
     "terms": [
         {"name": "静的解析", "english": "Static Analysis", "icon": "🔬",
          "def": "コードを実行せずに分析する手法。構文エラー、潜在バグ、セキュリティ問題を検出。"},
         {"name": "レビューコメント", "english": "Review Comments", "icon": "💬",
          "def": "AIが生成するコードへのフィードバック。改善提案、ベストプラクティスの推奨など。"}
     ],
     "quiz": {"q": "自動コードレビューで検出できるものは？",
              "options": ["ビジネスロジックの正しさ", "セキュリティ問題やコードスメル", "ユーザーの意図", "市場のトレンド"],
              "correct": 1}},

    {"id": 37, "title": "ドキュメント生成", "xp": 180, "prev": "コードレビュー自動化", "next": "レガシーコード対応",
     "terms": [
         {"name": "Docstring", "english": "Documentation String", "icon": "📄",
          "def": "コード内に埋め込まれた説明文。関数やクラスの目的、引数、戻り値を記述。"},
         {"name": "API文書", "english": "API Documentation", "icon": "📚",
          "def": "APIの使い方を説明するドキュメント。エンドポイント、パラメータ、レスポンス形式など。"}
     ],
     "quiz": {"q": "AIでドキュメントを生成するメリットは？",
              "options": ["ドキュメントが不要になる", "時間短縮と一貫性確保", "コードが速くなる", "バグが減る"],
              "correct": 1}},

    {"id": 38, "title": "レガシーコード対応", "xp": 220, "prev": "ドキュメント生成", "next": "マイグレーション支援",
     "terms": [
         {"name": "レガシーコード", "english": "Legacy Code", "icon": "🏚️",
          "def": "古い技術やスタイルで書かれた既存コード。保守が困難だがビジネスで重要な場合が多い。"},
         {"name": "リバースエンジニアリング", "english": "Reverse Engineering", "icon": "🔍",
          "def": "既存のコードから設計意図や仕様を読み解く作業。AIが得意とする分野。"}
     ],
     "quiz": {"q": "レガシーコードにAIを活用するメリットは？",
              "options": ["自動で削除できる", "コード理解とドキュメント化が効率的", "実行速度が上がる", "セキュリティが向上する"],
              "correct": 1}},

    {"id": 39, "title": "マイグレーション支援", "xp": 230, "prev": "レガシーコード対応", "next": "実践編まとめクイズ",
     "terms": [
         {"name": "マイグレーション", "english": "Migration", "icon": "🚚",
          "def": "システムやコードを新しい環境・技術に移行すること。言語変換、フレームワーク移行など。"},
         {"name": "互換性チェック", "english": "Compatibility Check", "icon": "✅",
          "def": "移行後のコードが正しく動作するか検証するプロセス。"}
     ],
     "quiz": {"q": "AIがマイグレーションで支援できるのは？",
              "options": ["サーバー移行", "コード変換と互換性チェック", "ハードウェア更新", "ネットワーク設定"],
              "correct": 1}},

    {"id": 40, "title": "実践編まとめクイズ", "xp": 280, "prev": "マイグレーション支援", "next": "エージェントアーキテクチャ",
     "terms": [],
     "quiz": {"q": "CI/CDとは何の略？",
              "options": ["Code Integration/Code Deployment", "Continuous Integration/Continuous Deployment", "Cloud Integration/Cloud Deployment", "Custom Integration/Custom Deployment"],
              "correct": 1}},

    # Stage 5: Mastery (41-50)
    {"id": 41, "title": "エージェントアーキテクチャ", "xp": 250, "prev": "実践編まとめクイズ", "next": "自律型コーディング",
     "terms": [
         {"name": "AIエージェント", "english": "AI Agent", "icon": "🤖",
          "def": "自律的にタスクを計画・実行するAIシステム。人間の介入なしに複数ステップの作業をこなす。"},
         {"name": "ツール使用", "english": "Tool Use", "icon": "🔧",
          "def": "AIが外部ツール（ファイル操作、API呼び出し、コマンド実行など）を使用する能力。"}
     ],
     "quiz": {"q": "AIエージェントの特徴は？",
              "options": ["単一タスクのみ", "自律的に複数タスクを実行", "人間の指示を毎回必要", "オフラインのみ動作"],
              "correct": 1}},

    {"id": 42, "title": "自律型コーディング", "xp": 280, "prev": "エージェントアーキテクチャ", "next": "マルチエージェント設計",
     "terms": [
         {"name": "自律型開発", "english": "Autonomous Development", "icon": "🚀",
          "def": "AIが要件から実装、テスト、デプロイまでを自律的に行う開発スタイル。"},
         {"name": "人間監督", "english": "Human-in-the-Loop", "icon": "👁️",
          "def": "AIの自律性を維持しつつ、重要な決定点で人間がレビュー・承認する仕組み。"}
     ],
     "quiz": {"q": "自律型コーディングで人間の役割は？",
              "options": ["不要", "すべてを手動で行う", "監督とレビュー", "AIの電源を入れるだけ"],
              "correct": 2}},

    {"id": 43, "title": "マルチエージェント設計", "xp": 300, "prev": "自律型コーディング", "next": "カスタムスキル開発",
     "terms": [
         {"name": "マルチエージェント", "english": "Multi-Agent System", "icon": "👥",
          "def": "複数のAIエージェントが協調して作業するシステム。役割分担で複雑なタスクに対応。"},
         {"name": "オーケストレーション", "english": "Orchestration", "icon": "🎼",
          "def": "複数のエージェントやサービスを統括し、協調動作させる仕組み。"}
     ],
     "quiz": {"q": "マルチエージェントのメリットは？",
              "options": ["コストが下がる", "専門化と協調で複雑なタスクに対応", "シンプルになる", "速度が上がる"],
              "correct": 1}},

    {"id": 44, "title": "カスタムスキル開発", "xp": 280, "prev": "マルチエージェント設計", "next": "ワークフロー自動化",
     "terms": [
         {"name": "スキル", "english": "Skill", "icon": "⚡",
          "def": "特定のタスクを実行するための再利用可能な命令セット。Codexでは$skill-nameで呼び出し可能。"},
         {"name": "プラグイン", "english": "Plugin", "icon": "🔌",
          "def": "AIの機能を拡張するための追加モジュール。外部サービスとの連携などを実現。"}
     ],
     "quiz": {"q": "カスタムスキルの利点は？",
              "options": ["毎回ゼロから指示する", "再利用可能で一貫した結果", "AIが勝手に作る", "特にメリットはない"],
              "correct": 1}},

    {"id": 45, "title": "ワークフロー自動化", "xp": 290, "prev": "カスタムスキル開発", "next": "大規模プロジェクト戦略",
     "terms": [
         {"name": "ワークフロー", "english": "Workflow", "icon": "🔄",
          "def": "一連の作業手順をまとめたもの。コード生成→レビュー→テスト→デプロイなど。"},
         {"name": "トリガー", "english": "Trigger", "icon": "⚡",
          "def": "ワークフローを開始するきっかけ。コミット、PR作成、スケジュールなど。"}
     ],
     "quiz": {"q": "ワークフロー自動化の例は？",
              "options": ["手動でコミット", "PR作成時に自動でテスト実行", "毎回手動でデプロイ", "ログを手動で確認"],
              "correct": 1}},

    {"id": 46, "title": "大規模プロジェクト戦略", "xp": 300, "prev": "ワークフロー自動化", "next": "AI駆動開発の未来",
     "terms": [
         {"name": "モノレポ", "english": "Monorepo", "icon": "📦",
          "def": "複数のプロジェクトを1つのリポジトリで管理する戦略。大規模組織で採用。"},
         {"name": "コードオーナーシップ", "english": "Code Ownership", "icon": "👤",
          "def": "特定のコード領域の責任者を明確にする仕組み。AIが自動でレビュアーを推奨可能。"}
     ],
     "quiz": {"q": "大規模プロジェクトでのAI活用のポイントは？",
              "options": ["全員が同じプロンプトを使う", "コンテキストを適切に管理する", "AIに全て任せる", "ドキュメントを省略する"],
              "correct": 1}},

    {"id": 47, "title": "AI駆動開発の未来", "xp": 250, "prev": "大規模プロジェクト戦略", "next": "ケーススタディ分析",
     "terms": [
         {"name": "AGI", "english": "Artificial General Intelligence", "icon": "🌟",
          "def": "汎用人工知能。特定タスクだけでなく、人間のように様々なタスクをこなせるAI。"},
         {"name": "Human-AI協調", "english": "Human-AI Collaboration", "icon": "🤝",
          "def": "人間とAIがそれぞれの強みを活かして協力する開発スタイル。"}
     ],
     "quiz": {"q": "AI駆動開発で人間に残る重要な役割は？",
              "options": ["単純なコーディング", "創造性と判断力、倫理的決定", "データ入力", "特になし"],
              "correct": 1}},

    {"id": 48, "title": "ケーススタディ分析", "xp": 280, "prev": "AI駆動開発の未来", "next": "マスタープロジェクト",
     "terms": [
         {"name": "ベストプラクティス", "english": "Best Practices", "icon": "⭐",
          "def": "実践で証明された最も効果的な方法。成功事例から学ぶ。"},
         {"name": "アンチパターン", "english": "Anti-Pattern", "icon": "⚠️",
          "def": "よくある間違いや非効率なパターン。避けるべき事例から学ぶ。"}
     ],
     "quiz": {"q": "ケーススタディから学ぶべきは？",
              "options": ["成功事例のみ", "失敗事例のみ", "成功と失敗の両方", "事例は不要"],
              "correct": 2}},

    {"id": 49, "title": "マスタープロジェクト", "xp": 400, "prev": "ケーススタディ分析", "next": "CODEX MASTER認定試験",
     "terms": [
         {"name": "統合プロジェクト", "english": "Integration Project", "icon": "🏗️",
          "def": "学んだスキルを全て統合して実際のプロジェクトに適用する実践的な課題。"},
         {"name": "ポートフォリオ", "english": "Portfolio", "icon": "💼",
          "def": "自分のスキルを示すための作品集。マスタープロジェクトはその一部になる。"}
     ],
     "quiz": {"q": "マスタープロジェクトの目的は？",
              "options": ["理論の暗記", "学んだスキルの統合と実践", "テストに合格する", "証明書を得る"],
              "correct": 1}},

    {"id": 50, "title": "CODEX MASTER認定試験", "xp": 500, "prev": "マスタープロジェクト", "next": None,
     "terms": [
         {"name": "マスター認定", "english": "Master Certification", "icon": "👑",
          "def": "全てのチャプターを完了し、総合的なスキルを証明した証。"},
         {"name": "継続学習", "english": "Continuous Learning", "icon": "📚",
          "def": "AI技術は急速に進化するため、常に最新情報をキャッチアップし続けることが重要。"}
     ],
     "quiz": {"q": "CODEX MASTERになった後、重要なのは？",
              "options": ["学習を止める", "継続的に学び続ける", "他人に教えない", "古い知識を守る"],
              "correct": 1}},
]

# HTML Template
def generate_chapter_html(chapter):
    terms_html = ""
    for term in chapter.get("terms", []):
        terms_html += f'''
            <div class="term-card">
                <div class="term-header">
                    <div class="term-icon">{term["icon"]}</div>
                    <div>
                        <div class="term-name">{term["name"]}</div>
                        <div class="term-english">{term["english"]}</div>
                    </div>
                </div>
                <div class="term-definition">{term["def"]}</div>
            </div>
'''

    quiz = chapter.get("quiz", {})
    options_html = ""
    for i, opt in enumerate(quiz.get("options", [])):
        is_correct = "true" if i == quiz.get("correct") else "false"
        options_html += f'''
                    <div class="quiz-option" onclick="selectOption('quiz1', {i}, {is_correct}, '')">
                        <span class="option-letter">{chr(65+i)}</span>
                        <span>{opt}</span>
                    </div>
'''

    next_link = f'chapter{chapter["id"]+1}.html' if chapter["next"] else '../index.html'
    next_text = chapter["next"] if chapter["next"] else 'ホームに戻る'
    prev_link = f'chapter{chapter["id"]-1}.html'

    html = f'''<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>Chapter {chapter["id"]}: {chapter["title"]} | CODEX MASTERY</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+JP:wght@400;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="shared.css">
</head>
<body>
    <header class="chapter-header">
        <a href="../index.html" class="back-btn">←</a>
        <div class="header-info">
            <div class="header-chapter">CHAPTER {chapter["id"]}</div>
            <div class="header-title">{chapter["title"]}</div>
        </div>
    </header>

    <div class="progress-section">
        <div class="progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
        <div class="progress-text"><span>進捗</span><span>0%</span></div>
    </div>

    <main class="chapter-content">
        <section class="content-section">
            <span class="section-badge">📖 CHAPTER {chapter["id"]}</span>
            <h2 class="section-title">{chapter["title"]}</h2>

            <p class="text-block">
                このチャプターでは、<strong>{chapter["title"]}</strong>について深く学んでいきます。
                実践的な知識とスキルを身につけ、Codexマスターへの道を進みましょう。
            </p>
        </section>

        {"<section class='content-section'><span class='section-badge'>📚 TERMINOLOGY</span>" + terms_html + "</section>" if terms_html else ""}

        <section class="content-section">
            <div class="quiz-section" id="quiz1">
                <div class="quiz-title">🎯 KNOWLEDGE CHECK</div>
                <p class="quiz-question">{quiz.get("q", "このチャプターの内容を確認しましょう")}</p>

                <div class="quiz-options">
{options_html}
                </div>

                <div id="quiz1-result" class="quiz-result"></div>
                <div id="quiz1-explanation" class="quiz-explanation">
                    <strong>解説:</strong> 正解は選択肢{chr(65 + quiz.get("correct", 0))}です。このチャプターの内容をしっかり復習しましょう。
                </div>
            </div>
        </section>

        <section class="content-section">
            <div class="output-exercise">
                <div class="output-title">✍️ OUTPUT: アウトプット練習</div>
                <p class="output-prompt">
                    このチャプターで学んだ「{chapter["title"]}」について、自分の言葉で説明してみましょう。
                </p>
                <textarea id="output1-input" class="output-textarea" placeholder="ここに入力..."></textarea>
                <button class="output-submit" onclick="submitOutput('output1')">回答を保存</button>
                <div id="output1-feedback" class="output-feedback"></div>
            </div>
        </section>

        <section class="content-section">
            <div class="memory-card">
                <div class="memory-icon">🔑</div>
                <div class="memory-title">KEY TAKEAWAYS</div>
                <div class="memory-content" style="text-align: left; font-size: 1rem;">
                    <ul style="list-style: none;">
                        <li>✅ {chapter["title"]}の基本を理解した</li>
                        <li>✅ 重要な用語を学んだ</li>
                        <li>✅ 実践への応用方法を知った</li>
                    </ul>
                </div>
            </div>
        </section>

        <div class="chapter-nav">
            <a href="{prev_link}" class="nav-btn">
                <div class="nav-btn-label">前のチャプター</div>
                <div class="nav-btn-text">← {chapter["prev"]}</div>
            </a>
            <a href="{next_link}" class="nav-btn next" onclick="completeChapter({chapter['xp']})">
                <div class="nav-btn-label">次のチャプター</div>
                <div class="nav-btn-text">{next_text} →</div>
            </a>
        </div>
    </main>

    <div class="completion-modal" id="completionModal">
        <div class="completion-content">
            <div class="completion-icon">🎉</div>
            <div class="completion-title">CHAPTER COMPLETE!</div>
            <p style="color: var(--text-secondary);">Chapter {chapter["id"]}をクリアしました！</p>
            <div class="completion-xp" id="completionXP">+{chapter["xp"]} XP</div>
            <button class="completion-btn" onclick="location.href='{next_link}'">次へ進む</button>
        </div>
    </div>

    <script src="shared.js"></script>
</body>
</html>
'''
    return html

# Generate all chapters
output_dir = "/home/user/AI-/docs/chapters"
os.makedirs(output_dir, exist_ok=True)

for chapter in chapters:
    html = generate_chapter_html(chapter)
    filepath = os.path.join(output_dir, f"chapter{chapter['id']}.html")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated: chapter{chapter['id']}.html")

print(f"\nGenerated {len(chapters)} chapters!")
