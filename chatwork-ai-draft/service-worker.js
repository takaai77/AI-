/**
 * service-worker.js
 * ─────────────────────────────────────────────
 * Chrome拡張のバックグラウンド Service Worker。
 *
 * 現時点の役割:
 *   - 拡張アイコンクリック時にオプション画面を開く
 *   - 将来の拡張に備えた最小構成
 *
 * 注意:
 *   - Manifest V3 では Service Worker はアイドル時に停止する
 *   - 永続的な状態は持たない設計にする
 *   - APIキー等の秘密情報は保持しない
 */

// 拡張アイコンクリック時にオプション画面を開く
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// インストール/アップデート時の処理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 初回インストール時にオプション画面を開く（設定を促す）
    chrome.runtime.openOptionsPage();
  }
});
