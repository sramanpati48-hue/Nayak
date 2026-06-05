from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# SQLite connection args check (check_same_thread: False needed for sqlite to handle threads correctly)
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

# Create Async Engine
engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False  # Set to True for verbose SQL logging in development
)

# Async Session Factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Database Dependency Injection yield generator
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injection to yield an asynchronous database session.
    Closes the session automatically upon request completion.
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
