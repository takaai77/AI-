(function () {
  const state = {
    mode: "security",
    questions: [],
    current: 0,
    score: 0,
    wrongCategories: [],
    answered: false,
    history: loadJSON("kamui_quiz_history", []),
    checklist: loadJSON("kamui_security_checklist", {})
  };

  const el = {
    roadmap: document.getElementById("roadmap"),
    terms: document.getElementById("terms"),
    checklist: document.getElementById("security-checklist"),
    modeSecurity: document.getElementById("mode-security"),
    modeAll: document.getElementById("mode-all"),
    count: document.getElementById("question-count"),
    historyText: document.getElementById("history-text"),
    startBtn: document.getElementById("start-quiz"),
    setup: document.getElementById("quiz-setup"),
    panel: document.getElementById("quiz-panel"),
    progressText: document.getElementById("progress-text"),
    scoreText: document.getElementById("score-text"),
    meter: document.getElementById("progress-meter"),
    category: document.getElementById("quiz-category"),
    question: document.getElementById("quiz-question"),
    options: document.getElementById("quiz-options"),
    feedback: document.getElementById("quiz-feedback"),
    feedbackResult: document.getElementById("feedback-result"),
    feedbackExplanation: document.getElementById("feedback-explanation"),
    feedbackAnalogy: document.getElementById("feedback-analogy"),
    nextBtn: document.getElementById("next-question"),
    restartBtn: document.getElementById("restart-quiz")
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function byMode() {
    if (state.mode === "all") return QUIZ_QUESTIONS;
    return QUIZ_QUESTIONS.filter((item) => item.focus === "security");
  }

  function renderRoadmap() {
    el.roadmap.innerHTML = ROADMAP_ITEMS.map(
      (item) => `
        <article class="roadmap-item">
          <p class="roadmap-rank">${item.rank}</p>
          <p class="roadmap-title">${item.title}</p>
          <p class="roadmap-why">${item.why}</p>
        </article>
      `
    ).join("");
  }

  function renderTerms() {
    el.terms.innerHTML = TERM_CARDS.map(
      (item) => `
        <details class="term">
          <summary>${item.term}</summary>
          <div class="term-body">
            <p><strong>Definition:</strong> ${item.definition}</p>
            <p><strong>Analogy:</strong> ${item.analogy}</p>
            <p><strong>Project Example:</strong> ${item.project}</p>
          </div>
        </details>
      `
    ).join("");
  }

  function renderChecklist() {
    el.checklist.innerHTML = SECURITY_CHECKLIST.map((item, index) => {
      const key = `c_${index}`;
      const checked = state.checklist[key] ? "checked" : "";
      return `
        <label class="check-item">
          <input type="checkbox" data-key="${key}" ${checked} />
          <p>${item}</p>
        </label>
      `;
    }).join("");

    el.checklist.querySelectorAll("input[type='checkbox']").forEach((node) => {
      node.addEventListener("change", (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        state.checklist[input.dataset.key] = input.checked;
        saveJSON("kamui_security_checklist", state.checklist);
      });
    });
  }

  function renderHistory() {
    const latest = state.history[0];
    if (!latest) {
      el.historyText.textContent = "Last run: none";
      return;
    }

    el.historyText.textContent = `Last run: ${latest.mode} / ${latest.score} correct / ${latest.total} total (${latest.date})`;
  }

  function setMode(mode) {
    state.mode = mode;
    el.modeSecurity.classList.toggle("active", mode === "security");
    el.modeAll.classList.toggle("active", mode === "all");
  }

  function startQuiz() {
    const source = byMode();
    const count = Math.min(Number(el.count.value), source.length);
    state.questions = shuffle(source).slice(0, count);
    state.current = 0;
    state.score = 0;
    state.wrongCategories = [];
    state.answered = false;

    el.setup.classList.add("hidden");
    el.panel.classList.remove("hidden");
    el.restartBtn.classList.add("hidden");
    renderQuestion();
  }

  function renderQuestion() {
    const item = state.questions[state.current];
    state.answered = false;

    el.progressText.textContent = `${state.current + 1} / ${state.questions.length}`;
    el.scoreText.textContent = `Score ${state.score} / ${state.current}`;
    el.meter.style.width = `${(state.current / state.questions.length) * 100}%`;
    el.category.textContent = `${item.category} | ${item.focus === "security" ? "Security" : "Architecture/Ops"}`;
    el.question.textContent = item.question;

    el.options.innerHTML = item.options
      .map(
        (option, index) =>
          `<button class="option-btn" type="button" data-index="${index}">${index + 1}. ${option}</button>`
      )
      .join("");

    el.options.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", onAnswer);
    });

    el.feedback.classList.add("hidden");
    el.nextBtn.classList.add("hidden");
  }

  function onAnswer(event) {
    if (state.answered) return;
    const selected = Number(event.currentTarget.dataset.index);
    const item = state.questions[state.current];
    const correct = selected === item.answer;

    state.answered = true;
    if (correct) state.score += 1;
    if (!correct) state.wrongCategories.push(item.category);

    el.options.querySelectorAll("button").forEach((button, index) => {
      const isCorrect = index === item.answer;
      button.disabled = true;
      if (isCorrect) button.classList.add("correct");
      if (!correct && index === selected) button.classList.add("wrong");
    });

    el.feedback.classList.remove("hidden");
    el.feedbackResult.textContent = correct ? "Correct" : "Incorrect";
    el.feedbackResult.className = `feedback-result ${correct ? "ok" : "ng"}`;
    el.feedbackExplanation.textContent = item.explanation;
    el.feedbackAnalogy.textContent = `Analogy: ${item.analogy}`;

    el.scoreText.textContent = `Score ${state.score} / ${state.current + 1}`;
    el.nextBtn.classList.remove("hidden");
  }

  function finishQuiz() {
    const total = state.questions.length;
    const percent = Math.round((state.score / total) * 100);
    const status =
      percent >= 85
        ? "Excellent."
        : percent >= 70
          ? "Good. Review one weak area."
          : "Needs review. Revisit fundamentals.";

    el.progressText.textContent = `${total} / ${total}`;
    el.scoreText.textContent = `Score ${state.score} / ${total}`;
    el.meter.style.width = "100%";
    el.category.textContent = "Result";
    el.question.innerHTML = `
      Result: ${state.score} / ${total} (${percent}%)<br />
      ${status}
    `;

    const weak = Array.from(new Set(state.wrongCategories)).slice(0, 3);
    el.options.innerHTML = `
      <div class="result-box">
        <strong>High-impact review areas:</strong><br />
        ${weak.length ? weak.join(" / ") : "No weak category detected. Proceed to implementation drills."}
      </div>
    `;

    el.feedback.classList.add("hidden");
    el.nextBtn.classList.add("hidden");
    el.restartBtn.classList.remove("hidden");

    const date = new Date().toLocaleString("ja-JP");
    state.history.unshift({ date, score: state.score, total, mode: state.mode });
    state.history = state.history.slice(0, 10);
    saveJSON("kamui_quiz_history", state.history);
    renderHistory();
  }

  function onNext() {
    state.current += 1;
    if (state.current >= state.questions.length) {
      finishQuiz();
      return;
    }
    renderQuestion();
  }

  function resetToSetup() {
    el.panel.classList.add("hidden");
    el.setup.classList.remove("hidden");
  }

  function bindEvents() {
    el.modeSecurity.addEventListener("click", () => setMode("security"));
    el.modeAll.addEventListener("click", () => setMode("all"));
    el.startBtn.addEventListener("click", startQuiz);
    el.nextBtn.addEventListener("click", onNext);
    el.restartBtn.addEventListener("click", resetToSetup);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // no-op on registration failure
      });
    });
  }

  function init() {
    renderRoadmap();
    renderTerms();
    renderChecklist();
    renderHistory();
    bindEvents();
    setMode("security");
    registerServiceWorker();
  }

  init();
})();
