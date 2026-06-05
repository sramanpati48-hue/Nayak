import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
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
async def list_history(db: AsyncSession = Depends(get_db)):
    """
    Get a list of all historical adversarial analysis sessions.
    """
    try:
        return await NyaybandhuService.list_history(db)
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history logs."
        )


@router.post("/sessions", response_model=NyaybandhuSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(session_in: NyaybandhuSessionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new Nyaybandhu adversarial legal analysis session.
    """
    try:
        return await NyaybandhuService.create_session(
            db=db,
            title=session_in.title,
            description=session_in.description,
            mode=session_in.mode,
            opposing_counsel_strategy=session_in.opposing_counsel_strategy,
            config=session_in.config
        )
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize adversarial session."
        )


@router.get("/sessions/{id}", response_model=SessionDetailsResponse)
async def get_session_details(id: str, db: AsyncSession = Depends(get_db)):
    """
    Get full details of a specific session, including all transcript events.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    
    events = await NyaybandhuService.get_events(db, id)
    return SessionDetailsResponse(session=session, events=events)


@router.get("/sessions/{id}/stream")
async def stream_session(id: str, db: AsyncSession = Depends(get_db)):
    """
    Server-Sent Events (SSE) streaming endpoint for live debate events.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
        
    return StreamingResponse(
        NyaybandhuService.generate_debate_stream(db, id),
        media_type="text/event-stream"
    )


@router.post("/sessions/{id}/answer", response_model=EventResponse)
async def answer_clarification(id: str, answer_in: AnswerRequest, db: AsyncSession = Depends(get_db)):
    """
    Answer a clarification card requested by Opposing Counsel or Bench.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
        
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
async def continue_session(id: str, db: AsyncSession = Depends(get_db)):
    """
    Trigger the continuation of the debate after an answer is submitted.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
    
    # Just a mock response that returns the latest list of events.
    # The client will reconnect to the SSE stream after continue is triggered.
    return await NyaybandhuService.get_events(db, id)


@router.post("/sessions/{id}/finalize", response_model=NyaybandhuSessionResponse)
async def finalize_session(id: str, db: AsyncSession = Depends(get_db)):
    """
    Finalize the session, generating summaries and verdicts.
    """
    session = await NyaybandhuService.get_session(db, id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nyaybandhu session '{id}' not found."
        )
        
    try:
        return await NyaybandhuService.finalize_session(db, id)
    except Exception as e:
        logger.error(f"Error finalising session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile final review."
        )
