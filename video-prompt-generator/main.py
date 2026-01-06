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


def parse_arguments():
    """
    コマンドライン引数の解析

    Returns:
        argparse.Namespace: 解析された引数
    """
    parser = argparse.ArgumentParser(
        description='動画URLから画像生成プロンプトを自動生成します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  %(prog)s https://www.youtube.com/watch?v=example_id
  %(prog)s https://www.youtube.com/watch?v=example_id --output custom_output.json
  %(prog)s https://www.youtube.com/watch?v=example_id --verbose

注意:
  - Google AI Studio APIキーが必要です（.envファイルに設定）
  - 動画は一時的にダウンロードされ、処理後に削除されます
        """
    )

    parser.add_argument(
        'video_url',
        type=str,
        help='処理する動画のURL（YouTube等）'
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
        print(f"  Video URL: {args.video_url}")
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

        print(f"📥 Downloading video from: {args.video_url}")
        video_path = video_processor.download_video(args.video_url)

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

        # ステップ2: プロンプト生成
        print("\n" + "=" * 60)
        print("STEP 2: Prompt Generation")
        print("=" * 60)

        prompt_gen = PromptGenerator(
            language=args.language,
            verbose=args.verbose
        )

        print("🤖 Analyzing video with Gemini API...")
        results = prompt_gen.generate_prompts(video_file, args.video_url)

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
