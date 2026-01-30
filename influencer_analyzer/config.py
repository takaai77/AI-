"""
設定管理モジュール
"""
import os
import yaml
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class InfluencerConfig:
    """インフルエンサー設定"""
    name: str
    x_username: Optional[str] = None
    note_username: Optional[str] = None
    categories: List[str] = field(default_factory=list)


@dataclass
class AnalysisConfig:
    """分析設定"""
    max_posts: int = 100
    include_retweets: bool = False
    keywords: List[str] = field(default_factory=list)
    skill_categories: List[str] = field(default_factory=lambda: [
        "動画編集",
        "サムネイル作成",
        "タイトル・コピーライティング",
        "ストーリーテリング",
        "エンゲージメント戦略",
        "収益化",
        "機材・ツール",
        "撮影テクニック",
        "音声・BGM",
        "投稿タイミング"
    ])


@dataclass
class AppConfig:
    """アプリケーション設定"""
    influencers: List[InfluencerConfig] = field(default_factory=list)
    analysis: AnalysisConfig = field(default_factory=AnalysisConfig)
    output_dir: str = "./output"

    # API設定（環境変数から読み込み）
    x_bearer_token: Optional[str] = None
    openai_api_key: Optional[str] = None


def load_config(config_path: str = "config.yaml") -> AppConfig:
    """設定ファイルを読み込む"""
    config = AppConfig()

    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}

        # インフルエンサー設定
        if 'influencers' in data:
            config.influencers = [
                InfluencerConfig(**inf) for inf in data['influencers']
            ]

        # 分析設定
        if 'analysis' in data:
            config.analysis = AnalysisConfig(**data['analysis'])

        # 出力ディレクトリ
        if 'output_dir' in data:
            config.output_dir = data['output_dir']

    # 環境変数からAPI設定を読み込み
    config.x_bearer_token = os.getenv('X_BEARER_TOKEN')
    config.openai_api_key = os.getenv('OPENAI_API_KEY')

    return config


def save_config_template(config_path: str = "config.yaml"):
    """設定ファイルのテンプレートを保存"""
    template = """# インフルエンサー分析ツール設定ファイル

# 分析対象のインフルエンサー
influencers:
  - name: "サンプルクリエイター"
    x_username: "sample_creator"
    note_username: "sample_creator"
    categories:
      - "動画クリエイター"
      - "YouTuber"

# 分析設定
analysis:
  max_posts: 100
  include_retweets: false
  keywords:
    - "動画編集"
    - "サムネイル"
    - "再生数"
    - "収益化"
  skill_categories:
    - "動画編集"
    - "サムネイル作成"
    - "タイトル・コピーライティング"
    - "ストーリーテリング"
    - "エンゲージメント戦略"
    - "収益化"
    - "機材・ツール"
    - "撮影テクニック"
    - "音声・BGM"
    - "投稿タイミング"

# 出力ディレクトリ
output_dir: "./output"
"""
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(template)
    print(f"設定テンプレートを保存しました: {config_path}")
