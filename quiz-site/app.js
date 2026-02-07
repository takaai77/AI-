(function () {
  const STORAGE_KEYS = {
    history: "kamui_quiz_history",
    checklist: "kamui_security_checklist",
    customQuestions: "kamui_custom_questions_v1"
  };

  const FOCUS_LABEL = {
    security: "セキュリティ",
    architecture: "設計",
    ops: "運用",
    incident: "インシデント対応"
  };

  const ALLOWED_FOCUS = new Set(["security", "architecture", "ops", "incident"]);

  const rawHistory = loadJSON(STORAGE_KEYS.history, []);
  const rawChecklist = loadJSON(STORAGE_KEYS.checklist, {});

  const state = {
    mode: "security",
    runningMode: "security",
    questions: [],
    current: 0,
    score: 0,
    securityAsked: 0,
    securityCorrect: 0,
    wrongIds: [],
    wrongCategories: [],
    answered: false,
    history: Array.isArray(rawHistory) ? rawHistory : [],
    checklist: typeof rawChecklist === "object" && rawChecklist !== null ? rawChecklist : {},
    customQuestions: sanitizeQuestionList(loadJSON(STORAGE_KEYS.customQuestions, [])),
    installPrompt: null
  };

  const el = {
    roadmap: document.getElementById("roadmap"),
    terms: document.getElementById("terms"),
    termSearch: document.getElementById("term-search"),
    checklist: document.getElementById("security-checklist"),
    dashboard: document.getElementById("dashboard"),
    installApp: document.getElementById("install-app"),
    networkStatus: document.getElementById("network-status"),
    modeSecurity: document.getElementById("mode-security"),
    modeAll: document.getElementById("mode-all"),
    modeReview: document.getElementById("mode-review"),
    modeIncident: document.getElementById("mode-incident"),
    count: document.getElementById("question-count"),
    historyText: document.getElementById("history-text"),
    startBtn: document.getElementById("start-quiz"),
    startDailyBtn: document.getElementById("start-daily"),
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
    copyResultBtn: document.getElementById("copy-result"),
    restartBtn: document.getElementById("restart-quiz"),
    adminForm: document.getElementById("admin-form"),
    adminCategory: document.getElementById("admin-category"),
    adminFocus: document.getElementById("admin-focus"),
    adminQuestion: document.getElementById("admin-question"),
    adminOption1: document.getElementById("admin-option-1"),
    adminOption2: document.getElementById("admin-option-2"),
    adminOption3: document.getElementById("admin-option-3"),
    adminOption4: document.getElementById("admin-option-4"),
    adminAnswer: document.getElementById("admin-answer"),
    adminAnalogy: document.getElementById("admin-analogy"),
    adminExplanation: document.getElementById("admin-explanation"),
    adminStatus: document.getElementById("admin-status"),
    adminReset: document.getElementById("admin-reset"),
    adminExport: document.getElementById("admin-export"),
    adminImportTrigger: document.getElementById("admin-import-trigger"),
    adminImportFile: document.getElementById("admin-import-file"),
    adminList: document.getElementById("admin-list")
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

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function seededShuffle(list, seedText) {
    let seed = 0;
    for (let i = 0; i < seedText.length; i += 1) {
      seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
    }

    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function todaySeedText() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function makeCustomId() {
    return `custom_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function sanitizeQuestion(raw, fallbackId) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const idRaw = typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : fallbackId;
    const focusRaw = typeof raw.focus === "string" ? raw.focus.trim() : "";
    const categoryRaw = typeof raw.category === "string" ? raw.category.trim() : "";
    const questionRaw = typeof raw.question === "string" ? raw.question.trim() : "";
    const optionsRaw = Array.isArray(raw.options)
      ? raw.options
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
          .slice(0, 4)
      : [];
    const answerRaw = Number(raw.answer);
    const explanationRaw = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
    const analogyRaw = typeof raw.analogy === "string" ? raw.analogy.trim() : "";

    if (!idRaw || !ALLOWED_FOCUS.has(focusRaw) || !categoryRaw || !questionRaw) {
      return null;
    }
    if (optionsRaw.length < 2) {
      return null;
    }
    if (!Number.isInteger(answerRaw) || answerRaw < 0 || answerRaw >= optionsRaw.length) {
      return null;
    }
    if (!explanationRaw || !analogyRaw) {
      return null;
    }

    return {
      id: idRaw.slice(0, 80),
      focus: focusRaw,
      category: categoryRaw.slice(0, 40),
      question: questionRaw.slice(0, 220),
      options: optionsRaw.map((item) => item.slice(0, 120)),
      answer: answerRaw,
      explanation: explanationRaw.slice(0, 220),
      analogy: analogyRaw.slice(0, 140)
    };
  }

  function sanitizeQuestionList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    const next = [];
    const idSet = new Set();
    for (let i = 0; i < list.length; i += 1) {
      const sanitized = sanitizeQuestion(list[i], makeCustomId());
      if (!sanitized) {
        continue;
      }
      if (idSet.has(sanitized.id)) {
        continue;
      }
      idSet.add(sanitized.id);
      next.push(sanitized);
    }
    return next.slice(0, 300);
  }

  function getAllQuestions() {
    return [...QUIZ_QUESTIONS, ...state.customQuestions];
  }

  function reviewQuestions(allQuestions) {
    const latest = state.history[0];
    if (!latest) {
      return allQuestions.filter((item) => item.focus === "security");
    }

    const wrongIds = Array.isArray(latest.wrongIds) ? latest.wrongIds : [];
    const byWrongIds = allQuestions.filter((item) => wrongIds.includes(item.id));
    if (byWrongIds.length >= 4) {
      return byWrongIds;
    }

    const wrongCategories = Array.isArray(latest.wrongCategories) ? latest.wrongCategories : [];
    const byWeakCategory = allQuestions.filter((item) => wrongCategories.includes(item.category));
    if (byWeakCategory.length >= 4) {
      return byWeakCategory;
    }

    return allQuestions.filter((item) => item.focus === "security");
  }

  function incidentQuestions(allQuestions) {
    const incident = allQuestions.filter((item) => item.focus === "incident");
    if (incident.length > 0) {
      return incident;
    }
    return allQuestions.filter((item) => item.focus === "security");
  }

  function byMode() {
    const allQuestions = getAllQuestions();
    if (state.mode === "all") {
      return allQuestions;
    }
    if (state.mode === "review") {
      return reviewQuestions(allQuestions);
    }
    if (state.mode === "incident") {
      return incidentQuestions(allQuestions);
    }
    return allQuestions.filter((item) => item.focus === "security");
  }

  function renderRoadmap() {
    el.roadmap.innerHTML = ROADMAP_ITEMS.map(
      (item) => `
        <article class="roadmap-item">
          <p class="roadmap-rank">${escapeHtml(item.rank)}</p>
          <p class="roadmap-title">${escapeHtml(item.title)}</p>
          <p class="roadmap-why">${escapeHtml(item.why)}</p>
        </article>
      `
    ).join("");
  }

  function renderTerms() {
    el.terms.innerHTML = TERM_CARDS.map(
      (item) => `
        <details class="term">
          <summary>${escapeHtml(item.term)}</summary>
          <div class="term-body">
            <p><strong>一言定義:</strong> ${escapeHtml(item.definition)}</p>
            <p><strong>たとえ話:</strong> ${escapeHtml(item.analogy)}</p>
            <p><strong>このシステム例:</strong> ${escapeHtml(item.project)}</p>
          </div>
        </details>
      `
    ).join("");
  }

  function filterTerms() {
    const keyword = (el.termSearch.value || "").trim().toLowerCase();
    const cards = Array.from(el.terms.querySelectorAll(".term"));
    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = keyword.length === 0 || text.includes(keyword) ? "" : "none";
    });
  }

  function renderChecklist() {
    el.checklist.innerHTML = SECURITY_CHECKLIST.map((item, index) => {
      const key = `c_${index}`;
      const checked = state.checklist[key] ? "checked" : "";
      return `
        <label class="check-item">
          <input type="checkbox" data-key="${key}" ${checked} />
          <p>${escapeHtml(item)}</p>
        </label>
      `;
    }).join("");

    el.checklist.querySelectorAll("input[type='checkbox']").forEach((node) => {
      node.addEventListener("change", (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) {
          return;
        }
        state.checklist[input.dataset.key] = input.checked;
        saveJSON(STORAGE_KEYS.checklist, state.checklist);
      });
    });
  }

  function renderHistory() {
    const latest = state.history[0];
    if (!latest) {
      el.historyText.textContent = "前回履歴: まだありません。";
      renderDashboard();
      return;
    }

    const secRate =
      latest.securityAsked && latest.securityAsked > 0
        ? Math.round((latest.securityCorrect / latest.securityAsked) * 100)
        : null;
    el.historyText.textContent =
      `前回履歴: ${latest.mode} / ${latest.score}問正解 / ${latest.total}問` +
      (secRate === null ? "" : ` / セキュリティ${secRate}%`) +
      ` (${latest.date})`;

    renderDashboard();
  }

  function renderDashboard() {
    if (state.history.length === 0) {
      el.dashboard.innerHTML = `
        <div class="dash-box">
          <p><strong>学習開始前</strong></p>
          <p>まずは「セキュリティ中心」12問で基礎を作るのがおすすめです。</p>
          <p>その後「インシデント対応」モードで事故時の初動を固めてください。</p>
        </div>
      `;
      return;
    }

    const latest = state.history[0];
    const recent = state.history.slice(0, 5);
    const avgRate =
      Math.round(
        (recent.reduce((sum, item) => sum + (item.total ? (item.score / item.total) * 100 : 0), 0) /
          recent.length) *
          10
      ) / 10;
    const weak = Array.isArray(latest.wrongCategories) ? Array.from(new Set(latest.wrongCategories)) : [];
    const customCount = state.customQuestions.length;

    const recommendText =
      weak.length > 0
        ? `次にやるべき領域: ${weak.slice(0, 3).map((item) => escapeHtml(item)).join(" / ")}`
        : "弱点カテゴリなし。全範囲モードで実力確認がおすすめです。";

    el.dashboard.innerHTML = `
      <div class="dash-box">
        <p><strong>直近5回の平均正答率:</strong> ${avgRate}%</p>
        <p><strong>前回モード:</strong> ${escapeHtml(latest.mode)}</p>
        <p>${recommendText}</p>
      </div>
      <div class="dash-box">
        <p><strong>今日の推奨:</strong> セキュリティ中心 8問 -> インシデント対応 8問 -> 弱点復習 8問</p>
        <p><strong>追加問題数:</strong> ${customCount}問（管理者セクションで編集可能）</p>
      </div>
    `;
  }

  function setMode(mode) {
    state.mode = mode;
    el.modeSecurity.classList.toggle("active", mode === "security");
    el.modeAll.classList.toggle("active", mode === "all");
    el.modeReview.classList.toggle("active", mode === "review");
    el.modeIncident.classList.toggle("active", mode === "incident");
    el.modeReview.classList.toggle("recommended", mode !== "review");
    el.modeIncident.classList.toggle("incident", true);
  }

  function startQuiz(daily) {
    const source = byMode();
    const count = Math.min(Number(el.count.value), source.length);
    if (!Number.isInteger(count) || count <= 0) {
      return;
    }

    state.runningMode = daily ? `daily:${state.mode}` : state.mode;
    state.questions = (daily ? seededShuffle(source, todaySeedText()) : shuffle(source)).slice(0, count);
    state.current = 0;
    state.score = 0;
    state.securityAsked = 0;
    state.securityCorrect = 0;
    state.wrongIds = [];
    state.wrongCategories = [];
    state.answered = false;

    el.setup.classList.add("hidden");
    el.panel.classList.remove("hidden");
    el.restartBtn.classList.add("hidden");
    el.copyResultBtn.classList.add("hidden");
    renderQuestion();
  }

  function renderQuestion() {
    const item = state.questions[state.current];
    if (!item) {
      finishQuiz();
      return;
    }

    state.answered = false;
    el.progressText.textContent = `${state.current + 1} / ${state.questions.length}`;
    el.scoreText.textContent = `正解 ${state.score} / ${state.current}`;
    el.meter.style.width = `${(state.current / state.questions.length) * 100}%`;
    el.category.textContent = `${item.category} | ${FOCUS_LABEL[item.focus] || item.focus}`;
    el.question.textContent = item.question;
    el.options.innerHTML = "";

    item.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-btn";
      button.dataset.index = String(index);
      button.textContent = `${index + 1}. ${option}`;
      button.addEventListener("click", onAnswer);
      el.options.appendChild(button);
    });

    el.feedback.classList.add("hidden");
    el.nextBtn.classList.add("hidden");
  }

  function onAnswer(event) {
    if (state.answered) {
      return;
    }

    const selected = Number(event.currentTarget.dataset.index);
    const item = state.questions[state.current];
    const correct = selected === item.answer;

    state.answered = true;
    if (item.focus === "security") {
      state.securityAsked += 1;
      if (correct) {
        state.securityCorrect += 1;
      }
    }

    if (correct) {
      state.score += 1;
    } else {
      state.wrongIds.push(item.id);
      state.wrongCategories.push(item.category);
    }

    el.options.querySelectorAll("button").forEach((button, index) => {
      const isCorrect = index === item.answer;
      button.disabled = true;
      if (isCorrect) {
        button.classList.add("correct");
      }
      if (!correct && index === selected) {
        button.classList.add("wrong");
      }
    });

    el.feedback.classList.remove("hidden");
    el.feedbackResult.textContent = correct ? "正解です" : "不正解です";
    el.feedbackResult.className = `feedback-result ${correct ? "ok" : "ng"}`;
    el.feedbackExplanation.textContent = item.explanation;
    el.feedbackAnalogy.textContent = `たとえ: ${item.analogy}`;
    el.scoreText.textContent = `正解 ${state.score} / ${state.current + 1}`;
    el.nextBtn.classList.remove("hidden");
  }

  function finishQuiz() {
    const total = state.questions.length;
    if (total === 0) {
      return;
    }

    const percent = Math.round((state.score / total) * 100);
    const secRate =
      state.securityAsked > 0 ? Math.round((state.securityCorrect / state.securityAsked) * 100) : null;
    const status =
      percent >= 85 ? "非常に良いです。" : percent >= 70 ? "良いです。弱点を1つ補強しましょう。" : "復習推奨です。";

    el.progressText.textContent = `${total} / ${total}`;
    el.scoreText.textContent = `正解 ${state.score} / ${total}`;
    el.meter.style.width = "100%";
    el.category.textContent = "結果";
    el.question.innerHTML =
      `学習結果: ${state.score} / ${total} (${percent}%)` +
      (secRate === null ? "" : `<br />セキュリティ正答率: ${secRate}%`) +
      `<br />${status}`;

    const weak = Array.from(new Set(state.wrongCategories)).slice(0, 4);
    el.options.innerHTML = `
      <div class="result-box">
        <strong>次に学ぶと効果が高い領域:</strong><br />
        ${weak.length ? weak.map((item) => escapeHtml(item)).join(" / ") : "弱点なし。次は実装演習へ進んでOK。"}
      </div>
    `;

    el.feedback.classList.add("hidden");
    el.nextBtn.classList.add("hidden");
    el.copyResultBtn.classList.remove("hidden");
    el.restartBtn.classList.remove("hidden");

    const date = new Date().toLocaleString("ja-JP");
    state.history.unshift({
      date,
      score: state.score,
      total,
      mode: state.runningMode,
      wrongIds: [...state.wrongIds],
      wrongCategories: [...new Set(state.wrongCategories)],
      securityAsked: state.securityAsked,
      securityCorrect: state.securityCorrect
    });
    state.history = state.history.slice(0, 20);
    saveJSON(STORAGE_KEYS.history, state.history);
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
    el.copyResultBtn.classList.add("hidden");
  }

  async function copyResult() {
    const latest = state.history[0];
    if (!latest) {
      return;
    }

    const rate = Math.round((latest.score / latest.total) * 100);
    const text = `学習結果: ${latest.mode} / ${latest.score}/${latest.total} (${rate}%)`;
    try {
      await navigator.clipboard.writeText(text);
      el.copyResultBtn.textContent = "コピー済み";
      setTimeout(() => {
        el.copyResultBtn.textContent = "結果をコピー";
      }, 1200);
    } catch (_error) {
      el.copyResultBtn.textContent = "コピー失敗";
      setTimeout(() => {
        el.copyResultBtn.textContent = "結果をコピー";
      }, 1200);
    }
  }

  function setAdminStatus(message, isError) {
    el.adminStatus.textContent = message;
    el.adminStatus.style.color = isError ? "#9d2f1d" : "#0c5f50";
  }

  function clearAdminForm() {
    el.adminForm.reset();
    el.adminFocus.value = "security";
    el.adminAnswer.value = "0";
    setAdminStatus("入力をクリアしました。", false);
  }

  function renderAdminList() {
    if (state.customQuestions.length === 0) {
      el.adminList.innerHTML = `
        <div class="dash-box">
          <p><strong>追加問題はまだありません。</strong></p>
          <p>上のフォームから追加すると、この端末だけに保存されます。</p>
        </div>
      `;
      return;
    }

    el.adminList.innerHTML = state.customQuestions
      .map(
        (item) => `
          <article class="admin-item">
            <div class="admin-item-head">
              <p class="admin-item-title">${escapeHtml(item.question)}</p>
              <button class="danger-btn" type="button" data-delete-id="${escapeHtml(item.id)}">削除</button>
            </div>
            <p class="admin-item-meta">[${escapeHtml(item.focus)}] ${escapeHtml(item.category)} / 選択肢${item.options.length}件</p>
          </article>
        `
      )
      .join("");
  }

  function addCustomQuestion(event) {
    event.preventDefault();

    const category = (el.adminCategory.value || "").trim();
    const focus = (el.adminFocus.value || "").trim();
    const question = (el.adminQuestion.value || "").trim();
    const options = [
      (el.adminOption1.value || "").trim(),
      (el.adminOption2.value || "").trim(),
      (el.adminOption3.value || "").trim(),
      (el.adminOption4.value || "").trim()
    ].filter((item) => item.length > 0);
    const answer = Number(el.adminAnswer.value);
    const analogy = (el.adminAnalogy.value || "").trim();
    const explanation = (el.adminExplanation.value || "").trim();

    if (!ALLOWED_FOCUS.has(focus)) {
      setAdminStatus("focus が不正です。", true);
      return;
    }
    if (!category || !question || !analogy || !explanation) {
      setAdminStatus("カテゴリ・問題文・たとえ・解説は必須です。", true);
      return;
    }
    if (options.length < 2) {
      setAdminStatus("選択肢は2つ以上必要です。", true);
      return;
    }
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      setAdminStatus("正解番号が選択肢数と一致していません。", true);
      return;
    }

    const custom = sanitizeQuestion(
      {
        id: makeCustomId(),
        focus,
        category,
        question,
        options,
        answer,
        explanation,
        analogy
      },
      makeCustomId()
    );

    if (!custom) {
      setAdminStatus("入力形式が不正です。", true);
      return;
    }

    state.customQuestions.unshift(custom);
    state.customQuestions = state.customQuestions.slice(0, 300);
    saveJSON(STORAGE_KEYS.customQuestions, state.customQuestions);
    renderAdminList();
    renderDashboard();
    setAdminStatus("問題を保存しました。", false);
    el.adminForm.reset();
    el.adminFocus.value = "security";
    el.adminAnswer.value = "0";
  }

  function onAdminListClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const deleteId = target.getAttribute("data-delete-id");
    if (!deleteId) {
      return;
    }

    state.customQuestions = state.customQuestions.filter((item) => item.id !== deleteId);
    saveJSON(STORAGE_KEYS.customQuestions, state.customQuestions);
    renderAdminList();
    renderDashboard();
    setAdminStatus("問題を削除しました。", false);
  }

  function exportCustomQuestions() {
    if (state.customQuestions.length === 0) {
      setAdminStatus("エクスポート対象がありません。", true);
      return;
    }

    const text = JSON.stringify(state.customQuestions, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-questions.json";
    link.click();
    URL.revokeObjectURL(url);
    setAdminStatus("エクスポートしました。", false);
  }

  async function importCustomQuestions(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = sanitizeQuestionList(parsed);
      if (imported.length === 0) {
        setAdminStatus("有効な問題が見つかりませんでした。", true);
        input.value = "";
        return;
      }

      const merged = sanitizeQuestionList([...state.customQuestions, ...imported]);
      state.customQuestions = merged;
      saveJSON(STORAGE_KEYS.customQuestions, state.customQuestions);
      renderAdminList();
      renderDashboard();
      setAdminStatus(`インポート完了: ${imported.length}問`, false);
      input.value = "";
    } catch (_error) {
      setAdminStatus("JSONの読み込みに失敗しました。", true);
      input.value = "";
    }
  }

  function updateNetworkStatus() {
    if (!el.networkStatus) {
      return;
    }
    if (navigator.onLine) {
      el.networkStatus.textContent = "オンライン";
      el.networkStatus.classList.remove("offline");
    } else {
      el.networkStatus.textContent = "オフライン（キャッシュ学習可）";
      el.networkStatus.classList.add("offline");
    }
  }

  function registerPwaFeatures() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {
          console.info("service worker registration failed");
        });
      });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      if (el.installApp) {
        el.installApp.classList.remove("hidden");
      }
    });

    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      if (el.installApp) {
        el.installApp.classList.add("hidden");
      }
    });

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    updateNetworkStatus();
  }

  async function installApp() {
    if (!state.installPrompt) {
      setAdminStatus("このブラウザではインストールボタンが表示されない場合があります。", true);
      return;
    }

    try {
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
    } catch (_error) {
      setAdminStatus("インストールに失敗しました。", true);
    } finally {
      state.installPrompt = null;
      el.installApp.classList.add("hidden");
    }
  }

  function bindEvents() {
    el.modeSecurity.addEventListener("click", () => setMode("security"));
    el.modeAll.addEventListener("click", () => setMode("all"));
    el.modeReview.addEventListener("click", () => setMode("review"));
    el.modeIncident.addEventListener("click", () => setMode("incident"));
    el.startBtn.addEventListener("click", () => startQuiz(false));
    el.startDailyBtn.addEventListener("click", () => startQuiz(true));
    el.nextBtn.addEventListener("click", onNext);
    el.copyResultBtn.addEventListener("click", copyResult);
    el.restartBtn.addEventListener("click", resetToSetup);
    el.termSearch.addEventListener("input", filterTerms);
    el.adminForm.addEventListener("submit", addCustomQuestion);
    el.adminReset.addEventListener("click", clearAdminForm);
    el.adminExport.addEventListener("click", exportCustomQuestions);
    el.adminImportTrigger.addEventListener("click", () => el.adminImportFile.click());
    el.adminImportFile.addEventListener("change", importCustomQuestions);
    el.adminList.addEventListener("click", onAdminListClick);
    if (el.installApp) {
      el.installApp.addEventListener("click", installApp);
    }
  }

  function init() {
    renderRoadmap();
    renderTerms();
    renderChecklist();
    renderAdminList();
    renderHistory();
    bindEvents();
    registerPwaFeatures();
    setMode("security");
  }

  init();
})();
