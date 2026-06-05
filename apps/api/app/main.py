import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse
from app.core.config import settings
from app.api.v1 import api_router
from app.db.base import Base
from app.db.session import engine

# Import models to ensure they are registered on the Base metadata before create_all is run
from app.db import models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("nayak-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events context manager.
    Handles startup tasks (like creating SQLite database schemas) and shutdown cleanups.
    """
    logger.info("Database setup: verifying connection and tables...")
    try:
        async with engine.begin() as conn:
            # Sync metadata creation using SQLAlchemy async wrapper
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        
    yield
    
    logger.info("Disposing database connections...")
    await engine.dispose()
    logger.info("Database connection closed.")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Nayak - AI Courtroom & Judicial Review Suite API Service",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

@app.middleware("http")
async def csrf_origin_referer_middleware(request: Request, call_next):
    """
    CSRF defense-in-depth: Origin/Referer check on mutating requests.
    Note: Origin/Referer checking is a defense-in-depth validation and is not a
    full substitute for secure token-based CSRF mitigation in session/cookie-based apps.
    Bearer tokens (stored outside cookies) reduce classic CSRF risk because browsers
    do not auto-attach authorization headers cross-site the way they do cookies.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        origin = request.headers.get("Origin")
        referer = request.headers.get("Referer")
        
        # Clean allowed origins to standard strings (no trailing slash)
        allowed_origins = [o.rstrip("/") for o in settings.BACKEND_CORS_ORIGINS]
        
        # If Origin header is present, validate it
        if origin:
            origin_clean = origin.rstrip("/")
            if origin_clean not in allowed_origins and "*" not in allowed_origins:
                logger.warning(f"CSRF defense: Unauthorized Origin '{origin}' blocked.")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: CSRF verification failed. Unauthorized Origin."}
                )
        # If Origin is absent, check Referer
        elif referer:
            try:
                parsed_url = urlparse(referer)
                referer_origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
                if referer_origin not in allowed_origins and "*" not in allowed_origins:
                    logger.warning(f"CSRF defense: Unauthorized Referer origin '{referer_origin}' blocked.")
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Forbidden: CSRF verification failed. Unauthorized Referer."}
                    )
            except Exception:
                logger.warning(f"CSRF defense: Malformed Referer header '{referer}' blocked.")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: CSRF verification failed. Malformed Referer."}
                )
        # Both headers are missing
        else:
            # Require at least one of Origin or Referer in production.
            # Allow bypass in development for tool tests (e.g. Swagger UI docs, curl).
            if settings.APP_ENV == "production":
                logger.warning("CSRF defense: Mutating request without Origin/Referer headers blocked in production.")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: CSRF verification failed. Origin/Referer headers missing."}
                )
                
    return await call_next(request)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """
    API Root Endpoint.
    """
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} Backend Service.",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }
