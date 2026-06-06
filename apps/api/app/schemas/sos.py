from typing import Any, Dict, Optional
from pydantic import BaseModel

class SOSIn(BaseModel):
    category: Optional[str]
    payload: Dict[str, Any]

class SOSOut(BaseModel):
    id: str
    category: Optional[str]
    media_path: Optional[str]
    created_at: str
