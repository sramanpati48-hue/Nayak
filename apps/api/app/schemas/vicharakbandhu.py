from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class VicharakReviewBase(BaseModel):
    title: str = Field(..., max_length=255, description="Title of the judicial review case folder")
    case_summary: Optional[str] = Field(None, description="Summary details or text transcript of the review records")

class VicharakReviewCreate(VicharakReviewBase):
    pass

class VicharakReviewResponse(VicharakReviewBase):
    id: str
    status: str
    structure: Optional[Dict[str, Any]] = None
    confidence_ledger: Optional[Dict[str, Any]] = None
    suggestions: Optional[Dict[str, Any]] = None
    report: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class IntakeTextRequest(BaseModel):
    text: str = Field(..., description="Plain text case brief or transcripts to ingest")

class UploadedDocumentResponse(BaseModel):
    id: str
    review_id: str
    filename: str
    content_type: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

class BenchNoteBase(BaseModel):
    title: str = Field(..., max_length=255)
    note_body: str = Field(...)
    category: str = Field("timeline", description="Note category: 'timeline', 'citation', or 'testimony'")
    side_impact: str = Field("neutral", description="Side impact: 'petitioner', 'respondent', or 'neutral'")
    materiality: str = Field("medium", description="Materiality level: 'high', 'medium', or 'low'")
    verification_status: str = Field("unverified", description="Status: 'verified', 'unverified', or 'discrepancy'")
    source_reference: Optional[str] = Field(None, description="Source context reference, e.g. Exhibit C, Page 4")
    confidence_effect: float = Field(0.0, description="Numeric impact rating (+/- percentage points)")
    effect_type: Optional[str] = Field("neutral", description="Effect type: 'corroboration', 'contradiction', or 'neutral'")
    source_strength: Optional[str] = Field("moderate", description="Source strength: 'strong', 'moderate', or 'weak'")
    ai_detected: bool = Field(False, description="Whether this note was flagged by AI scanning")

class BenchNoteCreate(BenchNoteBase):
    pass

class BenchNoteUpdate(BaseModel):
    title: Optional[str] = None
    note_body: Optional[str] = None
    category: Optional[str] = None
    side_impact: Optional[str] = None
    materiality: Optional[str] = None
    verification_status: Optional[str] = None
    source_reference: Optional[str] = None
    confidence_effect: Optional[float] = None
    effect_type: Optional[str] = None
    source_strength: Optional[str] = None
    ai_detected: Optional[bool] = None

class BenchNoteResponse(BenchNoteBase):
    id: str
    review_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class SuggestionItem(BaseModel):
    id: str
    text: str

class SuggestionsResponse(BaseModel):
    review_id: str
    suggestions: List[SuggestionItem]

class ConfidenceItem(BaseModel):
    label: str
    score: float
    status: str

class ConfidenceResponse(BaseModel):
    review_id: str
    ledger: List[ConfidenceItem]

class ReviewDetailsResponse(BaseModel):
    review: VicharakReviewResponse
    documents: List[UploadedDocumentResponse]
    entries: List[BenchNoteResponse]
