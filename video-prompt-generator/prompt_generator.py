"""
プロンプト生成モジュール

このモジュールはGemini APIを使用して動画を分析し、
Freepik Pikaso上のSeedance/Nano Banana Pro用の画像生成プロンプトを自動生成します。
"""

import json
from datetime import datetime
from typing import Optional, Dict, List

import google.generativeai as genai

from config import Config


class PromptGenerator:
    """
    プロンプト生成クラス

    Gemini APIを使用して動画を分析し、
    画像生成AI用のプロンプトと要点まとめを生成します。
    """

    def __init__(self, language: str = 'ja', model: str = 'seedance', verbose: bool = False):
        """
        初期化

        Args:
            language (str): プロンプトの言語（'ja'または'en'）
            model (str): Freepik Pikaso上の画像生成モデル（'seedance', 'nanobanana'）
            verbose (bool): 詳細ログを出力するかどうか
        """
        self.language = language
        self.model = model
        self.verbose = verbose

        # Google Generative AI の設定
        genai.configure(api_key=Config.GOOGLE_API_KEY)

        # Gemini モデルの初期化
        self.model = genai.GenerativeModel(
            model_name=Config.GEMINI_MODEL
        )

        if self.verbose:
            print(f"✓ PromptGenerator initialized")
            print(f"  Gemini Model: {Config.GEMINI_MODEL}")
            print(f"  Language: {self.language}")
            print(f"  Image Gen Model: {self.model}")

    def _get_model_instructions(self) -> Dict[str, str]:
        """
        Freepik Pikaso上のモデル別のプロンプト生成指示を取得

        Returns:
            Dict: 日本語と英語の指示
        """
        instructions = {
            'seedance': {
                'ja': """
**Seedance向けプロンプト（Freepik Pikaso）:**
- タグベースと自然言語のハイブリッド形式が最適
- 主要タグをカンマ区切りで列挙した後、詳細説明を追加
- 品質タグを必ず含める: masterpiece, best quality, highres, detailed
- スタイルタグ: realistic, anime, illustration, photorealistic等
- 例: "masterpiece, best quality, sunset beach, person walking, golden hour lighting, warm colors, cinematic composition, highly detailed"
                """,
                'en': """
**For Seedance (Freepik Pikaso):**
- Hybrid format: tags + natural language works best
- List main tags separated by commas, then add detailed description
- Always include quality tags: masterpiece, best quality, highres, detailed
- Style tags: realistic, anime, illustration, photorealistic, etc.
- Example: "masterpiece, best quality, sunset beach, person walking, golden hour lighting, warm colors, cinematic composition, highly detailed"
                """
            },
            'nanobanana': {
                'ja': """
**Nano Banana Pro向けプロンプト（Freepik Pikaso）:**
- 完全タグベース形式（カンマ区切り）が最適
- アニメ・イラスト特化のタグを使用
- 必須品質タグ: masterpiece, best quality, high resolution, detailed, absurdres
- スタイルタグ: anime, illustration, digital art, 2d等
- キャラクターの詳細: 1girl, 1boy, solo, group等
- 背景・構図: beach, sunset, scenic, landscape等
- 色・照明: warm colors, golden hour, soft lighting等
- 例: "masterpiece, best quality, absurdres, anime, 1girl, sunset beach, golden hour, warm colors, detailed background, soft lighting, scenic"
                """,
                'en': """
**For Nano Banana Pro (Freepik Pikaso):**
- Pure tag-based format (comma-separated) works best
- Use anime/illustration-focused tags
- Required quality tags: masterpiece, best quality, high resolution, detailed, absurdres
- Style tags: anime, illustration, digital art, 2d, etc.
- Character details: 1girl, 1boy, solo, group, etc.
- Background/composition: beach, sunset, scenic, landscape, etc.
- Colors/lighting: warm colors, golden hour, soft lighting, etc.
- Example: "masterpiece, best quality, absurdres, anime, 1girl, sunset beach, golden hour, warm colors, detailed background, soft lighting, scenic"
                """
            }
        }

        return instructions.get(self.model, instructions['seedance'])

    def _create_analysis_prompt(
        self,
        scenes: Optional[List[Dict]] = None,
        audio_analysis: Optional[Dict] = None
    ) -> str:
        """
        動画分析用のシステムプロンプトを作成

        Args:
            scenes (Optional[List[Dict]]): シーン情報（カット割り検出結果）
            audio_analysis (Optional[Dict]): 音声分析結果

        Returns:
            str: Gemini APIに送信するプロンプト
        """
        # シーン情報がある場合は、それを含めたプロンプトを作成
        scene_info = ""
        if scenes:
            scene_info = "\n\n# 検出されたシーン情報\n以下のタイムスタンプでシーンが検出されました：\n"
            for scene in scenes:
                scene_info += f"- Scene {scene['scene_number']}: {scene['timestamp']} - {scene['duration']:.1f}秒間\n"
            scene_info += "\n各シーンに対応するプロンプトを作成してください。\n"

        # 音声分析情報がある場合は、それを含める
        audio_info = ""
        if audio_analysis:
            audio_info = "\n\n# 音声分析情報\n"

            # BGM情報
            if audio_analysis.get('music_analysis'):
                music = audio_analysis['music_analysis']
                audio_info += "\n## BGM・音楽情報:\n"
                audio_info += f"- テンポ: {music.get('tempo', 'N/A'):.1f} BPM\n"
                audio_info += f"- 雰囲気: {music.get('mood', 'N/A')}\n"
                audio_info += f"- エネルギーレベル: {music.get('energy', 0):.2f}\n"
                audio_info += f"- 推定キー: {music.get('key', 'N/A')}\n"

            # 文字起こし情報
            if audio_analysis.get('transcription'):
                trans = audio_analysis['transcription']
                audio_info += "\n## セリフ・会話:\n"
                audio_info += f"- 言語: {trans.get('language', 'N/A')}\n"

                segments = trans.get('segments', [])
                if segments:
                    audio_info += f"- セリフ数: {len(segments)}件\n"
                    audio_info += "\n主なセリフ:\n"
                    # 最初の5件のセリフを表示
                    for seg in segments[:5]:
                        audio_info += f"  [{seg.get('timestamp', '00:00:00')}] {seg.get('text', '')}\n"

                    if len(segments) > 5:
                        audio_info += f"  ... (他 {len(segments) - 5}件のセリフ)\n"

            audio_info += "\nプロンプト作成時は、上記の音声情報も考慮してください。\n"
            audio_info += "特に、BGMの雰囲気やセリフの内容は、画像の雰囲気やシーンの理解に重要です。\n"

        # モデル別の指示を取得
        model_instructions = self._get_model_instructions()

        # f-string内でバックスラッシュを使えないため事前定義
        dialogue_ja = '"dialogue": "このシーンのセリフ（ある場合）",' if audio_analysis else ''
        audio_mood_ja = '"audio_mood": "BGMの雰囲気やセリフから感じる感情"' if audio_analysis else ''
        dialogue_en = '"dialogue": "Dialogue in this scene (if any)",' if audio_analysis else ''
        audio_mood_en = '"audio_mood": "Mood from BGM and dialogue"' if audio_analysis else ''

        if self.language == 'ja':
            prompt = f"""
あなたは画像生成AIのプロンプト作成の専門家です。
提供された動画を詳細に分析し、以下の2つのタスクを実行してください：
{scene_info}{audio_info}
# タスク1: 動画の要点まとめ
動画の内容を3-5文で簡潔にまとめてください。
主なテーマ、登場するオブジェクト、シーンの特徴を含めてください。
{'音声（セリフやBGM）の情報も要約に含めてください。' if audio_analysis else ''}

# タスク2: 画像生成プロンプトの作成
動画の重要なシーンや特徴的な場面について、**Freepik Pikaso上の{self.model.upper()}モデル向け**の
詳細な画像生成プロンプトを作成してください。

{model_instructions['ja']}

各プロンプトには以下を含めてください：
- 視覚的な詳細（構図、色彩、照明、雰囲気）
- スタイル指定（写真風、イラスト、アート等）
- 品質タグ（masterpiece, best quality, highres, detailed等）
{'- タイムスタンプ（各シーンの開始時刻）' if scenes else ''}
{'- 音声情報を考慮した雰囲気の描写（BGMの雰囲気、セリフの内容を反映）' if audio_analysis else ''}

# 出力形式
以下のJSON形式で出力してください：

{{
  "summary": "動画の要点まとめ（3-5文）{'、音声情報も含む' if audio_analysis else ''}",
  "prompts": [
    {{
      "scene": 1,
      "timestamp": "00:00:00",
      "description": "シーンの説明",
      "prompt": "詳細な英語プロンプト（Freepik Pikaso用）",
      "japanese_prompt": "日本語での説明的プロンプト"{',' if audio_analysis else ''}
      {dialogue_ja}
      {audio_mood_ja}
    }}
  ]
}}

重要：
- promptは必ず英語で記述してください（画像生成AIの精度向上のため）
- 具体的で詳細な描写を心がけてください
- ネガティブプロンプトは含めないでください
{'- タイムスタンプは HH:MM:SS 形式で記載してください' if scenes else ''}
{'- 音声情報（セリフやBGM）を活用して、より雰囲気のあるプロンプトを作成してください' if audio_analysis else ''}
            """
        else:  # English
            scene_info_en = ""
            if scenes:
                scene_info_en = "\n\n# Detected Scene Information\nScenes detected at the following timestamps:\n"
                for scene in scenes:
                    scene_info_en += f"- Scene {scene['scene_number']}: {scene['timestamp']} - {scene['duration']:.1f}s duration\n"
                scene_info_en += "\nPlease create prompts for each scene.\n"

            # 音声情報の英語版
            audio_info_en = ""
            if audio_analysis:
                audio_info_en = "\n\n# Audio Analysis Information\n"

                if audio_analysis.get('music_analysis'):
                    music = audio_analysis['music_analysis']
                    audio_info_en += "\n## Background Music:\n"
                    audio_info_en += f"- Tempo: {music.get('tempo', 'N/A'):.1f} BPM\n"
                    audio_info_en += f"- Mood: {music.get('mood', 'N/A')}\n"
                    audio_info_en += f"- Energy: {music.get('energy', 0):.2f}\n"
                    audio_info_en += f"- Key: {music.get('key', 'N/A')}\n"

                if audio_analysis.get('transcription'):
                    trans = audio_analysis['transcription']
                    audio_info_en += "\n## Dialogue/Speech:\n"
                    audio_info_en += f"- Language: {trans.get('language', 'N/A')}\n"

                    segments = trans.get('segments', [])
                    if segments:
                        audio_info_en += f"- Number of segments: {len(segments)}\n"
                        audio_info_en += "\nMain dialogue:\n"
                        for seg in segments[:5]:
                            audio_info_en += f"  [{seg.get('timestamp', '00:00:00')}] {seg.get('text', '')}\n"

                        if len(segments) > 5:
                            audio_info_en += f"  ... (and {len(segments) - 5} more)\n"

                audio_info_en += "\nConsider the audio information when creating prompts.\n"
                audio_info_en += "The mood of BGM and content of dialogue are important for understanding scene atmosphere.\n"

            prompt = f"""
You are an expert in creating prompts for image generation AI.
Analyze the provided video in detail and perform the following two tasks:
{scene_info_en}{audio_info_en}
# Task 1: Video Summary
Summarize the video content in 3-5 sentences.
Include the main theme, objects that appear, and scene characteristics.
{'Also include audio information (dialogue and BGM) in the summary.' if audio_analysis else ''}

# Task 2: Create Image Generation Prompts
Create detailed image generation prompts **specifically for {self.model.upper()} on Freepik Pikaso**
about important scenes or characteristic moments in the video.

{model_instructions['en']}

Each prompt should include:
- Visual details (composition, color, lighting, atmosphere)
- Style specification (photographic, illustration, art, etc.)
- Quality tags (masterpiece, best quality, highres, detailed, etc.)
{'- Timestamp (start time of each scene)' if scenes else ''}
{'- Atmospheric descriptions considering audio (BGM mood, dialogue content)' if audio_analysis else ''}

# Output Format
Output in the following JSON format:

{{
  "summary": "Video summary (3-5 sentences){'including audio information' if audio_analysis else ''}",
  "prompts": [
    {{
      "scene": 1,
      "timestamp": "00:00:00",
      "description": "Scene description",
      "prompt": "Detailed English prompt (for Freepik Pikaso)"{',' if audio_analysis else ''}
      {dialogue_en}
      {audio_mood_en}
    }}
  ]
}}

Important:
- Prompts must be written in English
- Be specific and detailed in descriptions
- Do not include negative prompts
{'- Timestamps should be in HH:MM:SS format' if scenes else ''}
{'- Utilize audio information (dialogue and BGM) to create more atmospheric prompts' if audio_analysis else ''}
            """

        return prompt

    def generate_prompts(
        self,
        video_file: genai.File,
        video_url: str,
        scenes: Optional[List[Dict]] = None,
        audio_analysis: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        動画からプロンプトを生成

        Args:
            video_file (genai.File): Gemini APIにアップロードされた動画ファイル
            video_url (str): 元の動画URL
            scenes (Optional[List[Dict]]): シーン情報（カット割り検出結果）
            audio_analysis (Optional[Dict]): 音声分析結果

        Returns:
            Optional[Dict]: 生成されたプロンプトと要点まとめ（失敗時はNone）
        """
        try:
            # 分析プロンプトの作成（シーン情報と音声情報を含む）
            analysis_prompt = self._create_analysis_prompt(scenes, audio_analysis)

            if self.verbose:
                print(f"  Sending request to Gemini API...")
                print(f"  Prompt length: {len(analysis_prompt)} characters")
                if scenes:
                    print(f"  Including {len(scenes)} scene timestamps")
                if audio_analysis:
                    print(f"  Including audio analysis (transcription & music)")

            # Gemini APIにリクエストを送信
            response = self.model.generate_content(
                [video_file, analysis_prompt],
                request_options={"timeout": 600}  # 10分のタイムアウト
            )

            if self.verbose:
                print(f"  ✓ Response received")

            # レスポンスの解析
            response_text = response.text

            if self.verbose:
                print(f"  Response length: {len(response_text)} characters")
                print(f"\n--- Raw Response ---")
                print(response_text[:500] + "..." if len(response_text) > 500 else response_text)
                print(f"--- End of Response ---\n")

            # JSONの抽出と解析
            result = self._parse_response(response_text)

            if not result:
                print("✗ Failed to parse response as JSON")
                return None

            # メタデータの追加
            result['video_url'] = video_url
            result['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            result['model'] = Config.GEMINI_MODEL
            result['language'] = self.language
            result['model'] = self.model

            # シーン情報がある場合は追加
            if scenes:
                result['scenes'] = scenes
                result['total_scenes'] = len(scenes)

            # 音声分析情報がある場合は追加
            if audio_analysis:
                result['audio_analysis'] = audio_analysis

            if self.verbose:
                print(f"  ✓ Successfully generated {len(result.get('prompts', []))} prompts")

            return result

        except Exception as e:
            print(f"✗ Error generating prompts: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return None

    def generate_prompts_with_scenes(
        self,
        video_file: genai.File,
        video_url: str,
        scenes: List[Dict],
        video_metadata: Optional[Dict] = None,
        audio_analysis: Optional[Dict] = None
    ) -> Optional[Dict]:
        """
        シーン情報付きで動画からプロンプトを生成

        カット割り検出結果と音声分析結果を使用して、各シーンに対応するプロンプトを生成します。

        Args:
            video_file (genai.File): Gemini APIにアップロードされた動画ファイル
            video_url (str): 元の動画URL
            scenes (List[Dict]): シーン情報（カット割り検出結果）
            video_metadata (Optional[Dict]): 動画のメタデータ
            audio_analysis (Optional[Dict]): 音声分析結果

        Returns:
            Optional[Dict]: 生成されたプロンプトと要点まとめ（失敗時はNone）
        """
        result = self.generate_prompts(video_file, video_url, scenes, audio_analysis)

        if result and video_metadata:
            result['video_metadata'] = video_metadata

        return result

    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """
        Gemini APIのレスポンスを解析

        JSONブロックを抽出し、パースします。

        Args:
            response_text (str): Gemini APIからのレスポンステキスト

        Returns:
            Optional[Dict]: パースされたJSONデータ（失敗時はNone）
        """
        try:
            # JSONブロックの抽出（```json ... ``` または { ... }）
            json_text = response_text.strip()

            # マークダウンコードブロックの除去
            if json_text.startswith('```json'):
                json_text = json_text[7:]  # '```json' を削除
            elif json_text.startswith('```'):
                json_text = json_text[3:]  # '```' を削除

            if json_text.endswith('```'):
                json_text = json_text[:-3]  # '```' を削除

            json_text = json_text.strip()

            # JSONのパース
            result = json.loads(json_text)

            # 必須フィールドの検証
            if 'summary' not in result or 'prompts' not in result:
                print("⚠️  Warning: Response missing required fields (summary or prompts)")
                # TODO: より詳細なエラーハンドリング
                return None

            return result

        except json.JSONDecodeError as e:
            print(f"✗ JSON decode error: {e}")
            if self.verbose:
                print(f"  Failed to parse: {response_text[:200]}...")
            return None

        except Exception as e:
            print(f"✗ Error parsing response: {e}")
            return None

    def refine_prompt(self, prompt: str, style: str = None) -> str:
        """
        プロンプトの改善

        TODO: 既存のプロンプトをより詳細に、または特定のスタイルに合わせて改善する機能

        Args:
            prompt (str): 元のプロンプト
            style (str): 希望するスタイル（例: "anime", "realistic", "oil painting"）

        Returns:
            str: 改善されたプロンプト
        """
        # TODO: Gemini APIを使用してプロンプトを改善
        # 1. スタイル指定を追加
        # 2. より詳細な描写を追加
        # 3. 品質タグの最適化

        if self.verbose:
            print("⚠️  Prompt refinement is not implemented yet")

        return prompt

    def generate_negative_prompt(self, prompt: str) -> str:
        """
        ネガティブプロンプトの生成

        TODO: ポジティブプロンプトから適切なネガティブプロンプトを生成

        Args:
            prompt (str): ポジティブプロンプト

        Returns:
            str: ネガティブプロンプト
        """
        # TODO: 一般的なネガティブプロンプトのテンプレート
        # 例: "low quality, blurry, distorted, bad anatomy, ..."

        if self.verbose:
            print("⚠️  Negative prompt generation is not implemented yet")

        # デフォルトのネガティブプロンプト
        default_negative = (
            "low quality, low resolution, blurry, distorted, "
            "bad anatomy, deformed, disfigured, poorly drawn"
        )

        return default_negative

    def batch_generate(
        self,
        video_files: List[genai.File],
        video_urls: List[str]
    ) -> List[Dict]:
        """
        複数動画の一括プロンプト生成

        TODO: 複数の動画を効率的に処理する機能

        Args:
            video_files (List[genai.File]): 動画ファイルのリスト
            video_urls (List[str]): 動画URLのリスト

        Returns:
            List[Dict]: 各動画の生成結果のリスト
        """
        # TODO: 並列処理や進捗表示を実装

        results = []

        for video_file, video_url in zip(video_files, video_urls):
            if self.verbose:
                print(f"\nProcessing: {video_url}")

            result = self.generate_prompts(video_file, video_url)

            if result:
                results.append(result)
            else:
                print(f"⚠️  Failed to process: {video_url}")

        return results


# テスト用のメイン関数
if __name__ == '__main__':
    """
    このモジュールを直接実行した場合のテストコード
    """
    import sys

    print("=== Prompt Generator Test ===\n")

    from config import initialize_config
    from video_processor import VideoProcessor

    if not initialize_config():
        print("Configuration failed!")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Usage: python prompt_generator.py <video_url>")
        sys.exit(1)

    video_url = sys.argv[1]

    # 動画の処理
    print("--- Processing Video ---")
    processor = VideoProcessor(verbose=True)
    video_path = processor.download_video(video_url)

    if not video_path:
        print("Failed to download video")
        sys.exit(1)

    video_file = processor.upload_to_gemini(video_path)

    if not video_file:
        print("Failed to upload video")
        sys.exit(1)

    # プロンプト生成
    print("\n--- Generating Prompts ---")
    generator = PromptGenerator(language='ja', verbose=True)
    results = generator.generate_prompts(video_file, video_url)

    if results:
        print("\n--- Results ---")
        print(json.dumps(results, ensure_ascii=False, indent=2))
        print("\n✓ Test completed successfully!")
    else:
        print("\n✗ Prompt generation failed")

    # クリーンアップ
    processor.cleanup(video_path)
