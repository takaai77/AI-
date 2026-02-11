const quizData = [
  {
    q: "「内タワビ」の正しい順番はどれ？",
    options: [
      "内部API → Cloud Tasks → Worker → BigQuery",
      "Worker → 内部API → BigQuery → Cloud Tasks",
      "BigQuery → Cloud Tasks → 内部API → Worker"
    ],
    correct: 0,
    explain: "受付してから整理券、作業、記録の順です。"
  },
  {
    q: "内部APIが最初にやるべきことは？",
    options: [
      "Playwrightでページを開く",
      "すぐ jobId を返し、処理はTasksに渡す",
      "BigQueryへ結果を書き込む"
    ],
    correct: 1,
    explain: "APIは重い処理をしない。すぐ返して後段に流します。"
  },
  {
    q: "Cloud Tasksを使う主な理由は？",
    options: [
      "待ち行列で順番管理し、リトライできるから",
      "画面の見た目を整えるため",
      "SQLを高速化するため"
    ],
    correct: 0,
    explain: "混雑時の安定運用と再試行が強みです。"
  },
  {
    q: "Workerのダミー処理として今回正しいのは？",
    options: [
      "PDFを作る",
      "URLへアクセスしてタイトルを取得する",
      "Slackに通知だけ送る"
    ],
    correct: 1,
    explain: "PlaywrightでURLへアクセスし、titleを取ります。"
  },
  {
    q: "ログ最低4点「成時エ依」に含まれないものは？",
    options: [
      "成功/失敗",
      "処理時間",
      "社員の評価スコア"
    ],
    correct: 2,
    explain: "記録対象は実行品質に関係する情報です。"
  },
  {
    q: "Cloud Tasksの同時実行制限を2にする意味は？",
    options: [
      "負荷を抑えてWorker側を守るため",
      "jobIdを短くするため",
      "BigQueryの列数を減らすため"
    ],
    correct: 0,
    explain: "安全運用のため、同時実行数は意図的に制御します。"
  }
];

const revealTargets = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.12 }
);
revealTargets.forEach((el) => observer.observe(el));

const quizProgress = document.getElementById("quiz-progress");
const quizQuestion = document.getElementById("quiz-question");
const quizOptions = document.getElementById("quiz-options");
const quizFeedback = document.getElementById("quiz-feedback");
const quizNext = document.getElementById("quiz-next");

let currentIndex = 0;
let score = 0;
let answered = false;

function renderQuiz() {
  const total = quizData.length;
  if (currentIndex >= total) {
    quizProgress.textContent = `完了 ${total}/${total}`;
    quizQuestion.textContent = `終了: ${score} / ${total} 正解`;
    quizOptions.innerHTML = "";
    quizFeedback.textContent = score >= total - 1 ? "ほぼ定着しています。" : "もう1周で定着率アップ。";
    quizFeedback.className = `quiz-feedback ${score >= total - 1 ? "good" : "bad"}`;
    quizNext.textContent = "最初から";
    quizNext.disabled = false;
    answered = true;
    return;
  }

  const item = quizData[currentIndex];
  quizProgress.textContent = `${currentIndex + 1} / ${total}`;
  quizQuestion.textContent = item.q;
  quizOptions.innerHTML = "";
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";
  quizNext.textContent = "次へ";
  quizNext.disabled = true;
  answered = false;

  item.options.forEach((optionText, optionIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-option";
    button.textContent = optionText;
    button.addEventListener("click", () => selectOption(button, optionIndex));
    quizOptions.appendChild(button);
  });
}

function selectOption(selectedButton, selectedIndex) {
  if (answered) {
    return;
  }

  answered = true;
  const item = quizData[currentIndex];
  const buttons = Array.from(document.querySelectorAll(".quiz-option"));

  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === item.correct) {
      button.classList.add("correct");
    }
  });

  const correct = selectedIndex === item.correct;
  if (correct) {
    score += 1;
    selectedButton.classList.add("correct");
    quizFeedback.textContent = `正解: ${item.explain}`;
    quizFeedback.className = "quiz-feedback good";
  } else {
    selectedButton.classList.add("wrong");
    quizFeedback.textContent = `不正解: ${item.explain}`;
    quizFeedback.className = "quiz-feedback bad";
  }

  quizNext.disabled = false;
}

quizNext.addEventListener("click", () => {
  if (currentIndex >= quizData.length) {
    currentIndex = 0;
    score = 0;
    renderQuiz();
    return;
  }

  if (!answered) {
    return;
  }

  currentIndex += 1;
  renderQuiz();
});

renderQuiz();

const checklistKey = "ops-automation-memory-checks-v1";
const checklistInputs = Array.from(document.querySelectorAll('#checklist input[type="checkbox"]'));
const resetButton = document.getElementById("reset-check");

function saveChecklist() {
  const state = {};
  checklistInputs.forEach((input) => {
    state[input.dataset.key] = input.checked;
  });
  localStorage.setItem(checklistKey, JSON.stringify(state));
}

function loadChecklist() {
  const raw = localStorage.getItem(checklistKey);
  if (!raw) {
    return;
  }
  try {
    const state = JSON.parse(raw);
    checklistInputs.forEach((input) => {
      if (state[input.dataset.key] === true) {
        input.checked = true;
      }
    });
  } catch (_error) {
    localStorage.removeItem(checklistKey);
  }
}

checklistInputs.forEach((input) => {
  input.addEventListener("change", saveChecklist);
});

resetButton.addEventListener("click", () => {
  checklistInputs.forEach((input) => {
    input.checked = false;
  });
  saveChecklist();
});

loadChecklist();
