"""
動画分析Pro Max - メインアプリケーション
Streamlitベースの実務レベル動画分析プラットフォーム
"""
import streamlit as st
import time
from datetime import datetime, timedelta
import os
from pathlib import Path

# モジュールインポート
from config import *
from database import *
from video_processor import process_video, get_video_info
from ai_analyzer import analyze_video, generate_analysis_prompt
from scheduler import get_scheduler, process_batch_queue

# ページ設定
st.set_page_config(**PAGE_CONFIG)

# セッション状態の初期化
if 'api_keys' not in st.session_state:
    st.session_state.api_keys = {'claude': '', 'gemini': ''}
if 'scheduler_running' not in st.session_state:
    st.session_state.scheduler_running = False


def main():
    """メインアプリケーション"""

    # ヘッダー
    st.title(f"{APP_ICON} 動画分析 Pro Max")
    st.markdown("**実務レベルの動画分析プラットフォーム - 24/7自動稼働対応**")

    # サイドバー - API設定
    with st.sidebar:
        st.header("⚙️ 設定")

        # APIプロバイダー選択
        ai_provider = st.radio(
            "AIプロバイダー",
            options=['claude', 'gemini'],
            format_func=lambda x: f"{AI_PROVIDERS[x]['icon']} {AI_PROVIDERS[x]['name']}"
        )

        # APIキー入力
        api_key_label = f"{AI_PROVIDERS[ai_provider]['icon']} {AI_PROVIDERS[ai_provider]['name']} APIキー"
        api_key = st.text_input(
            api_key_label,
            type="password",
            value=st.session_state.api_keys.get(ai_provider, ''),
            help=f"{AI_PROVIDERS[ai_provider]['name']}のAPIキーを入力してください"
        )

        if api_key:
            st.session_state.api_keys[ai_provider] = api_key
            st.success("✅ APIキー設定完了")

        st.divider()

        # スケジューラー制御
        st.subheader("🤖 自動スケジューラー")
        scheduler = get_scheduler()

        col1, col2 = st.columns(2)
        with col1:
            if st.button("▶️ 開始", use_container_width=True):
                scheduler.start()
                st.session_state.scheduler_running = True
                st.success("スケジューラー開始")

        with col2:
            if st.button("⏹️ 停止", use_container_width=True):
                scheduler.stop()
                st.session_state.scheduler_running = False
                st.info("スケジューラー停止")

        if st.session_state.scheduler_running:
            st.success("🟢 スケジューラー稼働中")
        else:
            st.info("⚪ スケジューラー停止中")

        st.divider()

        # 統計情報
        stats = get_statistics()
        st.subheader("📊 統計")
        st.metric("総分析数", stats['total'])
        st.metric("広告分析", stats['ad'])
        st.metric("映画分析", stats['movie'])
        st.metric("ドラマ分析", stats['drama'])

    # メインタブ
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📹 動画分析",
        "🔄 バッチ処理",
        "⏰ スケジュール",
        "📚 履歴",
        "📊 レポート"
    ])

    # タブ1: 動画分析
    with tab1:
        show_analysis_tab(ai_provider, api_key)

    # タブ2: バッチ処理
    with tab2:
        show_batch_tab(ai_provider, api_key)

    # タブ3: スケジュール
    with tab3:
        show_schedule_tab(ai_provider, api_key)

    # タブ4: 履歴
    with tab4:
        show_history_tab()

    # タブ5: レポート
    with tab5:
        show_report_tab()


def show_analysis_tab(ai_provider, api_key):
    """動画分析タブ"""
    st.header("📹 動画分析")

    # 分析タイプ選択
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        if st.button(f"{ANALYSIS_TYPES['ad']['icon']}\n\n{ANALYSIS_TYPES['ad']['name']}", use_container_width=True):
            st.session_state.analysis_type = 'ad'

    with col2:
        if st.button(f"{ANALYSIS_TYPES['movie']['icon']}\n\n{ANALYSIS_TYPES['movie']['name']}", use_container_width=True):
            st.session_state.analysis_type = 'movie'

    with col3:
        if st.button(f"{ANALYSIS_TYPES['drama']['icon']}\n\n{ANALYSIS_TYPES['drama']['name']}", use_container_width=True):
            st.session_state.analysis_type = 'drama'

    with col4:
        if st.button(f"{ANALYSIS_TYPES['comprehensive']['icon']}\n\n{ANALYSIS_TYPES['comprehensive']['name']}", use_container_width=True):
            st.session_state.analysis_type = 'comprehensive'

    # デフォルト値
    if 'analysis_type' not in st.session_state:
        st.session_state.analysis_type = 'ad'

    selected_type = st.session_state.analysis_type
    st.info(f"選択中: {ANALYSIS_TYPES[selected_type]['name']} - {ANALYSIS_TYPES[selected_type]['description']}")

    # 動画URL入力
    video_url = st.text_input(
        "動画URL *",
        placeholder="https://www.youtube.com/watch?v=...",
        help="YouTube URLまたは直リンクの動画URL"
    )

    video_title = st.text_input(
        "動画タイトル（オプション）",
        placeholder="自動取得されます"
    )

    additional_notes = st.text_area(
        "追加の分析指示",
        placeholder="特定の観点や注目ポイントがあれば記入してください",
        height=100
    )

    # 分析実行
    if st.button("🎬 分析開始", type="primary", use_container_width=True):
        if not api_key:
            st.error("❌ APIキーを設定してください")
            return

        if not video_url:
            st.error("❌ 動画URLを入力してください")
            return

        # 分析処理
        with st.spinner("分析中..."):
            try:
                # プログレスバー
                progress_bar = st.progress(0)
                status_text = st.empty()

                # ステップ1: 動画情報取得
                status_text.text("📥 動画情報を取得中...")
                progress_bar.progress(10)

                if not video_title:
                    info = get_video_info(video_url)
                    video_title = info['title']

                # ステップ2: 動画ダウンロードとフレーム抽出
                status_text.text("🎞️ 動画をダウンロードしてフレームを抽出中...")
                progress_bar.progress(30)

                video_result = process_video(video_url, num_frames=FRAMES_TO_EXTRACT)

                if not video_result['success']:
                    st.error(f"❌ 動画処理エラー: {video_result['error']}")
                    return

                frames = video_result['frames']
                frame_paths = video_result['frame_paths']

                progress_bar.progress(60)

                # フレームプレビュー
                st.subheader("抽出されたフレーム")
                cols = st.columns(min(len(frames), 4))
                for i, frame in enumerate(frames[:4]):
                    with cols[i]:
                        st.image(frame, use_column_width=True)

                # ステップ3: AI分析
                status_text.text("🤖 AIで分析中...")
                progress_bar.progress(70)

                start_time = time.time()

                analysis_result = analyze_video(
                    api_key,
                    ai_provider,
                    frames,
                    selected_type,
                    video_url,
                    video_title,
                    additional_notes
                )

                if not analysis_result['success']:
                    st.error(f"❌ 分析エラー: {analysis_result['error']}")
                    return

                duration = int(time.time() - start_time)

                progress_bar.progress(90)

                # ステップ4: 保存
                status_text.text("💾 結果を保存中...")

                analysis_id = save_analysis(
                    video_url,
                    video_title,
                    selected_type,
                    ai_provider,
                    analysis_result['result'],
                    frame_paths,
                    duration
                )

                progress_bar.progress(100)
                status_text.text("✅ 分析完了！")

                # 結果表示
                st.success(f"✅ 分析完了！（ID: {analysis_id}, 所要時間: {duration}秒）")

                st.subheader("📊 分析結果")
                st.markdown(analysis_result['result'])

                # ダウンロードボタン
                col1, col2 = st.columns(2)
                with col1:
                    st.download_button(
                        "📄 テキストをダウンロード",
                        data=analysis_result['result'],
                        file_name=f"analysis_{analysis_id}.txt",
                        mime="text/plain"
                    )

                with col2:
                    html_report = generate_html_report(analysis_id, video_title, video_url, selected_type, analysis_result['result'])
                    st.download_button(
                        "📕 HTMLレポートをダウンロード",
                        data=html_report,
                        file_name=f"analysis_{analysis_id}.html",
                        mime="text/html"
                    )

            except Exception as e:
                st.error(f"❌ エラー: {str(e)}")
                import traceback
                st.code(traceback.format_exc())


def show_batch_tab(ai_provider, api_key):
    """バッチ処理タブ"""
    st.header("🔄 バッチ処理")

    st.info("複数の動画を一括で分析します。夜間や仕事中に自動で処理が完了します。")

    # 分析タイプ選択
    batch_analysis_type = st.selectbox(
        "分析タイプ",
        options=list(ANALYSIS_TYPES.keys()),
        format_func=lambda x: f"{ANALYSIS_TYPES[x]['icon']} {ANALYSIS_TYPES[x]['name']}"
    )

    # URL入力
    urls_input = st.text_area(
        "動画URL（1行に1つ）",
        placeholder="https://www.youtube.com/watch?v=...\nhttps://www.youtube.com/watch?v=...",
        height=200
    )

    col1, col2 = st.columns(2)

    with col1:
        if st.button("➕ バッチキューに追加", use_container_width=True):
            if urls_input:
                urls = [url.strip() for url in urls_input.split('\n') if url.strip()]

                for url in urls:
                    try:
                        info = get_video_info(url)
                        add_to_batch(url, info['title'], batch_analysis_type, ai_provider)
                    except:
                        add_to_batch(url, url, batch_analysis_type, ai_provider)

                st.success(f"✅ {len(urls)}件をバッチキューに追加しました")
                st.rerun()

    with col2:
        if st.button("🗑️ キュークリア", use_container_width=True):
            clear_batch_queue()
            st.success("✅ バッチキューをクリアしました")
            st.rerun()

    # バッチキュー表示
    st.subheader("バッチキュー")
    batch_items = get_batch_queue()

    if not batch_items:
        st.info("バッチキューは空です")
    else:
        for item in batch_items:
            with st.expander(f"{item['video_title']} - {item['status']}"):
                st.write(f"**URL:** {item['video_url']}")
                st.write(f"**タイプ:** {ANALYSIS_TYPES[item['analysis_type']]['name']}")
                st.write(f"**ステータス:** {item['status']}")

                if item['status'] == 'failed' and item['error_message']:
                    st.error(f"エラー: {item['error_message']}")

                if st.button(f"削除", key=f"delete_batch_{item['id']}"):
                    delete_batch_item(item['id'])
                    st.rerun()

        # バッチ処理開始
        if st.button("🚀 バッチ処理開始", type="primary", use_container_width=True):
            if not api_key:
                st.error("❌ APIキーを設定してください")
                return

            pending_items = [item for item in batch_items if item['status'] == 'pending']

            if not pending_items:
                st.warning("処理待ちのアイテムがありません")
                return

            progress_bar = st.progress(0)
            status_text = st.empty()

            def progress_callback(current, total, item):
                progress = (current + 1) / total
                progress_bar.progress(progress)
                status_text.text(f"処理中: {item['video_title']} ({current + 1}/{total})")

            try:
                results = process_batch_queue(pending_items, api_key, ai_provider, progress_callback)

                success_count = sum(1 for r in results if r['success'])
                st.success(f"✅ バッチ処理完了: {success_count}/{len(results)} 成功")

                # ステータス更新
                for result in results:
                    if result['success']:
                        update_batch_status(result['id'], 'completed', analysis_id=result['analysis_id'])
                    else:
                        update_batch_status(result['id'], 'failed', error_message=result['error'])

                st.rerun()

            except Exception as e:
                st.error(f"❌ バッチ処理エラー: {str(e)}")


def show_schedule_tab(ai_provider, api_key):
    """スケジュールタブ"""
    st.header("⏰ スケジュール管理")

    st.info("指定した時刻に自動で動画分析を実行します。サーバー稼働中は24/7自動で処理されます。")

    # 新規スケジュール作成
    st.subheader("➕ 新規スケジュール作成")

    schedule_url = st.text_input("動画URL", key="schedule_url")
    schedule_analysis_type = st.selectbox(
        "分析タイプ",
        options=list(ANALYSIS_TYPES.keys()),
        format_func=lambda x: f"{ANALYSIS_TYPES[x]['icon']} {ANALYSIS_TYPES[x]['name']}",
        key="schedule_type"
    )

    col1, col2 = st.columns(2)

    with col1:
        schedule_date = st.date_input("実行日", value=datetime.now().date())

    with col2:
        schedule_time = st.time_input("実行時刻", value=datetime.now().time())

    if st.button("➕ スケジュール追加", use_container_width=True):
        if not schedule_url:
            st.error("❌ URLを入力してください")
            return

        scheduled_datetime = datetime.combine(schedule_date, schedule_time)

        if scheduled_datetime < datetime.now():
            st.error("❌ 未来の日時を指定してください")
            return

        try:
            info = get_video_info(schedule_url)
            title = info['title']
        except:
            title = schedule_url

        schedule_id = create_schedule(
            schedule_url,
            title,
            schedule_analysis_type,
            ai_provider,
            scheduled_datetime
        )

        st.success(f"✅ スケジュール追加完了（ID: {schedule_id}）")
        st.rerun()

    # スケジュール一覧
    st.subheader("📅 スケジュール一覧")

    schedules = get_all_schedules()

    if not schedules:
        st.info("スケジュールは登録されていません")
    else:
        for schedule in schedules:
            status_emoji = {
                'pending': '⏰',
                'processing': '⚙️',
                'completed': '✅',
                'failed': '❌'
            }.get(schedule['status'], '❓')

            with st.expander(f"{status_emoji} {schedule['video_title']} - {schedule['status']}"):
                st.write(f"**URL:** {schedule['video_url']}")
                st.write(f"**実行予定:** {schedule['scheduled_time']}")
                st.write(f"**タイプ:** {ANALYSIS_TYPES[schedule['analysis_type']]['name']}")
                st.write(f"**ステータス:** {schedule['status']}")

                if schedule['status'] == 'failed' and schedule['error_message']:
                    st.error(f"エラー: {schedule['error_message']}")

                if schedule['status'] == 'completed' and schedule['analysis_id']:
                    if st.button(f"結果を表示", key=f"view_schedule_{schedule['id']}"):
                        st.session_state.view_analysis_id = schedule['analysis_id']

                if st.button(f"削除", key=f"delete_schedule_{schedule['id']}"):
                    delete_schedule(schedule['id'])
                    st.rerun()


def show_history_tab():
    """履歴タブ"""
    st.header("📚 分析履歴")

    # 検索・フィルター
    col1, col2 = st.columns([3, 1])

    with col1:
        search_query = st.text_input("🔍 検索", placeholder="タイトルまたはURL")

    with col2:
        filter_type = st.selectbox(
            "フィルター",
            options=['all'] + list(ANALYSIS_TYPES.keys()),
            format_func=lambda x: '全て' if x == 'all' else ANALYSIS_TYPES[x]['name']
        )

    # 履歴取得
    analyses = get_all_analyses(limit=100)

    # フィルタリング
    if search_query:
        analyses = [a for a in analyses if search_query.lower() in a['video_title'].lower() or search_query.lower() in a['video_url'].lower()]

    if filter_type != 'all':
        analyses = [a for a in analyses if a['analysis_type'] == filter_type]

    # 表示
    if not analyses:
        st.info("履歴がありません")
    else:
        st.write(f"**{len(analyses)}件の履歴**")

        for analysis in analyses:
            with st.expander(f"{ANALYSIS_TYPES[analysis['analysis_type']]['icon']} {analysis['video_title']}"):
                st.write(f"**URL:** {analysis['video_url']}")
                st.write(f"**分析日時:** {analysis['created_at']}")
                st.write(f"**タイプ:** {ANALYSIS_TYPES[analysis['analysis_type']]['name']}")
                st.write(f"**AI:** {AI_PROVIDERS[analysis['ai_provider']]['name']}")

                if analysis['duration']:
                    st.write(f"**所要時間:** {analysis['duration']}秒")

                # 結果表示
                with st.expander("結果を表示"):
                    st.markdown(analysis['analysis_result'])

                # ダウンロード
                col1, col2, col3 = st.columns(3)

                with col1:
                    st.download_button(
                        "📄 テキスト",
                        data=analysis['analysis_result'],
                        file_name=f"analysis_{analysis['id']}.txt",
                        key=f"dl_txt_{analysis['id']}"
                    )

                with col2:
                    html_report = generate_html_report(
                        analysis['id'],
                        analysis['video_title'],
                        analysis['video_url'],
                        analysis['analysis_type'],
                        analysis['analysis_result']
                    )
                    st.download_button(
                        "📕 HTML",
                        data=html_report,
                        file_name=f"analysis_{analysis['id']}.html",
                        mime="text/html",
                        key=f"dl_html_{analysis['id']}"
                    )

                with col3:
                    if st.button("🗑️ 削除", key=f"delete_{analysis['id']}"):
                        delete_analysis(analysis['id'])
                        st.rerun()


def show_report_tab():
    """レポートタブ"""
    st.header("📊 レポート生成")

    st.info("期間を指定してレポートを生成できます")

    col1, col2 = st.columns(2)

    with col1:
        start_date = st.date_input("開始日", value=datetime.now().date() - timedelta(days=7))

    with col2:
        end_date = st.date_input("終了日", value=datetime.now().date())

    report_type = st.selectbox(
        "レポートタイプ",
        options=['summary', 'detailed'],
        format_func=lambda x: 'サマリーレポート' if x == 'summary' else '詳細レポート'
    )

    if st.button("📊 レポート生成", type="primary"):
        analyses = get_all_analyses(limit=1000)

        # 期間フィルタ
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        filtered = [
            a for a in analyses
            if start_datetime <= datetime.fromisoformat(a['created_at']) <= end_datetime
        ]

        if not filtered:
            st.warning("指定期間に分析データがありません")
            return

        st.success(f"✅ {len(filtered)}件の分析を含むレポートを生成しました")

        # サマリー
        st.subheader("📊 サマリー")

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("総分析数", len(filtered))

        with col2:
            ad_count = sum(1 for a in filtered if a['analysis_type'] == 'ad')
            st.metric("広告分析", ad_count)

        with col3:
            movie_count = sum(1 for a in filtered if a['analysis_type'] == 'movie')
            st.metric("映画分析", movie_count)

        with col4:
            drama_count = sum(1 for a in filtered if a['analysis_type'] == 'drama')
            st.metric("ドラマ分析", drama_count)

        if report_type == 'detailed':
            st.subheader("詳細")
            for analysis in filtered:
                with st.expander(f"{analysis['video_title']} - {analysis['created_at']}"):
                    st.markdown(analysis['analysis_result'][:500] + "...")


def generate_html_report(analysis_id, title, url, analysis_type, result):
    """HTMLレポート生成"""
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>動画分析レポート - {title}</title>
    <style>
        body {{ font-family: sans-serif; max-width: 1000px; margin: 40px auto; padding: 20px; }}
        h1 {{ color: #667eea; }}
        .meta {{ background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .result {{ white-space: pre-wrap; line-height: 1.8; }}
    </style>
</head>
<body>
    <h1>📊 動画分析レポート</h1>
    <div class="meta">
        <p><strong>動画タイトル:</strong> {title}</p>
        <p><strong>URL:</strong> <a href="{url}">{url}</a></p>
        <p><strong>分析タイプ:</strong> {ANALYSIS_TYPES[analysis_type]['name']}</p>
        <p><strong>分析ID:</strong> {analysis_id}</p>
    </div>
    <div class="result">{result}</div>
</body>
</html>"""


if __name__ == "__main__":
    main()
