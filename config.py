"""
動画分析Pro Max - 設定ファイル
"""
import os
from pathlib import Path

# ベースディレクトリ
BASE_DIR = Path(__file__).parent

# データディレクトリ
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# データベース
DATABASE_URL = f"sqlite:///{DATA_DIR / 'video_analysis.db'}"

# 動画保存ディレクトリ
VIDEO_DIR = DATA_DIR / "videos"
VIDEO_DIR.mkdir(exist_ok=True)

# フレーム保存ディレクトリ
FRAMES_DIR = DATA_DIR / "frames"
FRAMES_DIR.mkdir(exist_ok=True)

# レポート保存ディレクトリ
REPORTS_DIR = DATA_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# 動画処理設定
MAX_VIDEO_DURATION = 600  # 最大動画長さ（秒）
FRAMES_TO_EXTRACT = 12  # 抽出するフレーム数
FRAME_QUALITY = 95  # JPEG品質（0-100）

# AI設定
CLAUDE_MODEL = "claude-3-5-sonnet-20241022"
GEMINI_MODEL = "gemini-1.5-pro"
MAX_TOKENS = 8000

# スケジューリング設定
SCHEDULER_CHECK_INTERVAL = 60  # スケジュールチェック間隔（秒）

# アプリケーション設定
APP_TITLE = "🎬 動画分析 Pro Max"
APP_ICON = "🎬"
PAGE_CONFIG = {
    "page_title": "動画分析 Pro Max",
    "page_icon": "🎬",
    "layout": "wide",
    "initial_sidebar_state": "expanded"
}

# 分析タイプ
ANALYSIS_TYPES = {
    "ad": {
        "name": "📺 広告分析",
        "icon": "📺",
        "description": "CTR予測、ターゲット層、競合比較"
    },
    "movie": {
        "name": "🎬 映画分析",
        "icon": "🎬",
        "description": "物語構造、演出技法、映画文法"
    },
    "drama": {
        "name": "📺 ドラマ分析",
        "icon": "📺",
        "description": "エピソード構造、視聴維持率"
    },
    "comprehensive": {
        "name": "🌟 総合分析",
        "icon": "🌟",
        "description": "全観点から徹底分析"
    }
}

# AIプロバイダー
AI_PROVIDERS = {
    "claude": {
        "name": "Claude AI",
        "icon": "🤖",
        "model": CLAUDE_MODEL
    },
    "gemini": {
        "name": "Google Gemini",
        "icon": "✨",
        "model": GEMINI_MODEL
    }
}
