"""
動画処理モジュール

このモジュールは動画のダウンロード、アップロード、
および将来的にカット割り検出などの処理を行います。
"""

import os
import time
from pathlib import Path
from typing import Optional

import google.generativeai as genai
from pytube import YouTube

from config import Config


class VideoProcessor:
    """
    動画処理クラス

    YouTube動画のダウンロードとGemini APIへのアップロードを管理します。
    """

    def __init__(self, verbose: bool = False):
        """
        初期化

        Args:
            verbose (bool): 詳細ログを出力するかどうか
        """
        self.verbose = verbose
        self.video_cache_dir = Config.VIDEO_CACHE_DIR

        # Google Generative AI の設定
        genai.configure(api_key=Config.GOOGLE_API_KEY)

        if self.verbose:
            print(f"✓ VideoProcessor initialized")
            print(f"  Cache directory: {self.video_cache_dir}")

    def download_video(self, video_url: str) -> Optional[Path]:
        """
        YouTube動画をダウンロード

        Args:
            video_url (str): YouTube動画のURL

        Returns:
            Optional[Path]: ダウンロードした動画ファイルのパス（失敗時はNone）
        """
        try:
            if self.verbose:
                print(f"  Fetching video info from: {video_url}")

            # YouTube オブジェクトを作成
            yt = YouTube(video_url)

            if self.verbose:
                print(f"  Title: {yt.title}")
                print(f"  Length: {yt.length} seconds")
                print(f"  Author: {yt.author}")

            # ストリームを取得（MP4形式、指定された解像度）
            # TODO: ユーザーが解像度を選択できるようにする
            stream = yt.streams.filter(
                progressive=True,
                file_extension='mp4'
            ).order_by('resolution').desc().first()

            if not stream:
                print("✗ No suitable video stream found")
                return None

            if self.verbose:
                print(f"  Selected stream: {stream.resolution} - {stream.mime_type}")
                file_size_mb = stream.filesize / (1024 * 1024)
                print(f"  File size: {file_size_mb:.2f} MB")

                # サイズチェック
                if file_size_mb > Config.MAX_VIDEO_SIZE_MB:
                    print(f"⚠️  Warning: Video size ({file_size_mb:.2f} MB) exceeds "
                          f"recommended limit ({Config.MAX_VIDEO_SIZE_MB} MB)")

            # ダウンロード
            print("  Downloading...")
            output_path = stream.download(
                output_path=str(self.video_cache_dir),
                filename_prefix='video_'
            )

            video_path = Path(output_path)

            if self.verbose:
                print(f"  ✓ Download completed: {video_path.name}")

            return video_path

        except Exception as e:
            print(f"✗ Error downloading video: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return None

    def upload_to_gemini(self, video_path: Path) -> Optional[genai.File]:
        """
        動画をGemini APIにアップロード

        Args:
            video_path (Path): アップロードする動画ファイルのパス

        Returns:
            Optional[genai.File]: アップロードされたファイルオブジェクト（失敗時はNone）
        """
        try:
            if not video_path.exists():
                print(f"✗ Video file not found: {video_path}")
                return None

            if self.verbose:
                file_size_mb = video_path.stat().st_size / (1024 * 1024)
                print(f"  Uploading file: {video_path.name} ({file_size_mb:.2f} MB)")

            # Gemini APIにファイルをアップロード
            print("  Uploading to Gemini API...")
            video_file = genai.upload_file(path=str(video_path))

            if self.verbose:
                print(f"  ✓ Upload completed")
                print(f"  File URI: {video_file.uri}")
                print(f"  File name: {video_file.name}")

            # ファイル処理の完了を待機
            print("  Waiting for file processing...")
            while video_file.state.name == "PROCESSING":
                if self.verbose:
                    print("    Still processing...", end='\r')
                time.sleep(2)
                video_file = genai.get_file(video_file.name)

            if video_file.state.name == "FAILED":
                print("✗ Video processing failed")
                return None

            if self.verbose:
                print("  ✓ File processing completed")

            return video_file

        except Exception as e:
            print(f"✗ Error uploading to Gemini: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return None

    def detect_scene_changes(self, video_path: Path) -> list:
        """
        動画内のシーン変更を検出（カット割り検出）

        TODO: OpenCVを使用してシーン変更を検出する機能を実装
        現在は未実装で、空のリストを返します。

        Args:
            video_path (Path): 分析する動画ファイルのパス

        Returns:
            list: シーン変更のタイムスタンプリスト（秒単位）
        """
        # TODO: 以下の機能を実装予定:
        # 1. OpenCVで動画を読み込む
        # 2. フレーム間の差分を計算
        # 3. 閾値を超えた場合にシーン変更として記録
        # 4. 最小シーン長を考慮してフィルタリング

        if self.verbose:
            print("⚠️  Scene change detection is not implemented yet")

        return []

    def extract_frames(self, video_path: Path, timestamps: list) -> list:
        """
        指定されたタイムスタンプでフレームを抽出

        TODO: 特定の時刻のフレームを画像として抽出する機能を実装
        各シーンの代表フレームを取得するのに使用します。

        Args:
            video_path (Path): 動画ファイルのパス
            timestamps (list): 抽出するタイムスタンプのリスト（秒単位）

        Returns:
            list: 抽出されたフレーム画像のパスリスト
        """
        # TODO: 以下の機能を実装予定:
        # 1. OpenCVで動画を開く
        # 2. 各タイムスタンプに移動
        # 3. フレームを画像として保存
        # 4. 保存したファイルパスをリストで返す

        if self.verbose:
            print("⚠️  Frame extraction is not implemented yet")

        return []

    def get_video_metadata(self, video_path: Path) -> dict:
        """
        動画のメタデータを取得

        TODO: 動画の長さ、解像度、フレームレートなどの情報を取得

        Args:
            video_path (Path): 動画ファイルのパス

        Returns:
            dict: メタデータ（長さ、解像度、フレームレート等）
        """
        # TODO: OpenCVまたはffmpegを使用してメタデータを取得

        if self.verbose:
            print("⚠️  Metadata extraction is not implemented yet")

        return {
            'duration': 0,
            'width': 0,
            'height': 0,
            'fps': 0
        }

    def cleanup(self, video_path: Optional[Path] = None):
        """
        一時ファイルのクリーンアップ

        Args:
            video_path (Optional[Path]): 削除する動画ファイルのパス
                                         Noneの場合はキャッシュディレクトリ全体をクリーンアップ
        """
        try:
            if video_path and video_path.exists():
                if self.verbose:
                    print(f"  Cleaning up: {video_path.name}")
                video_path.unlink()
                if self.verbose:
                    print("  ✓ File deleted")

            elif video_path is None:
                # キャッシュディレクトリ全体をクリーンアップ
                if self.verbose:
                    print(f"  Cleaning up cache directory: {self.video_cache_dir}")

                if self.video_cache_dir.exists():
                    for file in self.video_cache_dir.glob('*'):
                        if file.is_file():
                            file.unlink()
                            if self.verbose:
                                print(f"    Deleted: {file.name}")

                if self.verbose:
                    print("  ✓ Cache cleaned")

        except Exception as e:
            print(f"⚠️  Warning: Cleanup failed: {e}")


# テスト用のメイン関数
if __name__ == '__main__':
    """
    このモジュールを直接実行した場合のテストコード
    """
    import sys

    if len(sys.argv) < 2:
        print("Usage: python video_processor.py <video_url>")
        sys.exit(1)

    # テスト実行
    print("=== Video Processor Test ===\n")

    from config import initialize_config

    if not initialize_config():
        print("Configuration failed!")
        sys.exit(1)

    processor = VideoProcessor(verbose=True)

    video_url = sys.argv[1]
    print(f"Testing with URL: {video_url}\n")

    # ダウンロードテスト
    print("--- Download Test ---")
    video_path = processor.download_video(video_url)

    if video_path:
        print(f"\n✓ Download successful: {video_path}")

        # アップロードテスト
        print("\n--- Upload Test ---")
        video_file = processor.upload_to_gemini(video_path)

        if video_file:
            print(f"\n✓ Upload successful!")
            print(f"  File URI: {video_file.uri}")
        else:
            print("\n✗ Upload failed")

        # クリーンアップ
        print("\n--- Cleanup Test ---")
        processor.cleanup(video_path)
        print("\n✓ Test completed")
    else:
        print("\n✗ Download failed")
