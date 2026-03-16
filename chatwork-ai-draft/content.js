/**
 * content.js
 * ─────────────────────────────────────────────
 * Chrome拡張のコンテンツスクリプト（メインエントリポイント）。
 * Chatwork Web版のページに注入され、AIカードUIを管理する。
 *
 * 役割:
 *   1. Chatwork画面の読み込み完了を検知する
 *   2. 入力欄が見つかったらAIカードUIを初期化する
 *   3. ルーム切り替え（SPA遷移）を MutationObserver で監視する
 *   4. 入力欄が消えた/現れた場合にUIを再初期化する
 *
 * 重要:
 *   - 送信ボタンには一切触れない
 *   - 必要最小限のDOM操作のみ
 */

(() => {
  'use strict';

  // 開発用ログフラグ（本番では false にする）
  const DEBUG = false;

  function log(msg) {
    if (DEBUG) console.log(`[AI下書き] ${msg}`);
  }

  // ── 初期化済みフラグ ──
  let _initialized = false;

  // ── 再初期化のデバウンスタイマー ──
  let _reinitTimer = null;
  const REINIT_DELAY = 1000; // ミリ秒

  /**
   * AIカードUIの初期化を試みる
   */
  function tryInit() {
    const inputEl = CW_SELECTORS.getInputElement();
    if (!inputEl) {
      log('入力欄が見つかりません。待機中…');
      return false;
    }

    // 既にボタンがあればスキップ
    if (document.querySelector('.cw-ai-trigger-btn')) {
      return true;
    }

    log('入力欄を検出。UIを初期化します。');
    CW_CARD.init();
    _initialized = true;
    return true;
  }

  /**
   * ルーム切り替え等でUIを再初期化する
   */
  function scheduleReinit() {
    if (_reinitTimer) clearTimeout(_reinitTimer);
    _reinitTimer = setTimeout(() => {
      // 既存UIが孤立していないかチェック
      const btn = document.querySelector('.cw-ai-trigger-btn');
      const inputContainer = CW_SELECTORS.getInputContainer();

      if (btn && inputContainer && inputContainer.contains(btn)) {
        // 正常に配置されている
        return;
      }

      // UIを再構築
      log('ルーム切り替えを検知。UIを再初期化します。');
      CW_CARD.destroy();
      _initialized = false;
      tryInit();
    }, REINIT_DELAY);
  }

  // ─────────────────────────────────────────────
  // MutationObserver でSPA遷移を監視
  // ─────────────────────────────────────────────

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      // DOM変更を検知したら再初期化をスケジュール
      // 大量のmutationが来ても1回だけ処理するようデバウンス
      let shouldCheck = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
      }

      if (shouldCheck) {
        if (!_initialized) {
          // まだ初期化できていない場合は即座に試行
          tryInit();
        } else {
          // 既に初期化済みの場合はデバウンスして再初期化チェック
          scheduleReinit();
        }
      }
    });

    // body 全体を監視（Chatwork は SPA なので広範囲の監視が必要）
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    log('MutationObserver を開始しました。');
  }

  // ─────────────────────────────────────────────
  // エントリポイント
  // ─────────────────────────────────────────────

  function main() {
    log('コンテンツスクリプト起動');

    // 初回の初期化試行
    if (!tryInit()) {
      // 入力欄がまだない場合、少し待ってからリトライ
      const retryIntervals = [500, 1000, 2000, 4000];
      let retryIndex = 0;

      function retry() {
        if (retryIndex >= retryIntervals.length) {
          log('入力欄が見つかりません。MutationObserverで待機します。');
          return;
        }
        setTimeout(() => {
          if (!_initialized && !tryInit()) {
            retryIndex++;
            retry();
          }
        }, retryIntervals[retryIndex]);
      }

      retry();
    }

    // SPA遷移の監視を開始
    startObserver();
  }

  // ページロード完了後に実行
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    main();
  } else {
    document.addEventListener('DOMContentLoaded', main);
  }
})();
