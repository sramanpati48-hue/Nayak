from __future__ import annotations

import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import RequestActor, get_request_actor, has_permission, require_permission
from app.db.models import JudgeEvidence, NyaybandhuSession
from app.db.session import get_db
from app.services.nyaybandhu_service import NyaybandhuService

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "judge_evidence")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class JudgeCaseSummary(BaseModel):
    id: str
    title: str
    status: str
    mode: str
    created_at: str
    description: str | None = None


class JudgeEvidenceResponse(BaseModel):
    id: str
    session_id: str
    filename: str
    content_type: str
    file_size: int
    created_at: str


@router.get("/cases", response_model=List[JudgeCaseSummary])
async def list_judge_cases(
    db: AsyncSession = Depends(get_db),
    actor: RequestActor = Depends(require_permission("view_assigned_cases")),
):
    sessions = await NyaybandhuService.list_history(db, actor)
    return [
        JudgeCaseSummary(
            id=session.id,
            title=session.title,
            status=session.status,
            mode=session.mode,
            created_at=session.created_at.isoformat(),
            description=session.description,
        )
        for session in sessions
    ]


@router.get("/cases/{session_id}", response_model=JudgeCaseSummary)
async def get_judge_case(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    actor: RequestActor = Depends(require_permission("view_assigned_cases")),
):
    session = await NyaybandhuService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    from app.core.rbac import require_session_access

    require_session_access(session, actor)

    return JudgeCaseSummary(
        id=session.id,
        title=session.title,
        status=session.status,
        mode=session.mode,
        created_at=session.created_at.isoformat(),
        description=session.description,
    )


@router.get("/cases/{session_id}/evidence", response_model=List[JudgeEvidenceResponse])
async def list_case_evidence(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    actor: RequestActor = Depends(require_permission("view_assigned_cases")),
):
    session = await NyaybandhuService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    from app.core.rbac import require_session_access

    require_session_access(session, actor)

    result = await db.execute(
        select(JudgeEvidence).where(JudgeEvidence.session_id == session_id).order_by(JudgeEvidence.created_at.desc())
    )
    evidence = result.scalars().all()
    return [
        JudgeEvidenceResponse(
            id=item.id,
            session_id=item.session_id,
            filename=item.filename,
            content_type=item.content_type,
            file_size=item.file_size,
            created_at=item.created_at.isoformat(),
        )
        for item in evidence
    ]


@router.post("/cases/{session_id}/evidence", response_model=JudgeEvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_case_evidence(
    session_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    actor: RequestActor = Depends(get_request_actor),
):
    if not has_permission(actor.role, "view_assigned_cases"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Judge access required.")

    session = await NyaybandhuService.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    from app.core.rbac import require_session_access

    require_session_access(session, actor)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    evidence_id = str(uuid.uuid4())
    safe_name = file.filename or "evidence.bin"
    storage_name = f"{evidence_id}_{safe_name}"
    storage_path = os.path.abspath(os.path.join(UPLOAD_DIR, storage_name))

    with open(storage_path, "wb") as handle:
        handle.write(content)

    record = JudgeEvidence(
        id=evidence_id,
        session_id=session_id,
        filename=safe_name,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        storage_path=storage_path,
        uploaded_by=actor.user_id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return JudgeEvidenceResponse(
        id=record.id,
        session_id=record.session_id,
        filename=record.filename,
        content_type=record.content_type,
        file_size=record.file_size,
        created_at=record.created_at.isoformat(),
    )
