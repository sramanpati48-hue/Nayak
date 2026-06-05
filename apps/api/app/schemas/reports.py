from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class JudicialReportBase(BaseModel):
    title: str = Field(..., max_length=255, description="Title of the compiled judicial report")
    content: Optional[str] = Field(None, description="Markdown content of the report")
    module: str = Field(..., description="Module owner: 'nyaybandhu' or 'vicharakbandhu'")

class JudicialReportCreate(JudicialReportBase):
    pass

class JudicialReportResponse(JudicialReportBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
