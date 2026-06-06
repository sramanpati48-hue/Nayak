from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.nyaybandhu import router as nyaybandhu_router
from app.api.v1.vicharakbandhu import router as vicharakbandhu_router
from app.api.v1.reports import router as reports_router
from app.api.v1.users import router as users_router
from app.api.v1.judge import router as judge_router
from app.api.v1.sos import router as sos_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(judge_router, prefix="/judge", tags=["Judge"])
api_router.include_router(nyaybandhu_router, prefix="/nyaybandhu", tags=["Nyaybandhu"])
api_router.include_router(vicharakbandhu_router, prefix="/vicharakbandhu", tags=["VicharakBandhu"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(sos_router, prefix="/sos", tags=["SOS"])
