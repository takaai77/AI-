// Shared JavaScript for Chapter Pages

// Game State
let gameState = {
    level: 1,
    xp: 0,
    xpToNext: 100,
    completedChapters: [],
    currentChapter: 1,
    streak: 0,
    lastLogin: null,
    totalQuizScore: 0,
    quizAttempts: 0,
    badges: [],
    chapterProgress: {},
    wrongAnswers: []
};

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('codexMasteryState');
    if (saved) {
        gameState = { ...gameState, ...JSON.parse(saved) };
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('codexMasteryState', JSON.stringify(gameState));
}

// Add XP
function addXP(amount) {
    gameState.xp += amount;

    while (gameState.xp >= gameState.xpToNext) {
        gameState.xp -= gameState.xpToNext;
        gameState.level++;
        gameState.xpToNext = Math.floor(gameState.xpToNext * 1.2);
    }

    saveState();
    updateProgressBar();
}

// Update progress bar
function updateProgressBar() {
    const progressFill = document.querySelector('.progress-fill');
    const chapterId = getCurrentChapterId();
    const progress = gameState.chapterProgress[chapterId] || 0;
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
}

// Get current chapter ID from URL
function getCurrentChapterId() {
    const match = window.location.pathname.match(/chapter(\d+)/);
    return match ? parseInt(match[1]) : 1;
}

// Update chapter progress
function updateChapterProgress(progress) {
    const chapterId = getCurrentChapterId();
    gameState.chapterProgress[chapterId] = Math.max(
        gameState.chapterProgress[chapterId] || 0,
        progress
    );
    saveState();
    updateProgressBar();
}

// Complete chapter
function completeChapter(xpReward) {
    const chapterId = getCurrentChapterId();

    if (!gameState.completedChapters.includes(chapterId)) {
        gameState.completedChapters.push(chapterId);
        gameState.currentChapter = Math.max(gameState.currentChapter, chapterId + 1);
        addXP(xpReward);
        showCompletionModal(xpReward);
    }

    saveState();
}

// Show completion modal
function showCompletionModal(xp) {
    const modal = document.getElementById('completionModal');
    const xpDisplay = document.getElementById('completionXP');

    if (modal && xpDisplay) {
        xpDisplay.textContent = `+${xp} XP`;
        modal.classList.add('show');
    }
}

// Close completion modal
function closeCompletionModal() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Quiz functionality
let quizAnswered = {};

function selectOption(quizId, optionIndex, isCorrect, explanation) {
    if (quizAnswered[quizId]) return;

    const options = document.querySelectorAll(`#${quizId} .quiz-option`);
    const resultDiv = document.getElementById(`${quizId}-result`);
    const explanationDiv = document.getElementById(`${quizId}-explanation`);

    options.forEach((opt, idx) => {
        opt.style.pointerEvents = 'none';
        if (idx === optionIndex) {
            opt.classList.add(isCorrect ? 'correct' : 'wrong');
        }
    });

    if (resultDiv) {
        resultDiv.className = `quiz-result show ${isCorrect ? 'success' : 'fail'}`;
        resultDiv.innerHTML = isCorrect
            ? '🎯 正解！素晴らしい！ +10 XP'
            : '❌ 不正解... 解説を確認しよう';
    }

    if (explanationDiv) {
        explanationDiv.classList.add('show');
    }

    if (isCorrect) {
        addXP(10);
        gameState.totalQuizScore += 100;
    } else {
        // Save wrong answer for review
        gameState.wrongAnswers.push({
            chapterId: getCurrentChapterId(),
            quizId: quizId,
            timestamp: Date.now()
        });
    }

    gameState.quizAttempts++;
    quizAnswered[quizId] = true;
    saveState();

    // Update progress
    const answeredCount = Object.keys(quizAnswered).length;
    const totalQuizzes = document.querySelectorAll('.quiz-section').length;
    updateChapterProgress(Math.min(90, 50 + (answeredCount / totalQuizzes) * 40));
}

// Output exercise functionality
function submitOutput(exerciseId) {
    const textarea = document.getElementById(`${exerciseId}-input`);
    const feedback = document.getElementById(`${exerciseId}-feedback`);

    if (textarea && feedback && textarea.value.trim().length > 0) {
        feedback.classList.add('show');
        feedback.innerHTML = `
            <div style="color: var(--neon-green); margin-bottom: 10px;">📝 回答を記録しました！</div>
            <div style="color: var(--text-secondary);">
                アウトプットは学習の定着に最も効果的です。
                自分の言葉で説明できることが理解の証です。
            </div>
        `;
        addXP(15);
        updateChapterProgress(Math.min(100, (gameState.chapterProgress[getCurrentChapterId()] || 0) + 10));
    }
}

// Interactive example functionality
function runInteractive(exampleId) {
    const input = document.getElementById(`${exampleId}-input`);
    const result = document.getElementById(`${exampleId}-result`);

    if (input && result) {
        result.classList.add('show');
        result.innerHTML = `
            <div style="color: var(--neon-cyan); margin-bottom: 10px;">✨ プロンプトを実行しました</div>
            <div style="color: var(--text-secondary);">
                実際のCodexでは、このプロンプトに基づいてコードが生成されます。
                ポイント: ${getInteractiveFeedback(input.value)}
            </div>
        `;
        addXP(5);
    }
}

function getInteractiveFeedback(prompt) {
    if (prompt.length < 20) {
        return 'プロンプトが短すぎます。より具体的な指示を追加しましょう。';
    } else if (prompt.includes('例') || prompt.includes('example')) {
        return '例を含めているのは良いですね！Few-shot learningの活用です。';
    } else if (prompt.includes('ステップ') || prompt.includes('step')) {
        return '段階的な指示は効果的です！Chain of Thoughtの応用ですね。';
    }
    return 'プロンプトの構造を意識して、より具体的に書いてみましょう。';
}

// Scroll tracking for progress
let maxScroll = 0;
function trackScroll() {
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        updateChapterProgress(Math.min(50, maxScroll / 2));
    }
}

// Initialize
function initChapter() {
    loadState();
    updateProgressBar();

    // Track scroll
    window.addEventListener('scroll', trackScroll);

    // Mark as started
    const chapterId = getCurrentChapterId();
    if (!gameState.chapterProgress[chapterId]) {
        gameState.chapterProgress[chapterId] = 5;
        saveState();
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', initChapter);
