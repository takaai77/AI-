"""
note投稿分析モジュール
"""
import os
import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import requests
from bs4 import BeautifulSoup
import time


@dataclass
class NoteArticle:
    """note記事データ"""
    id: str
    title: str
    body: str
    created_at: str
    like_count: int = 0
    comment_count: int = 0
    url: str = ""
    hashtags: List[str] = field(default_factory=list)
    is_paid: bool = False
    price: int = 0


class NoteAnalyzer:
    """noteアカウント分析クラス"""

    def __init__(self):
        self.base_url = "https://note.com/api/v2"
        self.articles: List[NoteArticle] = []
        self.user_info: Dict[str, Any] = {}

    def _get_headers(self) -> Dict[str, str]:
        """リクエストヘッダー"""
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }

    def fetch_user_info(self, username: str) -> Dict[str, Any]:
        """ユーザー情報を取得"""
        url = f"{self.base_url}/creators/{username}"

        try:
            response = requests.get(url, headers=self._get_headers())
            if response.status_code == 200:
                data = response.json()
                self.user_info = data.get('data', {})
                return self.user_info
            else:
                print(f"注意: noteユーザー情報の取得に失敗 ({response.status_code})")
                return self._get_sample_user_info(username)
        except Exception as e:
            print(f"注意: {e}. サンプルデータを使用します。")
            return self._get_sample_user_info(username)

    def fetch_articles(self, username: str, max_articles: int = 50) -> List[NoteArticle]:
        """記事一覧を取得"""
        url = f"{self.base_url}/creators/{username}/contents"
        params = {
            "kind": "note",
            "page": 1,
            "per_page": min(max_articles, 20)
        }

        articles = []
        try:
            page = 1
            while len(articles) < max_articles:
                params["page"] = page
                response = requests.get(url, headers=self._get_headers(), params=params)

                if response.status_code == 200:
                    data = response.json()
                    contents = data.get('data', {}).get('contents', [])

                    if not contents:
                        break

                    for item in contents:
                        article = self._parse_article(item)
                        articles.append(article)

                        if len(articles) >= max_articles:
                            break

                    page += 1
                    time.sleep(0.5)  # レート制限対策
                else:
                    print(f"注意: 記事取得に失敗 ({response.status_code})")
                    break

        except Exception as e:
            print(f"注意: {e}. サンプルデータを使用します。")
            return self._get_sample_articles(username)

        if not articles:
            return self._get_sample_articles(username)

        self.articles = articles
        return articles

    def _parse_article(self, item: Dict[str, Any]) -> NoteArticle:
        """記事データをパース"""
        return NoteArticle(
            id=str(item.get('id', '')),
            title=item.get('name', ''),
            body=item.get('body', item.get('excerpt', '')),
            created_at=item.get('created_at', item.get('publish_at', '')),
            like_count=item.get('like_count', 0),
            comment_count=item.get('comment_count', 0),
            url=item.get('note_url', f"https://note.com/{item.get('user', {}).get('urlname', '')}/n/{item.get('key', '')}"),
            hashtags=item.get('hashtag_notes', []),
            is_paid=item.get('price', 0) > 0,
            price=item.get('price', 0)
        )

    def fetch_article_content(self, article_url: str) -> str:
        """記事本文を取得（スクレイピング）"""
        try:
            response = requests.get(article_url, headers=self._get_headers())
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')

                # 記事本文を抽出
                content_div = soup.find('div', class_='note-common-styles__textnote-body')
                if content_div:
                    return content_div.get_text(separator='\n', strip=True)

                # 代替セレクター
                article_body = soup.find('article')
                if article_body:
                    return article_body.get_text(separator='\n', strip=True)

            return ""
        except Exception as e:
            print(f"記事取得エラー: {e}")
            return ""

    def _get_sample_user_info(self, username: str) -> Dict[str, Any]:
        """サンプルユーザー情報"""
        return {
            "id": "sample_id",
            "urlname": username,
            "name": username,
            "note_count": 100,
            "follower_count": 5000,
            "following_count": 200
        }

    def _get_sample_articles(self, username: str) -> List[NoteArticle]:
        """サンプル記事データ"""
        sample_articles = [
            NoteArticle(
                id="1",
                title="【完全版】YouTube動画編集の基本から応用まで",
                body="""
動画編集初心者の方へ向けた完全ガイドです。

■ カット編集の基本
- 不要な部分を的確に削除する
- ジャンプカットを活用して視聴維持率を上げる
- 間の取り方が重要。0.5秒の間で印象が変わる

■ テロップの入れ方
- フォントは読みやすさ重視（游ゴシック、ヒラギノ角ゴ）
- 文字の大きさは画面の1/15程度
- エッジ（縁取り）をつけて視認性アップ

■ BGM・効果音の選び方
- 動画のテンポに合わせたBGMを選ぶ
- 効果音は控えめに。多用すると安っぽくなる
- 著作権フリー音源サイト：DOVA-SYNDROME、甘茶の音楽工房
                """,
                created_at=datetime.now().isoformat(),
                like_count=350,
                comment_count=25,
                url="https://note.com/sample/n/12345"
            ),
            NoteArticle(
                id="2",
                title="サムネイルで再生数を3倍にした方法",
                body="""
サムネイルは動画のCTR（クリック率）を大きく左右します。

■ 効果的なサムネイルの特徴
1. 目立つ色使い（補色を活用）
2. 大きな文字（最大3語まで）
3. 人物の表情は感情を誇張
4. 矢印や丸で注目を集める

■ 私が実践しているルール
- 文字は画面の1/4を占める大きさ
- 黄色×黒、赤×白の組み合わせが効果的
- 顔出しの場合は驚きor笑顔
- スマホで見ても読める大きさか確認
                """,
                created_at=datetime.now().isoformat(),
                like_count=520,
                comment_count=42,
                url="https://note.com/sample/n/67890"
            ),
            NoteArticle(
                id="3",
                title="【有料級】YouTubeアルゴリズム完全攻略",
                body="""
YouTubeのアルゴリズムを理解して、再生数を伸ばすコツをお伝えします。

■ 視聴維持率を上げる
- 冒頭10秒で結論を予告
- 「〇〇を知りたい方は最後まで見てください」は逆効果
- 3分ごとにフックを入れる

■ クリック率を上げる
- タイトルに数字を入れる
- 「秘密」「驚愕」などのパワーワード
- ターゲットを明確にする（初心者向け、など）

■ エンゲージメントを上げる
- コメントへの返信で会話を生む
- 「この動画が参考になったらいいね」と促す
- 関連動画への誘導を忘れずに
                """,
                created_at=datetime.now().isoformat(),
                like_count=680,
                comment_count=58,
                url="https://note.com/sample/n/11111"
            ),
        ]
        self.articles = sample_articles
        return sample_articles

    def analyze_engagement(self) -> Dict[str, Any]:
        """エンゲージメント分析"""
        if not self.articles:
            return {}

        total_likes = sum(a.like_count for a in self.articles)
        total_comments = sum(a.comment_count for a in self.articles)
        avg_likes = total_likes / len(self.articles) if self.articles else 0

        # 人気記事トップ5
        top_articles = sorted(self.articles, key=lambda a: a.like_count, reverse=True)[:5]

        # 有料記事の分析
        paid_articles = [a for a in self.articles if a.is_paid]

        return {
            "total_articles": len(self.articles),
            "total_likes": total_likes,
            "total_comments": total_comments,
            "average_likes": round(avg_likes, 2),
            "paid_articles_count": len(paid_articles),
            "top_articles": top_articles
        }

    def extract_keywords(self, keywords: List[str]) -> Dict[str, List[NoteArticle]]:
        """キーワードに関連する記事を抽出"""
        keyword_articles = {kw: [] for kw in keywords}

        for article in self.articles:
            text = (article.title + " " + article.body).lower()
            for keyword in keywords:
                if keyword.lower() in text:
                    keyword_articles[keyword].append(article)

        return keyword_articles

    def get_tips_and_insights(self) -> List[Dict[str, Any]]:
        """記事からヒントやインサイトを抽出"""
        insights = []

        # ヒントを含む可能性のあるパターン
        tip_patterns = [
            r'[■●▼]',  # 見出し記号
            r'ポイント',
            r'コツ',
            r'方法',
            r'テクニック',
            r'おすすめ',
            r'効果的',
            r'重要',
            r'注意',
        ]

        for article in self.articles:
            # タイトルと本文を解析
            content = article.body
            lines = content.split('\n')

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                for pattern in tip_patterns:
                    if re.search(pattern, line):
                        insights.append({
                            "text": line,
                            "source_title": article.title,
                            "engagement": article.like_count,
                            "type": "tip",
                            "source": "note",
                            "url": article.url
                        })
                        break

        # エンゲージメント順にソート
        insights.sort(key=lambda x: x['engagement'], reverse=True)

        # 重複削除
        seen = set()
        unique_insights = []
        for insight in insights:
            if insight['text'] not in seen:
                seen.add(insight['text'])
                unique_insights.append(insight)

        return unique_insights

    def extract_sections(self) -> Dict[str, List[str]]:
        """記事から見出しセクションを抽出"""
        sections = {}

        for article in self.articles:
            current_section = None
            section_content = []

            for line in article.body.split('\n'):
                line = line.strip()
                if not line:
                    continue

                # 見出しパターン
                if re.match(r'^[■●▼【]', line):
                    if current_section and section_content:
                        if current_section not in sections:
                            sections[current_section] = []
                        sections[current_section].extend(section_content)

                    current_section = line
                    section_content = []
                elif current_section:
                    section_content.append(line)

            # 最後のセクション
            if current_section and section_content:
                if current_section not in sections:
                    sections[current_section] = []
                sections[current_section].extend(section_content)

        return sections

    def load_from_json(self, filepath: str) -> List[NoteArticle]:
        """JSONファイルから記事を読み込む"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        articles = []
        for item in data:
            article = NoteArticle(
                id=str(item.get('id', '')),
                title=item.get('title', ''),
                body=item.get('body', ''),
                created_at=item.get('created_at', ''),
                like_count=item.get('like_count', 0),
                comment_count=item.get('comment_count', 0),
                url=item.get('url', '')
            )
            articles.append(article)

        self.articles = articles
        return articles

    def export_to_json(self, filepath: str):
        """分析結果をJSONにエクスポート"""
        data = {
            "user_info": self.user_info,
            "articles": [
                {
                    "id": a.id,
                    "title": a.title,
                    "body": a.body[:500] + "..." if len(a.body) > 500 else a.body,
                    "created_at": a.created_at,
                    "like_count": a.like_count,
                    "comment_count": a.comment_count,
                    "url": a.url
                }
                for a in self.articles
            ],
            "engagement_analysis": self.analyze_engagement()
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"分析結果をエクスポートしました: {filepath}")
