/**
 * Git Quest - Advanced Stages
 * Codex開発エンジニアレベルの高度なGit学習コンテンツ
 * git worktree、並列実行、AI駆動開発ワークフロー
 */

// ===========================================
// 上級ステージデータ（ステージ6-10）
// ===========================================

const ADVANCED_STAGES = {
    6: {
        title: "高度なブランチ戦略",
        description: "rebase, cherry-pick, stashをマスター",
        difficulty: "advanced",
        estimatedTime: "90分",
        lessons: [
            {
                title: "git rebase とは？",
                content: `
                    <h2 class="lesson-title">🔄 git rebase - 履歴を整理する</h2>
                    <p class="lesson-text">
                        <strong>rebase（リベース）</strong>は、ブランチの「根本」を付け替える操作。
                        <br><br>
                        mergeとは違い、<strong>直線的で綺麗な履歴</strong>を作れる！
                    </p>
                    <div class="lesson-visual">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                            <div>
                                <h4 style="margin-bottom: 12px;">Merge の場合</h4>
                                <div style="background: #1E1E1E; border-radius: 8px; padding: 16px; font-family: monospace; color: #ccc; font-size: 13px;">
* Merge commit<br>
|\\<br>
| * feature commit 2<br>
| * feature commit 1<br>
|/<br>
* main commit
                                </div>
                            </div>
                            <div>
                                <h4 style="margin-bottom: 12px;">Rebase の場合</h4>
                                <div style="background: #1E1E1E; border-radius: 8px; padding: 16px; font-family: monospace; color: #ccc; font-size: 13px;">
* feature commit 2<br>
* feature commit 1<br>
* main commit<br>
|<br>
(直線的で綺麗！)
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># featureブランチでmainの最新を取り込む</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git checkout feature</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git rebase main</code>
                        </div>
                    </div>
                    <div class="lesson-tip warning">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>重要な注意</strong><br>
                            公開済み（push済み）のコミットをrebaseしてはいけない！<br>
                            チームメイトの履歴と衝突する原因になる。
                        </div>
                    </div>
                `
            },
            {
                title: "Interactive Rebase",
                content: `
                    <h2 class="lesson-title">✨ Interactive Rebase - コミット履歴を編集</h2>
                    <p class="lesson-text">
                        <code>git rebase -i</code>（インタラクティブリベース）を使うと、<br>
                        過去のコミットを<strong>編集・統合・並び替え・削除</strong>できる！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git rebase -i HEAD~3</code>
                            <br><br>
                            <code style="color: #666;"># エディタが開く:</code><br>
                            <code style="color: #FFD700;">pick</code><code style="color: #ccc;"> a1b2c3d 機能Aを追加</code><br>
                            <code style="color: #FFD700;">pick</code><code style="color: #ccc;"> e4f5g6h typo修正</code><br>
                            <code style="color: #FFD700;">pick</code><code style="color: #ccc;"> i7j8k9l 機能Aを改善</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 12px;">使えるコマンド</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            <div class="diagram-box">
                                <code style="color: var(--primary);">pick</code><br>
                                <small>そのまま使う</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">reword</code><br>
                                <small>メッセージを変更</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">squash</code><br>
                                <small>前のコミットと統合</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">fixup</code><br>
                                <small>統合（メッセージ破棄）</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">drop</code><br>
                                <small>コミットを削除</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">edit</code><br>
                                <small>コミット内容を編集</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>Codex活用ポイント</strong><br>
                            AIで生成した複数の小さなコミットをsquashで1つにまとめると綺麗！
                        </div>
                    </div>
                `
            },
            {
                title: "git cherry-pick",
                content: `
                    <h2 class="lesson-title">🍒 git cherry-pick - 特定のコミットだけ取り込む</h2>
                    <p class="lesson-text">
                        <strong>cherry-pick</strong>は、別のブランチから<br>
                        <strong>特定のコミットだけ</strong>を現在のブランチに適用する。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 特定のコミットを現在のブランチに適用</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git cherry-pick a1b2c3d</code>
                            <br><br>
                            <code style="color: #666;"># 複数のコミットを適用</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git cherry-pick a1b2c3d e4f5g6h</code>
                            <br><br>
                            <code style="color: #666;"># 範囲指定で適用</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git cherry-pick a1b2c3d^..e4f5g6h</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 12px;">使用シーン</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div class="diagram-box">
                                <strong>🐛 ホットフィックス</strong><br>
                                開発ブランチで修正したバグをmainにも適用
                            </div>
                            <div class="diagram-box">
                                <strong>🔀 部分的な取り込み</strong><br>
                                PRの一部のコミットだけを先に取り込みたい時
                            </div>
                            <div class="diagram-box">
                                <strong>🤖 AI生成コードの選別</strong><br>
                                Codexが生成した複数のコミットから良いものだけ採用
                            </div>
                        </div>
                    </div>
                `
            },
            {
                title: "git stash - 作業を一時保存",
                content: `
                    <h2 class="lesson-title">📦 git stash - 作業を一時保存</h2>
                    <p class="lesson-text">
                        <strong>stash</strong>は、作業中の変更を一時的に「棚上げ」する機能。
                        <br><br>
                        急なブランチ切り替えが必要なときに超便利！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 変更を一時保存</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git stash</code>
                            <br><br>
                            <code style="color: #666;"># メッセージ付きで保存</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git stash save "WIP: ログイン機能"</code>
                            <br><br>
                            <code style="color: #666;"># stashの一覧を表示</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git stash list</code>
                            <br>
                            <code style="color: #ccc;">stash@{0}: WIP: ログイン機能</code><br>
                            <code style="color: #ccc;">stash@{1}: WIP on main: a1b2c3d</code>
                            <br><br>
                            <code style="color: #666;"># 復元（stashから削除）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git stash pop</code>
                            <br><br>
                            <code style="color: #666;"># 復元（stashに残す）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git stash apply stash@{0}</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🚀</span>
                        <div>
                            <strong>Pro Tips</strong><br>
                            <code>git stash -u</code>: 未追跡ファイルも含める<br>
                            <code>git stash branch 名前</code>: stashから新しいブランチを作成
                        </div>
                    </div>
                `
            },
            {
                type: "simulator",
                title: "実践！rebase & stash",
                mission: "stashで変更を退避し、rebaseを実行しよう！",
                expectedCommands: ["git stash", "git rebase"]
            }
        ],
        quiz: [
            {
                question: "git rebase と git merge の主な違いは？",
                options: [
                    "rebaseは速い、mergeは遅い",
                    "rebaseは直線的な履歴を作る、mergeはマージコミットを作る",
                    "rebaseはローカル専用、mergeはリモート専用",
                    "違いはない"
                ],
                correct: 1,
                explanation: "rebaseはコミット履歴を直線的に保ち、mergeはブランチの分岐履歴を保持します。"
            },
            {
                question: "git rebase -i で「squash」を選ぶと？",
                options: [
                    "コミットを削除する",
                    "コミットメッセージを変更する",
                    "前のコミットと統合する",
                    "コミットをコピーする"
                ],
                correct: 2,
                explanation: "squashは選択したコミットを直前のコミットと統合します。"
            },
            {
                question: "git cherry-pick の用途として正しいのは？",
                options: [
                    "ブランチ全体をマージする",
                    "特定のコミットだけを別ブランチに適用する",
                    "コミットを削除する",
                    "リポジトリを複製する"
                ],
                correct: 1,
                explanation: "cherry-pickは特定のコミットだけを選んで現在のブランチに適用します。"
            },
            {
                question: "git stash pop と git stash apply の違いは？",
                options: [
                    "同じ動作をする",
                    "popは復元後にstashから削除、applyは残す",
                    "popは最新を復元、applyは古いのを復元",
                    "popは上書き、applyはマージ"
                ],
                correct: 1,
                explanation: "popは復元後にstashリストから削除しますが、applyは残したままにします。"
            }
        ]
    },

    7: {
        title: "git worktree - 並列開発",
        description: "複数の作業ディレクトリで同時開発",
        difficulty: "advanced",
        estimatedTime: "80分",
        lessons: [
            {
                title: "git worktree とは？",
                content: `
                    <h2 class="lesson-title">🌳 git worktree - 複数の作業ツリー</h2>
                    <p class="lesson-text">
                        <strong>worktree</strong>は、1つのリポジトリに<strong>複数の作業ディレクトリ</strong>を作る機能。
                        <br><br>
                        ブランチを切り替えずに、<strong>複数のブランチを同時に作業</strong>できる！
                    </p>
                    <div class="lesson-visual">
                        <div class="visual-diagram" style="flex-direction: column; gap: 20px;">
                            <div class="diagram-box highlight" style="width: 100%;">
                                <div style="font-size: 24px; margin-bottom: 8px;">📦 メインリポジトリ (.git)</div>
                                <small>全てのworktreeが共有</small>
                            </div>
                            <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                                <div class="diagram-box">
                                    📂 my-project/<br>
                                    <small>main ブランチ</small>
                                </div>
                                <div class="diagram-box">
                                    📂 my-project-feature/<br>
                                    <small>feature ブランチ</small>
                                </div>
                                <div class="diagram-box">
                                    📂 my-project-hotfix/<br>
                                    <small>hotfix ブランチ</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🚀</span>
                        <div>
                            <strong>Codexでの活用</strong><br>
                            Codexは複数のタスクを並列実行できる。<br>
                            worktreeを使えば、各タスクが別々のディレクトリで独立して作業可能！
                        </div>
                    </div>
                `
            },
            {
                title: "worktree の作成と管理",
                content: `
                    <h2 class="lesson-title">🔧 worktree の作成と管理</h2>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 新しいworktreeを作成（既存ブランチ）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree add ../my-project-feature feature</code>
                            <br><br>
                            <code style="color: #666;"># 新しいブランチと共にworktreeを作成</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree add -b new-feature ../my-project-new</code>
                            <br><br>
                            <code style="color: #666;"># worktree一覧を表示</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree list</code>
                            <br>
                            <code style="color: #ccc;">/home/user/my-project         a1b2c3d [main]</code><br>
                            <code style="color: #ccc;">/home/user/my-project-feature e4f5g6h [feature]</code><br>
                            <code style="color: #ccc;">/home/user/my-project-new     i7j8k9l [new-feature]</code>
                            <br><br>
                            <code style="color: #666;"># worktreeを削除</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree remove ../my-project-feature</code>
                        </div>
                    </div>
                    <div class="lesson-tip warning">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>注意</strong><br>
                            同じブランチを複数のworktreeでチェックアウトすることはできない。<br>
                            各worktreeは異なるブランチを担当する。
                        </div>
                    </div>
                `
            },
            {
                title: "並列開発ワークフロー",
                content: `
                    <h2 class="lesson-title">⚡ 並列開発ワークフロー</h2>
                    <p class="lesson-text">
                        worktreeを使った<strong>効率的な並列開発</strong>のパターンを学ぼう。
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">🎯 典型的なセットアップ</h4>
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left; font-size: 13px;">
                            <code style="color: #666;"># メインの作業ディレクトリ構造</code><br>
                            <code style="color: #ccc;">projects/</code><br>
                            <code style="color: #ccc;">├── my-app/              # main ブランチ（安定版）</code><br>
                            <code style="color: #ccc;">├── my-app-dev/          # develop ブランチ（開発版）</code><br>
                            <code style="color: #ccc;">├── my-app-feature-a/    # feature-a ブランチ</code><br>
                            <code style="color: #ccc;">├── my-app-feature-b/    # feature-b ブランチ</code><br>
                            <code style="color: #ccc;">└── my-app-hotfix/       # hotfix ブランチ</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 16px;">🔄 並列作業の流れ</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div class="diagram-box" style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 24px;">1️⃣</span>
                                <div>
                                    <strong>ターミナル1: feature-a を開発</strong><br>
                                    <code>cd my-app-feature-a && code .</code>
                                </div>
                            </div>
                            <div class="diagram-box" style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 24px;">2️⃣</span>
                                <div>
                                    <strong>ターミナル2: feature-b を開発</strong><br>
                                    <code>cd my-app-feature-b && code .</code>
                                </div>
                            </div>
                            <div class="diagram-box" style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 24px;">3️⃣</span>
                                <div>
                                    <strong>ターミナル3: 緊急hotfixに対応</strong><br>
                                    <code>cd my-app-hotfix && vim bugfix.js</code>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>メリット</strong><br>
                            • stashやcommitなしでブランチ切り替え不要<br>
                            • 複数のVSCodeウィンドウで同時編集<br>
                            • ビルド中でも別機能の開発が可能
                        </div>
                    </div>
                `
            },
            {
                title: "Codexとworktreeの組み合わせ",
                content: `
                    <h2 class="lesson-title">🤖 Codex × worktree = 最強の並列開発</h2>
                    <p class="lesson-text">
                        <strong>Codex（Claude Code）</strong>は複数のタスクを<strong>並列実行</strong>できる。<br>
                        worktreeと組み合わせることで、AIの並列処理能力を最大限活用！
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">🚀 Codex並列実行のセットアップ</h4>
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 各機能用のworktreeを準備</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree add -b auth ../app-auth</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree add -b api ../app-api</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git worktree add -b ui ../app-ui</code>
                            <br><br>
                            <code style="color: #666;"># Codexで並列タスクを実行</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> codex --parallel \\</code><br>
                            <code style="color: white;">    "cd ../app-auth && implement login" \\</code><br>
                            <code style="color: white;">    "cd ../app-api && create REST endpoints" \\</code><br>
                            <code style="color: white;">    "cd ../app-ui && build dashboard"</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div class="visual-diagram">
                            <div class="diagram-box" style="background: linear-gradient(135deg, #6C5CE7, #A29BFE); color: white;">
                                🤖 Codex<br>
                                <small>並列タスク実行</small>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <div class="diagram-arrow">→ Task 1</div>
                                <div class="diagram-arrow">→ Task 2</div>
                                <div class="diagram-arrow">→ Task 3</div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <div class="diagram-box" style="padding: 8px;">app-auth/</div>
                                <div class="diagram-box" style="padding: 8px;">app-api/</div>
                                <div class="diagram-box" style="padding: 8px;">app-ui/</div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">⚡</span>
                        <div>
                            <strong>並列実行のベストプラクティス</strong><br>
                            • 各タスクは独立したworktreeで実行<br>
                            • コンフリクトを避けるため、異なるファイルを編集<br>
                            • 完了後にmainへ順番にマージ
                        </div>
                    </div>
                `
            },
            {
                type: "simulator",
                title: "実践！worktreeで並列開発",
                mission: "worktreeを作成して、並列開発環境を構築しよう！",
                expectedCommands: ["git worktree add", "git worktree list"]
            }
        ],
        quiz: [
            {
                question: "git worktree の主な利点は？",
                options: [
                    "リポジトリを高速化する",
                    "複数のブランチを同時に作業できる",
                    "自動的にマージする",
                    "コミットを暗号化する"
                ],
                correct: 1,
                explanation: "worktreeを使うと、ブランチを切り替えずに複数のブランチを同時に作業できます。"
            },
            {
                question: "同じブランチを複数のworktreeでチェックアウトできる？",
                options: [
                    "できる",
                    "できない",
                    "mainブランチだけできる",
                    "設定による"
                ],
                correct: 1,
                explanation: "同じブランチを複数のworktreeでチェックアウトすることはできません。"
            },
            {
                question: "CodexとworktreeのFEATS組み合わせの利点は？",
                options: [
                    "コードが自動的に書かれる",
                    "並列タスクを独立したディレクトリで実行できる",
                    "インターネット接続が不要になる",
                    "Gitが不要になる"
                ],
                correct: 1,
                explanation: "worktreeにより、Codexの並列タスクを独立したディレクトリで衝突なく実行できます。"
            }
        ]
    },

    8: {
        title: "高度なデバッグ技法",
        description: "bisect, reflog, blame で問題解決",
        difficulty: "expert",
        estimatedTime: "70分",
        lessons: [
            {
                title: "git bisect - バグの原因コミットを特定",
                content: `
                    <h2 class="lesson-title">🔍 git bisect - 二分探索でバグ発見</h2>
                    <p class="lesson-text">
                        <strong>bisect</strong>は、バグが混入したコミットを<br>
                        <strong>二分探索</strong>で効率的に見つける機能。
                        <br><br>
                        1000コミットあっても、約10回のチェックで特定できる！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># bisectを開始</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git bisect start</code>
                            <br><br>
                            <code style="color: #666;"># 現在（バグあり）を「bad」とマーク</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git bisect bad</code>
                            <br><br>
                            <code style="color: #666;"># 正常だったコミットを「good」とマーク</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git bisect good v1.0.0</code>
                            <br>
                            <code style="color: #ccc;">Bisecting: 50 revisions left to test</code>
                            <br><br>
                            <code style="color: #666;"># テストして good/bad を繰り返す</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git bisect good</code>
                            <code style="color: #666;"> # or git bisect bad</code>
                            <br><br>
                            <code style="color: #666;"># 原因コミットが見つかったら終了</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git bisect reset</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🤖</span>
                        <div>
                            <strong>自動化</strong><br>
                            <code>git bisect run npm test</code> でテストを自動実行し、<br>
                            完全自動でバグの原因コミットを特定できる！
                        </div>
                    </div>
                `
            },
            {
                title: "git reflog - 消えた履歴を復元",
                content: `
                    <h2 class="lesson-title">📜 git reflog - 全ての操作履歴</h2>
                    <p class="lesson-text">
                        <strong>reflog</strong>は、HEADの移動履歴を全て記録。
                        <br><br>
                        間違ってresetしたコミットも、ここから復元できる！
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git reflog</code>
                            <br>
                            <code style="color: #FFD700;">a1b2c3d</code><code style="color: #ccc;"> HEAD@{0}: commit: 新機能追加</code><br>
                            <code style="color: #FFD700;">e4f5g6h</code><code style="color: #ccc;"> HEAD@{1}: reset: moving to HEAD~3</code><br>
                            <code style="color: #FFD700;">i7j8k9l</code><code style="color: #ccc;"> HEAD@{2}: commit: 重要な変更</code><br>
                            <code style="color: #FFD700;">m0n1o2p</code><code style="color: #ccc;"> HEAD@{3}: checkout: moving from feature to main</code>
                            <br><br>
                            <code style="color: #666;"># 消えたコミットを復元</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git checkout i7j8k9l</code>
                            <br><br>
                            <code style="color: #666;"># または新しいブランチとして復元</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git branch recovered i7j8k9l</code>
                        </div>
                    </div>
                    <div class="lesson-tip warning">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>reflogは90日で消える</strong><br>
                            デフォルトでは90日経過すると古いエントリは削除される。<br>
                            大事な復元は早めに！
                        </div>
                    </div>
                `
            },
            {
                title: "git blame - コードの責任者を特定",
                content: `
                    <h2 class="lesson-title">👤 git blame - 誰がいつ書いた？</h2>
                    <p class="lesson-text">
                        <strong>blame</strong>は、ファイルの各行が<br>
                        <strong>誰によって、いつ、どのコミットで</strong>書かれたかを表示。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left; font-size: 12px;">
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git blame src/app.js</code>
                            <br><br>
                            <code style="color: #FFD700;">a1b2c3d4</code><code style="color: #ccc;"> (田中太郎 2024-01-15 10:30)  1) const express = require('express');</code><br>
                            <code style="color: #FFD700;">a1b2c3d4</code><code style="color: #ccc;"> (田中太郎 2024-01-15 10:30)  2) const app = express();</code><br>
                            <code style="color: #FFD700;">e5f6g7h8</code><code style="color: #ccc;"> (鈴木花子 2024-02-01 14:20)  3) </code><br>
                            <code style="color: #FFD700;">e5f6g7h8</code><code style="color: #ccc;"> (鈴木花子 2024-02-01 14:20)  4) // バグ修正: nullチェック追加</code><br>
                            <code style="color: #FFD700;">e5f6g7h8</code><code style="color: #ccc;"> (鈴木花子 2024-02-01 14:20)  5) app.use(middleware);</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 12px;">便利なオプション</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div class="diagram-box">
                                <code>git blame -L 10,20 file.js</code><br>
                                <small>10〜20行目だけを表示</small>
                            </div>
                            <div class="diagram-box">
                                <code>git blame -w file.js</code><br>
                                <small>空白の変更を無視</small>
                            </div>
                            <div class="diagram-box">
                                <code>git blame --since="2024-01-01" file.js</code><br>
                                <small>指定日以降の変更のみ</small>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                title: "git log の高度な使い方",
                content: `
                    <h2 class="lesson-title">📊 git log - 高度な履歴検索</h2>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left; font-size: 13px;">
                            <code style="color: #666;"># グラフ表示</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --oneline --graph --all</code>
                            <br><br>
                            <code style="color: #666;"># 特定ファイルの履歴</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --follow -- src/app.js</code>
                            <br><br>
                            <code style="color: #666;"># コミットメッセージで検索</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --grep="バグ修正"</code>
                            <br><br>
                            <code style="color: #666;"># コード内の文字列変更を検索</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log -S "functionName"</code>
                            <br><br>
                            <code style="color: #666;"># 特定の著者のコミット</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --author="田中"</code>
                            <br><br>
                            <code style="color: #666;"># 日付範囲で絞り込み</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --since="2024-01-01" --until="2024-02-01"</code>
                            <br><br>
                            <code style="color: #666;"># 統計情報を表示</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git log --stat</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🎯</span>
                        <div>
                            <strong>カスタムフォーマット</strong><br>
                            <code>git log --pretty=format:"%h - %an: %s"</code><br>
                            ハッシュ - 著者: メッセージ の形式で表示
                        </div>
                    </div>
                `
            }
        ],
        quiz: [
            {
                question: "git bisect の用途は？",
                options: [
                    "ファイルを分割する",
                    "バグが混入したコミットを二分探索で特定する",
                    "ブランチを二つに分ける",
                    "リポジトリをバックアップする"
                ],
                correct: 1,
                explanation: "bisectは二分探索アルゴリズムでバグが混入したコミットを効率的に特定します。"
            },
            {
                question: "git reflog で何ができる？",
                options: [
                    "リモートのログを見る",
                    "消えたコミットを含む全ての操作履歴を見る",
                    "ファイルの変更履歴を見る",
                    "ログファイルを作成する"
                ],
                correct: 1,
                explanation: "reflogはHEADの移動履歴を全て記録しており、誤って消したコミットも復元できます。"
            },
            {
                question: "git blame の主な用途は？",
                options: [
                    "バグの責任者を責める",
                    "各行が誰によっていつ書かれたか確認する",
                    "コードの品質をチェックする",
                    "マージコンフリクトを解決する"
                ],
                correct: 1,
                explanation: "blameは各行の作成者とコミット情報を表示し、コードの経緯を理解するのに役立ちます。"
            }
        ]
    },

    9: {
        title: "Git Hooks & 自動化",
        description: "フック、CI/CD、自動化ワークフロー",
        difficulty: "expert",
        estimatedTime: "85分",
        lessons: [
            {
                title: "Git Hooks とは？",
                content: `
                    <h2 class="lesson-title">🪝 Git Hooks - 自動化の力</h2>
                    <p class="lesson-text">
                        <strong>Git Hooks</strong>は、特定のGitイベント時に<br>
                        <strong>自動でスクリプトを実行</strong>する仕組み。
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">主要なフック</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            <div class="diagram-box">
                                <code style="color: var(--primary);">pre-commit</code><br>
                                <small>コミット前に実行<br>（リント、テスト）</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">commit-msg</code><br>
                                <small>コミットメッセージ<br>のチェック</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">pre-push</code><br>
                                <small>プッシュ前に実行<br>（全テスト実行）</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">post-merge</code><br>
                                <small>マージ後に実行<br>（依存関係更新）</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># フックファイルの場所</code><br>
                            <code style="color: #ccc;">.git/hooks/</code><br>
                            <code style="color: #ccc;">├── pre-commit.sample</code><br>
                            <code style="color: #ccc;">├── commit-msg.sample</code><br>
                            <code style="color: #ccc;">├── pre-push.sample</code><br>
                            <code style="color: #ccc;">└── ...</code>
                        </div>
                    </div>
                `
            },
            {
                title: "pre-commit フックの設定",
                content: `
                    <h2 class="lesson-title">✅ pre-commit フックの設定</h2>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># .git/hooks/pre-commit を作成</code><br><br>
                            <code style="color: #A29BFE;">#!/bin/bash</code><br><br>
                            <code style="color: #ccc;">echo "🔍 Running pre-commit checks..."</code><br><br>
                            <code style="color: #666;"># ESLint でコードチェック</code><br>
                            <code style="color: #ccc;">npm run lint</code><br>
                            <code style="color: #A29BFE;">if</code><code style="color: #ccc;"> [ $? -ne 0 ]; </code><code style="color: #A29BFE;">then</code><br>
                            <code style="color: #ccc;">    echo "❌ Lint errors found!"</code><br>
                            <code style="color: #ccc;">    </code><code style="color: #A29BFE;">exit</code><code style="color: #ccc;"> 1</code><br>
                            <code style="color: #A29BFE;">fi</code><br><br>
                            <code style="color: #666;"># テスト実行</code><br>
                            <code style="color: #ccc;">npm test</code><br>
                            <code style="color: #A29BFE;">if</code><code style="color: #ccc;"> [ $? -ne 0 ]; </code><code style="color: #A29BFE;">then</code><br>
                            <code style="color: #ccc;">    echo "❌ Tests failed!"</code><br>
                            <code style="color: #ccc;">    </code><code style="color: #A29BFE;">exit</code><code style="color: #ccc;"> 1</code><br>
                            <code style="color: #A29BFE;">fi</code><br><br>
                            <code style="color: #ccc;">echo "✅ All checks passed!"</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 実行権限を付与</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> chmod +x .git/hooks/pre-commit</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">💡</span>
                        <div>
                            <strong>husky を使おう</strong><br>
                            <code>npx husky-init && npm install</code><br>
                            huskyを使えば、フックをチームで共有できる！
                        </div>
                    </div>
                `
            },
            {
                title: "GitHub Actions との連携",
                content: `
                    <h2 class="lesson-title">🔄 GitHub Actions - CI/CD</h2>
                    <p class="lesson-text">
                        <strong>GitHub Actions</strong>を使って、<br>
                        プッシュやPR時に自動でテスト・デプロイを実行。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left; font-size: 12px;">
                            <code style="color: #666;"># .github/workflows/ci.yml</code><br><br>
                            <code style="color: #A29BFE;">name:</code><code style="color: #ccc;"> CI Pipeline</code><br><br>
                            <code style="color: #A29BFE;">on:</code><br>
                            <code style="color: #ccc;">  push:</code><br>
                            <code style="color: #ccc;">    branches: [main, develop]</code><br>
                            <code style="color: #ccc;">  pull_request:</code><br>
                            <code style="color: #ccc;">    branches: [main]</code><br><br>
                            <code style="color: #A29BFE;">jobs:</code><br>
                            <code style="color: #ccc;">  test:</code><br>
                            <code style="color: #ccc;">    runs-on: ubuntu-latest</code><br>
                            <code style="color: #ccc;">    steps:</code><br>
                            <code style="color: #ccc;">      - uses: actions/checkout@v4</code><br>
                            <code style="color: #ccc;">      - uses: actions/setup-node@v4</code><br>
                            <code style="color: #ccc;">        with:</code><br>
                            <code style="color: #ccc;">          node-version: '20'</code><br>
                            <code style="color: #ccc;">      - run: npm ci</code><br>
                            <code style="color: #ccc;">      - run: npm run lint</code><br>
                            <code style="color: #ccc;">      - run: npm test</code>
                        </div>
                    </div>
                `
            },
            {
                title: "Codex Hooks の活用",
                content: `
                    <h2 class="lesson-title">🤖 Codex Hooks - AI開発の自動化</h2>
                    <p class="lesson-text">
                        <strong>Claude Code（Codex）</strong>には専用のフック機能があり、<br>
                        AI開発ワークフローを自動化できる。
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">Codex フックの種類</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <div class="diagram-box">
                                <code style="color: var(--primary);">PreToolUse</code><br>
                                <small>ツール実行前に検証・確認</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">PostToolUse</code><br>
                                <small>ツール実行後に追加処理</small>
                            </div>
                            <div class="diagram-box">
                                <code style="color: var(--primary);">Stop</code><br>
                                <small>セッション終了時の処理</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left; font-size: 12px;">
                            <code style="color: #666;"># ~/.claude/settings.json</code><br><br>
                            <code style="color: #ccc;">{</code><br>
                            <code style="color: #ccc;">  "hooks": {</code><br>
                            <code style="color: #ccc;">    "stop": [</code><br>
                            <code style="color: #ccc;">      {</code><br>
                            <code style="color: #ccc;">        "matcher": "",</code><br>
                            <code style="color: #ccc;">        "hooks": [</code><br>
                            <code style="color: #ccc;">          {</code><br>
                            <code style="color: #ccc;">            "type": "command",</code><br>
                            <code style="color: #ccc;">            "command": "~/.claude/git-check.sh"</code><br>
                            <code style="color: #ccc;">          }</code><br>
                            <code style="color: #ccc;">        ]</code><br>
                            <code style="color: #ccc;">      }</code><br>
                            <code style="color: #ccc;">    ]</code><br>
                            <code style="color: #ccc;">  }</code><br>
                            <code style="color: #ccc;">}</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🚀</span>
                        <div>
                            <strong>活用例</strong><br>
                            • 編集前に自動でgit stash<br>
                            • コミット前にlint/format自動実行<br>
                            • セッション終了時に未コミット警告
                        </div>
                    </div>
                `
            }
        ],
        quiz: [
            {
                question: "pre-commit フックはいつ実行される？",
                options: [
                    "プッシュする前",
                    "コミットする前",
                    "マージする前",
                    "クローンする前"
                ],
                correct: 1,
                explanation: "pre-commitフックはgit commitを実行した時、コミットが作成される前に実行されます。"
            },
            {
                question: "Git フックファイルはどこにある？",
                options: [
                    ".github/hooks/",
                    ".git/hooks/",
                    "hooks/",
                    "~/.githooks/"
                ],
                correct: 1,
                explanation: "Git フックファイルは .git/hooks/ ディレクトリ内にあります。"
            },
            {
                question: "huskyを使う利点は？",
                options: [
                    "フックが速くなる",
                    "フック設定をチームで共有できる",
                    "Gitが不要になる",
                    "自動的にコードを書いてくれる"
                ],
                correct: 1,
                explanation: "huskyを使うとpackage.jsonで管理でき、チーム全員が同じフックを使えます。"
            }
        ]
    },

    10: {
        title: "エンタープライズGit戦略",
        description: "大規模開発、サブモジュール、モノレポ",
        difficulty: "master",
        estimatedTime: "100分",
        lessons: [
            {
                title: "Git Submodules",
                content: `
                    <h2 class="lesson-title">📦 Git Submodules - リポジトリの中にリポジトリ</h2>
                    <p class="lesson-text">
                        <strong>Submodule</strong>は、リポジトリ内に<br>
                        <strong>別のリポジトリ</strong>を埋め込む機能。
                        <br><br>
                        共有ライブラリや設定を複数プロジェクトで使う時に便利。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># サブモジュールを追加</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git submodule add https://github.com/lib/shared.git libs/shared</code>
                            <br><br>
                            <code style="color: #666;"># サブモジュールを含めてクローン</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git clone --recurse-submodules https://github.com/my/repo.git</code>
                            <br><br>
                            <code style="color: #666;"># 既存クローンでサブモジュールを初期化</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git submodule update --init --recursive</code>
                            <br><br>
                            <code style="color: #666;"># サブモジュールを最新に更新</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git submodule update --remote</code>
                        </div>
                    </div>
                    <div class="lesson-tip warning">
                        <span class="tip-icon">⚠️</span>
                        <div>
                            <strong>注意点</strong><br>
                            サブモジュールは特定のコミットを指す。<br>
                            更新したら親リポジトリでもコミットが必要。
                        </div>
                    </div>
                `
            },
            {
                title: "モノレポ戦略",
                content: `
                    <h2 class="lesson-title">🏗️ モノレポ - 単一リポジトリ戦略</h2>
                    <p class="lesson-text">
                        <strong>モノレポ（Monorepo）</strong>は、複数のプロジェクトを<br>
                        <strong>1つのリポジトリ</strong>で管理する戦略。
                        <br><br>
                        Google、Facebook、Microsoftなど大企業が採用。
                    </p>
                    <div class="lesson-visual">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <h4 style="margin-bottom: 12px;">マルチレポ</h4>
                                <div style="background: var(--bg-card); padding: 16px; border-radius: 8px; font-size: 13px;">
                                    📦 frontend-repo/<br>
                                    📦 backend-repo/<br>
                                    📦 mobile-repo/<br>
                                    📦 shared-lib-repo/
                                </div>
                            </div>
                            <div>
                                <h4 style="margin-bottom: 12px;">モノレポ</h4>
                                <div style="background: var(--bg-card); padding: 16px; border-radius: 8px; font-size: 13px;">
                                    📦 company-repo/<br>
                                    ├── apps/frontend/<br>
                                    ├── apps/backend/<br>
                                    ├── apps/mobile/<br>
                                    └── packages/shared/
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 12px;">モノレポツール</h4>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <div class="diagram-box" style="flex: 1; min-width: 120px;">
                                <strong>Nx</strong><br>
                                <small>高機能ビルドシステム</small>
                            </div>
                            <div class="diagram-box" style="flex: 1; min-width: 120px;">
                                <strong>Turborepo</strong><br>
                                <small>高速ビルドキャッシュ</small>
                            </div>
                            <div class="diagram-box" style="flex: 1; min-width: 120px;">
                                <strong>Lerna</strong><br>
                                <small>npm パッケージ管理</small>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                title: "Git LFS - 大容量ファイル管理",
                content: `
                    <h2 class="lesson-title">💾 Git LFS - 大容量ファイル管理</h2>
                    <p class="lesson-text">
                        <strong>Git LFS（Large File Storage）</strong>は、<br>
                        大きなファイル（画像、動画、モデル等）を効率的に管理。
                    </p>
                    <div class="lesson-visual">
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># LFSをインストール</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git lfs install</code>
                            <br><br>
                            <code style="color: #666;"># 追跡するファイルタイプを指定</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git lfs track "*.psd"</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git lfs track "*.mp4"</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git lfs track "*.model"</code>
                            <br><br>
                            <code style="color: #666;"># .gitattributes が作成される</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> cat .gitattributes</code><br>
                            <code style="color: #ccc;">*.psd filter=lfs diff=lfs merge=lfs -text</code><br>
                            <code style="color: #ccc;">*.mp4 filter=lfs diff=lfs merge=lfs -text</code>
                            <br><br>
                            <code style="color: #666;"># 通常通りadd/commitでOK</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git add design.psd && git commit -m "Add design"</code>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🤖</span>
                        <div>
                            <strong>AI開発での活用</strong><br>
                            機械学習モデル(.h5, .pt)やデータセットの管理に最適！
                        </div>
                    </div>
                `
            },
            {
                title: "大規模リポジトリの最適化",
                content: `
                    <h2 class="lesson-title">⚡ 大規模リポジトリの最適化</h2>
                    <p class="lesson-text">
                        巨大なリポジトリでも<strong>高速に作業</strong>するためのテクニック。
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">パーシャルクローン</h4>
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># blobless clone（ファイル内容は後で取得）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git clone --filter=blob:none https://github.com/huge/repo.git</code>
                            <br><br>
                            <code style="color: #666;"># treeless clone（ツリーも後で取得）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git clone --filter=tree:0 https://github.com/huge/repo.git</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 16px;">スパースチェックアウト</h4>
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># 特定のディレクトリだけをチェックアウト</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git sparse-checkout init --cone</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git sparse-checkout set apps/frontend packages/shared</code>
                        </div>
                    </div>
                    <div class="lesson-visual" style="margin-top: 20px;">
                        <h4 style="margin-bottom: 16px;">リポジトリのメンテナンス</h4>
                        <div style="background: #1E1E1E; border-radius: 12px; padding: 20px; text-align: left;">
                            <code style="color: #666;"># ガベージコレクション</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git gc --aggressive</code>
                            <br><br>
                            <code style="color: #666;"># メンテナンス（Git 2.30+）</code><br>
                            <code style="color: #27C93F;">$</code>
                            <code style="color: white;"> git maintenance start</code>
                        </div>
                    </div>
                `
            },
            {
                title: "Git戦略まとめ - エンジニアへの道",
                content: `
                    <h2 class="lesson-title">🏆 Git戦略まとめ</h2>
                    <p class="lesson-text">
                        これであなたは<strong>Codex開発エンジニアレベル</strong>のGit知識を習得！
                    </p>
                    <div class="lesson-visual">
                        <h4 style="margin-bottom: 16px;">習得したスキル</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                            <div class="diagram-box">
                                ✅ 基本操作<br>
                                <small>init, add, commit, push, pull</small>
                            </div>
                            <div class="diagram-box">
                                ✅ ブランチ戦略<br>
                                <small>branch, merge, rebase</small>
                            </div>
                            <div class="diagram-box">
                                ✅ 高度な操作<br>
                                <small>cherry-pick, stash, worktree</small>
                            </div>
                            <div class="diagram-box">
                                ✅ デバッグ<br>
                                <small>bisect, reflog, blame</small>
                            </div>
                            <div class="diagram-box">
                                ✅ 自動化<br>
                                <small>hooks, CI/CD, Actions</small>
                            </div>
                            <div class="diagram-box">
                                ✅ 大規模開発<br>
                                <small>submodules, monorepo, LFS</small>
                            </div>
                        </div>
                    </div>
                    <div class="lesson-tip">
                        <span class="tip-icon">🚀</span>
                        <div>
                            <strong>次のステップ</strong><br>
                            • 実際のプロジェクトでworktreeを使った並列開発を試す<br>
                            • Codexと組み合わせてAI駆動開発を実践<br>
                            • オープンソースプロジェクトに貢献する
                        </div>
                    </div>
                `
            }
        ],
        quiz: [
            {
                question: "Git Submoduleの用途は？",
                options: [
                    "ファイルを分割する",
                    "別のリポジトリを埋め込む",
                    "ブランチを作成する",
                    "コミットを圧縮する"
                ],
                correct: 1,
                explanation: "Submoduleは別のリポジトリをメインリポジトリ内に埋め込み、共有ライブラリなどを管理します。"
            },
            {
                question: "モノレポの利点は？",
                options: [
                    "リポジトリが軽くなる",
                    "コード共有とアトミックな変更が容易",
                    "自動的にテストが通る",
                    "インターネット接続が不要"
                ],
                correct: 1,
                explanation: "モノレポは複数プロジェクト間のコード共有が容易で、一度のコミットで関連する変更を行えます。"
            },
            {
                question: "Git LFSは何のために使う？",
                options: [
                    "コードの圧縮",
                    "大容量ファイル（画像、動画等）の効率的な管理",
                    "高速なクローン",
                    "自動マージ"
                ],
                correct: 1,
                explanation: "Git LFSは大容量バイナリファイルを効率的に管理し、リポジトリの肥大化を防ぎます。"
            },
            {
                question: "スパースチェックアウトの利点は？",
                options: [
                    "コードが自動的に書かれる",
                    "必要なディレクトリだけをチェックアウトできる",
                    "コミットが高速になる",
                    "マージが不要になる"
                ],
                correct: 1,
                explanation: "巨大なモノレポでも、作業に必要な部分だけをチェックアウトして効率的に作業できます。"
            }
        ]
    }
};

// ===========================================
// 上級用語集の追加
// ===========================================

const ADVANCED_GLOSSARY = [
    { term: "Rebase", reading: "リベース", category: "上級", definition: "ブランチの基点を移動し、直線的な履歴を作る操作。" },
    { term: "Cherry-pick", reading: "チェリーピック", category: "上級", definition: "特定のコミットだけを別のブランチに適用する操作。" },
    { term: "Stash", reading: "スタッシュ", category: "中級", definition: "作業中の変更を一時的に退避する機能。" },
    { term: "Worktree", reading: "ワークツリー", category: "上級", definition: "1つのリポジトリに複数の作業ディレクトリを作る機能。" },
    { term: "Bisect", reading: "バイセクト", category: "上級", definition: "二分探索でバグが混入したコミットを特定する機能。" },
    { term: "Reflog", reading: "リフログ", category: "上級", definition: "HEADの移動履歴を記録し、消えたコミットも復元可能。" },
    { term: "Hook", reading: "フック", category: "上級", definition: "特定のGitイベント時に自動でスクリプトを実行する仕組み。" },
    { term: "Submodule", reading: "サブモジュール", category: "エキスパート", definition: "リポジトリ内に別のリポジトリを埋め込む機能。" },
    { term: "Monorepo", reading: "モノレポ", category: "エキスパート", definition: "複数のプロジェクトを1つのリポジトリで管理する戦略。" },
    { term: "Git LFS", reading: "ギット・エルエフエス", category: "エキスパート", definition: "大容量ファイルを効率的に管理するための拡張機能。" },
    { term: "Sparse Checkout", reading: "スパースチェックアウト", category: "エキスパート", definition: "リポジトリの一部だけをチェックアウトする機能。" },
    { term: "Partial Clone", reading: "パーシャルクローン", category: "エキスパート", definition: "必要なオブジェクトだけを取得するクローン方式。" },
    { term: "Interactive Rebase", reading: "インタラクティブリベース", category: "上級", definition: "コミット履歴を対話的に編集・整理する機能。" },
    { term: "Squash", reading: "スカッシュ", category: "上級", definition: "複数のコミットを1つに統合する操作。" },
    { term: "Fixup", reading: "フィックスアップ", category: "上級", definition: "コミットを統合時にメッセージを破棄する操作。" },
    { term: "CI/CD", reading: "シーアイ・シーディー", category: "DevOps", definition: "継続的インテグレーション・継続的デリバリーの略。自動テスト・デプロイの仕組み。" },
    { term: "GitHub Actions", reading: "ギットハブ・アクションズ", category: "DevOps", definition: "GitHubの CI/CD プラットフォーム。" }
];

// ===========================================
// 上級実績
// ===========================================

const ADVANCED_ACHIEVEMENTS = [
    { id: "stage_6_clear", name: "リベースマスター", desc: "ステージ6をクリア", icon: "🔄", unlocked: false },
    { id: "stage_7_clear", name: "並列開発者", desc: "ステージ7をクリア", icon: "🌳", unlocked: false },
    { id: "stage_8_clear", name: "デバッグ探偵", desc: "ステージ8をクリア", icon: "🔍", unlocked: false },
    { id: "stage_9_clear", name: "自動化エンジニア", desc: "ステージ9をクリア", icon: "🤖", unlocked: false },
    { id: "stage_10_clear", name: "エンタープライズ級", desc: "ステージ10をクリア", icon: "🏗️", unlocked: false },
    { id: "worktree_master", name: "Worktreeマスター", desc: "worktreeを5回以上作成", icon: "🌿", unlocked: false },
    { id: "rebase_expert", name: "Rebaseエキスパート", desc: "interactive rebaseを完了", icon: "✨", unlocked: false },
    { id: "codex_ready", name: "Codex Ready", desc: "全上級ステージをクリア", icon: "🚀", unlocked: false },
    { id: "perfect_advanced", name: "上級パーフェクト", desc: "上級クイズで全問正解", icon: "💎", unlocked: false },
    { id: "git_sensei", name: "Git先生", desc: "レベル10に到達", icon: "🎓", unlocked: false }
];

// ===========================================
// シミュレーター拡張（上級コマンド対応）
// ===========================================

function processAdvancedCommand(command, simulator) {
    const parts = command.split(' ');
    const baseCmd = parts.slice(0, 2).join(' ');

    // git stash
    if (command === 'git stash' || command.startsWith('git stash save')) {
        if (!simulator.stash) simulator.stash = [];
        const stashEntry = {
            id: simulator.stash.length,
            files: [...simulator.files.filter(f => f.status !== 'committed')],
            message: command.includes('save') ? command.split('"')[1] || 'WIP' : 'WIP'
        };
        simulator.stash.push(stashEntry);
        simulator.files.forEach(f => {
            if (f.status !== 'committed') f.status = 'committed';
        });
        return { success: true, message: `Saved working directory and index state: ${stashEntry.message}` };
    }

    if (command === 'git stash list') {
        if (!simulator.stash || simulator.stash.length === 0) {
            return { success: true, message: 'No stash entries.' };
        }
        const list = simulator.stash.map((s, i) => `stash@{${i}}: ${s.message}`).join('\n');
        return { success: true, message: list };
    }

    if (command === 'git stash pop') {
        if (!simulator.stash || simulator.stash.length === 0) {
            return { success: false, message: 'No stash entries to apply.' };
        }
        const stash = simulator.stash.pop();
        stash.files.forEach(f => {
            const existing = simulator.files.find(ef => ef.name === f.name);
            if (existing) existing.status = f.status;
        });
        return { success: true, message: `Dropped refs/stash@{0}` };
    }

    // git rebase
    if (baseCmd === 'git rebase') {
        const target = parts[2];
        if (!target) {
            return { success: false, message: 'Usage: git rebase <branch>' };
        }
        if (!simulator.branches.includes(target)) {
            return { success: false, message: `fatal: invalid upstream '${target}'` };
        }
        return { success: true, message: `Successfully rebased and updated refs/heads/${simulator.currentBranch}.` };
    }

    // git worktree
    if (baseCmd === 'git worktree') {
        const action = parts[2];

        if (action === 'list') {
            if (!simulator.worktrees) simulator.worktrees = [{ path: '/project', branch: simulator.currentBranch }];
            const list = simulator.worktrees.map(w => `${w.path}  [${w.branch}]`).join('\n');
            return { success: true, message: list };
        }

        if (action === 'add') {
            if (!simulator.worktrees) simulator.worktrees = [{ path: '/project', branch: simulator.currentBranch }];
            const path = parts[3];
            const branch = parts[4] || parts[3].split('/').pop();

            if (parts[3] === '-b') {
                // git worktree add -b <branch> <path>
                const newBranch = parts[4];
                const newPath = parts[5];
                if (!simulator.branches.includes(newBranch)) {
                    simulator.branches.push(newBranch);
                }
                simulator.worktrees.push({ path: newPath, branch: newBranch });
                return { success: true, message: `Preparing worktree (new branch '${newBranch}')\nHEAD is now at ${generateHash()}` };
            }

            simulator.worktrees.push({ path, branch });
            return { success: true, message: `Preparing worktree (checking out '${branch}')\nHEAD is now at ${generateHash()}` };
        }

        if (action === 'remove') {
            const path = parts[3];
            if (simulator.worktrees) {
                simulator.worktrees = simulator.worktrees.filter(w => w.path !== path);
            }
            return { success: true, message: `Removing worktree '${path}'` };
        }
    }

    // git bisect
    if (baseCmd === 'git bisect') {
        const action = parts[2];

        if (action === 'start') {
            simulator.bisecting = true;
            return { success: true, message: 'Bisecting: started' };
        }

        if (action === 'good' || action === 'bad') {
            if (!simulator.bisecting) {
                return { success: false, message: 'You need to start by "git bisect start"' };
            }
            return { success: true, message: `Bisecting: ${Math.floor(Math.random() * 50)} revisions left to test` };
        }

        if (action === 'reset') {
            simulator.bisecting = false;
            return { success: true, message: `Previous HEAD position was ${generateHash()}` };
        }
    }

    // git reflog
    if (command === 'git reflog') {
        const entries = [
            `${generateHash()} HEAD@{0}: commit: Latest change`,
            `${generateHash()} HEAD@{1}: checkout: moving from feature to main`,
            `${generateHash()} HEAD@{2}: commit: Previous change`,
            `${generateHash()} HEAD@{3}: rebase finished: returning to refs/heads/main`
        ];
        return { success: true, message: entries.join('\n') };
    }

    // git cherry-pick
    if (baseCmd === 'git cherry-pick') {
        const commitHash = parts[2];
        if (!commitHash) {
            return { success: false, message: 'Usage: git cherry-pick <commit>' };
        }
        return { success: true, message: `[${simulator.currentBranch} ${generateHash()}] Cherry-picked commit` };
    }

    return null; // コマンドが認識されない場合
}

function generateHash() {
    return Math.random().toString(36).substring(2, 9);
}

// ===========================================
// 初期化関数
// ===========================================

function initAdvancedContent() {
    // STAGESに上級ステージを追加
    if (typeof STAGES !== 'undefined') {
        Object.assign(STAGES, ADVANCED_STAGES);
    }

    // 用語集に追加
    if (typeof GLOSSARY !== 'undefined') {
        GLOSSARY.push(...ADVANCED_GLOSSARY);
    }

    // 実績に追加
    if (typeof ACHIEVEMENTS !== 'undefined') {
        ACHIEVEMENTS.push(...ADVANCED_ACHIEVEMENTS);
    }

    // XPレベルテーブルを拡張
    if (typeof XP_LEVELS !== 'undefined') {
        XP_LEVELS.push(6500, 8000, 10000, 12500, 15000); // レベル11-15追加
    }

    console.log('✅ Advanced Git content loaded!');
    console.log('📚 Stages 6-10 available');
    console.log('🎯 New achievements unlocked');
}

// ページ読み込み時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedContent);
} else {
    initAdvancedContent();
}
