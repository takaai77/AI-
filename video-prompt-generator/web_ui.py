#!/usr/bin/env python3
"""
Video Prompt Generator - Streamlit Web UI

iPhone/モバイルブラウザから動画分析を手軽に行うためのWebインターフェース

使用方法:
    streamlit run web_ui.py
"""

import streamlit as st
import json
import os
from pathlib import Path
from datetime import datetime
import tempfile

# 自作モジュールのインポート
from config import Config, initialize_config
from video_processor import VideoProcessor
from prompt_generator import PromptGenerator
from audio_analyzer import AudioAnalyzer


# ページ設定（モバイル対応）
st.set_page_config(
    page_title="Video Prompt Generator",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# カスタムCSS（モバイル対応）
st.markdown("""
<style>
    .stApp {
        max-width: 1200px;
        margin: 0 auto;
    }
    .upload-box {
        border: 2px dashed #1f77b4;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        margin: 10px 0;
    }
    .result-box {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    .frame-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 15px;
        margin: 20px 0;
    }
    .frame-item {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    @media (max-width: 768px) {
        .frame-gallery {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        }
    }
</style>
""", unsafe_allow_html=True)


def initialize_session_state():
    """セッション状態の初期化"""
    if 'results' not in st.session_state:
        st.session_state.results = None
    if 'extracted_frames' not in st.session_state:
        st.session_state.extracted_frames = None
    if 'video_path' not in st.session_state:
        st.session_state.video_path = None
    if 'processing' not in st.session_state:
        st.session_state.processing = False


def display_header():
    """ヘッダーの表示"""
    st.title("🎬 Video Prompt Generator")
    st.markdown("""
    動画URLまたはローカルファイルから、Midjourney/Stable Diffusion用の
    画像生成プロンプトを自動作成します。
    """)
    st.markdown("---")


def display_sidebar():
    """サイドバーの設定"""
    with st.sidebar:
        st.header("⚙️ 設定")

        # 言語選択
        language = st.selectbox(
            "プロンプト言語",
            options=["ja", "en"],
            format_func=lambda x: "日本語" if x == "ja" else "English",
            help="生成されるプロンプトの言語を選択"
        )

        # プラットフォーム選択
        platform = st.selectbox(
            "🎨 画像生成プラットフォーム",
            options=["seaart", "novelai", "midjourney"],
            format_func=lambda x: {
                "seaart": "SeaArt（シーダンス）",
                "novelai": "NovelAI（ナノバナナプロ）",
                "midjourney": "Midjourney"
            }[x],
            index=0,  # SeaArtをデフォルト
            help="使用する画像生成プラットフォームを選択"
        )

        # プラットフォーム別の説明
        platform_desc = {
            "seaart": "💡 タグベース + 自然言語のハイブリッド形式で生成",
            "novelai": "💡 アニメ・イラスト特化、タグベース形式で生成",
            "midjourney": "💡 自然言語で詳細に記述する形式で生成"
        }
        st.info(platform_desc[platform])

        # シーン検出オプション
        st.subheader("🎬 シーン検出")
        detect_scenes = st.checkbox(
            "カット割り検出を有効にする",
            value=True,
            help="動画のシーン変更を自動検出"
        )

        extract_frames = st.checkbox(
            "代表フレームを抽出",
            value=True,
            disabled=not detect_scenes,
            help="各シーンの代表画像を保存"
        )

        # 音声分析オプション
        st.subheader("🎤 音声分析")
        analyze_audio = st.checkbox(
            "音声分析を有効にする",
            value=False,
            help="セリフの文字起こしとBGM分析を実行"
        )

        whisper_model = st.selectbox(
            "音声認識モデル",
            options=["tiny", "base", "small", "medium"],
            index=1,  # baseをデフォルト
            disabled=not analyze_audio,
            help="tiny=最速・低精度、medium=高精度・遅い（初回のみモデルダウンロードが必要）"
        )

        if analyze_audio:
            st.info("💡 初回実行時は音声認識モデルのダウンロードが発生します（数百MB）")

        # 詳細ログ
        verbose = st.checkbox(
            "詳細ログを表示",
            value=False,
            help="処理の詳細情報を表示"
        )

        # 対応プラットフォーム表示
        st.markdown("---")
        st.subheader("📱 対応プラットフォーム")
        st.markdown("""
        - ✅ YouTube
        - ✅ X (Twitter)
        - ✅ Instagram
        - ✅ TikTok
        - ✅ その他1000+サイト
        - ✅ ローカルファイル
        """)

        # API情報
        st.markdown("---")
        st.caption("Powered by Google Gemini API")

        return language, platform, detect_scenes, extract_frames, analyze_audio, whisper_model, verbose


def display_input_section():
    """入力セクションの表示"""
    st.header("📥 動画入力")

    # タブで入力方法を切り替え
    tab1, tab2 = st.tabs(["🔗 URL入力", "📁 ファイルアップロード"])

    with tab1:
        video_url = st.text_input(
            "動画URL",
            placeholder="https://www.youtube.com/watch?v=...",
            help="YouTube, X (Twitter), Instagram, TikTok等のURL"
        )

        # URL例を表示
        with st.expander("💡 URL例"):
            st.markdown("""
            **YouTube:**
            ```
            https://www.youtube.com/watch?v=example_id
            ```

            **X (Twitter):**
            ```
            https://twitter.com/user/status/123456789
            ```

            **Instagram:**
            ```
            https://www.instagram.com/p/ABC123/
            ```

            **TikTok:**
            ```
            https://www.tiktok.com/@user/video/123456789
            ```
            """)

        return "url", video_url

    with tab2:
        uploaded_file = st.file_uploader(
            "動画ファイルを選択",
            type=['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv'],
            help="対応形式: .mp4, .avi, .mov, .mkv, .flv, .wmv"
        )

        if uploaded_file is not None:
            # 一時ファイルとして保存
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(uploaded_file.name).suffix) as tmp_file:
                tmp_file.write(uploaded_file.getvalue())
                tmp_path = tmp_file.name

            st.success(f"✓ ファイルをアップロードしました: {uploaded_file.name}")
            st.info(f"📊 ファイルサイズ: {uploaded_file.size / (1024*1024):.2f} MB")

            return "file", tmp_path

        return "file", None


def process_video(video_source, source_type, language, platform, detect_scenes, extract_frames, analyze_audio, whisper_model, verbose):
    """動画の処理"""

    # 入力チェック
    if source_type == "url" and not video_source:
        st.warning("⚠️ 動画URLを入力してください")
        return False

    if source_type == "file" and not video_source:
        st.warning("⚠️ 動画ファイルをアップロードしてください")
        return False

    try:
        # 処理開始
        st.session_state.processing = True
        progress_bar = st.progress(0)
        status_text = st.empty()

        # ステップ1: 動画の処理
        status_text.text("⏳ ステップ1/3: 動画を処理中...")
        progress_bar.progress(10)

        video_processor = VideoProcessor(verbose=verbose)

        if source_type == "url":
            status_text.text(f"📥 動画をダウンロード中: {video_source}")
            video_path = video_processor.download_video(video_source)
        else:
            video_path = Path(video_source)

        if not video_path or not video_path.exists():
            st.error("✗ 動画の取得に失敗しました")
            return False

        st.session_state.video_path = video_path
        progress_bar.progress(30)

        # Geminiへのアップロード
        status_text.text("📤 Gemini APIへアップロード中...")
        video_file = video_processor.upload_to_gemini(video_path)

        if not video_file:
            st.error("✗ Gemini APIへのアップロードに失敗しました")
            return False

        progress_bar.progress(50)

        # シーン検出（オプション）
        scenes = None
        video_metadata = None
        extracted_frames_data = None

        if detect_scenes:
            status_text.text("🎬 シーンを検出中...")

            # メタデータ取得
            video_metadata = video_processor.get_video_metadata(video_path)

            # カット割り検出
            scenes = video_processor.detect_scene_changes(video_path)

            if scenes:
                st.info(f"✓ {len(scenes)} シーンを検出しました")

                # フレーム抽出
                if extract_frames:
                    status_text.text("🖼️ フレームを抽出中...")
                    extracted_frames_data = video_processor.extract_frames(video_path, scenes)
                    st.session_state.extracted_frames = extracted_frames_data

            progress_bar.progress(60)

        # 音声分析（オプション）
        audio_analysis = None

        if analyze_audio:
            status_text.text("🎤 音声を分析中...")

            audio_analyzer = AudioAnalyzer(
                whisper_model=whisper_model,
                verbose=verbose
            )

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
                    st.info(f"✓ {len(segments)}件のセリフを文字起こししました")

                # BGM分析結果の表示
                if audio_analysis.get('music_analysis'):
                    music = audio_analysis['music_analysis']
                    st.info(f"✓ BGM分析完了: {music.get('mood', 'N/A')} ({music.get('tempo', 0):.0f} BPM)")

            progress_bar.progress(65)

        # ステップ2: プロンプト生成
        status_text.text("⏳ ステップ2/3: プロンプトを生成中...")
        progress_bar.progress(70)

        prompt_gen = PromptGenerator(language=language, platform=platform, verbose=verbose)

        status_text.text("🤖 Gemini APIで動画を分析中...")

        if scenes:
            results = prompt_gen.generate_prompts_with_scenes(
                video_file,
                video_source if source_type == "url" else str(video_path),
                scenes,
                video_metadata,
                audio_analysis  # 音声分析結果を追加
            )
        else:
            results = prompt_gen.generate_prompts(
                video_file,
                video_source if source_type == "url" else str(video_path),
                audio_analysis=audio_analysis  # 音声分析結果を追加
            )

        if not results:
            st.error("✗ プロンプト生成に失敗しました")
            return False

        progress_bar.progress(90)

        # 結果の保存
        status_text.text("💾 結果を保存中...")
        output_path = Config.get_output_filename('prompts')

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        st.session_state.results = results

        progress_bar.progress(100)
        status_text.text("✨ 処理が完了しました！")

        return True

    except Exception as e:
        st.error(f"✗ エラーが発生しました: {e}")
        if verbose:
            st.exception(e)
        return False

    finally:
        st.session_state.processing = False


def display_results():
    """結果の表示"""
    if not st.session_state.results:
        return

    results = st.session_state.results

    st.markdown("---")
    st.header("📊 結果")

    # サマリー表示
    with st.expander("📝 動画サマリー", expanded=True):
        st.write(results.get('summary', 'N/A'))

    # 動画情報
    if 'video_metadata' in results:
        metadata = results['video_metadata']
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("時間", metadata.get('duration_formatted', 'N/A'))
        with col2:
            st.metric("解像度", f"{metadata.get('width')}x{metadata.get('height')}")
        with col3:
            st.metric("FPS", f"{metadata.get('fps', 0):.1f}")
        with col4:
            st.metric("シーン数", results.get('total_scenes', 'N/A'))

    # 音声分析情報
    if 'audio_analysis' in results:
        audio_analysis = results['audio_analysis']

        with st.expander("🎤 音声分析結果", expanded=False):
            # 文字起こし
            if audio_analysis.get('transcription'):
                trans = audio_analysis['transcription']
                segments = trans.get('segments', [])

                st.markdown(f"**言語:** {trans.get('language', 'N/A')}")
                st.markdown(f"**セリフ数:** {len(segments)}件")

                if segments:
                    st.markdown("**セリフ一覧:**")
                    for seg in segments:
                        st.markdown(f"`[{seg.get('timestamp')}]` {seg.get('text', '')}")

            # BGM分析
            if audio_analysis.get('music_analysis'):
                music = audio_analysis['music_analysis']

                st.markdown("---")
                st.markdown("**🎵 BGM分析:**")

                col1, col2, col3, col4 = st.columns(4)

                with col1:
                    st.metric("テンポ", f"{music.get('tempo', 0):.0f} BPM")
                with col2:
                    st.metric("雰囲気", music.get('mood', 'N/A'))
                with col3:
                    st.metric("エネルギー", f"{music.get('energy', 0):.2f}")
                with col4:
                    st.metric("キー", music.get('key', 'N/A'))

    # プロンプト一覧
    st.subheader("🎨 生成されたプロンプト")

    prompts = results.get('prompts', [])

    for i, prompt in enumerate(prompts):
        with st.expander(f"🎬 Scene {prompt.get('scene', i+1)}: {prompt.get('timestamp', 'N/A')}", expanded=(i == 0)):
            # 説明
            if 'description' in prompt:
                st.markdown(f"**説明:** {prompt['description']}")

            # セリフ（音声分析結果）
            if 'dialogue' in prompt and prompt['dialogue']:
                st.markdown(f"**💬 セリフ:** {prompt['dialogue']}")

            # BGMの雰囲気（音声分析結果）
            if 'audio_mood' in prompt and prompt['audio_mood']:
                st.markdown(f"**🎵 音の雰囲気:** {prompt['audio_mood']}")

            # 英語プロンプト
            st.markdown("**🇬🇧 English Prompt:**")
            st.code(prompt.get('prompt', 'N/A'), language="text")

            # 日本語プロンプト（ある場合）
            if 'japanese_prompt' in prompt:
                st.markdown("**🇯🇵 Japanese Prompt:**")
                st.code(prompt['japanese_prompt'], language="text")

            # コピーボタン
            col1, col2 = st.columns(2)
            with col1:
                st.button(
                    "📋 英語プロンプトをコピー",
                    key=f"copy_en_{i}",
                    help="クリップボードにコピー"
                )
            if 'japanese_prompt' in prompt:
                with col2:
                    st.button(
                        "📋 日本語プロンプトをコピー",
                        key=f"copy_ja_{i}",
                        help="クリップボードにコピー"
                    )

    # 抽出されたフレーム表示
    if st.session_state.extracted_frames:
        st.markdown("---")
        st.subheader("🖼️ 抽出されたフレーム")

        frames = st.session_state.extracted_frames

        # グリッドレイアウトで表示
        cols = st.columns(3)
        for i, frame_data in enumerate(frames):
            with cols[i % 3]:
                frame_path = frame_data.get('frame_path')
                if frame_path and os.path.exists(frame_path):
                    st.image(
                        frame_path,
                        caption=f"Scene {frame_data.get('scene_number')}: {frame_data.get('timestamp')}",
                        use_container_width=True
                    )

    # JSON ダウンロード
    st.markdown("---")
    st.subheader("💾 結果のダウンロード")

    json_str = json.dumps(results, ensure_ascii=False, indent=2)

    col1, col2 = st.columns(2)

    with col1:
        st.download_button(
            label="📥 JSON形式でダウンロード",
            data=json_str,
            file_name=f"prompts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )

    with col2:
        # テキスト形式でもダウンロード可能に
        text_output = f"# Video Prompt Generator Results\n\n"
        text_output += f"## Summary\n{results.get('summary', 'N/A')}\n\n"
        text_output += f"## Prompts\n\n"

        for prompt in prompts:
            text_output += f"### Scene {prompt.get('scene')}: {prompt.get('timestamp', 'N/A')}\n"
            if 'description' in prompt:
                text_output += f"**Description:** {prompt['description']}\n\n"
            text_output += f"**English Prompt:**\n{prompt.get('prompt', 'N/A')}\n\n"
            if 'japanese_prompt' in prompt:
                text_output += f"**Japanese Prompt:**\n{prompt['japanese_prompt']}\n\n"
            text_output += "---\n\n"

        st.download_button(
            label="📥 テキスト形式でダウンロード",
            data=text_output,
            file_name=f"prompts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            mime="text/plain"
        )


def main():
    """メイン処理"""

    # 設定の初期化
    if not initialize_config():
        st.error("✗ 設定の初期化に失敗しました")
        st.info("💡 `.env`ファイルに`GOOGLE_API_KEY`が設定されているか確認してください")
        st.stop()

    # セッション状態の初期化
    initialize_session_state()

    # ヘッダー表示
    display_header()

    # サイドバー
    language, platform, detect_scenes, extract_frames, analyze_audio, whisper_model, verbose = display_sidebar()

    # 入力セクション
    source_type, video_source = display_input_section()

    # 処理開始ボタン
    st.markdown("---")

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        process_button = st.button(
            "🚀 プロンプトを生成",
            type="primary",
            use_container_width=True,
            disabled=st.session_state.processing
        )

    # 処理実行
    if process_button:
        with st.spinner("処理中..."):
            success = process_video(
                video_source,
                source_type,
                language,
                platform,
                detect_scenes,
                extract_frames,
                analyze_audio,
                whisper_model,
                verbose
            )

            if success:
                st.success("✨ プロンプト生成が完了しました！")
                st.balloons()

    # 結果表示
    display_results()

    # フッター
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666;">
        <p>Video Prompt Generator | Powered by Google Gemini API</p>
        <p>iPhone・モバイルブラウザ対応 🎉</p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == '__main__':
    main()
