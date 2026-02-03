/**
 * Git Quest - Gitを楽しく学ぶゲーミフィケーション学習アプリ
 * 中学生向け・5時間でGitマスターを目指す
 */

// ===========================================
// グローバル変数とゲームステート
// ===========================================

let gameState = {
    player: {
        level: 1,
        xp: 0,
        coins: 0,
        streak: 0,
        lastPlayDate: null
    },
    progress: {
        currentStage: 1,
        currentLesson: 0,
        completedStages: [],
        stageStars: {},
        unlockedStages: [1]
    },
    achievements: [],
    settings: {
        soundEnabled: true,
        darkMode: false,
        difficulty: 'normal'
    },
    simulator: {
        initialized: false,
        files: [],
        stagedFiles: [],
        commits: [],
        currentBranch: 'main',
        branches: ['main']
    }
};

// XPレベルテーブル
const XP_LEVELS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000, 5000];

// ===========================================
// 学習コンテンツデータ
// ===========================================

const STAGES = {
    1: {
        title: "Gitって何?",
        description: "バージョン管理の基本を学ぼう",
        lessons: [
            {
                title: "バージョン管理ってなに?",
                content: `
                    <h2 class="lesson-title">📚 バージョン管理ってなに?</h2>
                    <p class="lesson-text">
                        ゲームでセーブデータを作るよね？
                        <br><br>
                        「ボス戦の前にセーブしておこう...」<br>
                        「あ、ミスった！セーブデータからやり直そう！」
                        <br><br>
                        <strong>バージョン管理</strong>は、プログラムやファイルの「セーブデータ」を作る仕組みなんだ！
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box">📄 レポート v1</div>
                            <div class="diagram-arrow">→</div>
                            <div class="diagram-box">📄 レポート v2</div>
                            <div class="diagram-arrow">→</div>
                            <div class="diagram-box highlight">📄 レポート v3</div>
                        </div>
                        <p style="margin-top: 16px; color: var(--text-secondary)">いつでも前のバージョンに戻れる！</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>ポイント</strong><br>
                            バージョン管理を使えば、間違えても安心！いつでもやり直せるよ。
                        </div>
                    </div>
                `
            },
            {
                title: "Gitって何ができるの?",
                content: `
                    <h2 class="lesson-title">🐙 Gitって何ができるの?</h2>
                    <p class="lesson-text">
                        <strong>Git（ギット）</strong>は、世界中のプログラマーが使っている<br>
                        超人気のバージョン管理ツールだよ！
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 20px">Gitでできること</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; text-align: left;">
                            <div class="diagram-box">
                                <div style="font-size: 32px; margin-bottom: 8px">💾</div>
                                <strong>変更を保存</strong><br>
                                <small>いつでも前に戻れる</small>
                            </div>
                            <div class="diagram-box">
                                <div style="font-size: 32px; margin-bottom: 8px">👥</div>
                                <strong>チームで共有</strong><br>
                                <small>みんなで同時に開発</small>
                            </div>
                            <div class="diagram-box">
                                <div style="font-size: 32px; margin-bottom: 8px">🌿</div>
                                <strong>ブランチ</strong><br>
                                <small>新機能を安全に試せる</small>
                            </div>
                            <div class="diagram-box">
                                <div style="font-size: 32px; margin-bottom: 8px">🔍</div>
                                <strong>変更履歴</strong><br>
                                <small>誰がいつ何を変えたか</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎮</span>
                        <div>
                            <strong>豆知識</strong><br>
                            マインクラフトやフォートナイトも、Gitを使って開発されているよ！
                        </div>
                    </div>
                `
            },
            {
                title: "Gitの3つのエリア",
                content: `
                    <h2 class="lesson-title">📦 Gitの3つのエリア</h2>
                    <p class="lesson-text">
                        Gitには大事な<strong>3つのエリア</strong>があるよ。<br>
                        これを理解すれば、Gitの半分はマスターしたようなもの！
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram" style="flex-direction: column; gap: 24px;">
                            <div class="diagram-box" style="width: 100%; max-width: 300px; background: #E8F5E9;">
                                <div style="font-size: 24px">📁 ワーキングディレクトリ</div>
                                <small>実際に作業するフォルダ</small>
                            </div>
                            <div class="diagram-arrow" style="transform: rotate(90deg)">→</div>
                            <div class="diagram-box" style="width: 100%; max-width: 300px; background: #FFF3E0;">
                                <div style="font-size: 24px">📋 ステージングエリア</div>
                                <small>コミット前の準備エリア</small>
                            </div>
                            <div class="diagram-arrow" style="transform: rotate(90deg)">→</div>
                            <div class="diagram-box highlight" style="width: 100%; max-width: 300px;">
                                <div style="font-size: 24px">💾 リポジトリ</div>
                                <small>変更履歴が保存される場所</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🍱</span>
                        <div>
                            <strong>イメージしよう</strong><br>
                            お弁当を作るとき: 材料（作業）→ 詰める（ステージング）→ 完成（コミット）
                        </div>
                    </div>
                `
            },
            {
                title: "基本コマンドを覚えよう",
                content: `
                    <h2 class="lesson-title">⌨️ 基本コマンドを覚えよう</h2>
                    <p class="lesson-text">
                        Gitはコマンド（命令）を入力して使うよ。<br>
                        最初に覚える4つのコマンドを紹介するね！
                    </p>
                    <div class="lesson-visual">
                        <div style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
                            <div class="diagram-box">
                                <code style="color: var(--primary); font-size: 18px;">git init</code>
                                <p style="margin-top: 8px">リポジトリを作成する（最初に1回だけ）</p>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary); font-size: 18px;">git add ファイル名</code>
                                <p style="margin-top: 8px">ステージングエリアに追加する</p>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary); font-size: 18px;">git commit -m "メッセージ"</code>
                                <p style="margin-top: 8px">変更を保存（コミット）する</p>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary); font-size: 18px;">git status</code>
                                <p style="margin-top: 8px">今の状態を確認する</p>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎯</span>
                        <div>
                            <strong>次のステップ</strong><br>
                            この4つを覚えたら、シミュレーターで実際に試してみよう！
                        </div>
                    </div>
                `
            },
            {
                type: "quiz",
                title: "理解度チェック！"
            }
        ],
        quiz: [
            {
                question: "Gitは何をするためのツール？",
                options: [
                    "ゲームを作るため",
                    "ファイルのバージョン管理をするため",
                    "絵を描くため",
                    "音楽を作るため"
                ],
                correct: 1,
                explanation: "Gitはファイルの変更履歴を管理するためのツールです。いつでも前のバージョンに戻れます。"
            },
            {
                question: "git init コマンドは何をする？",
                options: [
                    "ファイルを削除する",
                    "新しいリポジトリを作成する",
                    "変更をコミットする",
                    "ブランチを切り替える"
                ],
                correct: 1,
                explanation: "git init はプロジェクトフォルダに新しいGitリポジトリを作成します。最初に1回だけ実行します。"
            },
            {
                question: "ステージングエリアの役割は？",
                options: [
                    "ファイルを削除する場所",
                    "コミットする前の準備エリア",
                    "ゲームをプレイする場所",
                    "インターネットに接続する場所"
                ],
                correct: 1,
                explanation: "ステージングエリアは、コミットする変更を選んで準備しておく場所です。"
            },
            {
                question: "今のGitの状態を確認するコマンドは？",
                options: [
                    "git check",
                    "git status",
                    "git show",
                    "git look"
                ],
                correct: 1,
                explanation: "git status は現在の状態（変更されたファイル、ステージングされたファイルなど）を表示します。"
            },
            {
                question: "Gitの3つのエリアとして正しいのは？",
                options: [
                    "入力、出力、保存",
                    "ワーキングディレクトリ、ステージングエリア、リポジトリ",
                    "フォルダ、ファイル、コード",
                    "開始、中間、終了"
                ],
                correct: 1,
                explanation: "Gitは「ワーキングディレクトリ」「ステージングエリア」「リポジトリ」の3つのエリアで管理します。"
            }
        ]
    },
    2: {
        title: "リポジトリを作ろう",
        description: "最初のリポジトリを作成しよう",
        lessons: [
            {
                title: "リポジトリとは?",
                content: `
                    <h2 class="lesson-title">📦 リポジトリとは?</h2>
                    <p class="lesson-text">
                        <strong>リポジトリ（Repository）</strong>は、<br>
                        プロジェクトの全ての変更履歴が保存される「倉庫」のようなものだよ。
                        <br><br>
                        略して「リポ」や「レポ」と呼ばれることもあるよ！
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box highlight" style="padding: 30px;">
                                <div style="font-size: 48px; margin-bottom: 12px">📦</div>
                                <strong>リポジトリ</strong>
                                <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                                    <span style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📄 ファイル</span>
                                    <span style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📜 履歴</span>
                                    <span style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">🌿 ブランチ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>ポイント</strong><br>
                            1つのプロジェクトに1つのリポジトリを作るのが基本だよ。
                        </div>
                    </div>
                `
            },
            {
                title: "git init を使おう",
                content: `
                    <h2 class="lesson-title">🎬 git init を使おう</h2>
                    <p class="lesson-text">
                        新しいプロジェクトを始めるとき、最初に<br>
                        <code>git init</code>コマンドを実行するよ。
                        <br><br>
                        これでフォルダがGitリポジトリになる！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> cd my-project</code>
                            <br><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git init</code>
                            <br>
                            <code style="color: #CCCCCC;">Initialized empty Git repository in /my-project/.git/</code>
                        </div>
                        <p style="margin-top: 16px; color: var(--text-secondary)">.gitフォルダが作られて、リポジトリが完成！</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>注意</strong><br>
                            git init は1つのプロジェクトで1回だけ！何度も実行しなくてOK。
                        </div>
                    </div>
                `
            },
            {
                title: ".gitフォルダの秘密",
                content: `
                    <h2 class="lesson-title">🔍 .gitフォルダの秘密</h2>
                    <p class="lesson-text">
                        git init を実行すると、隠しフォルダ<strong>.git</strong>が作られるよ。
                        <br><br>
                        ここにGitの全てのデータが保存されているんだ！
                    </p>
                    <div class="lesson-visual">
                        <div style="text-align: left; font-family: monospace; background: var(--bg-card); padding: 20px; border-radius: 12px;">
                            <div>📂 my-project/</div>
                            <div style="padding-left: 24px;">📂 <span style="color: var(--primary)">.git/</span> ← Gitのデータ</div>
                            <div style="padding-left: 48px; color: var(--text-secondary);">📄 config</div>
                            <div style="padding-left: 48px; color: var(--text-secondary);">📄 HEAD</div>
                            <div style="padding-left: 48px; color: var(--text-secondary);">📂 objects/</div>
                            <div style="padding-left: 24px;">📄 index.html</div>
                            <div style="padding-left: 24px;">📄 style.css</div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🚫</span>
                        <div>
                            <strong>大事</strong><br>
                            .gitフォルダは絶対に直接編集しないでね！壊れちゃうかも。
                        </div>
                    </div>
                `
            },
            {
                title: "git status で確認しよう",
                content: `
                    <h2 class="lesson-title">🔎 git status で確認しよう</h2>
                    <p class="lesson-text">
                        <code>git status</code>は「今どうなってる？」を教えてくれるコマンド。
                        <br><br>
                        困ったらまずこれを実行しよう！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git status</code>
                            <br><br>
                            <code style="color: #CCCCCC;">On branch main</code><br>
                            <code style="color: #CCCCCC;">No commits yet</code><br>
                            <code style="color: #CCCCCC;">Untracked files:</code><br>
                            <code style="color: #FF6B6B;">  index.html</code><br>
                            <code style="color: #FF6B6B;">  style.css</code>
                        </div>
                        <p style="margin-top: 16px; color: var(--text-secondary)">赤いファイルは「まだGitに追加されていない」という意味</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎯</span>
                        <div>
                            <strong>コツ</strong><br>
                            git status は何度実行してもOK！何も壊れないから安心して使ってね。
                        </div>
                    </div>
                `
            },
            {
                type: "simulator",
                title: "実践！リポジトリを作ろう",
                mission: "git init を使ってリポジトリを作成しよう！",
                expectedCommands: ["git init", "git status"]
            }
        ],
        quiz: [
            {
                question: "リポジトリとは何？",
                options: [
                    "プログラミング言語の一種",
                    "プロジェクトの変更履歴が保存される場所",
                    "インターネットのサービス",
                    "パソコンの部品"
                ],
                correct: 1,
                explanation: "リポジトリは、プロジェクトの全てのファイルと変更履歴が保存される場所です。"
            },
            {
                question: ".gitフォルダには何が入っている？",
                options: [
                    "ゲームのセーブデータ",
                    "Gitの全てのデータと履歴",
                    "インターネットの設定",
                    "写真と動画"
                ],
                correct: 1,
                explanation: ".gitフォルダにはGitが管理する全てのデータ（履歴、設定、ブランチ情報など）が保存されています。"
            },
            {
                question: "git status コマンドは何をする？",
                options: [
                    "ファイルを削除する",
                    "現在の状態を表示する",
                    "新しいブランチを作る",
                    "変更をコミットする"
                ],
                correct: 1,
                explanation: "git status は現在のリポジトリの状態（変更されたファイル、ステージングされたファイルなど）を表示します。"
            }
        ]
    },
    3: {
        title: "変更を保存しよう",
        description: "add と commit を使いこなそう",
        lessons: [
            {
                title: "git add の役割",
                content: `
                    <h2 class="lesson-title">➕ git add の役割</h2>
                    <p class="lesson-text">
                        <code>git add</code>は、ファイルを<strong>ステージングエリア</strong>に追加するコマンド。
                        <br><br>
                        「このファイルを次のコミットに含めてね！」という意味だよ。
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box" style="background: #E8F5E9;">
                                📄 index.html<br>
                                <small>（変更した）</small>
                            </div>
                            <div class="diagram-arrow">
                                <div>git add</div>
                                →
                            </div>
                            <div class="diagram-box highlight">
                                📋 ステージング<br>
                                <small>（コミット準備OK）</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git add index.html</code>
                            <span style="color: #666;"> # 1つのファイル</span>
                            <br><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git add .</code>
                            <span style="color: #666;"> # 全てのファイル</span>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>ポイント</strong><br>
                            <code>git add .</code>（ドット）を使うと、変更した全てのファイルを一度に追加できるよ！
                        </div>
                    </div>
                `
            },
            {
                title: "git commit で保存",
                content: `
                    <h2 class="lesson-title">💾 git commit で保存</h2>
                    <p class="lesson-text">
                        <code>git commit</code>は、ステージングしたファイルを<strong>リポジトリに保存</strong>するコマンド。
                        <br><br>
                        これが「セーブポイント」を作る瞬間！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git commit -m "最初のコミット"</code>
                            <br><br>
                            <code style="color: #CCCCCC;">[main (root-commit) a1b2c3d] 最初のコミット</code><br>
                            <code style="color: #CCCCCC;"> 2 files changed, 50 insertions(+)</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div class="visual-diagram">
                            <div class="diagram-box">
                                📋 ステージング
                            </div>
                            <div class="diagram-arrow">
                                <div>commit</div>
                                →
                            </div>
                            <div class="diagram-box highlight">
                                💾 リポジトリ<br>
                                <small>a1b2c3d</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">📝</span>
                        <div>
                            <strong>メッセージのコツ</strong><br>
                            「何を変更したか」がわかるメッセージを書こう！<br>
                            例: "ログイン機能を追加", "バグを修正"
                        </div>
                    </div>
                `
            },
            {
                title: "コミットメッセージの書き方",
                content: `
                    <h2 class="lesson-title">✍️ コミットメッセージの書き方</h2>
                    <p class="lesson-text">
                        良いコミットメッセージは、未来の自分やチームメイトへの<strong>手紙</strong>のようなもの。
                        <br><br>
                        「何をしたか」がすぐわかるように書こう！
                    </p>
                    <div class="lesson-visual">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="diagram-box" style="background: #FFEBEE; border-color: #E57373;">
                                <div style="color: #C62828; font-weight: bold; margin-bottom: 8px;">❌ 悪い例</div>
                                <code>"修正"</code><br>
                                <code>"変更した"</code><br>
                                <code>"あああ"</code>
                            </div>
                            <div class="diagram-box" style="background: #E8F5E9; border-color: #81C784;">
                                <div style="color: #2E7D32; font-weight: bold; margin-bottom: 8px;">✅ 良い例</div>
                                <code>"ヘッダーの色を変更"</code><br>
                                <code>"ログイン機能を追加"</code><br>
                                <code>"READMEを更新"</code>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎯</span>
                        <div>
                            <strong>コツ</strong><br>
                            「〇〇を追加」「〇〇を修正」「〇〇を削除」のように動詞から始めると◎
                        </div>
                    </div>
                `
            },
            {
                title: "git log で履歴を見よう",
                content: `
                    <h2 class="lesson-title">📜 git log で履歴を見よう</h2>
                    <p class="lesson-text">
                        <code>git log</code>は、今までのコミット履歴を見るコマンド。
                        <br><br>
                        誰が、いつ、何を変更したかがわかるよ！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log</code>
                            <br><br>
                            <code style="color: #FFD700;">commit a1b2c3d4e5f6...</code><br>
                            <code style="color: #CCCCCC;">Author: あなた</code><br>
                            <code style="color: #CCCCCC;">Date: 2024-01-15 10:30</code><br>
                            <code style="color: white;">    ログイン機能を追加</code>
                            <br><br>
                            <code style="color: #FFD700;">commit 9z8y7x6w5v4u...</code><br>
                            <code style="color: #CCCCCC;">Author: あなた</code><br>
                            <code style="color: #CCCCCC;">Date: 2024-01-14 15:00</code><br>
                            <code style="color: white;">    最初のコミット</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>ヒント</strong><br>
                            <code>git log --oneline</code>を使うと、1行で簡潔に表示されるよ！
                        </div>
                    </div>
                `
            },
            {
                type: "simulator",
                title: "実践！コミットしよう",
                mission: "ファイルを追加して、コミットしよう！",
                expectedCommands: ["git add", "git commit"]
            }
        ],
        quiz: [
            {
                question: "git add の役割は？",
                options: [
                    "ファイルを削除する",
                    "ファイルをステージングエリアに追加する",
                    "新しいブランチを作る",
                    "リモートにプッシュする"
                ],
                correct: 1,
                explanation: "git add はファイルをステージングエリアに追加し、次のコミットに含める準備をします。"
            },
            {
                question: "全てのファイルを一度にステージングするコマンドは？",
                options: [
                    "git add all",
                    "git add .",
                    "git add *files",
                    "git add everything"
                ],
                correct: 1,
                explanation: "git add . を使うと、現在のディレクトリの全ての変更をステージングできます。"
            },
            {
                question: "良いコミットメッセージはどれ？",
                options: [
                    "修正した",
                    "あああ",
                    "ログインボタンの色を青に変更",
                    "test"
                ],
                correct: 2,
                explanation: "良いコミットメッセージは、何を変更したかが具体的にわかるものです。"
            },
            {
                question: "コミット履歴を見るコマンドは？",
                options: [
                    "git history",
                    "git show",
                    "git log",
                    "git list"
                ],
                correct: 2,
                explanation: "git log でコミットの履歴（誰が、いつ、何を変更したか）を見ることができます。"
            }
        ]
    },
    4: {
        title: "ブランチで分岐",
        description: "並行して開発しよう",
        lessons: [
            {
                title: "ブランチとは?",
                content: `
                    <h2 class="lesson-title">🌿 ブランチとは?</h2>
                    <p class="lesson-text">
                        <strong>ブランチ（Branch）</strong>は「枝」という意味。
                        <br><br>
                        メインの開発から「枝分かれ」して、<br>
                        新しい機能を安全に試せる仕組みだよ！
                    </p>
                    <div class="lesson-visual">
                        <div style="position: relative; height: 200px;">
                            <div style="position: absolute; left: 50%; transform: translateX(-50%);">
                                <div style="display: flex; flex-direction: column; align-items: center;">
                                    <div class="diagram-box" style="margin-bottom: 20px;">main</div>
                                    <div style="width: 4px; height: 40px; background: var(--primary);"></div>
                                    <div style="display: flex; gap: 60px;">
                                        <div style="display: flex; flex-direction: column; align-items: center;">
                                            <div style="width: 40px; height: 4px; background: var(--accent);"></div>
                                            <div style="width: 4px; height: 40px; background: var(--accent);"></div>
                                            <div class="diagram-box" style="background: var(--accent-light);">feature</div>
                                        </div>
                                        <div style="width: 4px; height: 60px; background: var(--primary);"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎮</span>
                        <div>
                            <strong>イメージ</strong><br>
                            RPGの「セーブデータを分けて、別ルートを試す」ような感じ！
                        </div>
                    </div>
                `
            },
            {
                title: "ブランチを作ろう",
                content: `
                    <h2 class="lesson-title">🌱 ブランチを作ろう</h2>
                    <p class="lesson-text">
                        新しいブランチを作るには<code>git branch</code>コマンドを使うよ。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 新しいブランチを作成</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git branch feature-login</code>
                            <br><br>
                            <code style="color: #666;"># ブランチ一覧を表示</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git branch</code>
                            <br>
                            <code style="color: #27C93F;">* main</code><br>
                            <code style="color: #CCCCCC;">  feature-login</code>
                        </div>
                        <p style="margin-top: 16px; color: var(--text-secondary)">* マークが今いるブランチを示すよ</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">📝</span>
                        <div>
                            <strong>命名のコツ</strong><br>
                            機能を追加するなら <code>feature-〇〇</code><br>
                            バグを直すなら <code>fix-〇〇</code> と名付けよう！
                        </div>
                    </div>
                `
            },
            {
                title: "ブランチを切り替えよう",
                content: `
                    <h2 class="lesson-title">🔀 ブランチを切り替えよう</h2>
                    <p class="lesson-text">
                        ブランチ間を移動するには<code>git checkout</code>または<code>git switch</code>を使うよ。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># ブランチを切り替え</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git checkout feature-login</code>
                            <br>
                            <code style="color: #CCCCCC;">Switched to branch 'feature-login'</code>
                            <br><br>
                            <code style="color: #666;"># 作成と切り替えを同時に</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git checkout -b new-branch</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>ショートカット</strong><br>
                            <code>git checkout -b ブランチ名</code>で「作成＋切り替え」が一度にできる！
                        </div>
                    </div>
                `
            },
            {
                title: "マージで統合しよう",
                content: `
                    <h2 class="lesson-title">🔗 マージで統合しよう</h2>
                    <p class="lesson-text">
                        ブランチでの作業が終わったら、<code>git merge</code>でメインに統合しよう！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># まずmainブランチに移動</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git checkout main</code>
                            <br><br>
                            <code style="color: #666;"># feature-loginをmainにマージ</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git merge feature-login</code>
                            <br>
                            <code style="color: #CCCCCC;">Merge made by the 'recursive' strategy.</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div class="visual-diagram">
                            <div class="diagram-box">feature</div>
                            <div class="diagram-arrow">
                                <div>merge</div>
                                →
                            </div>
                            <div class="diagram-box highlight">main</div>
                        </div>
                        <p style="margin-top: 16px">featureの変更がmainに統合される！</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>注意</strong><br>
                            マージは「取り込む側」のブランチで実行するよ！
                        </div>
                    </div>
                `
            },
            {
                type: "simulator",
                title: "実践！ブランチを使おう",
                mission: "新しいブランチを作って、切り替えてみよう！",
                expectedCommands: ["git branch", "git checkout"]
            }
        ],
        quiz: [
            {
                question: "ブランチの役割は？",
                options: [
                    "ファイルを削除する",
                    "メインから分岐して並行開発する",
                    "インターネットに接続する",
                    "パソコンを再起動する"
                ],
                correct: 1,
                explanation: "ブランチはメインの開発から分岐して、新機能を安全に開発できる仕組みです。"
            },
            {
                question: "新しいブランチを作るコマンドは？",
                options: [
                    "git new branch",
                    "git create branch",
                    "git branch ブランチ名",
                    "git make branch"
                ],
                correct: 2,
                explanation: "git branch ブランチ名 で新しいブランチを作成できます。"
            },
            {
                question: "ブランチを切り替えるコマンドは？",
                options: [
                    "git change",
                    "git checkout",
                    "git move",
                    "git goto"
                ],
                correct: 1,
                explanation: "git checkout ブランチ名 でブランチを切り替えられます。git switch も使えます。"
            },
            {
                question: "git merge はどこで実行する？",
                options: [
                    "マージ元のブランチで",
                    "マージ先（取り込む側）のブランチで",
                    "どこでもいい",
                    "新しいブランチを作ってから"
                ],
                correct: 1,
                explanation: "マージは取り込む側のブランチで実行します。mainにfeatureをマージするなら、mainで実行。"
            }
        ]
    },
    5: {
        title: "みんなで開発",
        description: "GitHubでチーム開発",
        lessons: [
            {
                title: "GitHubとは?",
                content: `
                    <h2 class="lesson-title">🐙 GitHubとは?</h2>
                    <p class="lesson-text">
                        <strong>GitHub（ギットハブ）</strong>は、Gitリポジトリをインターネット上で管理できるサービス。
                        <br><br>
                        世界中の人とコードを共有したり、チームで開発したりできるよ！
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box">
                                💻<br>
                                あなたのPC<br>
                                <small>ローカル</small>
                            </div>
                            <div class="diagram-arrow">←→</div>
                            <div class="diagram-box highlight">
                                ☁️<br>
                                GitHub<br>
                                <small>リモート</small>
                            </div>
                            <div class="diagram-arrow">←→</div>
                            <div class="diagram-box">
                                💻<br>
                                チームのPC<br>
                                <small>ローカル</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🌟</span>
                        <div>
                            <strong>豆知識</strong><br>
                            GitHubには1億人以上のユーザーがいて、世界最大のコード共有サイトだよ！
                        </div>
                    </div>
                `
            },
            {
                title: "リモートリポジトリ",
                content: `
                    <h2 class="lesson-title">☁️ リモートリポジトリ</h2>
                    <p class="lesson-text">
                        自分のPCにあるリポジトリを<strong>ローカル</strong>、<br>
                        GitHub上のリポジトリを<strong>リモート</strong>と呼ぶよ。
                    </p>
                    <div class="lesson-visual">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="diagram-box">
                                <div style="font-size: 32px; margin-bottom: 8px">💻</div>
                                <strong>ローカル</strong><br>
                                <small>自分のPCにある<br>リポジトリ</small>
                            </div>
                            <div class="diagram-box highlight">
                                <div style="font-size: 32px; margin-bottom: 8px">☁️</div>
                                <strong>リモート</strong><br>
                                <small>GitHub上の<br>リポジトリ</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># リモートを追加</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git remote add origin https://github.com/...</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">📝</span>
                        <div>
                            <strong>origin って?</strong><br>
                            リモートリポジトリの名前。慣習的に「origin」と名付けることが多いよ。
                        </div>
                    </div>
                `
            },
            {
                title: "git push でアップロード",
                content: `
                    <h2 class="lesson-title">⬆️ git push でアップロード</h2>
                    <p class="lesson-text">
                        ローカルの変更をリモートに送るには<code>git push</code>を使うよ。
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box">
                                💻 ローカル
                            </div>
                            <div class="diagram-arrow">
                                <div>push</div>
                                →
                            </div>
                            <div class="diagram-box highlight">
                                ☁️ リモート
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git push origin main</code>
                            <br>
                            <code style="color: #CCCCCC;">Counting objects: 5, done.</code><br>
                            <code style="color: #CCCCCC;">Writing objects: 100%</code><br>
                            <code style="color: #27C93F;">Branch 'main' set up to track 'origin/main'.</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>構文</strong><br>
                            <code>git push リモート名 ブランチ名</code>
                        </div>
                    </div>
                `
            },
            {
                title: "git pull でダウンロード",
                content: `
                    <h2 class="lesson-title">⬇️ git pull でダウンロード</h2>
                    <p class="lesson-text">
                        リモートの最新の変更をローカルに取り込むには<code>git pull</code>を使うよ。
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram">
                            <div class="diagram-box">
                                💻 ローカル
                            </div>
                            <div class="diagram-arrow">
                                <div>pull</div>
                                ←
                            </div>
                            <div class="diagram-box highlight">
                                ☁️ リモート
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git pull origin main</code>
                            <br>
                            <code style="color: #CCCCCC;">remote: Counting objects: 3, done.</code><br>
                            <code style="color: #CCCCCC;">Updating a1b2c3d..x9y8z7w</code><br>
                            <code style="color: #CCCCCC;">Fast-forward</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>大事</strong><br>
                            チーム開発では、作業を始める前に必ず<code>git pull</code>しよう！<br>
                            最新の状態で作業することが大切。
                        </div>
                    </div>
                `
            },
            {
                title: "git clone でコピー",
                content: `
                    <h2 class="lesson-title">📥 git clone でコピー</h2>
                    <p class="lesson-text">
                        GitHubにあるリポジトリを自分のPCにコピーするには<code>git clone</code>を使うよ。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git clone https://github.com/user/repo.git</code>
                            <br>
                            <code style="color: #CCCCCC;">Cloning into 'repo'...</code><br>
                            <code style="color: #CCCCCC;">remote: Counting objects: 100, done.</code><br>
                            <code style="color: #27C93F;">done.</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div class="visual-diagram">
                            <div class="diagram-box highlight">
                                ☁️ GitHub
                            </div>
                            <div class="diagram-arrow">
                                <div>clone</div>
                                →
                            </div>
                            <div class="diagram-box">
                                💻 あなたのPC
                            </div>
                        </div>
                        <p style="margin-top: 16px">リポジトリ全体がコピーされる！</p>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎉</span>
                        <div>
                            <strong>おめでとう！</strong><br>
                            これでGitの基本はマスターだ！あとは実践あるのみ！
                        </div>
                    </div>
                `
            }
        ],
        quiz: [
            {
                question: "GitHubとは何？",
                options: [
                    "プログラミング言語",
                    "Gitリポジトリをオンラインで管理できるサービス",
                    "パソコンの種類",
                    "ゲームの名前"
                ],
                correct: 1,
                explanation: "GitHubはGitリポジトリをインターネット上で管理・共有できるサービスです。"
            },
            {
                question: "ローカルの変更をリモートに送るコマンドは？",
                options: [
                    "git send",
                    "git upload",
                    "git push",
                    "git transfer"
                ],
                correct: 2,
                explanation: "git push でローカルの変更をリモートリポジトリにアップロードできます。"
            },
            {
                question: "リモートの変更をローカルに取り込むコマンドは？",
                options: [
                    "git pull",
                    "git download",
                    "git get",
                    "git receive"
                ],
                correct: 0,
                explanation: "git pull でリモートの最新の変更をローカルに取り込めます。"
            },
            {
                question: "GitHubのリポジトリを自分のPCにコピーするコマンドは？",
                options: [
                    "git copy",
                    "git download",
                    "git clone",
                    "git duplicate"
                ],
                correct: 2,
                explanation: "git clone でGitHub上のリポジトリ全体を自分のPCにコピーできます。"
            },
            {
                question: "チーム開発で作業を始める前にすべきことは？",
                options: [
                    "git push",
                    "git pull",
                    "git init",
                    "git clone"
                ],
                correct: 1,
                explanation: "作業を始める前にgit pullして、リモートの最新の変更を取り込むことが大切です。"
            }
        ]
    }
};

// Git用語集
const GLOSSARY = [
    { term: "Git", reading: "ギット", category: "基本", definition: "ファイルの変更履歴を記録・追跡するためのバージョン管理システム。" },
    { term: "Repository", reading: "リポジトリ", category: "基本", definition: "プロジェクトのファイルと変更履歴が保存される場所。「リポ」と略すことも。" },
    { term: "Commit", reading: "コミット", category: "基本", definition: "変更を記録すること。ゲームのセーブポイントのようなもの。" },
    { term: "Branch", reading: "ブランチ", category: "中級", definition: "開発の流れを分岐させる機能。「枝」という意味。" },
    { term: "Merge", reading: "マージ", category: "中級", definition: "ブランチを統合すること。" },
    { term: "Clone", reading: "クローン", category: "基本", definition: "リポジトリをコピーすること。" },
    { term: "Push", reading: "プッシュ", category: "基本", definition: "ローカルの変更をリモートに送ること。" },
    { term: "Pull", reading: "プル", category: "基本", definition: "リモートの変更をローカルに取り込むこと。" },
    { term: "Staging Area", reading: "ステージングエリア", category: "基本", definition: "コミットする前に変更を準備する場所。" },
    { term: "Working Directory", reading: "ワーキングディレクトリ", category: "基本", definition: "実際に作業するフォルダ。" },
    { term: "Remote", reading: "リモート", category: "基本", definition: "ネットワーク上にあるリポジトリ（例：GitHub）。" },
    { term: "Local", reading: "ローカル", category: "基本", definition: "自分のコンピュータ上にあるリポジトリ。" },
    { term: "GitHub", reading: "ギットハブ", category: "サービス", definition: "Gitリポジトリをオンラインでホスティングするサービス。" },
    { term: "Checkout", reading: "チェックアウト", category: "中級", definition: "ブランチを切り替えること。" },
    { term: "HEAD", reading: "ヘッド", category: "上級", definition: "現在のブランチの最新のコミットを指すポインタ。" },
    { term: "Conflict", reading: "コンフリクト", category: "上級", definition: "マージ時に同じ部分が異なる変更をされていて、自動統合できない状態。" },
    { term: "Fetch", reading: "フェッチ", category: "中級", definition: "リモートの情報を取得する（マージはしない）。" },
    { term: "Diff", reading: "ディフ", category: "基本", definition: "変更の差分を表示すること。" },
    { term: "Log", reading: "ログ", category: "基本", definition: "コミット履歴を表示すること。" },
    { term: "Status", reading: "ステータス", category: "基本", definition: "リポジトリの現在の状態を表示すること。" }
];

// 実績データ
const ACHIEVEMENTS = [
    { id: "first_lesson", name: "はじめの一歩", desc: "最初のレッスンをクリア", icon: "🎯", unlocked: false },
    { id: "first_commit", name: "初コミット", desc: "シミュレーターで最初のコミット", icon: "💾", unlocked: false },
    { id: "quiz_master", name: "クイズマスター", desc: "クイズで全問正解", icon: "🧠", unlocked: false },
    { id: "stage_1_clear", name: "Git入門者", desc: "ステージ1をクリア", icon: "🌱", unlocked: false },
    { id: "stage_2_clear", name: "リポジトリマスター", desc: "ステージ2をクリア", icon: "📦", unlocked: false },
    { id: "stage_3_clear", name: "コミット職人", desc: "ステージ3をクリア", icon: "💾", unlocked: false },
    { id: "stage_4_clear", name: "ブランチ使い", desc: "ステージ4をクリア", icon: "🌿", unlocked: false },
    { id: "stage_5_clear", name: "チームプレイヤー", desc: "ステージ5をクリア", icon: "👥", unlocked: false },
    { id: "streak_3", name: "3日連続", desc: "3日連続で学習", icon: "🔥", unlocked: false },
    { id: "streak_7", name: "1週間連続", desc: "7日連続で学習", icon: "⚡", unlocked: false },
    { id: "level_5", name: "レベル5到達", desc: "レベル5に到達", icon: "⭐", unlocked: false },
    { id: "git_master", name: "Gitマスター", desc: "全ステージをクリア", icon: "👑", unlocked: false }
];

// ===========================================
// 初期化
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
    initializeApp();
});

function initializeApp() {
    // ローディング画面を表示
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        updateUI();
        checkStreak();
    }, 2000);
}

// ===========================================
// ローカルストレージ
// ===========================================

function saveGameState() {
    localStorage.setItem('gitquest_save', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('gitquest_save');
    if (saved) {
        gameState = { ...gameState, ...JSON.parse(saved) };
    }
    // 設定を適用
    if (gameState.settings.darkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }
    document.getElementById('sound-toggle').checked = gameState.settings.soundEnabled;
    document.getElementById('difficulty-select').value = gameState.settings.difficulty;
}

// ===========================================
// UI更新
// ===========================================

function updateUI() {
    // プレイヤーステータス更新
    document.getElementById('player-level').textContent = gameState.player.level;
    document.getElementById('player-xp').textContent = gameState.player.xp;
    document.getElementById('player-coins').textContent = gameState.player.coins;

    // XPバー更新
    const currentLevelXP = XP_LEVELS[gameState.player.level - 1] || 0;
    const nextLevelXP = XP_LEVELS[gameState.player.level] || XP_LEVELS[XP_LEVELS.length - 1];
    const progress = ((gameState.player.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    document.getElementById('xp-progress').style.width = `${Math.min(progress, 100)}%`;

    // ストリーク更新
    document.getElementById('streak-count').textContent = gameState.player.streak;

    // ステージマップ更新
    updateStageMap();

    // 実績更新
    updateAchievements();

    // 用語集更新
    renderGlossary();
}

function updateStageMap() {
    for (let i = 1; i <= 5; i++) {
        const node = document.querySelector(`.stage-node[data-stage="${i}"]`);
        if (node) {
            if (gameState.progress.unlockedStages.includes(i)) {
                node.classList.remove('locked');
                node.classList.add('unlocked');
                const lockOverlay = node.querySelector('.lock-overlay');
                if (lockOverlay) lockOverlay.remove();
            }

            // スター表示
            const stars = gameState.progress.stageStars[i] || 0;
            const starsContainer = document.getElementById(`stage-${i}-stars`);
            if (starsContainer) {
                const starSpans = starsContainer.querySelectorAll('span');
                starSpans.forEach((span, index) => {
                    span.textContent = index < stars ? '★' : '☆';
                    if (index < stars) span.classList.add('filled');
                });
            }
        }
    }

    // ボスステージ
    const bossNode = document.querySelector('.stage-node.boss');
    if (bossNode && gameState.progress.completedStages.length >= 5) {
        bossNode.classList.remove('locked');
        bossNode.classList.add('unlocked');
        const lockOverlay = bossNode.querySelector('.lock-overlay');
        if (lockOverlay) lockOverlay.remove();
    }
}

function updateAchievements() {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';

    let unlockedCount = 0;

    ACHIEVEMENTS.forEach(achievement => {
        const isUnlocked = gameState.achievements.includes(achievement.id);
        if (isUnlocked) unlockedCount++;

        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <h4>${achievement.name}</h4>
                <p>${achievement.desc}</p>
            </div>
        `;
        grid.appendChild(card);
    });

    document.getElementById('total-achievements').textContent = unlockedCount;
    document.getElementById('total-badges').textContent = unlockedCount;
}

function renderGlossary() {
    const list = document.getElementById('glossary-list');
    list.innerHTML = '';

    GLOSSARY.forEach(item => {
        const div = document.createElement('div');
        div.className = 'glossary-item';
        div.innerHTML = `
            <div class="glossary-term">
                ${item.term}
                <span class="term-badge">${item.category}</span>
            </div>
            <div class="glossary-reading">${item.reading}</div>
            <div class="glossary-definition">${item.definition}</div>
        `;
        div.onclick = () => div.classList.toggle('expanded');
        list.appendChild(div);
    });
}

function filterGlossary() {
    const searchTerm = document.getElementById('glossary-search').value.toLowerCase();
    const items = document.querySelectorAll('.glossary-item');

    items.forEach(item => {
        const term = item.querySelector('.glossary-term').textContent.toLowerCase();
        const reading = item.querySelector('.glossary-reading').textContent.toLowerCase();
        if (term.includes(searchTerm) || reading.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===========================================
// ナビゲーション
// ===========================================

function toggleMenu() {
    document.getElementById('side-menu').classList.toggle('active');
}

function showSection(sectionId) {
    // 全セクションを非表示
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // 指定セクションを表示
    document.getElementById(`${sectionId}-section`).classList.add('active');

    // メニューを閉じる
    document.getElementById('side-menu').classList.remove('active');
}

// ===========================================
// ステージ・レッスン管理
// ===========================================

let currentStageData = null;
let currentLessonIndex = 0;
let currentQuizIndex = 0;
let quizScore = 0;

function startStage(stageNum) {
    if (stageNum === 'boss') {
        if (gameState.progress.completedStages.length < 5) {
            showNotification('🔒', 'ロック中', '全ステージをクリアすると解放されます');
            return;
        }
        // ボスステージ（最終試験）を開始
        startBossStage();
        return;
    }

    if (!gameState.progress.unlockedStages.includes(stageNum)) {
        showNotification('🔒', 'ロック中', '前のステージをクリアしてください');
        return;
    }

    currentStageData = STAGES[stageNum];
    currentLessonIndex = 0;
    gameState.progress.currentStage = stageNum;
    saveGameState();

    renderLesson();
    showSection('lesson');
}

function continueLastStage() {
    startStage(gameState.progress.currentStage);
}

function renderLesson() {
    const lesson = currentStageData.lessons[currentLessonIndex];
    const content = document.getElementById('lesson-content');
    const total = currentStageData.lessons.length;

    document.getElementById('lesson-current').textContent = currentLessonIndex + 1;
    document.getElementById('lesson-total').textContent = total;

    // 前へボタンの状態
    document.getElementById('prev-btn').disabled = currentLessonIndex === 0;

    if (lesson.type === 'quiz') {
        // クイズセクションへ
        currentQuizIndex = 0;
        quizScore = 0;
        startQuiz();
        return;
    }

    if (lesson.type === 'simulator') {
        // シミュレーターセクションへ
        document.getElementById('mission-text').textContent = lesson.mission;
        initSimulator();
        showSection('simulator');
        return;
    }

    content.innerHTML = lesson.content;

    // 次へボタンのテキスト更新
    const nextBtn = document.getElementById('next-btn');
    if (currentLessonIndex === total - 1) {
        nextBtn.textContent = 'クイズへ ▶';
    } else {
        nextBtn.textContent = '次へ ▶';
    }
}

function nextLesson() {
    if (currentLessonIndex < currentStageData.lessons.length - 1) {
        currentLessonIndex++;
        renderLesson();
        playSound('click');
    }
}

function prevLesson() {
    if (currentLessonIndex > 0) {
        currentLessonIndex--;
        renderLesson();
        playSound('click');
    }
}

// ===========================================
// クイズシステム
// ===========================================

function startQuiz() {
    showSection('quiz');
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const quiz = currentStageData.quiz;
    const question = quiz[currentQuizIndex];

    document.getElementById('quiz-current').textContent = currentQuizIndex + 1;
    document.getElementById('quiz-total').textContent = quiz.length;
    document.getElementById('quiz-question').textContent = question.question;

    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = option;
        btn.onclick = () => selectQuizAnswer(index);
        optionsContainer.appendChild(btn);
    });

    // フィードバックを隠す
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-next-btn').classList.add('hidden');
}

function selectQuizAnswer(selectedIndex) {
    const quiz = currentStageData.quiz;
    const question = quiz[currentQuizIndex];
    const options = document.querySelectorAll('.quiz-option');
    const feedback = document.getElementById('quiz-feedback');

    // 選択を無効化
    options.forEach((opt, i) => {
        opt.disabled = true;
        if (i === question.correct) {
            opt.classList.add('correct');
        } else if (i === selectedIndex) {
            opt.classList.add('incorrect');
        }
    });

    // フィードバック表示
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    const isCorrect = selectedIndex === question.correct;

    if (isCorrect) {
        feedback.classList.add('correct');
        feedback.querySelector('.feedback-text').textContent = '正解！';
        quizScore++;
        addXP(20);
        playSound('correct');
    } else {
        feedback.classList.add('incorrect');
        feedback.querySelector('.feedback-text').textContent = '残念...';
        playSound('incorrect');
    }

    feedback.querySelector('.feedback-explanation').textContent = question.explanation;
    document.getElementById('quiz-next-btn').classList.remove('hidden');
}

function nextQuizQuestion() {
    currentQuizIndex++;

    if (currentQuizIndex >= currentStageData.quiz.length) {
        // クイズ終了
        finishQuiz();
    } else {
        renderQuizQuestion();
    }
}

function finishQuiz() {
    const total = currentStageData.quiz.length;
    const percentage = (quizScore / total) * 100;
    let stars = 0;

    if (percentage >= 80) stars = 3;
    else if (percentage >= 60) stars = 2;
    else if (percentage >= 40) stars = 1;

    // ステージクリア処理
    const stageNum = gameState.progress.currentStage;

    if (!gameState.progress.completedStages.includes(stageNum)) {
        gameState.progress.completedStages.push(stageNum);

        // 次のステージをアンロック
        if (stageNum < 5 && !gameState.progress.unlockedStages.includes(stageNum + 1)) {
            gameState.progress.unlockedStages.push(stageNum + 1);
        }

        // 実績チェック
        unlockAchievement(`stage_${stageNum}_clear`);

        if (stageNum === 1) {
            unlockAchievement('first_lesson');
        }

        if (gameState.progress.completedStages.length >= 5) {
            unlockAchievement('git_master');
        }
    }

    // スター更新
    if (!gameState.progress.stageStars[stageNum] || gameState.progress.stageStars[stageNum] < stars) {
        gameState.progress.stageStars[stageNum] = stars;
    }

    // 報酬
    const xpReward = stars * 50;
    const coinReward = stars * 30;
    addXP(xpReward);
    addCoins(coinReward);

    // 全問正解ボーナス
    if (quizScore === total) {
        unlockAchievement('quiz_master');
        addXP(50);
    }

    saveGameState();

    // 結果表示
    showNotification(
        stars >= 2 ? '🎉' : '👍',
        'ステージクリア！',
        `${quizScore}/${total}問正解 - ★${stars}`
    );

    // ホームに戻る
    setTimeout(() => {
        showSection('stages');
        updateUI();
    }, 2000);
}

// ===========================================
// Gitシミュレーター
// ===========================================

function initSimulator() {
    gameState.simulator = {
        initialized: false,
        files: [
            { name: 'index.html', status: 'untracked' },
            { name: 'style.css', status: 'untracked' }
        ],
        stagedFiles: [],
        commits: [],
        currentBranch: 'main',
        branches: ['main']
    };
    renderSimulator();
}

function renderSimulator() {
    // ファイルツリー
    const fileTree = document.getElementById('file-tree');
    fileTree.innerHTML = `
        <div class="folder">
            <span class="folder-icon">📂</span>
            <span class="folder-name">my-project</span>
            ${gameState.simulator.initialized ? '<span style="color: var(--success); font-size: 12px;">(Git)</span>' : ''}
        </div>
    `;

    gameState.simulator.files.forEach(file => {
        const div = document.createElement('div');
        div.className = `file-item ${file.status}`;
        div.innerHTML = `
            <span>📄</span>
            <span>${file.name}</span>
            <span style="font-size: 11px; color: var(--text-light);">${getStatusLabel(file.status)}</span>
        `;
        fileTree.appendChild(div);
    });

    // ステージングエリア
    const stagingArea = document.getElementById('staging-area');
    if (gameState.simulator.stagedFiles.length === 0) {
        stagingArea.innerHTML = '<p class="empty-message">ファイルがありません</p>';
    } else {
        stagingArea.innerHTML = '';
        gameState.simulator.stagedFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'staged-file';
            div.innerHTML = `<span>📄</span><span>${file}</span>`;
            stagingArea.appendChild(div);
        });
    }

    // コミット履歴
    const commitHistory = document.getElementById('commit-history');
    if (gameState.simulator.commits.length === 0) {
        commitHistory.innerHTML = '<p class="empty-message">コミットがありません</p>';
    } else {
        commitHistory.innerHTML = '';
        gameState.simulator.commits.forEach(commit => {
            const div = document.createElement('div');
            div.className = 'commit-item';
            div.innerHTML = `
                <span class="commit-hash">${commit.hash}</span>
                <span class="commit-message">${commit.message}</span>
            `;
            commitHistory.appendChild(div);
        });
    }
}

function getStatusLabel(status) {
    const labels = {
        'untracked': '未追跡',
        'modified': '変更あり',
        'staged': 'ステージ済',
        'committed': 'コミット済'
    };
    return labels[status] || '';
}

function handleTerminalInput(event) {
    if (event.key !== 'Enter') return;

    const input = document.getElementById('terminal-input');
    const command = input.value.trim();
    input.value = '';

    if (!command) return;

    addTerminalLine(command, 'command');
    processCommand(command);
}

function addTerminalLine(text, type = 'output') {
    const output = document.getElementById('terminal-output');
    const line = document.createElement('div');
    line.className = 'terminal-line';

    if (type === 'command') {
        line.innerHTML = `<span class="prompt">$</span><span class="output">${text}</span>`;
    } else {
        line.innerHTML = `<span class="output ${type}">${text}</span>`;
    }

    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function processCommand(command) {
    const parts = command.split(' ');
    const baseCmd = parts.slice(0, 2).join(' ');

    // git init
    if (command === 'git init') {
        if (gameState.simulator.initialized) {
            addTerminalLine('既にGitリポジトリが初期化されています', 'error');
        } else {
            gameState.simulator.initialized = true;
            addTerminalLine('Initialized empty Git repository in /my-project/.git/', 'success');
            playSound('success');
            checkMissionComplete('git init');
        }
        renderSimulator();
        return;
    }

    // git status
    if (command === 'git status') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        addTerminalLine(`On branch ${gameState.simulator.currentBranch}`);

        if (gameState.simulator.commits.length === 0) {
            addTerminalLine('No commits yet');
        }

        const untracked = gameState.simulator.files.filter(f => f.status === 'untracked');
        const modified = gameState.simulator.files.filter(f => f.status === 'modified');

        if (gameState.simulator.stagedFiles.length > 0) {
            addTerminalLine('Changes to be committed:', 'success');
            gameState.simulator.stagedFiles.forEach(f => {
                addTerminalLine(`  new file: ${f}`, 'success');
            });
        }

        if (untracked.length > 0) {
            addTerminalLine('Untracked files:');
            untracked.forEach(f => {
                addTerminalLine(`  ${f.name}`, 'error');
            });
        }

        if (modified.length > 0) {
            addTerminalLine('Modified files:');
            modified.forEach(f => {
                addTerminalLine(`  ${f.name}`, 'error');
            });
        }

        checkMissionComplete('git status');
        return;
    }

    // git add
    if (baseCmd === 'git add') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        const fileName = parts[2];

        if (fileName === '.') {
            // 全ファイル追加
            gameState.simulator.files.forEach(f => {
                if (f.status === 'untracked' || f.status === 'modified') {
                    if (!gameState.simulator.stagedFiles.includes(f.name)) {
                        gameState.simulator.stagedFiles.push(f.name);
                    }
                    f.status = 'staged';
                }
            });
            addTerminalLine('全てのファイルをステージングしました', 'success');
        } else if (fileName) {
            const file = gameState.simulator.files.find(f => f.name === fileName);
            if (file) {
                if (!gameState.simulator.stagedFiles.includes(fileName)) {
                    gameState.simulator.stagedFiles.push(fileName);
                }
                file.status = 'staged';
                addTerminalLine(`${fileName}をステージングしました`, 'success');
            } else {
                addTerminalLine(`fatal: pathspec '${fileName}' did not match any files`, 'error');
            }
        } else {
            addTerminalLine('使い方: git add <file> or git add .', 'error');
        }

        checkMissionComplete('git add');
        renderSimulator();
        return;
    }

    // git commit
    if (baseCmd === 'git commit') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        if (gameState.simulator.stagedFiles.length === 0) {
            addTerminalLine('nothing to commit, working tree clean', 'error');
            return;
        }

        const messageMatch = command.match(/-m\s+["'](.+)["']/);
        if (!messageMatch) {
            addTerminalLine('使い方: git commit -m "メッセージ"', 'error');
            return;
        }

        const message = messageMatch[1];
        const hash = Math.random().toString(36).substring(2, 9);

        gameState.simulator.commits.unshift({ hash, message });

        // ファイルステータス更新
        gameState.simulator.files.forEach(f => {
            if (f.status === 'staged') {
                f.status = 'committed';
            }
        });

        gameState.simulator.stagedFiles = [];

        addTerminalLine(`[${gameState.simulator.currentBranch} ${hash}] ${message}`, 'success');
        addTerminalLine(`${gameState.simulator.files.length} files changed`);

        // 初コミット実績
        if (gameState.simulator.commits.length === 1) {
            unlockAchievement('first_commit');
        }

        checkMissionComplete('git commit');
        playSound('success');
        renderSimulator();
        return;
    }

    // git branch
    if (baseCmd === 'git branch') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        const branchName = parts[2];

        if (!branchName) {
            // ブランチ一覧表示
            gameState.simulator.branches.forEach(b => {
                const prefix = b === gameState.simulator.currentBranch ? '* ' : '  ';
                const color = b === gameState.simulator.currentBranch ? 'success' : '';
                addTerminalLine(`${prefix}${b}`, color);
            });
        } else {
            // 新しいブランチ作成
            if (gameState.simulator.branches.includes(branchName)) {
                addTerminalLine(`fatal: A branch named '${branchName}' already exists`, 'error');
            } else {
                gameState.simulator.branches.push(branchName);
                addTerminalLine(`ブランチ '${branchName}' を作成しました`, 'success');
                checkMissionComplete('git branch');
            }
        }
        return;
    }

    // git checkout
    if (baseCmd === 'git checkout') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        const target = parts[2];
        const createFlag = parts[2] === '-b';

        if (createFlag) {
            // 新しいブランチを作成して切り替え
            const newBranch = parts[3];
            if (!newBranch) {
                addTerminalLine('使い方: git checkout -b <branch-name>', 'error');
                return;
            }
            if (gameState.simulator.branches.includes(newBranch)) {
                addTerminalLine(`fatal: A branch named '${newBranch}' already exists`, 'error');
            } else {
                gameState.simulator.branches.push(newBranch);
                gameState.simulator.currentBranch = newBranch;
                addTerminalLine(`Switched to a new branch '${newBranch}'`, 'success');
                checkMissionComplete('git checkout');
            }
        } else if (target) {
            // 既存のブランチに切り替え
            if (gameState.simulator.branches.includes(target)) {
                gameState.simulator.currentBranch = target;
                addTerminalLine(`Switched to branch '${target}'`, 'success');
                checkMissionComplete('git checkout');
            } else {
                addTerminalLine(`error: pathspec '${target}' did not match any branch`, 'error');
            }
        } else {
            addTerminalLine('使い方: git checkout <branch-name>', 'error');
        }

        renderSimulator();
        return;
    }

    // git log
    if (command === 'git log' || command === 'git log --oneline') {
        if (!gameState.simulator.initialized) {
            addTerminalLine('fatal: not a git repository', 'error');
            return;
        }

        if (gameState.simulator.commits.length === 0) {
            addTerminalLine('まだコミットがありません');
            return;
        }

        gameState.simulator.commits.forEach(commit => {
            addTerminalLine(`${commit.hash} ${commit.message}`, 'success');
        });
        return;
    }

    // 不明なコマンド
    addTerminalLine(`command not found: ${parts[0]}`, 'error');
}

function insertCommand(cmd) {
    document.getElementById('terminal-input').value = cmd;
    document.getElementById('terminal-input').focus();
}

function checkMissionComplete(command) {
    const lesson = currentStageData?.lessons[currentLessonIndex];
    if (lesson?.type === 'simulator' && lesson.expectedCommands) {
        const completed = lesson.expectedCommands.every(cmd =>
            document.getElementById('terminal-output').textContent.includes(cmd)
        );

        if (completed) {
            setTimeout(() => {
                addXP(50);
                showNotification('🎉', 'ミッション完了！', '+50 XP');
                setTimeout(() => {
                    currentLessonIndex++;
                    if (currentLessonIndex < currentStageData.lessons.length) {
                        renderLesson();
                        showSection('lesson');
                    } else {
                        startQuiz();
                    }
                }, 1500);
            }, 500);
        }
    }
}

function showHint() {
    const lesson = currentStageData?.lessons[currentLessonIndex];
    if (lesson?.type === 'simulator') {
        const hints = {
            'git init': 'ヒント: git init と入力してリポジトリを作成しよう！',
            'git add': 'ヒント: git add . で全ファイルをステージングできるよ！',
            'git commit': 'ヒント: git commit -m "メッセージ" でコミットしよう！',
            'git branch': 'ヒント: git branch 名前 で新しいブランチを作れるよ！',
            'git checkout': 'ヒント: git checkout -b 名前 でブランチを作って切り替えられるよ！'
        };

        const expectedCmd = lesson.expectedCommands?.[0] || '';
        const hint = hints[expectedCmd.split(' ')[0] + ' ' + (expectedCmd.split(' ')[1] || '')] || hints[expectedCmd.split(' ')[0]] || 'コマンドを入力してみよう！';

        showNotification('💡', 'ヒント', hint);
    }
}

// ===========================================
// ボスステージ（最終試験）
// ===========================================

function startBossStage() {
    showNotification('👑', '最終試験', 'Gitマスターへの挑戦が始まる！');
    // 全ステージのクイズからランダムに出題
    currentStageData = {
        title: "最終試験",
        quiz: []
    };

    // 各ステージから2問ずつ出題
    for (let i = 1; i <= 5; i++) {
        const stageQuiz = STAGES[i].quiz;
        const shuffled = [...stageQuiz].sort(() => Math.random() - 0.5);
        currentStageData.quiz.push(...shuffled.slice(0, 2));
    }

    currentQuizIndex = 0;
    quizScore = 0;
    startQuiz();
}

// ===========================================
// ゲーミフィケーション機能
// ===========================================

function addXP(amount) {
    gameState.player.xp += amount;

    // レベルアップチェック
    const newLevel = calculateLevel(gameState.player.xp);
    if (newLevel > gameState.player.level) {
        gameState.player.level = newLevel;
        showLevelUpModal(newLevel);

        // レベル実績チェック
        if (newLevel >= 5) {
            unlockAchievement('level_5');
        }
    }

    saveGameState();
    updateUI();
}

function addCoins(amount) {
    gameState.player.coins += amount;
    saveGameState();
    updateUI();
}

function calculateLevel(xp) {
    for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
        if (xp >= XP_LEVELS[i]) {
            return i + 1;
        }
    }
    return 1;
}

function checkStreak() {
    const today = new Date().toDateString();
    const lastPlay = gameState.player.lastPlayDate;

    if (lastPlay !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastPlay === yesterday.toDateString()) {
            // 連続記録継続
            gameState.player.streak++;

            if (gameState.player.streak >= 3) {
                unlockAchievement('streak_3');
            }
            if (gameState.player.streak >= 7) {
                unlockAchievement('streak_7');
            }
        } else if (lastPlay) {
            // 連続記録リセット
            gameState.player.streak = 1;
        } else {
            gameState.player.streak = 1;
        }

        gameState.player.lastPlayDate = today;
        saveGameState();
    }

    updateUI();
}

function unlockAchievement(achievementId) {
    if (!gameState.achievements.includes(achievementId)) {
        gameState.achievements.push(achievementId);
        saveGameState();

        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (achievement) {
            showBadgeModal(achievement);
            addXP(30);
            addCoins(20);
        }
    }
}

// ===========================================
// モーダル・通知
// ===========================================

function showNotification(icon, title, message) {
    const notification = document.getElementById('notification');
    notification.querySelector('.notification-icon').textContent = icon;
    notification.querySelector('.notification-title').textContent = title;
    notification.querySelector('.notification-message').textContent = message;
    notification.classList.remove('hidden');

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function showLevelUpModal(level) {
    const modal = document.getElementById('levelup-modal');
    document.getElementById('new-level-number').textContent = level;
    modal.classList.remove('hidden');
    playSound('levelup');

    // コインボーナス
    addCoins(100);
}

function closeLevelUpModal() {
    document.getElementById('levelup-modal').classList.add('hidden');
}

function showBadgeModal(achievement) {
    const modal = document.getElementById('badge-modal');
    document.getElementById('earned-badge-icon').textContent = achievement.icon;
    document.getElementById('earned-badge-name').textContent = achievement.name;
    document.getElementById('earned-badge-desc').textContent = achievement.desc;
    modal.classList.remove('hidden');
    playSound('badge');
}

function closeBadgeModal() {
    document.getElementById('badge-modal').classList.add('hidden');
}

// ===========================================
// 設定
// ===========================================

function toggleSound() {
    gameState.settings.soundEnabled = document.getElementById('sound-toggle').checked;
    saveGameState();
}

function toggleDarkMode() {
    gameState.settings.darkMode = document.getElementById('dark-mode-toggle').checked;
    document.body.classList.toggle('dark-mode', gameState.settings.darkMode);
    saveGameState();
}

function changeDifficulty() {
    gameState.settings.difficulty = document.getElementById('difficulty-select').value;
    saveGameState();
}

function resetProgress() {
    if (confirm('本当にデータをリセットしますか？\n全ての進捗が失われます。')) {
        localStorage.removeItem('gitquest_save');
        location.reload();
    }
}

// ===========================================
// サウンド
// ===========================================

function playSound(type) {
    if (!gameState.settings.soundEnabled) return;

    // Web Audio APIを使用したシンプルな効果音
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds = {
        click: { freq: 800, duration: 0.1 },
        correct: { freq: 880, duration: 0.2 },
        incorrect: { freq: 300, duration: 0.3 },
        success: { freq: 660, duration: 0.3 },
        levelup: { freq: 440, duration: 0.5 },
        badge: { freq: 520, duration: 0.4 }
    };

    const sound = sounds[type] || sounds.click;

    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
}

// ===========================================
// マスコットメッセージ
// ===========================================

const MASCOT_MESSAGES = [
    "やあ！今日もGitを学ぼう！",
    "コミットは小まめにするのがコツだよ！",
    "ブランチを使えば安全に実験できるね！",
    "git status は困ったときの味方！",
    "エラーが出ても大丈夫、一緒に解決しよう！",
    "毎日少しずつ練習すると上達するよ！",
    "分からないことがあったら用語集を見てね！"
];

function updateMascotMessage() {
    const message = MASCOT_MESSAGES[Math.floor(Math.random() * MASCOT_MESSAGES.length)];
    document.getElementById('mascot-message').innerHTML = message;
}

// 定期的にメッセージを更新
setInterval(updateMascotMessage, 30000);
