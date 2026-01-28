#!/usr/bin/env python3
"""
Audio Analyzer Module

動画の音声を分析し、以下の情報を抽出:
- セリフの文字起こし（タイムスタンプ付き）
- BGMの分析（テンポ、雰囲気、ジャンル推定）
- 効果音の検出
- 音量レベルの分析
"""

import os
import whisper
import librosa
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from moviepy.editor import VideoFileClip
import soundfile as sf


class AudioAnalyzer:
    """音声分析クラス"""

    def __init__(self, whisper_model: str = "base", verbose: bool = False):
        """
        初期化

        Args:
            whisper_model: Whisperモデルのサイズ
                - tiny: 最速、精度低
                - base: バランス型（デフォルト）
                - small: 高精度
                - medium: より高精度
                - large: 最高精度、遅い
            verbose: 詳細ログを出力するか
        """
        self.verbose = verbose
        self.whisper_model_name = whisper_model

        # Whisperモデルの読み込み
        if self.verbose:
            print(f"Loading Whisper model: {whisper_model}")

        try:
            self.whisper_model = whisper.load_model(whisper_model)
            if self.verbose:
                print("✓ Whisper model loaded successfully")
        except Exception as e:
            print(f"Warning: Failed to load Whisper model: {e}")
            self.whisper_model = None

    def extract_audio(self, video_path: Path) -> Optional[Path]:
        """
        動画から音声を抽出

        Args:
            video_path: 動画ファイルのパス

        Returns:
            抽出した音声ファイルのパス（WAV形式）
        """
        try:
            if self.verbose:
                print(f"Extracting audio from: {video_path}")

            # 音声ファイルの保存先
            audio_dir = Path("audio_cache")
            audio_dir.mkdir(exist_ok=True)

            audio_path = audio_dir / f"{video_path.stem}_audio.wav"

            # 既に抽出済みならスキップ
            if audio_path.exists():
                if self.verbose:
                    print(f"✓ Using cached audio: {audio_path}")
                return audio_path

            # 動画から音声を抽出
            video = VideoFileClip(str(video_path))

            if video.audio is None:
                if self.verbose:
                    print("⚠ No audio track found in video")
                return None

            video.audio.write_audiofile(
                str(audio_path),
                codec='pcm_s16le',
                verbose=self.verbose,
                logger=None if not self.verbose else 'bar'
            )

            video.close()

            if self.verbose:
                print(f"✓ Audio extracted: {audio_path}")

            return audio_path

        except Exception as e:
            print(f"Error extracting audio: {e}")
            return None

    def transcribe_audio(
        self,
        audio_path: Path,
        language: str = None
    ) -> Optional[Dict]:
        """
        音声を文字起こし（Whisper使用）

        Args:
            audio_path: 音声ファイルのパス
            language: 言語コード（自動検出の場合はNone）

        Returns:
            文字起こし結果:
            {
                'text': '全文',
                'language': '検出された言語',
                'segments': [
                    {
                        'id': 0,
                        'start': 0.0,
                        'end': 2.5,
                        'text': 'こんにちは',
                        'timestamp': '00:00:00'
                    },
                    ...
                ]
            }
        """
        if not self.whisper_model:
            print("Error: Whisper model not loaded")
            return None

        try:
            if self.verbose:
                print(f"Transcribing audio: {audio_path}")

            # Whisperで文字起こし
            result = self.whisper_model.transcribe(
                str(audio_path),
                language=language,
                task='transcribe',
                verbose=self.verbose
            )

            # タイムスタンプをHH:MM:SS形式に変換
            segments_with_timestamp = []
            for segment in result['segments']:
                start_time = segment['start']
                end_time = segment['end']

                segments_with_timestamp.append({
                    'id': segment['id'],
                    'start': start_time,
                    'end': end_time,
                    'text': segment['text'].strip(),
                    'timestamp': self._format_timestamp(start_time)
                })

            transcription = {
                'text': result['text'],
                'language': result['language'],
                'segments': segments_with_timestamp
            }

            if self.verbose:
                print(f"✓ Transcription completed ({len(segments_with_timestamp)} segments)")
                print(f"  Detected language: {result['language']}")

            return transcription

        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return None

    def analyze_music(self, audio_path: Path) -> Optional[Dict]:
        """
        BGMを分析（librosa使用）

        Args:
            audio_path: 音声ファイルのパス

        Returns:
            音楽分析結果:
            {
                'tempo': 120.0,  # BPM
                'key': 'C major',
                'energy': 0.75,  # 0-1
                'mood': 'upbeat',
                'spectral_centroid': 2000.0,
                'zero_crossing_rate': 0.05,
                'rms_energy': 0.15
            }
        """
        try:
            if self.verbose:
                print(f"Analyzing music: {audio_path}")

            # 音声データを読み込み
            y, sr = librosa.load(str(audio_path), sr=None)

            # テンポ推定
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

            # スペクトル重心（明るさの指標）
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_centroid_mean = np.mean(spectral_centroids)

            # ゼロ交差率（音色の指標）
            zero_crossings = librosa.feature.zero_crossing_rate(y)[0]
            zcr_mean = np.mean(zero_crossings)

            # RMSエネルギー（音量の指標）
            rms = librosa.feature.rms(y=y)[0]
            rms_mean = np.mean(rms)

            # エネルギーレベル（0-1に正規化）
            energy = min(rms_mean * 10, 1.0)

            # 雰囲気の推定（シンプルなヒューリスティック）
            mood = self._estimate_mood(tempo, energy, spectral_centroid_mean, zcr_mean)

            # 音階推定（クロマ特徴）
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)
            key_index = np.argmax(chroma_mean)
            keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            estimated_key = keys[key_index]

            analysis = {
                'tempo': float(tempo),
                'key': estimated_key,
                'energy': float(energy),
                'mood': mood,
                'spectral_centroid': float(spectral_centroid_mean),
                'zero_crossing_rate': float(zcr_mean),
                'rms_energy': float(rms_mean)
            }

            if self.verbose:
                print(f"✓ Music analysis completed")
                print(f"  Tempo: {tempo:.1f} BPM")
                print(f"  Key: {estimated_key}")
                print(f"  Mood: {mood}")
                print(f"  Energy: {energy:.2f}")

            return analysis

        except Exception as e:
            print(f"Error analyzing music: {e}")
            return None

    def detect_audio_segments(
        self,
        audio_path: Path,
        threshold_db: float = -40.0
    ) -> List[Dict]:
        """
        音声区間を検出（無音部分を除外）

        Args:
            audio_path: 音声ファイルのパス
            threshold_db: 音声と判定する閾値（デシベル）

        Returns:
            音声区間のリスト:
            [
                {
                    'start': 0.5,
                    'end': 3.2,
                    'duration': 2.7,
                    'timestamp': '00:00:00'
                },
                ...
            ]
        """
        try:
            if self.verbose:
                print(f"Detecting audio segments: {audio_path}")

            # 音声データを読み込み
            y, sr = librosa.load(str(audio_path), sr=None)

            # 非無音区間を検出
            intervals = librosa.effects.split(
                y,
                top_db=abs(threshold_db)
            )

            segments = []
            for i, (start_sample, end_sample) in enumerate(intervals):
                start_time = librosa.samples_to_time(start_sample, sr=sr)
                end_time = librosa.samples_to_time(end_sample, sr=sr)
                duration = end_time - start_time

                segments.append({
                    'segment_id': i + 1,
                    'start': float(start_time),
                    'end': float(end_time),
                    'duration': float(duration),
                    'timestamp': self._format_timestamp(start_time)
                })

            if self.verbose:
                print(f"✓ Detected {len(segments)} audio segments")

            return segments

        except Exception as e:
            print(f"Error detecting audio segments: {e}")
            return []

    def analyze_complete(
        self,
        video_path: Path,
        language: str = None,
        analyze_music: bool = True,
        detect_segments: bool = True
    ) -> Optional[Dict]:
        """
        包括的な音声分析

        Args:
            video_path: 動画ファイルのパス
            language: 文字起こしの言語（自動検出の場合はNone）
            analyze_music: BGM分析を行うか
            detect_segments: 音声区間検出を行うか

        Returns:
            統合された音声分析結果
        """
        results = {
            'video_path': str(video_path),
            'transcription': None,
            'music_analysis': None,
            'audio_segments': None
        }

        # 音声抽出
        audio_path = self.extract_audio(video_path)

        if not audio_path:
            print("⚠ Audio extraction failed")
            return results

        # 文字起こし
        if self.verbose:
            print("\n=== Transcription ===")

        transcription = self.transcribe_audio(audio_path, language)
        results['transcription'] = transcription

        # BGM分析
        if analyze_music:
            if self.verbose:
                print("\n=== Music Analysis ===")

            music_analysis = self.analyze_music(audio_path)
            results['music_analysis'] = music_analysis

        # 音声区間検出
        if detect_segments:
            if self.verbose:
                print("\n=== Audio Segments ===")

            audio_segments = self.detect_audio_segments(audio_path)
            results['audio_segments'] = audio_segments

        return results

    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """秒数をHH:MM:SS形式に変換"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    @staticmethod
    def _estimate_mood(
        tempo: float,
        energy: float,
        spectral_centroid: float,
        zcr: float
    ) -> str:
        """
        音楽の雰囲気を推定

        シンプルなヒューリスティックベースの推定
        """
        # テンポによる分類
        if tempo < 80:
            tempo_mood = "slow"
        elif tempo < 120:
            tempo_mood = "moderate"
        else:
            tempo_mood = "fast"

        # エネルギーによる分類
        if energy < 0.3:
            energy_mood = "calm"
        elif energy < 0.7:
            energy_mood = "moderate"
        else:
            energy_mood = "energetic"

        # スペクトル重心による分類（明るさ）
        if spectral_centroid < 1500:
            brightness = "dark"
        elif spectral_centroid < 3000:
            brightness = "balanced"
        else:
            brightness = "bright"

        # 複合的な雰囲気の判定
        if tempo_mood == "slow" and energy_mood == "calm":
            return "peaceful/relaxing"
        elif tempo_mood == "fast" and energy_mood == "energetic":
            return "upbeat/exciting"
        elif tempo_mood == "slow" and brightness == "dark":
            return "melancholic/sad"
        elif tempo_mood == "fast" and brightness == "bright":
            return "happy/joyful"
        elif energy_mood == "energetic":
            return "dynamic/intense"
        elif energy_mood == "calm":
            return "calm/ambient"
        else:
            return "neutral/moderate"


if __name__ == '__main__':
    # テスト用
    import sys

    if len(sys.argv) < 2:
        print("Usage: python audio_analyzer.py <video_path>")
        sys.exit(1)

    video_path = Path(sys.argv[1])

    if not video_path.exists():
        print(f"Error: Video file not found: {video_path}")
        sys.exit(1)

    # 分析実行
    analyzer = AudioAnalyzer(whisper_model="base", verbose=True)
    results = analyzer.analyze_complete(
        video_path,
        language=None,  # 自動検出
        analyze_music=True,
        detect_segments=True
    )

    # 結果表示
    print("\n" + "=" * 60)
    print("AUDIO ANALYSIS RESULTS")
    print("=" * 60)

    if results['transcription']:
        print("\n--- Transcription ---")
        print(f"Language: {results['transcription']['language']}")
        print(f"Full Text:\n{results['transcription']['text']}")
        print(f"\nSegments ({len(results['transcription']['segments'])} total):")
        for seg in results['transcription']['segments'][:5]:  # 最初の5件
            print(f"  [{seg['timestamp']}] {seg['text']}")

    if results['music_analysis']:
        print("\n--- Music Analysis ---")
        music = results['music_analysis']
        print(f"Tempo: {music['tempo']:.1f} BPM")
        print(f"Key: {music['key']}")
        print(f"Mood: {music['mood']}")
        print(f"Energy: {music['energy']:.2f}")

    if results['audio_segments']:
        print(f"\n--- Audio Segments ({len(results['audio_segments'])} total) ---")
        for seg in results['audio_segments'][:5]:  # 最初の5件
            print(f"  Segment {seg['segment_id']}: {seg['timestamp']} ({seg['duration']:.1f}s)")
