import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.rbac import (
    RequestActor,
    get_request_actor,
    has_permission,
    require_session_access,
    require_session_write_access,
)
from app.db.session import get_db
from app.schemas.nyaybandhu import (
    NyaybandhuSessionCreate,
    NyaybandhuSessionResponse,
    AnswerRequest,
    EventResponse,
    SessionDetailsResponse
)
from app.services.nyaybandhu_service import NyaybandhuService

logger = logging.getLogger("nayak-api")
router = APIRouter()

@router.get("/history", response_model=List[NyaybandhuSessionResponse])
async def list_history(db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Get a list of all historical adversarial analysis sessions.
    """
    try:
        return await NyaybandhuService.list_history(db, actor)
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history logs."
        )


@router.post("/sessions", response_model=NyaybandhuSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session_in: NyaybandhuSessionCreate, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Create a new Nyaybandhu adversarial legal analysis session.
    """
    try:
        if not has_permission(actor.role, "create_case"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role cannot create a new case workspace.",
            )

        return await NyaybandhuService.create_session(
            db=db,
            title=session_in.title,
            description=session_in.description,
            mode=session_in.mode,
            opposing_counsel_strategy=session_in.opposing_counsel_strategy,
            config=session_in.config,
            actor=actor,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize adversarial session."
        )


@router.get("/sessions/{id}", response_model=SessionDetailsResponse)
async def get_session_details(id: str, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Get full details of a specific session, including all transcript events.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    
    require_session_access(session, actor)
    events = await NyaybandhuService.get_events(db, id)
    return SessionDetailsResponse(session=session, events=events)


@router.get("/sessions/{id}/stream")
async def stream_session(id: str, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Server-Sent Events (SSE) streaming endpoint for live debate events.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    require_session_access(session, actor)
        
    return StreamingResponse(
        NyaybandhuService.generate_debate_stream(db, id),
        media_type="text/event-stream"
    )


@router.post("/sessions/{id}/answer", response_model=EventResponse)
async def answer_clarification(id: str, answer_in: AnswerRequest, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Answer a clarification card requested by Opposing Counsel or Bench.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
        
    require_session_write_access(session, actor, "answer_cross_questions")
    
    try:
        return await NyaybandhuService.answer_card(
            db=db,
            session_id=id,
            card_id=answer_in.card_id,
            selected_option=answer_in.selected_option
        )
    except Exception as e:
        logger.error(f"Error answering clarification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record response."
        )


@router.post("/sessions/{id}/continue", response_model=List[EventResponse])
async def continue_session(id: str, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Trigger the continuation of the debate after an answer is submitted.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    require_session_write_access(session, actor, "answer_cross_questions")
    
    # Just a mock response that returns the latest list of events.
    # The client will reconnect to the SSE stream after continue is triggered.
    return await NyaybandhuService.get_events(db, id)


@router.post("/sessions/{id}/finalize", response_model=NyaybandhuSessionResponse)
async def finalize_session(id: str, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    """
    Finalize the session, generating summaries and verdicts.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    if actor.role not in ("normal_user", "lawyer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your role cannot finalize this workspace.",
        )
    require_session_access(session, actor)
        
    try:
        return await NyaybandhuService.finalize_session(db, id)
    except Exception as e:
        logger.error(f"Error finalising session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile final review."
        )


@router.post("/sessions/{id}/intern-notes", response_model=NyaybandhuSessionResponse)
async def add_intern_note(id: str, payload: dict, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found.",
        )

    require_session_write_access(session, actor, "add_intern_notes")
    note = str(payload.get("note", "")).strip()
    if not note:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intern note text is required.")

    try:
        return await NyaybandhuService.add_intern_note(db, id, note, actor)
    except Exception as e:
        logger.error(f"Error saving intern note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save intern note.",
        )


@router.post("/sessions/{id}/lawyer-review-complete", response_model=NyaybandhuSessionResponse)
async def mark_lawyer_review_complete(id: str, payload: dict | None = None, db: AsyncSession = Depends(get_db), actor: RequestActor = Depends(get_request_actor)):
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found.",
        )

    require_session_write_access(session, actor, "mark_lawyer_review_complete")
    summary = None
    if payload:
        summary = payload.get("summary")

    try:
        return await NyaybandhuService.mark_lawyer_review_complete(db, id, summary, actor)
    except Exception as e:
        logger.error(f"Error completing lawyer review: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark lawyer review complete.",
        )
