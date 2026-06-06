import datetime
from typing import Any, Dict, Optional
from sqlalchemy import String, Text, DateTime, JSON, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class NyaybandhuSession(Base):
    """
    SQLAlchemy Model representing a Nyaybandhu adversarial legal analysis session.
    """
    __tablename__ = "nyaybandhu_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mode: Mapped[str] = mapped_column(String(50), default="practice")
    opposing_counsel_strategy: Mapped[str] = mapped_column(String(50), default="textualist")
    status: Mapped[str] = mapped_column(String(50), default="active")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verdict: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    # Storing history or session configuration as JSON
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)


class TranscriptEvent(Base):
    """
    SQLAlchemy Model representing a transcript/dialogue event in a Nyaybandhu session.
    """
    __tablename__ = "nyaybandhu_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    speaker: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(50))  # "bench", "petitioner", "respondent"
    text: Mapped[str] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(String(50))  # "argument", "clarification_request", "score_update", "done"
    card_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    score_delta: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class VicharakReview(Base):
    """
    SQLAlchemy Model representing a VicharakBandhu judicial review instance.
    """
    __tablename__ = "vicharak_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    case_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    structure: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    confidence_ledger: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    suggestions: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    report: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    analysis_results: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)


class UploadedDocument(Base):
    """
    SQLAlchemy Model representing metadata of files uploaded to a VicharakBandhu session.
    """
    __tablename__ = "vicharak_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    review_id: Mapped[str] = mapped_column(String(36), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    file_type: Mapped[str] = mapped_column(String(50))  # "document" or "voice"
    file_size: Mapped[int] = mapped_column(Integer)  # Represent as integer/bytes
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class BenchNoteEntry(Base):
    """
    SQLAlchemy Model representing a judicial Bench Note / record entry.
    """
    __tablename__ = "vicharak_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    review_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255))
    note_body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50))  # "timeline", "citation", "testimony"
    side_impact: Mapped[str] = mapped_column(String(50))  # "petitioner", "respondent", "neutral"
    materiality: Mapped[str] = mapped_column(String(50))  # "high", "medium", "low"
    verification_status: Mapped[str] = mapped_column(String(50))  # "verified", "unverified", "discrepancy"
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence_effect: Mapped[float] = mapped_column(Float)  # numeric float
    effect_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="neutral")
    source_strength: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="moderate")
    ai_detected: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class User(Base):
    """
    Application user mapped to Clerk identity with Nayak RBAC role.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="normal_user")
    portal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class JudgeEvidence(Base):
    """
    Evidence or proof file uploaded in judge fast-track workflow.
    """
    __tablename__ = "judge_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(String(500))
    uploaded_by: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class JudicialReport(Base):
    """
    SQLAlchemy Model representing generated legal and judicial reports.
    """
    __tablename__ = "judicial_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    module: Mapped[str] = mapped_column(String(50))  # "nyaybandhu" or "vicharakbandhu"
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class SOSReport(Base):
    """
    Store SOS reports from clients. Payload stored as JSON; optional file path for uploaded media.
    """
    __tablename__ = "sos_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    media_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

