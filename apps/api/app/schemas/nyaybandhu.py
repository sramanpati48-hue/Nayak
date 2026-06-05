from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class NyaybandhuSessionBase(BaseModel):
    title: str = Field(..., max_length=255, description="Title of the adversarial legal analysis session")
    description: Optional[str] = Field(None, description="Detailed context or briefing materials")
    mode: str = Field("practice", description="Session mode: 'practice' (Simulation Arena) or 'real-life' (Live Case Analysis)")
    opposing_counsel_strategy: str = Field("textualist", description="Opposing counsel strategy profile")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Configuration parameters for the analysis agent")

class NyaybandhuSessionCreate(NyaybandhuSessionBase):
    pass

class NyaybandhuSessionResponse(NyaybandhuSessionBase):
    id: str
    status: str
    summary: Optional[str] = None
    verdict: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AnswerRequest(BaseModel):
    card_id: str = Field(..., description="The unique ID of the clarification event")
    selected_option: str = Field(..., description="The option key/text chosen by the user")

class EventResponse(BaseModel):
    id: str
    session_id: str
    speaker: str
    role: str
    text: str
    event_type: str
    card_data: Optional[Dict[str, Any]] = None
    score_delta: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SessionDetailsResponse(BaseModel):
    session: NyaybandhuSessionResponse
    events: List[EventResponse]
