#!/usr/bin/env python3
"""
Video Prompt Generator - メインエントリーポイント

動画URLから画像生成AIプロンプトを自動生成するツール

使用方法:
    python main.py <動画URL>

例:
    python main.py https://www.youtube.com/watch?v=example_id
"""

import sys
import argparse
import json
from datetime import datetime
from pathlib import Path

# 自作モジュールのインポート
from config import Config, initialize_config
from video_processor import VideoProcessor
from prompt_generator import PromptGenerator
from audio_analyzer import AudioAnalyzer


def parse_arguments():
    """
    コマンドライン引数の解析

    Returns:
        argparse.Namespace: 解析された引数
    """
    parser = argparse.ArgumentParser(
        description='動画URLまたはローカルファイルから画像生成プロンプトを自動生成します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # YouTube動画
  %(prog)s https://www.youtube.com/watch?v=example_id

  # X (Twitter)動画
  %(prog)s https://twitter.com/user/status/123456789

  # ローカルファイル
  %(prog)s /path/to/video.mp4

  # カット割り検出付き
  %(prog)s https://www.youtube.com/watch?v=example_id --detect-scenes --extract-frames

  # 音声分析付き（セリフ + BGM）
  %(prog)s https://www.youtube.com/watch?v=example_id --analyze-audio

  # 完全分析（シーン + 音声 + フレーム）
  %(prog)s https://www.youtube.com/watch?v=example_id --detect-scenes --extract-frames --analyze-audio --verbose

  # カスタム出力
  %(prog)s https://www.youtube.com/watch?v=example_id --output my_prompts.json --verbose

対応プラットフォーム:
  - YouTube
  - X (Twitter)
  - Instagram
  - TikTok
  - その他多数（yt-dlp対応サイト）
  - ローカル動画ファイル (.mp4, .avi, .mov等)

注意:
  - Google AI Studio APIキーが必要です（.envファイルに設定）
  - URL指定時は動画を一時的にダウンロードします
  - --detect-scenesオプションでカット割り検出を有効化できます
  - --extract-framesオプションで各シーンの代表フレームを抽出できます
  - --analyze-audioオプションで音声分析（セリフの文字起こし、BGM分析）を有効化できます
  - 音声分析には初回のみWhisperモデルのダウンロードが必要です（数百MB）
        """
    )

    parser.add_argument(
        'video_url_or_path',
        type=str,
        help='処理する動画のURL、またはローカルファイルパス'
    )

    parser.add_argument(
        '-o', '--output',
        type=str,
        default=None,
        help='出力JSONファイル名（省略時は自動生成）'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='詳細なログを表示'
    )

    # TODO: 将来的に追加予定のオプション
    parser.add_argument(
        '--no-download',
        action='store_true',
        help='動画をダウンロードせずにURLから直接処理（未実装）'
    )

    parser.add_argument(
        '--language',
        type=str,
        choices=['ja', 'en'],
        default='ja',
        help='プロンプトの言語（ja: 日本語, en: 英語）'
    )

    parser.add_argument(
        '--detect-scenes',
        action='store_true',
        help='カット割り検出を有効にする（シーン変更を自動検出）'
    )

    parser.add_argument(
        '--extract-frames',
        action='store_true',
        help='各シーンの代表フレームを抽出（--detect-scenesと併用）'
    )

    parser.add_argument(
        '--analyze-audio',
        action='store_true',
        help='音声分析を有効にする（セリフの文字起こし、BGM分析）'
    )

    parser.add_argument(
        '--whisper-model',
        type=str,
        choices=['tiny', 'base', 'small', 'medium', 'large'],
        default='base',
        help='Whisper音声認識モデルのサイズ（tiny=最速、large=最高精度）'
    )

    return parser.parse_args()


def print_banner():
    """
    アプリケーションのバナーを表示
    """
    banner = """
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        Video Prompt Generator                             ║
║        動画から画像生成プロンプトを自動作成               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    """
    print(banner)


def save_results(results, output_path):
    """
    処理結果をJSONファイルに保存

    Args:
        results (dict): 保存する結果データ
        output_path (Path): 出力ファイルパス

    Returns:
        bool: 保存が成功したかどうか
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"✗ Error saving results: {e}")
        return False


def main():
    """
    メイン処理フロー

    1. 設定の初期化と検証
    2. コマンドライン引数の解析
    3. 動画のダウンロードとアップロード
    4. プロンプトの生成
    5. 結果の保存

    Returns:
        int: 終了コード（0: 成功, 1: エラー）
    """
    # バナー表示
    print_banner()

    # 設定の初期化
    print("⏳ Initializing configuration...")
    if not initialize_config():
        print("✗ Configuration initialization failed!")
        return 1

    # コマンドライン引数の解析
    args = parse_arguments()

    if args.verbose:
        print(f"\n📋 Arguments:")
        print(f"  Video URL/Path: {args.video_url_or_path}")
        print(f"  Output: {args.output if args.output else 'Auto-generated'}")
        print(f"  Language: {args.language}")
        print()

    # 処理開始
    start_time = datetime.now()
    print(f"🚀 Starting process at {start_time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    try:
        # ステップ1: 動画の処理
        print("=" * 60)
        print("STEP 1: Video Processing")
        print("=" * 60)

        video_processor = VideoProcessor(verbose=args.verbose)

        # ローカルファイルかURLかを判定して表示
        import os
        if os.path.exists(args.video_url_or_path):
            print(f"📁 Processing local video file: {args.video_url_or_path}")
        else:
            print(f"📥 Downloading video from: {args.video_url_or_path}")

        video_path = video_processor.download_video(args.video_url_or_path)

        if not video_path:
            print("✗ Failed to download video")
            return 1

        print(f"✓ Video downloaded: {video_path}")

        print("📤 Uploading video to Gemini API...")
        video_file = video_processor.upload_to_gemini(video_path)

        if not video_file:
            print("✗ Failed to upload video to Gemini")
            return 1

        print(f"✓ Video uploaded successfully")

        # オプション: カット割り検出とフレーム抽出
        scenes = None
        video_metadata = None
        extracted_frames = None

        if args.detect_scenes:
            print("\n" + "=" * 60)
            print("STEP 1.5: Scene Detection & Frame Extraction")
            print("=" * 60)

            # 動画メタデータの取得
            print("📊 Getting video metadata...")
            video_metadata = video_processor.get_video_metadata(video_path)

            # カット割り検出
            print("🎬 Detecting scene changes...")
            scenes = video_processor.detect_scene_changes(video_path)

            if scenes:
                print(f"✓ Detected {len(scenes)} scenes")

                # フレーム抽出（オプション）
                if args.extract_frames:
                    print("🖼️  Extracting representative frames...")
                    extracted_frames = video_processor.extract_frames(video_path, scenes)

                    if extracted_frames:
                        print(f"✓ Extracted {len(extracted_frames)} frames")
            else:
                print("⚠️  No scenes detected, proceeding without scene information")

        # オプション: 音声分析
        audio_analysis = None

        if args.analyze_audio:
            print("\n" + "=" * 60)
            print("STEP 1.6: Audio Analysis")
            print("=" * 60)

            audio_analyzer = AudioAnalyzer(
                whisper_model=args.whisper_model,
                verbose=args.verbose
            )

            print("🎤 Analyzing audio (transcription & music analysis)...")
            audio_analysis = audio_analyzer.analyze_complete(
                video_path,
                language=None,  # 自動検出
                analyze_music=True,
                detect_segments=True
            )

            if audio_analysis:
                # 文字起こし結果の表示
                if audio_analysis.get('transcription'):
                    trans = audio_analysis['transcription']
                    segments = trans.get('segments', [])
                    print(f"✓ Transcribed {len(segments)} dialogue segments")
                    print(f"  Detected language: {trans.get('language', 'N/A')}")

                # BGM分析結果の表示
                if audio_analysis.get('music_analysis'):
                    music = audio_analysis['music_analysis']
                    print(f"✓ Music analysis completed")
                    print(f"  Tempo: {music.get('tempo', 0):.1f} BPM")
                    print(f"  Mood: {music.get('mood', 'N/A')}")
                    print(f"  Energy: {music.get('energy', 0):.2f}")
            else:
                print("⚠️  Audio analysis failed, proceeding without audio information")

        # ステップ2: プロンプト生成
        print("\n" + "=" * 60)
        print("STEP 2: Prompt Generation")
        print("=" * 60)

        prompt_gen = PromptGenerator(
            language=args.language,
            verbose=args.verbose
        )

        print("🤖 Analyzing video with Gemini API...")

        # シーン情報がある場合は、それを含めてプロンプトを生成
        if scenes:
            results = prompt_gen.generate_prompts_with_scenes(
                video_file,
                args.video_url_or_path,
                scenes,
                video_metadata,
                audio_analysis  # 音声分析結果を追加
            )
        else:
            results = prompt_gen.generate_prompts(
                video_file,
                args.video_url_or_path,
                audio_analysis=audio_analysis  # 音声分析結果を追加
            )

        if not results:
            print("✗ Failed to generate prompts")
            return 1

        print(f"✓ Generated {len(results.get('prompts', []))} prompts")

        # ステップ3: 結果の保存
        print("\n" + "=" * 60)
        print("STEP 3: Saving Results")
        print("=" * 60)

        if args.output:
            output_path = Config.OUTPUT_DIR / args.output
        else:
            output_path = Config.get_output_filename('prompts')

        print(f"💾 Saving results to: {output_path}")

        if save_results(results, output_path):
            print(f"✓ Results saved successfully")
        else:
            print("✗ Failed to save results")
            return 1

        # 処理完了
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print("\n" + "=" * 60)
        print("✨ Process completed successfully!")
        print("=" * 60)
        print(f"⏱️  Total time: {duration:.2f} seconds")
        print(f"📄 Output file: {output_path.absolute()}")

        # 結果のサマリーを表示
        if args.verbose:
            print("\n📊 Summary:")
            print(f"  Video URL: {results.get('video_url')}")
            print(f"  Timestamp: {results.get('timestamp')}")
            print(f"  Number of prompts: {len(results.get('prompts', []))}")

            if video_metadata:
                print(f"\n📹 Video Info:")
                print(f"  Duration: {video_metadata.get('duration_formatted')}")
                print(f"  Resolution: {video_metadata.get('width')}x{video_metadata.get('height')}")
                print(f"  FPS: {video_metadata.get('fps'):.2f}")

            if scenes:
                print(f"\n🎬 Scene Detection:")
                print(f"  Total scenes: {len(scenes)}")
                for scene in scenes[:5]:  # 最初の5つのシーンのみ表示
                    print(f"    Scene {scene['scene_number']}: {scene['timestamp']} ({scene['duration']:.1f}s)")
                if len(scenes) > 5:
                    print(f"    ... and {len(scenes) - 5} more scenes")

            if extracted_frames:
                print(f"\n🖼️  Extracted Frames:")
                print(f"  Total frames: {len(extracted_frames)}")
                print(f"  Location: {Config.OUTPUT_DIR / 'frames'}")

            if audio_analysis:
                print(f"\n🎤 Audio Analysis:")

                if audio_analysis.get('transcription'):
                    trans = audio_analysis['transcription']
                    segments = trans.get('segments', [])
                    print(f"  Dialogue segments: {len(segments)}")
                    print(f"  Language: {trans.get('language', 'N/A')}")

                    if segments:
                        print(f"\n  Sample dialogue:")
                        for seg in segments[:3]:  # 最初の3件のみ表示
                            print(f"    [{seg.get('timestamp')}] {seg.get('text', '')}")
                        if len(segments) > 3:
                            print(f"    ... and {len(segments) - 3} more")

                if audio_analysis.get('music_analysis'):
                    music = audio_analysis['music_analysis']
                    print(f"\n  Music:")
                    print(f"    Tempo: {music.get('tempo', 0):.1f} BPM")
                    print(f"    Mood: {music.get('mood', 'N/A')}")
                    print(f"    Energy: {music.get('energy', 0):.2f}")
                    print(f"    Key: {music.get('key', 'N/A')}")

            print(f"\n📝 Video Summary:")
            print(f"  {results.get('summary', 'N/A')}")

        print("\n✓ Done! You can now use the generated prompts for image generation.")

        return 0

    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
        return 1

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

    finally:
        # クリーンアップ処理
        # TODO: 一時ファイルの削除などのクリーンアップ処理を実装
        pass


if __name__ == '__main__':
    sys.exit(main())
