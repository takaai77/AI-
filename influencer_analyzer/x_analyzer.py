"""
X（Twitter）投稿分析モジュール
"""
import os
import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import requests


@dataclass
class Tweet:
    """ツイートデータ"""
    id: str
    text: str
    created_at: str
    retweet_count: int = 0
    like_count: int = 0
    reply_count: int = 0
    quote_count: int = 0
    impression_count: int = 0
    is_retweet: bool = False
    media_urls: List[str] = field(default_factory=list)
    urls: List[str] = field(default_factory=list)


class XAnalyzer:
    """X（Twitter）アカウント分析クラス"""

    def __init__(self, bearer_token: Optional[str] = None):
        self.bearer_token = bearer_token or os.getenv('X_BEARER_TOKEN')
        self.base_url = "https://api.twitter.com/2"
        self.tweets: List[Tweet] = []
        self.user_info: Dict[str, Any] = {}

    def _get_headers(self) -> Dict[str, str]:
        """認証ヘッダーを取得"""
        return {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }

    def fetch_user_info(self, username: str) -> Dict[str, Any]:
        """ユーザー情報を取得"""
        if not self.bearer_token:
            print("警告: X_BEARER_TOKENが設定されていません。サンプルデータを使用します。")
            return self._get_sample_user_info(username)

        url = f"{self.base_url}/users/by/username/{username}"
        params = {
            "user.fields": "description,public_metrics,created_at,profile_image_url"
        }

        try:
            response = requests.get(url, headers=self._get_headers(), params=params)
            if response.status_code == 200:
                data = response.json()
                self.user_info = data.get('data', {})
                return self.user_info
            else:
                print(f"エラー: ユーザー情報の取得に失敗しました ({response.status_code})")
                return self._get_sample_user_info(username)
        except Exception as e:
            print(f"エラー: {e}")
            return self._get_sample_user_info(username)

    def fetch_tweets(self, username: str, max_results: int = 100,
                     include_retweets: bool = False) -> List[Tweet]:
        """ツイートを取得"""
        if not self.bearer_token:
            print("警告: X_BEARER_TOKENが設定されていません。サンプルデータを使用します。")
            return self._get_sample_tweets(username)

        # まずユーザーIDを取得
        if not self.user_info:
            self.fetch_user_info(username)

        user_id = self.user_info.get('id')
        if not user_id:
            return self._get_sample_tweets(username)

        url = f"{self.base_url}/users/{user_id}/tweets"
        params = {
            "max_results": min(max_results, 100),
            "tweet.fields": "created_at,public_metrics,entities,referenced_tweets",
            "expansions": "attachments.media_keys",
            "media.fields": "url,preview_image_url"
        }

        if not include_retweets:
            params["exclude"] = "retweets"

        tweets = []
        try:
            response = requests.get(url, headers=self._get_headers(), params=params)
            if response.status_code == 200:
                data = response.json()
                for tweet_data in data.get('data', []):
                    tweet = self._parse_tweet(tweet_data)
                    tweets.append(tweet)
            else:
                print(f"エラー: ツイートの取得に失敗しました ({response.status_code})")
                return self._get_sample_tweets(username)
        except Exception as e:
            print(f"エラー: {e}")
            return self._get_sample_tweets(username)

        self.tweets = tweets
        return tweets

    def _parse_tweet(self, tweet_data: Dict[str, Any]) -> Tweet:
        """ツイートデータをパース"""
        metrics = tweet_data.get('public_metrics', {})
        entities = tweet_data.get('entities', {})

        # URL抽出
        urls = []
        if 'urls' in entities:
            urls = [u.get('expanded_url', u.get('url', '')) for u in entities['urls']]

        # リツイートかどうか判定
        is_retweet = False
        if 'referenced_tweets' in tweet_data:
            for ref in tweet_data['referenced_tweets']:
                if ref.get('type') == 'retweeted':
                    is_retweet = True
                    break

        return Tweet(
            id=tweet_data.get('id', ''),
            text=tweet_data.get('text', ''),
            created_at=tweet_data.get('created_at', ''),
            retweet_count=metrics.get('retweet_count', 0),
            like_count=metrics.get('like_count', 0),
            reply_count=metrics.get('reply_count', 0),
            quote_count=metrics.get('quote_count', 0),
            impression_count=metrics.get('impression_count', 0),
            is_retweet=is_retweet,
            urls=urls
        )

    def _get_sample_user_info(self, username: str) -> Dict[str, Any]:
        """サンプルユーザー情報を返す"""
        return {
            "id": "sample_id",
            "name": username,
            "username": username,
            "description": "サンプルユーザーの説明",
            "public_metrics": {
                "followers_count": 10000,
                "following_count": 500,
                "tweet_count": 5000
            }
        }

    def _get_sample_tweets(self, username: str) -> List[Tweet]:
        """サンプルツイートを返す（APIトークンがない場合のデモ用）"""
        sample_tweets = [
            Tweet(
                id="1",
                text="動画編集のコツ：カット編集は視聴者の集中力を維持するために重要です。3秒以上同じ画角を続けないようにしましょう。#動画編集 #YouTuber",
                created_at=datetime.now().isoformat(),
                like_count=150,
                retweet_count=30
            ),
            Tweet(
                id="2",
                text="サムネイルは動画の顔！目立つ色使い、大きな文字、表情豊かな人物写真がクリック率を上げます。特に黄色と黒の組み合わせは効果的です。",
                created_at=datetime.now().isoformat(),
                like_count=200,
                retweet_count=45
            ),
            Tweet(
                id="3",
                text="タイトルの付け方で再生数が3倍変わりました。「〇〇する方法」より「〇〇したら人生変わった」のような感情を動かすタイトルが効果的です。",
                created_at=datetime.now().isoformat(),
                like_count=320,
                retweet_count=80
            ),
            Tweet(
                id="4",
                text="BGM選びのポイント：著作権フリーでも雰囲気に合うものを選ぶこと。テンポは内容に合わせて変える。おすすめはEpidemicSoundとArtlist。",
                created_at=datetime.now().isoformat(),
                like_count=180,
                retweet_count=35
            ),
            Tweet(
                id="5",
                text="投稿時間の最適化について。私の分析では、土曜日の17時-19時が最も視聴率が高い。ターゲット層によって変わるので自分のデータを分析することが大切。",
                created_at=datetime.now().isoformat(),
                like_count=250,
                retweet_count=60
            ),
        ]
        self.tweets = sample_tweets
        return sample_tweets

    def analyze_engagement(self) -> Dict[str, Any]:
        """エンゲージメント分析"""
        if not self.tweets:
            return {}

        total_likes = sum(t.like_count for t in self.tweets)
        total_retweets = sum(t.retweet_count for t in self.tweets)
        total_replies = sum(t.reply_count for t in self.tweets)

        avg_likes = total_likes / len(self.tweets) if self.tweets else 0
        avg_retweets = total_retweets / len(self.tweets) if self.tweets else 0

        # 最も人気のあるツイートを取得
        top_tweets = sorted(self.tweets, key=lambda t: t.like_count + t.retweet_count, reverse=True)[:5]

        return {
            "total_tweets": len(self.tweets),
            "total_likes": total_likes,
            "total_retweets": total_retweets,
            "total_replies": total_replies,
            "average_likes": round(avg_likes, 2),
            "average_retweets": round(avg_retweets, 2),
            "top_tweets": top_tweets
        }

    def extract_keywords(self, keywords: List[str]) -> Dict[str, List[Tweet]]:
        """キーワードに関連するツイートを抽出"""
        keyword_tweets = {kw: [] for kw in keywords}

        for tweet in self.tweets:
            text_lower = tweet.text.lower()
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    keyword_tweets[keyword].append(tweet)

        return keyword_tweets

    def get_tips_and_insights(self) -> List[Dict[str, Any]]:
        """投稿からヒントやインサイトを抽出"""
        insights = []

        # ヒントを含む可能性のあるパターン
        tip_patterns = [
            r'コツ[：:は]',
            r'ポイント[：:は]',
            r'方法[：:は]',
            r'〜すると',
            r'〜したら',
            r'おすすめ',
            r'効果的',
            r'重要',
            r'大切',
            r'秘訣',
            r'テクニック',
        ]

        for tweet in self.tweets:
            for pattern in tip_patterns:
                if re.search(pattern, tweet.text):
                    insights.append({
                        "text": tweet.text,
                        "engagement": tweet.like_count + tweet.retweet_count,
                        "type": "tip",
                        "source": "X"
                    })
                    break

        # エンゲージメント順にソート
        insights.sort(key=lambda x: x['engagement'], reverse=True)
        return insights

    def load_from_json(self, filepath: str) -> List[Tweet]:
        """JSONファイルからツイートを読み込む（手動エクスポートデータ用）"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        tweets = []
        for item in data:
            tweet = Tweet(
                id=str(item.get('id', '')),
                text=item.get('text', item.get('full_text', '')),
                created_at=item.get('created_at', ''),
                like_count=item.get('favorite_count', item.get('like_count', 0)),
                retweet_count=item.get('retweet_count', 0),
                reply_count=item.get('reply_count', 0)
            )
            tweets.append(tweet)

        self.tweets = tweets
        return tweets

    def export_to_json(self, filepath: str):
        """分析結果をJSONにエクスポート"""
        data = {
            "user_info": self.user_info,
            "tweets": [
                {
                    "id": t.id,
                    "text": t.text,
                    "created_at": t.created_at,
                    "like_count": t.like_count,
                    "retweet_count": t.retweet_count,
                    "reply_count": t.reply_count
                }
                for t in self.tweets
            ],
            "engagement_analysis": self.analyze_engagement()
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"分析結果をエクスポートしました: {filepath}")
