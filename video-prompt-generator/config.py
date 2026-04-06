"""
設定管理モジュール

このモジュールは環境変数からAPIキーを読み込み、
アプリケーション全体で使用する設定値を管理します。
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
# プロジェクトルートディレクトリの.envファイルを探す
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)


class Config:
    """
    アプリケーション設定クラス

    環境変数から設定値を読み込み、デフォルト値を提供します。
    """

    # ===== API設定 =====
    # Google Gemini API キー（必須）
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

    # Gemini モデル名
    # TODO: 将来的に異なるモデルを選択できるようにする
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

    # ===== ディレクトリ設定 =====
    # 出力ディレクトリ（生成されたプロンプトJSONを保存）
    OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', 'output'))

    # 動画キャッシュディレクトリ（ダウンロードした動画を一時保存）
    VIDEO_CACHE_DIR = Path(os.getenv('VIDEO_CACHE_DIR', 'videos'))

    # ===== 動画処理設定 =====
    # 最大動画サイズ（MB）
    # TODO: 大きな動画の処理最適化を実装
    MAX_VIDEO_SIZE_MB = int(os.getenv('MAX_VIDEO_SIZE_MB', '500'))

    # 動画の解像度設定（pytube用）
    # TODO: ユーザーが解像度を選択できるようにする
    VIDEO_RESOLUTION = os.getenv('VIDEO_RESOLUTION', '720p')

    # ===== プロンプト生成設定 =====
    # 生成するプロンプトの最大長
    MAX_PROMPT_LENGTH = int(os.getenv('MAX_PROMPT_LENGTH', '500'))

    # プロンプトの言語（'ja': 日本語, 'en': 英語）
    # TODO: 多言語対応を実装
    PROMPT_LANGUAGE = os.getenv('PROMPT_LANGUAGE', 'ja')

    # ===== カット割り検出設定（今後実装予定） =====
    # シーン変更検出の閾値
    # TODO: OpenCVを使用したシーン検出機能を実装
    SCENE_CHANGE_THRESHOLD = float(os.getenv('SCENE_CHANGE_THRESHOLD', '30.0'))

    # 最小シーン長（秒）
    MIN_SCENE_LENGTH = float(os.getenv('MIN_SCENE_LENGTH', '2.0'))

    @classmethod
    def validate(cls):
        """
        設定の検証

        必須の設定値が存在するかチェックし、
        存在しない場合はエラーを発生させます。

        Raises:
            ValueError: 必須の設定値が不足している場合
        """
        if not cls.GOOGLE_API_KEY:
            raise ValueError(
                "GOOGLE_API_KEY not found in environment variables.\n"
                "Please create a .env file and set your API key.\n"
                "Example: GOOGLE_API_KEY=your_api_key_here"
            )

        # APIキーの基本的なフォーマットチェック
        if len(cls.GOOGLE_API_KEY) < 20:
            raise ValueError(
                "GOOGLE_API_KEY appears to be invalid (too short).\n"
                "Please check your API key."
            )

    @classmethod
    def setup_directories(cls):
        """
        必要なディレクトリを作成

        OUTPUT_DIRとVIDEO_CACHE_DIRが存在しない場合は作成します。
        """
        cls.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        cls.VIDEO_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        print(f"✓ Output directory: {cls.OUTPUT_DIR.absolute()}")
        print(f"✓ Video cache directory: {cls.VIDEO_CACHE_DIR.absolute()}")

    @classmethod
    def get_output_filename(cls, prefix='prompts'):
        """
        タイムスタンプ付きの出力ファイル名を生成

        Args:
            prefix (str): ファイル名のプレフィックス

        Returns:
            Path: 出力ファイルのパス
        """
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{prefix}_{timestamp}.json"
        return cls.OUTPUT_DIR / filename


# モジュール読み込み時に設定を検証
# TODO: より詳細なエラーハンドリングを実装
def initialize_config():
    """
    設定の初期化

    アプリケーション起動時に呼び出され、
    設定の検証とディレクトリのセットアップを行います。
    """
    try:
        Config.validate()
        Config.setup_directories()
        return True
    except ValueError as e:
        print(f"Configuration Error: {e}")
        return False


# 設定情報の表示（デバッグ用）
def print_config():
    """
    現在の設定情報を表示（デバッグ用）

    APIキーは一部のみ表示します。
    """
    print("\n===== Current Configuration =====")

    # APIキーは最初の4文字と最後の4文字のみ表示
    if Config.GOOGLE_API_KEY:
        masked_key = f"{Config.GOOGLE_API_KEY[:4]}...{Config.GOOGLE_API_KEY[-4:]}"
    else:
        masked_key = "Not set"

    print(f"GOOGLE_API_KEY: {masked_key}")
    print(f"GEMINI_MODEL: {Config.GEMINI_MODEL}")
    print(f"OUTPUT_DIR: {Config.OUTPUT_DIR}")
    print(f"VIDEO_CACHE_DIR: {Config.VIDEO_CACHE_DIR}")
    print(f"MAX_VIDEO_SIZE_MB: {Config.MAX_VIDEO_SIZE_MB}")
    print(f"PROMPT_LANGUAGE: {Config.PROMPT_LANGUAGE}")
    print("=================================\n")


if __name__ == '__main__':
    # このファイルを直接実行した場合は設定情報を表示
    if initialize_config():
        print_config()
        print("✓ Configuration is valid!")
    else:
        print("✗ Configuration validation failed!")
