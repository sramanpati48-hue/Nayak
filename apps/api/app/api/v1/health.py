from fastapi import APIRouter

router = APIRouter()

@router.get("", status_code=200)
async def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy",
        "service": "Nayak Judicial Suite API",
        "version": "1.0.0"
    }
