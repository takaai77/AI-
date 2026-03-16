/**
 * ai-card.js
 * ─────────────────────────────────────────────
 * AIカードUIの構築と操作を担当する。
 *
 * UI構成:
 *   - トリガーボタン（入力欄付近に表示）
 *   - AIカード（ミニカードUI）
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
  };

  // ── DOM参照 ──
  let _els = {};

  // ── トーン定義 ──
  const TONES = [
    { key: 'polite', label: 'もっと丁寧に' },
    { key: 'soft', label: 'やわらかく' },
    { key: 'short', label: '短く' },
    { key: 'summary', label: '要点だけ' },
  ];

  // ─────────────────────────────────────────────
  // DOM要素生成ヘルパー（innerHTML を避ける）
  // ─────────────────────────────────────────────

  /**
   * 要素を安全に生成する
   */
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
    const btn = el('button', {
      className: 'cw-ai-trigger-btn',
      title: 'AI返信下書きを作成',
      onClick: toggleCard,
    }, [
      el('span', { className: 'cw-ai-trigger-btn__icon', textContent: '✨' }),
      el('span', { textContent: 'AI返信' }),
    ]);
    return btn;
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

    // ── 安心メッセージ ──
    const notice = el('div', {
      className: 'cw-ai-card__notice',
      textContent: '💡 送信はされません。下書きのみ作成します。',
    });

    // ── テキスト入力エリア ──
    const textarea = el('textarea', {
      className: 'cw-ai-card__textarea',
      placeholder: 'どう返信したいですか？（例：丁寧にお断りしたい）',
    });
    textarea.rows = 2;

    const inputArea = el('div', { className: 'cw-ai-card__input-area' }, [textarea]);

    // ── 提案ボタン ──
    const suggestBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--primary',
      textContent: '返信を提案',
      onClick: handleSuggest,
    });

    const actions = el('div', { className: 'cw-ai-card__actions' }, [suggestBtn]);

    // ── トーン変更ボタン群 ──
    const toneLabel = el('div', {
      className: 'cw-ai-card__tone-label',
      textContent: 'トーンを変更:',
    });

    const toneButtons = TONES.map(tone =>
      el('button', {
        className: 'cw-ai-card__btn',
        textContent: tone.label,
        'data-tone': tone.key,
        onClick: () => handleToneChange(tone.key),
      })
    );

    const toneGroup = el('div', { className: 'cw-ai-card__tone-group' }, [
      toneLabel,
      ...toneButtons,
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
      className: 'cw-ai-card__btn',
      textContent: '再生成',
      onClick: handleRetry,
    });

    const undoBtn = el('button', {
      className: 'cw-ai-card__btn',
      textContent: '元に戻す',
      onClick: handleUndo,
    });

    const insertBtn = el('button', {
      className: 'cw-ai-card__btn cw-ai-card__btn--insert',
      textContent: '入力欄に挿入',
      onClick: handleInsert,
    });

    const footer = el('div', { className: 'cw-ai-card__footer' }, [
      retryBtn,
      undoBtn,
      insertBtn,
    ]);

    // ── カード本体 ──
    const card = el('div', { className: 'cw-ai-card' }, [
      header,
      notice,
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
      showStatus('loading', '生成中…');
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
      // textContent で安全に表示（XSS防止）
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
      _els.toneInfo.textContent = `トーン: ${_state.toneLabel}`;
      _els.toneInfo.classList.add('cw-ai-card__tone-info--visible');
    } else {
      _els.toneInfo.classList.remove('cw-ai-card__tone-info--visible');
    }

    // 注意メモ
    if (_state.notes) {
      _els.notesEl.textContent = `⚠️ ${_state.notes}`;
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
    _els.statusEl.className = `cw-ai-card__status cw-ai-card__status--visible cw-ai-card__status--${type}`;

    // 子要素をクリアして再構築
    while (_els.statusEl.firstChild) {
      _els.statusEl.removeChild(_els.statusEl.firstChild);
    }

    if (type === 'loading') {
      _els.statusEl.appendChild(el('div', { className: 'cw-ai-spinner' }));
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
  }

  function closeCard() {
    _state.isOpen = false;
    updateUI();
  }

  /**
   * 「返信を提案」ボタンのハンドラ
   */
  async function handleSuggest() {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, 'neutral', false);
  }

  /**
   * トーン変更ハンドラ
   */
  async function handleToneChange(tone) {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, tone, false);
  }

  /**
   * 「再生成」ハンドラ
   */
  async function handleRetry() {
    const intent = _els.textarea.value.trim();
    await requestDraft(intent, _state.currentTone, true);
  }

  /**
   * 「元に戻す」ハンドラ
   */
  function handleUndo() {
    if (_state.previousDraft) {
      const temp = _state.currentDraft;
      _state.currentDraft = _state.previousDraft;
      _state.previousDraft = temp;
      updateUI();
    }
  }

  /**
   * 「入力欄に挿入」ハンドラ
   */
  function handleInsert() {
    if (!_state.currentDraft) return;

    const success = CW_INSERT.insertToChatInput(_state.currentDraft);
    if (success) {
      // 挿入成功 → カードを閉じる
      _state.isOpen = false;
      _state.error = '';
      updateUI();
    } else {
      _state.error = '入力欄にテキストを挿入できませんでした。画面を確認してください。';
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
      // ペイロード組み立て
      const payload = CW_EXTRACT.buildPayload({ intent, tone, retryMode });

      // API呼び出し
      const result = await CW_API.requestDraft(payload);

      if (result.ok) {
        // 成功 → 前の下書きを退避してから更新
        _state.previousDraft = _state.currentDraft;
        _state.currentDraft = result.draft;
        _state.toneLabel = result.toneLabel || '';
        _state.notes = result.notes || '';
        _state.error = '';
      } else {
        _state.error = result.error || 'エラーが発生しました。';
      }
    } catch (e) {
      _state.error = '予期しないエラーが発生しました。';
    } finally {
      _state.isLoading = false;
      updateUI();
    }
  }

  // ─────────────────────────────────────────────
  // 初期化（外部から呼ばれる）
  // ─────────────────────────────────────────────

  /**
   * AIカードUIを初期化してDOMに追加する
   */
  function init() {
    // 既に初期化済みの場合はスキップ
    if (document.querySelector('.cw-ai-card')) return;

    // トリガーボタンを入力欄付近に配置
    const triggerBtn = createTriggerButton();
    const inputContainer = CW_SELECTORS.getInputContainer();

    if (inputContainer) {
      inputContainer.appendChild(triggerBtn);
    } else {
      // 入力欄が見つからない場合は body 末尾に追加（フォールバック）
      document.body.appendChild(triggerBtn);
    }

    // AIカード本体を body に追加
    const card = createCard();
    document.body.appendChild(card);

    updateUI();
  }

  /**
   * UIを破棄する（ルーム切り替え時などに使用）
   */
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
