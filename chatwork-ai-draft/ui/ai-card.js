/**
 * ai-card.js
 * ─────────────────────────────────────────────
 * AIカードUIの構築と操作を担当する。
 *
 * UI構成:
 *   - トリガーボタン（入力欄付近に表示）
 *   - AIカード（ミニカードUI）
 *     - テンプレート選択パネル（折りたたみ式）
 *     - 意図入力テキストエリア
 *     - 返信提案ボタン
 *     - トーン変更ボタン群
 *     - プレビュー表示
 *     - 操作ボタン（再生成、元に戻す、入力欄に挿入）
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
    templatePanelOpen: false,
    selectedTemplate: null,  // 選択中のテンプレートオブジェクト
  };

  // ── DOM参照 ──
  let _els = {};

  // ── トーン定義 ──
  const TONES = [
    { key: 'polite', label: '丁寧に', icon: '🎩' },
    { key: 'soft', label: 'やわらかく', icon: '🌸' },
    { key: 'short', label: '短く', icon: '✂️' },
    { key: 'summary', label: '要点だけ', icon: '📌' },
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
  // テンプレートパネルの生成
  // ─────────────────────────────────────────────

  function createTemplatePanel() {
    // トグルボタン
    const toggleBtn = el('button', {
      className: 'cw-ai-tpl__toggle',
      onClick: toggleTemplatePanel,
    }, [
      el('span', { textContent: '📋 テンプレートから選ぶ' }),
      el('span', { className: 'cw-ai-tpl__arrow', textContent: '▼' }),
    ]);

    // テンプレート一覧コンテナ（初期非表示）
    const listContainer = el('div', { className: 'cw-ai-tpl__list' });

    const panel = el('div', { className: 'cw-ai-tpl' }, [
      toggleBtn,
      listContainer,
    ]);

    return { panel, listContainer, toggleBtn };
  }

  /**
   * テンプレート一覧を非同期で構築する
   */
  async function renderTemplateList() {
    if (!_els.tplList) return;
    // 子要素をクリア
    while (_els.tplList.firstChild) {
      _els.tplList.removeChild(_els.tplList.firstChild);
    }

    const grouped = await CW_TEMPLATES.getTemplatesByCategory();

    for (const [category, templates] of grouped) {
      // カテゴリラベル
      _els.tplList.appendChild(
        el('div', { className: 'cw-ai-tpl__category', textContent: category })
      );

      for (const tpl of templates) {
        const chip = el('button', {
          className: 'cw-ai-tpl__chip' + (tpl.isPreset ? '' : ' cw-ai-tpl__chip--user'),
          title: tpl.intent,
          onClick: () => selectTemplate(tpl),
        }, [
          el('span', { className: 'cw-ai-tpl__chip-icon', textContent: tpl.icon || '📌' }),
          el('span', { textContent: tpl.name }),
        ]);
        _els.tplList.appendChild(chip);
      }
    }
  }

  /**
   * テンプレートを選択したとき
   */
  function selectTemplate(tpl) {
    _state.selectedTemplate = tpl;
    // テキストエリアにintentを反映
    if (_els.textarea) {
      _els.textarea.value = tpl.intent;
    }
    // トーンも反映
    if (tpl.tone) {
      _state.currentTone = tpl.tone;
    }
    // パネルを閉じる
    _state.templatePanelOpen = false;
    updateTemplatePanelUI();
  }

  function toggleTemplatePanel() {
    _state.templatePanelOpen = !_state.templatePanelOpen;
    updateTemplatePanelUI();
    if (_state.templatePanelOpen) {
      renderTemplateList();
    }
  }

  function updateTemplatePanelUI() {
    if (!_els.tplList || !_els.tplToggleBtn) return;
    _els.tplList.classList.toggle('cw-ai-tpl__list--open', _state.templatePanelOpen);
    const arrow = _els.tplToggleBtn.querySelector('.cw-ai-tpl__arrow');
    if (arrow) arrow.textContent = _state.templatePanelOpen ? '▲' : '▼';
  }

  // ─────────────────────────────────────────────
  // AIカード本体の生成
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

    // ── 安心バッジ ──
    const safeBadge = el('div', { className: 'cw-ai-card__safe-badge' }, [
      el('span', { className: 'cw-ai-card__safe-icon', textContent: '🔒' }),
      el('span', { textContent: '下書きのみ作成します。送信はされません。' }),
    ]);

    // ── テンプレートパネル ──
    const { panel: tplPanel, listContainer: tplList, toggleBtn: tplToggleBtn } = createTemplatePanel();

    // ── テキスト入力エリア ──
    const textarea = el('textarea', {
      className: 'cw-ai-card__textarea',
      placeholder: 'どう返信したいですか？\n例: 丁寧にお断りしたい、日程を提案したい…',
    });
    textarea.rows = 2;

    const inputArea = el('div', { className: 'cw-ai-card__input-area' }, [textarea]);

    // ── 提案ボタン ──
    const suggestBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--primary cw-ai-card__btn--suggest',
      onClick: handleSuggest,
    }, [
      el('span', { textContent: '✨ 返信を提案' }),
    ]);

    const actions = el('div', { className: 'cw-ai-card__actions' }, [suggestBtn]);

    // ── トーン変更ボタン群 ──
    const toneLabel = el('div', {
      className: 'cw-ai-card__section-label',
      textContent: 'トーンを変更',
    });

    const toneButtons = TONES.map(tone =>
      el('button', {
        className: 'cw-ai-card__btn cw-ai-card__btn--tone',
        'data-tone': tone.key,
        onClick: () => handleToneChange(tone.key),
      }, [
        el('span', { textContent: tone.icon + ' ' + tone.label }),
      ])
    );

    const toneGroup = el('div', { className: 'cw-ai-card__tone-group' }, [
      toneLabel,
      el('div', { className: 'cw-ai-card__tone-buttons' }, toneButtons),
    ]);

    // ── ステータス表示（ローディング・エラー） ──
    const statusEl = el('div', { className: 'cw-ai-card__status' });

    // ── トーン情報表示 ──
    const toneInfo = el('div', { className: 'cw-ai-card__tone-info' });

    // ── プレビューエリア ──
    const preview = el('div', { className: 'cw-ai-card__preview' });

    // ── 注意メモ ──
    const notesEl = el('div', { className: 'cw-ai-card__notes' });

    // ── フッター（操作ボタン） ──
    const retryBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--secondary',
      onClick: handleRetry,
    }, [el('span', { textContent: '🔄 再生成' })]);

    const undoBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--secondary',
      onClick: handleUndo,
    }, [el('span', { textContent: '↩️ 元に戻す' })]);

    const insertBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--insert',
      onClick: handleInsert,
    }, [el('span', { textContent: '📥 入力欄に挿入' })]);

    const footer = el('div', { className: 'cw-ai-card__footer' }, [
      el('div', { className: 'cw-ai-card__footer-left' }, [retryBtn, undoBtn]),
      insertBtn,
    ]);

    // ── カード本体 ──
    const card = el('div', { className: 'cw-ai-card' }, [
      header,
      safeBadge,
      tplPanel,
      inputArea,
      actions,
      toneGroup,
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
      undoBtn,
      insertBtn,
      tplList,
      tplToggleBtn,
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

    // プレビュー表示
    if (_state.currentDraft) {
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
      _els.notesEl.textContent = '💡 ' + _state.notes;
      _els.notesEl.classList.add('cw-ai-card__notes--visible');
    } else {
      _els.notesEl.classList.remove('cw-ai-card__notes--visible');
    }

    // 元に戻すボタンは前の下書きがある場合のみ有効
    if (_els.undoBtn) {
      _els.undoBtn.disabled = !_state.previousDraft;
    }
  }

  function showStatus(type, message) {
    _els.statusEl.className = 'cw-ai-card__status cw-ai-card__status--visible cw-ai-card__status--' + type;

    while (_els.statusEl.firstChild) {
      _els.statusEl.removeChild(_els.statusEl.firstChild);
    }

    if (type === 'loading') {
      // パルスドット風ローディング
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
    // カードを開いた時にテンプレート一覧をプリロード
    if (_state.isOpen && _state.templatePanelOpen) {
      renderTemplateList();
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

  function handleUndo() {
    if (_state.previousDraft) {
      const temp = _state.currentDraft;
      _state.currentDraft = _state.previousDraft;
      _state.previousDraft = temp;
      updateUI();
    }
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
   * カスタムプロンプトとテンプレート情報を含めて送信する
   */
  async function requestDraft(intent, tone, retryMode) {
    _state.isLoading = true;
    _state.error = '';
    _state.currentTone = tone;
    updateUI();

    try {
      // カスタムプロンプトを読み込む
      const customPrompt = await CW_TEMPLATES.loadCustomPrompt();
      const templateName = _state.selectedTemplate ? _state.selectedTemplate.name : '';

      // ペイロード組み立て
      const payload = CW_EXTRACT.buildPayload({
        intent,
        tone,
        retryMode,
        customPrompt,
        templateName,
      });

      const result = await CW_API.requestDraft(payload);

      if (result.ok) {
        _state.previousDraft = _state.currentDraft;
        _state.currentDraft = result.draft;
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
      templatePanelOpen: false,
      selectedTemplate: null,
    };
  }

  return {
    init,
    destroy,
    toggleCard,
    closeCard,
  };
})();
