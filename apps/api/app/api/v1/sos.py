import uuid
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db import models
from app.schemas.sos import SOSIn, SOSOut
from app.db.models import SOSReport

router = APIRouter()

UPLOAD_DIR = os.environ.get("SOS_UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/sos", response_model=SOSOut)
async def receive_sos(
    category: Optional[str] = Form(None),
    payload: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """Accept SOS payload as JSON string in `payload` form field, optionally with a media file."""
    if not payload:
        raise HTTPException(status_code=400, detail="Missing payload")

    try:
        import json
        payload_obj = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    media_path = None
    if file:
        # Save uploaded file
        fname = f"sos_{uuid.uuid4().hex}_{file.filename}"
        fpath = os.path.join(UPLOAD_DIR, fname)
        with open(fpath, "wb") as f:
            content = await file.read()
            f.write(content)
        media_path = fpath

    # persist record
    new_id = str(uuid.uuid4())
    record = SOSReport(id=new_id, category=category, payload=payload_obj, media_path=media_path)
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return SOSOut(id=new_id, category=category, media_path=media_path, created_at=record.created_at.isoformat())
