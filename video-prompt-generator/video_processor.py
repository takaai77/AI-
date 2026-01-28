"""
動画処理モジュール

このモジュールは動画のダウンロード、アップロード、
および将来的にカット割り検出などの処理を行います。
"""

import os
import time
from pathlib import Path
from typing import Optional, List, Dict

import cv2
import numpy as np
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

    def detect_scene_changes(self, video_path: Path) -> List[Dict]:
        """
        動画内のシーン変更を検出（カット割り検出）

        OpenCVを使用してフレーム間のヒストグラム差分を計算し、
        閾値を超えた場合にシーン変更として検出します。

        Args:
            video_path (Path): 分析する動画ファイルのパス

        Returns:
            List[Dict]: シーン情報のリスト
                [{
                    'scene_number': int,      # シーン番号
                    'start_time': float,      # 開始時刻（秒）
                    'end_time': float,        # 終了時刻（秒）
                    'duration': float,        # シーンの長さ（秒）
                    'timestamp': str          # 開始時刻のフォーマット済み文字列 (HH:MM:SS)
                }]
        """
        try:
            if not video_path.exists():
                print(f"✗ Video file not found: {video_path}")
                return []

            if self.verbose:
                print(f"  Analyzing video for scene changes...")

            # 動画を開く
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                print("✗ Failed to open video file")
                return []

            # 動画の情報を取得
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps

            if self.verbose:
                print(f"  Video info: {frame_count} frames, {fps:.2f} FPS, {duration:.2f}s")

            # シーン変更の検出
            scene_changes = [0.0]  # 最初は0秒から開始
            prev_hist = None
            frame_number = 0

            # 設定値を取得
            threshold = Config.SCENE_CHANGE_THRESHOLD
            min_scene_length = Config.MIN_SCENE_LENGTH

            if self.verbose:
                print(f"  Detection settings: threshold={threshold}, min_scene_length={min_scene_length}s")

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # フレームをRGBに変換してヒストグラムを計算
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                hist = cv2.calcHist([frame_rgb], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
                hist = cv2.normalize(hist, hist).flatten()

                # 前のフレームとの差分を計算
                if prev_hist is not None:
                    # ヒストグラムの差分（相関係数を使用）
                    diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                    # 相関係数は1に近いほど似ている（0: 全く違う, 1: 同じ）
                    # 閾値より小さい場合（つまり違いが大きい場合）にシーン変更とみなす
                    similarity = diff * 100  # パーセント表示

                    if similarity < (100 - threshold):
                        current_time = frame_number / fps

                        # 最小シーン長の確認
                        if len(scene_changes) == 0 or (current_time - scene_changes[-1]) >= min_scene_length:
                            scene_changes.append(current_time)
                            if self.verbose:
                                print(f"    Scene change detected at {self._format_timestamp(current_time)} "
                                      f"(similarity: {similarity:.1f}%)")

                prev_hist = hist
                frame_number += 1

                # 進捗表示
                if self.verbose and frame_number % 100 == 0:
                    progress = (frame_number / frame_count) * 100
                    print(f"    Progress: {progress:.1f}% ({frame_number}/{frame_count} frames)", end='\r')

            cap.release()

            # 最後のシーンの終了時刻を追加
            if scene_changes[-1] < duration:
                scene_changes.append(duration)

            if self.verbose:
                print(f"\n  ✓ Detected {len(scene_changes) - 1} scenes")

            # シーン情報を構築
            scenes = []
            for i in range(len(scene_changes) - 1):
                scene = {
                    'scene_number': i + 1,
                    'start_time': scene_changes[i],
                    'end_time': scene_changes[i + 1],
                    'duration': scene_changes[i + 1] - scene_changes[i],
                    'timestamp': self._format_timestamp(scene_changes[i])
                }
                scenes.append(scene)

                if self.verbose:
                    print(f"    Scene {scene['scene_number']}: "
                          f"{scene['timestamp']} - {self._format_timestamp(scene['end_time'])} "
                          f"({scene['duration']:.1f}s)")

            return scenes

        except Exception as e:
            print(f"✗ Error detecting scene changes: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return []

    def extract_frames(self, video_path: Path, scenes: List[Dict]) -> List[Dict]:
        """
        各シーンの中間フレームを抽出

        各シーンの中間地点のフレームを画像として保存します。

        Args:
            video_path (Path): 動画ファイルのパス
            scenes (List[Dict]): シーン情報のリスト（detect_scene_changesの出力）

        Returns:
            List[Dict]: フレーム情報のリスト
                [{
                    'scene_number': int,      # シーン番号
                    'timestamp': str,         # タイムスタンプ
                    'frame_path': Path,       # 抽出されたフレーム画像のパス
                    'time_seconds': float     # 秒単位の時刻
                }]
        """
        try:
            if not video_path.exists():
                print(f"✗ Video file not found: {video_path}")
                return []

            if not scenes:
                print("⚠️  No scenes provided for frame extraction")
                return []

            if self.verbose:
                print(f"  Extracting frames from {len(scenes)} scenes...")

            # 出力ディレクトリの作成
            frames_dir = Config.OUTPUT_DIR / 'frames'
            frames_dir.mkdir(parents=True, exist_ok=True)

            # 動画を開く
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                print("✗ Failed to open video file")
                return []

            fps = cap.get(cv2.CAP_PROP_FPS)
            extracted_frames = []

            for scene in scenes:
                # シーンの中間時刻を計算
                mid_time = (scene['start_time'] + scene['end_time']) / 2
                frame_number = int(mid_time * fps)

                # フレームに移動
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
                ret, frame = cap.read()

                if ret:
                    # ファイル名を生成
                    frame_filename = f"scene_{scene['scene_number']:03d}_{self._format_timestamp(mid_time).replace(':', '-')}.jpg"
                    frame_path = frames_dir / frame_filename

                    # フレームを保存
                    cv2.imwrite(str(frame_path), frame)

                    extracted_frames.append({
                        'scene_number': scene['scene_number'],
                        'timestamp': self._format_timestamp(mid_time),
                        'frame_path': frame_path,
                        'time_seconds': mid_time
                    })

                    if self.verbose:
                        print(f"    ✓ Scene {scene['scene_number']}: {frame_filename}")
                else:
                    if self.verbose:
                        print(f"    ✗ Failed to extract frame for scene {scene['scene_number']}")

            cap.release()

            if self.verbose:
                print(f"  ✓ Extracted {len(extracted_frames)} frames to {frames_dir}")

            return extracted_frames

        except Exception as e:
            print(f"✗ Error extracting frames: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return []

    def get_video_metadata(self, video_path: Path) -> Dict:
        """
        動画のメタデータを取得

        OpenCVを使用して動画の長さ、解像度、フレームレートなどの情報を取得します。

        Args:
            video_path (Path): 動画ファイルのパス

        Returns:
            Dict: メタデータ
                {
                    'duration': float,        # 動画の長さ（秒）
                    'width': int,             # 幅（ピクセル）
                    'height': int,            # 高さ（ピクセル）
                    'fps': float,             # フレームレート
                    'frame_count': int,       # 総フレーム数
                    'duration_formatted': str # フォーマット済みの長さ (HH:MM:SS)
                }
        """
        try:
            if not video_path.exists():
                print(f"✗ Video file not found: {video_path}")
                return self._empty_metadata()

            # 動画を開く
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                print("✗ Failed to open video file")
                return self._empty_metadata()

            # メタデータを取得
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0

            cap.release()

            metadata = {
                'duration': duration,
                'width': width,
                'height': height,
                'fps': fps,
                'frame_count': frame_count,
                'duration_formatted': self._format_timestamp(duration)
            }

            if self.verbose:
                print(f"  Video metadata:")
                print(f"    Duration: {metadata['duration_formatted']} ({duration:.2f}s)")
                print(f"    Resolution: {width}x{height}")
                print(f"    FPS: {fps:.2f}")
                print(f"    Frame count: {frame_count}")

            return metadata

        except Exception as e:
            print(f"✗ Error getting video metadata: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return self._empty_metadata()

    def _empty_metadata(self) -> Dict:
        """空のメタデータを返す"""
        return {
            'duration': 0,
            'width': 0,
            'height': 0,
            'fps': 0,
            'frame_count': 0,
            'duration_formatted': '00:00:00'
        }

    def _format_timestamp(self, seconds: float) -> str:
        """
        秒数をHH:MM:SS形式にフォーマット

        Args:
            seconds (float): 秒数

        Returns:
            str: フォーマット済みのタイムスタンプ (HH:MM:SS)
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

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
