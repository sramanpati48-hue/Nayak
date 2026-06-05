import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.vicharakbandhu import (
    VicharakReviewCreate,
    VicharakReviewResponse,
    IntakeTextRequest,
    UploadedDocumentResponse,
    BenchNoteCreate,
    BenchNoteUpdate,
    BenchNoteResponse,
    SuggestionsResponse,
    ConfidenceResponse,
    ReviewDetailsResponse
)
from app.services.vicharak_service import VicharakService

logger = logging.getLogger("nayak-api")
router = APIRouter()

@router.get("/history", response_model=List[VicharakReviewResponse])
async def list_history(db: AsyncSession = Depends(get_db)):
    """
    Get a list of all historical judicial review sessions.
    """
    try:
        return await VicharakService.list_history(db)
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve history logs."
        )


@router.post("/reviews", response_model=VicharakReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(review_in: VicharakReviewCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new judicial review session.
    """
    try:
        return await VicharakService.create_review(
            db=db,
            title=review_in.title,
            case_summary=review_in.case_summary
        )
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize review case folder."
        )


@router.get("/reviews/{id}", response_model=ReviewDetailsResponse)
async def get_review_details(id: str, db: AsyncSession = Depends(get_db)):
    """
    Get full details of a specific review case workspace, including document uploads and notes.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    docs = await VicharakService.get_documents(db, id)
    entries = await VicharakService.get_entries(db, id)
    return ReviewDetailsResponse(review=review, documents=docs, entries=entries)


@router.post("/reviews/{id}/text", response_model=VicharakReviewResponse)
async def ingest_brief_text(id: str, intake_in: IntakeTextRequest, db: AsyncSession = Depends(get_db)):
    """
    Submit case briefs as raw text to execute case timeline extraction.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    try:
        return await VicharakService.ingest_text(db, id, intake_in.text)
    except Exception as e:
        logger.error(f"Error ingesting text brief: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute text extraction sweeps."
        )


@router.post("/reviews/{id}/voice", response_model=UploadedDocumentResponse)
async def upload_voice(id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload court record audio tapes.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    try:
        content = await file.read()
        file_size = len(content)
        return await VicharakService.add_document(
            db=db,
            review_id=id,
            filename=file.filename,
            content_type=file.content_type or "audio/wav",
            file_type="voice",
            file_size=file_size
        )
    except Exception as e:
        logger.error(f"Error uploading voice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record voice ingest logs."
        )


@router.post("/reviews/{id}/documents", response_model=UploadedDocumentResponse)
async def upload_document(id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload PDF pleadings or legal transcripts.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    try:
        content = await file.read()
        file_size = len(content)
        return await VicharakService.add_document(
            db=db,
            review_id=id,
            filename=file.filename,
            content_type=file.content_type or "application/pdf",
            file_type="document",
            file_size=file_size
        )
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record document ingest logs."
        )


@router.get("/reviews/{id}/structure")
async def get_structure(id: str, db: AsyncSession = Depends(get_db)):
    """
    Get the extracted case structure mapping timelines and argument claims.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
    return review.structure or {"claims": [], "timeline": []}


@router.post("/reviews/{id}/entries", response_model=BenchNoteResponse)
async def create_entry(id: str, note_in: BenchNoteCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new judicial Bench Note entry.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    try:
        return await VicharakService.add_entry(
            db=db,
            review_id=id,
            title=note_in.title,
            note_body=note_in.note_body,
            category=note_in.category,
            side_impact=note_in.side_impact,
            materiality=note_in.materiality,
            verification_status=note_in.verification_status,
            source_reference=note_in.source_reference,
            confidence_effect=note_in.confidence_effect,
            effect_type=note_in.effect_type,
            source_strength=note_in.source_strength,
            ai_detected=note_in.ai_detected
        )
    except Exception as e:
        logger.error(f"Error creating entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save Bench Note entry."
        )


@router.patch("/entries/{entry_id}", response_model=BenchNoteResponse)
async def update_entry(entry_id: str, note_up: BenchNoteUpdate, db: AsyncSession = Depends(get_db)):
    """
    Edit an existing Bench Note entry.
    """
    try:
        entry = await VicharakService.update_entry(
            db=db,
            entry_id=entry_id,
            data=note_up.model_dump(exclude_unset=True)
        )
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bench Note entry '{entry_id}' not found."
            )
        return entry
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update Bench Note."
        )


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a Bench Note entry.
    """
    try:
        success = await VicharakService.delete_entry(db, entry_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bench Note entry '{entry_id}' not found."
            )
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete Bench Note."
        )


@router.get("/reviews/{id}/confidence", response_model=ConfidenceResponse)
async def get_confidence(id: str, db: AsyncSession = Depends(get_db)):
    """
    Get the confidence ledger entries for the review.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
    
    ledger_data = review.confidence_ledger or {"ledger": []}
    return ConfidenceResponse(review_id=id, ledger=ledger_data.get("ledger", []))


@router.get("/reviews/{id}/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(id: str, db: AsyncSession = Depends(get_db)):
    """
    Get suggestions or points to keep in mind.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    sug_data = review.suggestions or {"points": []}
    return SuggestionsResponse(review_id=id, suggestions=sug_data.get("points", []))


@router.get("/reviews/{id}/report", response_model=VicharakReviewResponse)
async def compile_report(id: str, db: AsyncSession = Depends(get_db)):
    """
    Finalize the review case and compile the final review report.
    """
    review = await VicharakService.get_review(db, id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VicharakReview case '{id}' not found."
        )
        
    try:
        return await VicharakService.compile_report(db, id)
    except Exception as e:
        logger.error(f"Error compiling report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile review report."
        )
