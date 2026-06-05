import logging
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import JudicialReport
from app.schemas.reports import JudicialReportCreate, JudicialReportResponse

logger = logging.getLogger("nayak-api")
router = APIRouter()

@router.get("", response_model=List[JudicialReportResponse])
async def list_reports(
    module: Optional[str] = Query(None, description="Filter by module: 'nyaybandhu' or 'vicharakbandhu'"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all generated reports.
    """
    try:
        stmt = select(JudicialReport)
        if module:
            stmt = stmt.where(JudicialReport.module == module)
        stmt = stmt.order_by(JudicialReport.created_at.desc())
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list reports."
        )


@router.post("", response_model=JudicialReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(report_in: JudicialReportCreate, db: AsyncSession = Depends(get_db)):
    """
    Save/compile a new judicial report.
    """
    try:
        report = JudicialReport(
            id=str(uuid.uuid4()),
            title=report_in.title,
            content=report_in.content,
            module=report_in.module,
            created_at=datetime.datetime.utcnow()
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        return report
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report."
        )


@router.get("/{report_id}", response_model=JudicialReportResponse)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get details of a specific report.
    """
    try:
        result = await db.execute(select(JudicialReport).where(JudicialReport.id == report_id))
        report = result.scalar_one_or_none()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found."
            )
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve report '{report_id}'."
        )
