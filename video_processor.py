"""
動画分析Pro Max - 動画処理モジュール
YouTube動画のダウンロードとフレーム抽出
"""
import os
import cv2
import yt_dlp
import base64
from pathlib import Path
from PIL import Image
import io
import re
from config import VIDEO_DIR, FRAMES_DIR, MAX_VIDEO_DURATION, FRAMES_TO_EXTRACT, FRAME_QUALITY


def extract_video_id(url):
    """URLから動画IDを抽出"""
    # YouTube
    youtube_patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]*)',
        r'youtube\.com\/embed\/([^&\n?]*)',
    ]
    for pattern in youtube_patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # その他の動画サイト用に汎用的な処理
    return url.split('/')[-1].split('?')[0][:20]


def get_video_info(url):
    """動画情報を取得"""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail'),
                'description': info.get('description', '')
            }
    except Exception as e:
        print(f"動画情報取得エラー: {e}")
        return {
            'title': extract_video_id(url),
            'duration': 0,
            'thumbnail': None,
            'description': ''
        }


def download_video(url, output_path=None):
    """動画をダウンロード"""
    if output_path is None:
        video_id = extract_video_id(url)
        output_path = VIDEO_DIR / f"{video_id}.mp4"

    # すでにダウンロード済みの場合はスキップ
    if output_path.exists():
        print(f"動画は既にダウンロード済み: {output_path}")
        return str(output_path)

    ydl_opts = {
        'format': 'best[ext=mp4][height<=720]',  # 最大720pに制限
        'outtmpl': str(output_path),
        'quiet': True,
        'no_warnings': True,
        'max_filesize': 100 * 1024 * 1024,  # 最大100MB
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"動画をダウンロード中: {url}")
            ydl.download([url])
            print(f"ダウンロード完了: {output_path}")
            return str(output_path)
    except Exception as e:
        print(f"動画ダウンロードエラー: {e}")
        raise Exception(f"動画のダウンロードに失敗しました: {str(e)}")


def extract_frames_from_video(video_path, num_frames=FRAMES_TO_EXTRACT):
    """動画からフレームを抽出"""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"動画ファイルが見つかりません: {video_path}")

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise Exception("動画を開けませんでした")

    # 動画情報取得
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0

    print(f"動画情報: {total_frames}フレーム, {fps}fps, {duration:.2f}秒")

    # 最大時間チェック
    if duration > MAX_VIDEO_DURATION:
        cap.release()
        raise Exception(f"動画が長すぎます（最大{MAX_VIDEO_DURATION}秒）")

    # フレームを等間隔で抽出
    frame_indices = []
    if total_frames > num_frames:
        step = total_frames // num_frames
        frame_indices = [i * step for i in range(num_frames)]
    else:
        frame_indices = list(range(total_frames))

    frames = []
    frame_paths = []

    video_id = Path(video_path).stem
    frames_dir = FRAMES_DIR / video_id
    frames_dir.mkdir(exist_ok=True)

    for idx, frame_idx in enumerate(frame_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()

        if not ret:
            continue

        # フレームを保存
        frame_path = frames_dir / f"frame_{idx:03d}.jpg"
        cv2.imwrite(str(frame_path), frame, [cv2.IMWRITE_JPEG_QUALITY, FRAME_QUALITY])

        # Base64エンコード
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, FRAME_QUALITY])
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        frames.append(f"data:image/jpeg;base64,{frame_base64}")
        frame_paths.append(str(frame_path))

        print(f"フレーム抽出: {idx + 1}/{len(frame_indices)}")

    cap.release()

    print(f"{len(frames)}個のフレームを抽出しました")

    return frames, frame_paths


def process_video(url, num_frames=FRAMES_TO_EXTRACT):
    """動画を処理してフレームを抽出（全体の流れ）"""
    try:
        # 動画情報取得
        print(f"動画情報を取得中: {url}")
        info = get_video_info(url)

        # 動画ダウンロード
        print("動画をダウンロード中...")
        video_path = download_video(url)

        # フレーム抽出
        print("フレームを抽出中...")
        frames, frame_paths = extract_frames_from_video(video_path, num_frames)

        return {
            'success': True,
            'title': info['title'],
            'frames': frames,
            'frame_paths': frame_paths,
            'video_path': video_path,
            'duration': info['duration']
        }

    except Exception as e:
        print(f"動画処理エラー: {e}")
        return {
            'success': False,
            'error': str(e),
            'title': None,
            'frames': [],
            'frame_paths': [],
            'video_path': None,
            'duration': 0
        }


def get_youtube_thumbnails(url):
    """YouTubeサムネイルを取得（フォールバック用）"""
    video_id = extract_video_id(url)
    if not video_id:
        return []

    thumbnail_urls = [
        f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        f"https://img.youtube.com/vi/{video_id}/0.jpg",
        f"https://img.youtube.com/vi/{video_id}/1.jpg",
        f"https://img.youtube.com/vi/{video_id}/2.jpg",
        f"https://img.youtube.com/vi/{video_id}/3.jpg",
    ]

    return thumbnail_urls


def clean_old_videos(days=7):
    """古い動画ファイルを削除"""
    import time
    current_time = time.time()
    days_in_seconds = days * 24 * 60 * 60

    deleted_count = 0
    for video_file in VIDEO_DIR.glob("*.mp4"):
        file_age = current_time - video_file.stat().st_mtime
        if file_age > days_in_seconds:
            video_file.unlink()
            deleted_count += 1
            print(f"削除: {video_file}")

    for frames_folder in FRAMES_DIR.glob("*"):
        if frames_folder.is_dir():
            folder_age = current_time - frames_folder.stat().st_mtime
            if folder_age > days_in_seconds:
                for frame_file in frames_folder.glob("*"):
                    frame_file.unlink()
                frames_folder.rmdir()
                deleted_count += 1
                print(f"削除: {frames_folder}")

    print(f"{deleted_count}個のファイル/フォルダを削除しました")
    return deleted_count


if __name__ == "__main__":
    # テスト用
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    result = process_video(test_url, num_frames=4)

    if result['success']:
        print(f"成功: {len(result['frames'])}個のフレームを抽出")
    else:
        print(f"失敗: {result['error']}")
