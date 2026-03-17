/**
 * ai-card.js
 * ─────────────────────────────────────────────
 * AIカードUIの構築と操作を担当する。
 *
 * UI構成（Gmail「文書作成サポート」風のシンプルデザイン）:
 *   - トリガーボタン（入力欄付近に表示）
 *   - AIカード（ミニカードUI）
 *     - 意図入力テキストエリア
 *     - 作成ボタン
 *     - プレビュー表示
 *     - 操作ボタン（再生成、入力欄に挿入）
 *
 * 重要:
 *   - innerHTML を乱用しない（XSS防止）
 *   - textContent ベースで表示する
 *   - 送信ボタンは絶対に押さない
 */

// eslint-disable-next-line no-var
var CW_CARD = (() => {
  'use strict';

  // ── 状態管理 ──
  let _state = {
    isOpen: false,
    isLoading: false,
    currentDraft: '',
    previousDraft: '',
    currentTone: 'neutral',
    toneLabel: '',
    notes: '',
    error: '',
  };

  // ── DOM参照 ──
  let _els = {};

  // ── トーン定義（最低限の2つだけ） ──
  const TONES = [
    { key: 'polite', label: '丁寧に', icon: '🎩' },
    { key: 'short', label: '短く', icon: '✂️' },
  ];

  // ─────────────────────────────────────────────
  // DOM要素生成ヘルパー（innerHTML を避ける）
  // ─────────────────────────────────────────────

  function el(tag, attrs = {}, children = []) {
    const elem = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') {
        elem.className = val;
      } else if (key === 'textContent') {
        elem.textContent = val;
      } else if (key.startsWith('on')) {
        elem.addEventListener(key.slice(2).toLowerCase(), val);
      } else {
        elem.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        elem.appendChild(document.createTextNode(child));
      } else if (child) {
        elem.appendChild(child);
      }
    }
    return elem;
  }

  // ─────────────────────────────────────────────
  // トリガーボタンの生成
  // ─────────────────────────────────────────────

  function createTriggerButton() {
    return el('button', {
      className: 'cw-ai-trigger-btn',
      title: 'AI返信の下書きを作成（送信はしません）',
      onClick: toggleCard,
    }, [
      el('span', { className: 'cw-ai-trigger-btn__icon', textContent: '✨' }),
      el('span', { textContent: 'AI返信' }),
    ]);
  }

  // ─────────────────────────────────────────────
  // AIカード本体の生成（Gmail風シンプルUI）
  // ─────────────────────────────────────────────

  function createCard() {
    // ── ヘッダー ──
    const closeBtn = el('button', {
      className: 'cw-ai-card__close-btn',
      title: '閉じる',
      textContent: '×',
      onClick: closeCard,
    });

    const header = el('div', { className: 'cw-ai-card__header' }, [
      el('div', { className: 'cw-ai-card__title' }, [
        el('span', { className: 'cw-ai-card__title-icon', textContent: '✨' }),
        el('span', { textContent: 'AI返信サポート' }),
      ]),
      closeBtn,
    ]);

    // ── テキスト入力エリア ──
    const textarea = el('textarea', {
      className: 'cw-ai-card__textarea',
      placeholder: 'どう返信したいですか？\n例: ミスをお詫び、日程を提案、丁寧にお断り…',
    });
    textarea.rows = 2;

    // Enter で送信（Shift+Enter で改行）
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !_state.isLoading) {
        e.preventDefault();
        handleSuggest();
      }
    });

    const inputArea = el('div', { className: 'cw-ai-card__input-area' }, [textarea]);

    // ── 作成ボタン ──
    const suggestBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--primary cw-ai-card__btn--suggest',
      onClick: handleSuggest,
    }, [
      el('span', { textContent: '✨ 返信を提案' }),
    ]);

    const actions = el('div', { className: 'cw-ai-card__actions' }, [suggestBtn]);

    // ── ステータス表示（ローディング・エラー） ──
    const statusEl = el('div', { className: 'cw-ai-card__status' });

    // ── トーン情報表示 ──
    const toneInfo = el('div', { className: 'cw-ai-card__tone-info' });

    // ── プレビューエリア ──
    const preview = el('div', { className: 'cw-ai-card__preview' });

    // ── 注意メモ ──
    const notesEl = el('div', { className: 'cw-ai-card__notes' });

    // ── フッター（操作ボタン） ──
    const toneButtons = TONES.map(tone =>
      el('button', {
        className: 'cw-ai-card__btn cw-ai-card__btn--tone',
        'data-tone': tone.key,
        onClick: () => handleToneChange(tone.key),
      }, [
        el('span', { textContent: tone.icon + ' ' + tone.label }),
      ])
    );

    const retryBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--secondary',
      onClick: handleRetry,
    }, [el('span', { textContent: '🔄 再生成' })]);

    const insertBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--insert',
      onClick: handleInsert,
    }, [el('span', { textContent: '📥 入力欄に挿入' })]);

    const footer = el('div', { className: 'cw-ai-card__footer' }, [
      el('div', { className: 'cw-ai-card__footer-left' }, [retryBtn, ...toneButtons]),
      insertBtn,
    ]);

    // ── カード本体 ──
    const card = el('div', { className: 'cw-ai-card' }, [
      header,
      inputArea,
      actions,
      statusEl,
      toneInfo,
      preview,
      notesEl,
      footer,
    ]);

    // DOM参照を保存
    _els = {
      card,
      textarea,
      suggestBtn,
      toneButtons,
      statusEl,
      toneInfo,
      preview,
      notesEl,
      footer,
      retryBtn,
      insertBtn,
    };

    return card;
  }

  // ─────────────────────────────────────────────
  // UI更新
  // ─────────────────────────────────────────────

  function updateUI() {
    if (!_els.card) return;

    // カード表示/非表示
    _els.card.classList.toggle('cw-ai-card--visible', _state.isOpen);

    // ローディング状態
    if (_state.isLoading) {
      showStatus('loading', '下書きを考えています…');
      setButtonsDisabled(true);
    } else if (_state.error) {
      showStatus('error', _state.error);
      setButtonsDisabled(false);
    } else {
      hideStatus();
      setButtonsDisabled(false);
    }

    // プレビュー表示（改行を正しく処理）
    if (_state.currentDraft) {
      // textContent + white-space: pre-wrap で改行を反映
      _els.preview.textContent = _state.currentDraft;
      _els.preview.classList.add('cw-ai-card__preview--visible');
      _els.footer.classList.add('cw-ai-card__footer--visible');
    } else {
      _els.preview.textContent = '';
      _els.preview.classList.remove('cw-ai-card__preview--visible');
      _els.footer.classList.remove('cw-ai-card__footer--visible');
    }

    // トーン情報
    if (_state.toneLabel) {
      _els.toneInfo.textContent = 'トーン: ' + _state.toneLabel;
      _els.toneInfo.classList.add('cw-ai-card__tone-info--visible');
    } else {
      _els.toneInfo.classList.remove('cw-ai-card__tone-info--visible');
    }

    // 注意メモ
    if (_state.notes) {
      _els.notesEl.textContent = _state.notes;
      _els.notesEl.classList.add('cw-ai-card__notes--visible');
    } else {
      _els.notesEl.classList.remove('cw-ai-card__notes--visible');
    }
  }

  function showStatus(type, message) {
    _els.statusEl.className = 'cw-ai-card__status cw-ai-card__status--visible cw-ai-card__status--' + type;

    while (_els.statusEl.firstChild) {
      _els.statusEl.removeChild(_els.statusEl.firstChild);
    }

    if (type === 'loading') {
      const dots = el('div', { className: 'cw-ai-dots' }, [
        el('span', { className: 'cw-ai-dot' }),
        el('span', { className: 'cw-ai-dot' }),
        el('span', { className: 'cw-ai-dot' }),
      ]);
      _els.statusEl.appendChild(dots);
    }
    _els.statusEl.appendChild(document.createTextNode(message));
  }

  function hideStatus() {
    _els.statusEl.className = 'cw-ai-card__status';
    while (_els.statusEl.firstChild) {
      _els.statusEl.removeChild(_els.statusEl.firstChild);
    }
  }

  function setButtonsDisabled(disabled) {
    _els.suggestBtn.disabled = disabled;
    _els.toneButtons.forEach(btn => { btn.disabled = disabled; });
    if (_els.retryBtn) _els.retryBtn.disabled = disabled;
    if (_els.insertBtn) _els.insertBtn.disabled = disabled;
  }

  // ─────────────────────────────────────────────
  // イベントハンドラ
  // ─────────────────────────────────────────────

  function toggleCard() {
    _state.isOpen = !_state.isOpen;
    _state.error = '';
    updateUI();
    // 開いた時にテキストエリアにフォーカス
    if (_state.isOpen && _els.textarea) {
      setTimeout(() => _els.textarea.focus(), 100);
    }
  }

  function closeCard() {
    _state.isOpen = false;
    updateUI();
  }

  async function handleSuggest() {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, 'neutral', false);
  }

  async function handleToneChange(tone) {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, tone, false);
  }

  async function handleRetry() {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, _state.currentTone, true);
  }

  function handleInsert() {
    if (!_state.currentDraft) return;

    const success = CW_INSERT.insertToChatInput(_state.currentDraft);
    if (success) {
      _state.isOpen = false;
      _state.error = '';
      updateUI();
    } else {
      _state.error = '入力欄が見つかりませんでした。画面を更新して再試行してください。';
      updateUI();
    }
  }

  /**
   * 下書きリクエストの共通処理
   */
  async function requestDraft(intent, tone, retryMode) {
    _state.isLoading = true;
    _state.error = '';
    _state.currentTone = tone;
    updateUI();

    try {
      const customPrompt = await CW_TEMPLATES.loadCustomPrompt();

      const payload = CW_EXTRACT.buildPayload({
        intent,
        tone,
        retryMode,
        customPrompt,
        templateName: '',
      });

      const result = await CW_API.requestDraft(payload);

      if (result.ok) {
        _state.previousDraft = _state.currentDraft;
        // 改行を正規化（\r\n → \n、エスケープされた \\n → \n）
        let draft = result.draft || '';
        draft = draft.replace(/\\n/g, '\n');
        draft = draft.replace(/\r\n/g, '\n');
        _state.currentDraft = draft;
        _state.toneLabel = result.toneLabel || '';
        _state.notes = result.notes || '';
        _state.error = '';
      } else {
        _state.error = result.error || 'うまくいきませんでした。もう一度お試しください。';
      }
    } catch (e) {
      _state.error = 'うまくいきませんでした。しばらく待ってから再試行してください。';
    } finally {
      _state.isLoading = false;
      updateUI();
    }
  }

  // ─────────────────────────────────────────────
  // 初期化
  // ─────────────────────────────────────────────

  function init() {
    if (document.querySelector('.cw-ai-card')) return;

    const triggerBtn = createTriggerButton();
    const inputContainer = CW_SELECTORS.getInputContainer();

    if (inputContainer) {
      inputContainer.appendChild(triggerBtn);
    } else {
      document.body.appendChild(triggerBtn);
    }

    const card = createCard();
    document.body.appendChild(card);

    updateUI();
  }

  function destroy() {
    const existingCard = document.querySelector('.cw-ai-card');
    if (existingCard) existingCard.remove();

    const existingBtn = document.querySelector('.cw-ai-trigger-btn');
    if (existingBtn) existingBtn.remove();

    _els = {};
    _state = {
      isOpen: false,
      isLoading: false,
      currentDraft: '',
      previousDraft: '',
      currentTone: 'neutral',
      toneLabel: '',
      notes: '',
      error: '',
    };
  }

  return {
    init,
    destroy,
    toggleCard,
    closeCard,
  };
})();
