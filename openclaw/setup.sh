#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# OpenClaw セットアップスクリプト (AI- 学習サイト用)
# ============================================================
# 前提: Node.js >= 22 がインストール済みであること
# 使い方: bash openclaw/setup.sh
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# --- Node.js バージョンチェック ---
check_node() {
  if ! command -v node &>/dev/null; then
    error "Node.js が見つかりません。v22 以上をインストールしてください: https://nodejs.org/"
  fi

  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -lt 22 ]; then
    error "Node.js v22 以上が必要です (現在: $(node -v))。アップデートしてください。"
  fi
  info "Node.js $(node -v) を確認しました"
}

# --- OpenClaw インストール ---
install_openclaw() {
  if command -v openclaw &>/dev/null; then
    info "OpenClaw は既にインストール済みです ($(openclaw --version 2>/dev/null || echo 'unknown'))"
    return 0
  fi

  info "OpenClaw をインストールしています..."
  npm install -g openclaw@latest
  info "OpenClaw のインストールが完了しました"
}

# --- 設定ファイルのコピー ---
copy_config() {
  DEST="$HOME/.openclaw"
  mkdir -p "$DEST"

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/openclaw.json" ]; then
    cp "$SCRIPT_DIR/openclaw.json" "$DEST/openclaw.json"
    info "設定ファイルを $DEST/openclaw.json にコピーしました"
  else
    warn "openclaw.json が見つかりません。デフォルト設定で進めます。"
  fi
}

# --- Gateway 起動方法の案内 ---
print_next_steps() {
  echo ""
  echo "=========================================="
  echo "  セットアップ完了!"
  echo "=========================================="
  echo ""
  info "次のステップ:"
  echo ""
  echo "  1. オンボーディングを実行:"
  echo "     openclaw onboard --install-daemon"
  echo ""
  echo "  2. Gateway を起動:"
  echo "     openclaw gateway --port 18789 --verbose"
  echo ""
  echo "  3. WebChat にアクセス (ブラウザ):"
  echo "     http://127.0.0.1:18789/chat"
  echo ""
  echo "  === iPhone から接続する方法 ==="
  echo ""
  echo "  4. App Store から OpenClaw をインストール"
  echo "     https://apps.apple.com/app/openclaw/id6740261825"
  echo ""
  echo "  5. iPhone と同じ Wi-Fi に接続していれば自動検出されます"
  echo "     手動接続の場合: 設定 > Manual Host > Gateway の IP:18789"
  echo ""
  echo "  6. リモートアクセス (外出先から):"
  echo "     openclaw tailscale serve"
  echo ""
  echo "=========================================="
}

# --- メイン ---
main() {
  info "AI- 学習サイト用 OpenClaw セットアップを開始します"
  echo ""
  check_node
  install_openclaw
  copy_config
  print_next_steps
}

main "$@"
