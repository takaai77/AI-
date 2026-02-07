"""
動画分析Pro Max - スケジューラーモジュール
自動スケジューリングとバッチ処理
"""
import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from database import get_pending_schedules, update_schedule_status, save_analysis
from video_processor import process_video
from ai_analyzer import analyze_video
import traceback


class VideoAnalysisScheduler:
    """動画分析スケジューラー"""

    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False

    def start(self):
        """スケジューラー開始"""
        if not self.is_running:
            self.scheduler.add_job(
                self.check_and_process_schedules,
                'interval',
                seconds=60,  # 1分ごとにチェック
                id='schedule_checker'
            )
            self.scheduler.start()
            self.is_running = True
            print("✅ スケジューラーを開始しました")

    def stop(self):
        """スケジューラー停止"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            print("⏹️ スケジューラーを停止しました")

    def check_and_process_schedules(self):
        """スケジュールをチェックして実行"""
        try:
            pending_schedules = get_pending_schedules()

            if not pending_schedules:
                return

            print(f"🔄 {len(pending_schedules)}件のスケジュールを処理中...")

            for schedule in pending_schedules:
                try:
                    self.process_schedule(schedule)
                except Exception as e:
                    error_msg = f"スケジュール処理エラー: {str(e)}"
                    print(f"❌ {error_msg}")
                    print(traceback.format_exc())
                    update_schedule_status(
                        schedule['id'],
                        'failed',
                        error_message=error_msg
                    )

        except Exception as e:
            print(f"❌ スケジュールチェックエラー: {e}")
            print(traceback.format_exc())

    def process_schedule(self, schedule):
        """個別のスケジュールを処理"""
        schedule_id = schedule['id']
        video_url = schedule['video_url']
        video_title = schedule['video_title']
        analysis_type = schedule['analysis_type']
        ai_provider = schedule['ai_provider']

        print(f"📹 処理開始: {video_title} ({analysis_type})")

        # ステータス更新: processing
        update_schedule_status(schedule_id, 'processing')

        start_time = time.time()

        try:
            # 動画処理
            print(f"  1. 動画をダウンロード中...")
            video_result = process_video(video_url)

            if not video_result['success']:
                raise Exception(video_result['error'])

            frames = video_result['frames']
            frame_paths = video_result['frame_paths']

            if not video_title:
                video_title = video_result['title']

            # AI分析（APIキーは環境変数から取得する想定）
            # 実際の実装ではユーザーのAPIキーを安全に保存・取得する必要がある
            print(f"  2. AI分析中...")

            # 注: 実際の実装ではAPIキーを適切に管理する必要があります
            # ここでは簡略化のため、環境変数から取得する想定
            import os
            if ai_provider == 'claude':
                api_key = os.getenv('CLAUDE_API_KEY')
            else:
                api_key = os.getenv('GEMINI_API_KEY')

            if not api_key:
                raise Exception(f"{ai_provider} APIキーが設定されていません")

            analysis_result = analyze_video(
                api_key,
                ai_provider,
                frames,
                analysis_type,
                video_url,
                video_title
            )

            if not analysis_result['success']:
                raise Exception(analysis_result['error'])

            # 結果を保存
            duration = int(time.time() - start_time)
            analysis_id = save_analysis(
                video_url,
                video_title,
                analysis_type,
                ai_provider,
                analysis_result['result'],
                frame_paths,
                duration
            )

            # ステータス更新: completed
            update_schedule_status(schedule_id, 'completed', analysis_id=analysis_id)

            print(f"✅ 完了: {video_title} (分析ID: {analysis_id}, {duration}秒)")

        except Exception as e:
            error_msg = str(e)
            print(f"❌ エラー: {error_msg}")
            update_schedule_status(schedule_id, 'failed', error_message=error_msg)
            raise


def process_batch_queue(batch_items, api_key, ai_provider, progress_callback=None):
    """バッチキューを処理"""
    results = []

    for i, item in enumerate(batch_items):
        try:
            if progress_callback:
                progress_callback(i, len(batch_items), item)

            # 動画処理
            video_result = process_video(item['video_url'])

            if not video_result['success']:
                results.append({
                    'id': item['id'],
                    'success': False,
                    'error': video_result['error']
                })
                continue

            # AI分析
            analysis_result = analyze_video(
                api_key,
                ai_provider,
                video_result['frames'],
                item['analysis_type'],
                item['video_url'],
                item['video_title'] or video_result['title']
            )

            if not analysis_result['success']:
                results.append({
                    'id': item['id'],
                    'success': False,
                    'error': analysis_result['error']
                })
                continue

            # 保存
            analysis_id = save_analysis(
                item['video_url'],
                item['video_title'] or video_result['title'],
                item['analysis_type'],
                ai_provider,
                analysis_result['result'],
                video_result['frame_paths']
            )

            results.append({
                'id': item['id'],
                'success': True,
                'analysis_id': analysis_id
            })

        except Exception as e:
            results.append({
                'id': item['id'],
                'success': False,
                'error': str(e)
            })

    return results


# グローバルスケジューラーインスタンス
_global_scheduler = None


def get_scheduler():
    """グローバルスケジューラーを取得"""
    global _global_scheduler
    if _global_scheduler is None:
        _global_scheduler = VideoAnalysisScheduler()
    return _global_scheduler


def start_scheduler():
    """スケジューラー開始"""
    scheduler = get_scheduler()
    scheduler.start()


def stop_scheduler():
    """スケジューラー停止"""
    scheduler = get_scheduler()
    scheduler.stop()


if __name__ == "__main__":
    # テスト用
    print("スケジューラーテスト")
    scheduler = VideoAnalysisScheduler()
    scheduler.start()

    try:
        print("60秒間スケジューラーを実行...")
        time.sleep(60)
    finally:
        scheduler.stop()
