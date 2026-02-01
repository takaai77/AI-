# ============================================
# Playwright自動化基盤 - APIサーバー用 Dockerfile
# ============================================
# このDockerfileはAPIサーバー（Express）をビルドします
# ワーカーは Dockerfile.worker を使用してください

# ベースイメージ: PlaywrightのNode.js公式イメージ
# 必要なブラウザとライブラリが含まれています
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 作業ディレクトリを設定
WORKDIR /app

# ============================================
# 依存パッケージのインストール
# ============================================
# package.json と package-lock.json をコピー
COPY package*.json ./

# 本番用の依存パッケージのみインストール
# devDependenciesはビルド後に不要なため除外
RUN npm ci --only=production

# TypeScriptコンパイラを一時的にインストール（ビルド用）
RUN npm install -g typescript

# ============================================
# ソースコードのコピーとビルド
# ============================================
# ソースファイルをコピー
COPY tsconfig.json ./
COPY src/ ./src/

# TypeScriptをコンパイル
RUN tsc

# ビルド後にTypeScriptコンパイラを削除（イメージサイズ削減）
RUN npm uninstall -g typescript

# ============================================
# 実行時設定
# ============================================
# Cloud Run等で使用するポート
ENV PORT=8080

# 本番モード
ENV NODE_ENV=production

# ポートを公開
EXPOSE 8080

# ヘルスチェック（30秒ごとに確認）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# APIサーバーを起動
CMD ["node", "dist/server.js"]
