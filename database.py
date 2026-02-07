"""
動画分析Pro Max - データベース管理
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from config import DATABASE_URL

Base = declarative_base()
engine = create_engine(DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)


class VideoAnalysis(Base):
    """動画分析結果テーブル"""
    __tablename__ = 'video_analyses'

    id = Column(Integer, primary_key=True)
    video_url = Column(String(500), nullable=False)
    video_title = Column(String(200))
    analysis_type = Column(String(50), nullable=False)  # ad, movie, drama, comprehensive
    ai_provider = Column(String(50), nullable=False)  # claude, gemini
    analysis_result = Column(Text, nullable=False)
    frames_json = Column(Text)  # JSON形式でフレームパスを保存
    created_at = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer)  # 分析にかかった時間（秒）

    def to_dict(self):
        return {
            'id': self.id,
            'video_url': self.video_url,
            'video_title': self.video_title,
            'analysis_type': self.analysis_type,
            'ai_provider': self.ai_provider,
            'analysis_result': self.analysis_result,
            'frames': json.loads(self.frames_json) if self.frames_json else [],
            'created_at': self.created_at.isoformat(),
            'duration': self.duration
        }


class Schedule(Base):
    """スケジュールテーブル"""
    __tablename__ = 'schedules'

    id = Column(Integer, primary_key=True)
    video_url = Column(String(500), nullable=False)
    video_title = Column(String(200))
    analysis_type = Column(String(50), nullable=False)
    ai_provider = Column(String(50), nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    analysis_id = Column(Integer)  # 完了時に関連する分析IDを保存
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'video_url': self.video_url,
            'video_title': self.video_title,
            'analysis_type': self.analysis_type,
            'ai_provider': self.ai_provider,
            'scheduled_time': self.scheduled_time.isoformat(),
            'status': self.status,
            'analysis_id': self.analysis_id,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class BatchQueue(Base):
    """バッチ処理キューテーブル"""
    __tablename__ = 'batch_queue'

    id = Column(Integer, primary_key=True)
    video_url = Column(String(500), nullable=False)
    video_title = Column(String(200))
    analysis_type = Column(String(50), nullable=False)
    ai_provider = Column(String(50), nullable=False)
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    analysis_id = Column(Integer)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'video_url': self.video_url,
            'video_title': self.video_title,
            'analysis_type': self.analysis_type,
            'ai_provider': self.ai_provider,
            'status': self.status,
            'analysis_id': self.analysis_id,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


def init_database():
    """データベース初期化"""
    Base.metadata.create_all(engine)


def get_session():
    """セッション取得"""
    return Session()


def save_analysis(video_url, video_title, analysis_type, ai_provider, result, frames=None, duration=None):
    """分析結果を保存"""
    session = get_session()
    try:
        analysis = VideoAnalysis(
            video_url=video_url,
            video_title=video_title,
            analysis_type=analysis_type,
            ai_provider=ai_provider,
            analysis_result=result,
            frames_json=json.dumps(frames) if frames else None,
            duration=duration
        )
        session.add(analysis)
        session.commit()
        analysis_id = analysis.id
        return analysis_id
    finally:
        session.close()


def get_all_analyses(limit=100):
    """全分析結果を取得"""
    session = get_session()
    try:
        analyses = session.query(VideoAnalysis).order_by(
            VideoAnalysis.created_at.desc()
        ).limit(limit).all()
        return [a.to_dict() for a in analyses]
    finally:
        session.close()


def get_analysis_by_id(analysis_id):
    """IDで分析結果を取得"""
    session = get_session()
    try:
        analysis = session.query(VideoAnalysis).filter_by(id=analysis_id).first()
        return analysis.to_dict() if analysis else None
    finally:
        session.close()


def delete_analysis(analysis_id):
    """分析結果を削除"""
    session = get_session()
    try:
        analysis = session.query(VideoAnalysis).filter_by(id=analysis_id).first()
        if analysis:
            session.delete(analysis)
            session.commit()
            return True
        return False
    finally:
        session.close()


def create_schedule(video_url, video_title, analysis_type, ai_provider, scheduled_time):
    """スケジュール作成"""
    session = get_session()
    try:
        schedule = Schedule(
            video_url=video_url,
            video_title=video_title,
            analysis_type=analysis_type,
            ai_provider=ai_provider,
            scheduled_time=scheduled_time
        )
        session.add(schedule)
        session.commit()
        return schedule.id
    finally:
        session.close()


def get_pending_schedules():
    """実行待ちスケジュールを取得"""
    session = get_session()
    try:
        now = datetime.utcnow()
        schedules = session.query(Schedule).filter(
            Schedule.status == 'pending',
            Schedule.scheduled_time <= now
        ).all()
        return [s.to_dict() for s in schedules]
    finally:
        session.close()


def get_all_schedules():
    """全スケジュールを取得"""
    session = get_session()
    try:
        schedules = session.query(Schedule).order_by(
            Schedule.scheduled_time.desc()
        ).all()
        return [s.to_dict() for s in schedules]
    finally:
        session.close()


def update_schedule_status(schedule_id, status, analysis_id=None, error_message=None):
    """スケジュールステータス更新"""
    session = get_session()
    try:
        schedule = session.query(Schedule).filter_by(id=schedule_id).first()
        if schedule:
            schedule.status = status
            if analysis_id:
                schedule.analysis_id = analysis_id
            if error_message:
                schedule.error_message = error_message
            if status in ['completed', 'failed']:
                schedule.completed_at = datetime.utcnow()
            session.commit()
            return True
        return False
    finally:
        session.close()


def delete_schedule(schedule_id):
    """スケジュール削除"""
    session = get_session()
    try:
        schedule = session.query(Schedule).filter_by(id=schedule_id).first()
        if schedule:
            session.delete(schedule)
            session.commit()
            return True
        return False
    finally:
        session.close()


def add_to_batch(video_url, video_title, analysis_type, ai_provider):
    """バッチキューに追加"""
    session = get_session()
    try:
        batch_item = BatchQueue(
            video_url=video_url,
            video_title=video_title,
            analysis_type=analysis_type,
            ai_provider=ai_provider
        )
        session.add(batch_item)
        session.commit()
        return batch_item.id
    finally:
        session.close()


def get_batch_queue():
    """バッチキューを取得"""
    session = get_session()
    try:
        items = session.query(BatchQueue).order_by(
            BatchQueue.created_at.asc()
        ).all()
        return [i.to_dict() for i in items]
    finally:
        session.close()


def update_batch_status(batch_id, status, analysis_id=None, error_message=None):
    """バッチアイテムステータス更新"""
    session = get_session()
    try:
        item = session.query(BatchQueue).filter_by(id=batch_id).first()
        if item:
            item.status = status
            if analysis_id:
                item.analysis_id = analysis_id
            if error_message:
                item.error_message = error_message
            if status in ['completed', 'failed']:
                item.completed_at = datetime.utcnow()
            session.commit()
            return True
        return False
    finally:
        session.close()


def delete_batch_item(batch_id):
    """バッチアイテム削除"""
    session = get_session()
    try:
        item = session.query(BatchQueue).filter_by(id=batch_id).first()
        if item:
            session.delete(item)
            session.commit()
            return True
        return False
    finally:
        session.close()


def clear_batch_queue():
    """バッチキュークリア"""
    session = get_session()
    try:
        session.query(BatchQueue).delete()
        session.commit()
        return True
    finally:
        session.close()


def get_statistics():
    """統計情報取得"""
    session = get_session()
    try:
        total = session.query(VideoAnalysis).count()
        ad_count = session.query(VideoAnalysis).filter_by(analysis_type='ad').count()
        movie_count = session.query(VideoAnalysis).filter_by(analysis_type='movie').count()
        drama_count = session.query(VideoAnalysis).filter_by(analysis_type='drama').count()
        comprehensive_count = session.query(VideoAnalysis).filter_by(analysis_type='comprehensive').count()

        return {
            'total': total,
            'ad': ad_count,
            'movie': movie_count,
            'drama': drama_count,
            'comprehensive': comprehensive_count
        }
    finally:
        session.close()


# 初期化
init_database()
