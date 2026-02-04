#!/usr/bin/env python3
"""
インフルエンサー分析ツール - Streamlit Webアプリ版
iPhoneなどモバイルデバイスから使用可能
"""
import streamlit as st
import os
import json
from datetime import datetime

# ページ設定（モバイル最適化）
st.set_page_config(
    page_title="インフルエンサー分析",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# カスタムCSS（モバイル対応）
st.markdown("""
<style>
    /* モバイル最適化 */
    .stApp {
        max-width: 100%;
    }

    /* 大きなボタン（タップしやすく） */
    .stButton > button {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1.1rem;
        border-radius: 10px;
    }

    /* カード風デザイン */
    .skill-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem;
        border-radius: 12px;
        margin: 0.5rem 0;
        color: white;
    }

    .insight-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 10px;
        margin: 0.5rem 0;
        border-left: 4px solid #667eea;
    }

    /* タブのスタイル */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }

    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        border-radius: 10px;
    }

    /* メトリクスカード */
    [data-testid="metric-container"] {
        background: #f0f2f6;
        padding: 1rem;
        border-radius: 10px;
    }

    /* テキストエリア */
    .stTextArea textarea {
        font-size: 16px !important; /* iOS ズーム防止 */
    }

    .stTextInput input {
        font-size: 16px !important;
    }

    /* PWAインストールバナー */
    .pwa-banner {
        background: linear-gradient(90deg, #4CAF50, #45a049);
        color: white;
        padding: 0.75rem;
        border-radius: 8px;
        text-align: center;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# PWA用マニフェストリンク
st.markdown("""
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="分析ツール">
<link rel="apple-touch-icon" href="/icon-192.png">
""", unsafe_allow_html=True)

# インポート
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from influencer_analyzer.x_analyzer import XAnalyzer
from influencer_analyzer.note_analyzer import NoteAnalyzer
from influencer_analyzer.content_analyzer import ContentAnalyzer
from influencer_analyzer.report_generator import ReportGenerator


def init_session_state():
    """セッション状態を初期化"""
    if 'analysis_result' not in st.session_state:
        st.session_state.analysis_result = None
    if 'saved_analyses' not in st.session_state:
        st.session_state.saved_analyses = []


def show_header():
    """ヘッダーを表示"""
    st.title("📊 インフルエンサー分析")
    st.caption("X・noteの投稿からスキルを抽出")


def show_analysis_form():
    """分析フォームを表示"""
    with st.form("analysis_form"):
        st.subheader("🔍 分析設定")

        name = st.text_input(
            "インフルエンサー名",
            placeholder="例: クリエイター太郎"
        )

        col1, col2 = st.columns(2)
        with col1:
            x_username = st.text_input(
                "X ユーザー名",
                placeholder="@なしで入力"
            )
        with col2:
            note_username = st.text_input(
                "note ユーザー名",
                placeholder="URLの末尾"
            )

        max_posts = st.slider(
            "取得投稿数",
            min_value=10,
            max_value=100,
            value=50,
            step=10
        )

        submitted = st.form_submit_button(
            "🚀 分析開始",
            use_container_width=True
        )

        return submitted, name, x_username, note_username, max_posts


def run_analysis(name, x_username, note_username, max_posts):
    """分析を実行"""
    progress = st.progress(0)
    status = st.empty()

    x_insights = []
    note_insights = []
    x_engagement = None
    note_engagement = None

    # X分析
    if x_username:
        status.text("📱 X の投稿を分析中...")
        progress.progress(25)

        x_analyzer = XAnalyzer()
        x_analyzer.fetch_user_info(x_username)
        x_analyzer.fetch_tweets(x_username, max_results=max_posts)
        x_insights = x_analyzer.get_tips_and_insights()
        x_engagement = x_analyzer.analyze_engagement()

    progress.progress(50)

    # note分析
    if note_username:
        status.text("📝 note の記事を分析中...")

        note_analyzer = NoteAnalyzer()
        note_analyzer.fetch_user_info(note_username)
        note_analyzer.fetch_articles(note_username, max_articles=max_posts)
        note_insights = note_analyzer.get_tips_and_insights()
        note_engagement = note_analyzer.analyze_engagement()

    progress.progress(75)

    # コンテンツ分析
    status.text("🧠 スキルを抽出中...")
    content_analyzer = ContentAnalyzer()
    result = content_analyzer.analyze(x_insights, note_insights, name)
    result.skills = content_analyzer.deduplicate_skills(result.skills)

    progress.progress(100)
    status.text("✅ 分析完了!")

    return result, x_engagement, note_engagement


def show_results(result, x_engagement, note_engagement):
    """分析結果を表示"""
    st.success(f"✨ {result.influencer_name} の分析が完了しました")

    # サマリーメトリクス
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("抽出スキル数", f"{len(result.skills)}件")
    with col2:
        x_count = result.summary.get('source_distribution', {}).get('X', 0)
        st.metric("X投稿", f"{x_count}件")
    with col3:
        note_count = result.summary.get('source_distribution', {}).get('note', 0)
        st.metric("note記事", f"{note_count}件")

    # タブで結果を表示
    tab1, tab2, tab3, tab4 = st.tabs(["📚 スキル集", "🔥 トップ10", "📈 統計", "💾 保存"])

    with tab1:
        show_skills_by_category(result)

    with tab2:
        show_top_insights(result)

    with tab3:
        show_statistics(result, x_engagement, note_engagement)

    with tab4:
        show_export_options(result, x_engagement, note_engagement)


def show_skills_by_category(result):
    """カテゴリ別スキル表示"""
    from collections import defaultdict

    categorized = defaultdict(list)
    for skill in result.skills:
        categorized[skill.category].append(skill)

    # カテゴリ選択
    categories = list(categorized.keys())
    if not categories:
        st.info("スキルが見つかりませんでした")
        return

    selected_category = st.selectbox(
        "カテゴリを選択",
        categories,
        format_func=lambda x: f"{x} ({len(categorized[x])}件)"
    )

    # スキル表示
    skills = categorized[selected_category]
    for i, skill in enumerate(skills[:10], 1):
        with st.expander(f"{i}. {skill.title[:40]}...", expanded=i <= 3):
            st.markdown(f"""
            **ソース:** {skill.source} | **エンゲージメント:** {skill.engagement}

            {skill.description}
            """)

            if skill.keywords:
                st.caption(f"🏷️ {', '.join(skill.keywords)}")


def show_top_insights(result):
    """トップインサイト表示"""
    sorted_skills = sorted(result.skills, key=lambda s: -s.engagement)[:10]

    for i, skill in enumerate(sorted_skills, 1):
        st.markdown(f"""
        <div class="insight-card">
            <strong>#{i} {skill.category}</strong>
            <span style="float:right; color:#667eea;">♥ {skill.engagement}</span>
            <p style="margin-top:0.5rem;">{skill.description[:150]}...</p>
            <small>📍 {skill.source}</small>
        </div>
        """, unsafe_allow_html=True)


def show_statistics(result, x_engagement, note_engagement):
    """統計情報を表示"""
    st.subheader("📊 カテゴリ分布")

    category_dist = result.summary.get('category_distribution', {})
    if category_dist:
        import pandas as pd
        df = pd.DataFrame(
            list(category_dist.items()),
            columns=['カテゴリ', '件数']
        ).sort_values('件数', ascending=True)

        st.bar_chart(df.set_index('カテゴリ'))

    # エンゲージメント詳細
    if x_engagement:
        st.subheader("📱 X エンゲージメント")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("平均いいね", x_engagement.get('average_likes', 0))
        with col2:
            st.metric("平均RT", x_engagement.get('average_retweets', 0))

    if note_engagement:
        st.subheader("📝 note エンゲージメント")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("総いいね", note_engagement.get('total_likes', 0))
        with col2:
            st.metric("平均いいね", note_engagement.get('average_likes', 0))


def show_export_options(result, x_engagement, note_engagement):
    """エクスポートオプション"""
    st.subheader("💾 レポート保存")

    # マークダウンレポート生成
    generator = ReportGenerator("./output")
    report = generator.generate_report(result, x_engagement, note_engagement)

    # ダウンロードボタン
    st.download_button(
        label="📄 マークダウンをダウンロード",
        data=report,
        file_name=f"{result.influencer_name}_analysis.md",
        mime="text/markdown",
        use_container_width=True
    )

    # チートシート
    cheatsheet = generator.generate_quick_reference(result)
    st.download_button(
        label="📋 チートシートをダウンロード",
        data=cheatsheet,
        file_name=f"{result.influencer_name}_cheatsheet.md",
        mime="text/markdown",
        use_container_width=True
    )

    # プレビュー
    with st.expander("📖 レポートプレビュー"):
        st.markdown(report[:3000] + "\n\n...")


def show_demo_mode():
    """デモモードを実行"""
    if st.button("🎮 デモを実行", use_container_width=True):
        with st.spinner("デモデータで分析中..."):
            result, x_eng, note_eng = run_analysis(
                "サンプルクリエイター",
                "demo_user",
                "demo_user",
                50
            )
            st.session_state.analysis_result = (result, x_eng, note_eng)
            st.rerun()


def show_saved_analyses():
    """保存済み分析を表示"""
    st.subheader("📁 保存済み分析")

    if not st.session_state.saved_analyses:
        st.info("保存された分析はありません")
        return

    for i, (name, timestamp) in enumerate(st.session_state.saved_analyses):
        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"📊 {name}")
            st.caption(timestamp)
        with col2:
            if st.button("表示", key=f"load_{i}"):
                st.info("この機能は開発中です")


def main():
    """メイン関数"""
    init_session_state()
    show_header()

    # サイドバー（デスクトップ用）
    with st.sidebar:
        st.header("⚙️ 設定")
        show_demo_mode()
        st.divider()
        show_saved_analyses()

        st.divider()
        st.caption("📱 ホーム画面に追加してアプリとして使えます")

    # メインコンテンツ
    if st.session_state.analysis_result:
        result, x_eng, note_eng = st.session_state.analysis_result
        show_results(result, x_eng, note_eng)

        if st.button("🔄 新しい分析", use_container_width=True):
            st.session_state.analysis_result = None
            st.rerun()
    else:
        # 分析フォーム
        submitted, name, x_username, note_username, max_posts = show_analysis_form()

        if submitted:
            if not name:
                st.error("インフルエンサー名を入力してください")
            elif not x_username and not note_username:
                st.error("X または note のユーザー名を入力してください")
            else:
                result, x_eng, note_eng = run_analysis(
                    name, x_username, note_username, max_posts
                )
                st.session_state.analysis_result = (result, x_eng, note_eng)
                st.rerun()

        # モバイル向けデモボタン
        st.divider()
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🎮 デモで試す", use_container_width=True):
                result, x_eng, note_eng = run_analysis(
                    "サンプルクリエイター", "demo", "demo", 50
                )
                st.session_state.analysis_result = (result, x_eng, note_eng)
                st.rerun()
        with col2:
            st.button("❓ 使い方", use_container_width=True)


if __name__ == "__main__":
    main()
