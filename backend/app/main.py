from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.exceptions import SellSyncException
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import AsyncSessionLocal, async_engine
from app.models.user import User


async def init_db() -> None:
    """Create tables if they don't exist and seed initial superadmin and marketplaces."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed platform superadmin if configured
    if settings.FIRST_SUPERADMIN_EMAIL and settings.FIRST_SUPERADMIN_PASSWORD:
        async with AsyncSessionLocal() as session:
            res = await session.execute(
                select(User).where(User.email == settings.FIRST_SUPERADMIN_EMAIL.lower())
            )
            admin = res.scalar_one_or_none()
            if not admin:
                new_admin = User(
                    email=settings.FIRST_SUPERADMIN_EMAIL.lower(),
                    hashed_password=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                    full_name=settings.FIRST_SUPERADMIN_NAME,
                    is_active=True,
                    is_verified=True,
                    is_superadmin=True,
                )
                session.add(new_admin)
                await session.commit()

            # Seed default marketplaces
            from app.services.marketplace_service import marketplace_service
            await marketplace_service.seed_marketplaces_if_needed(session)

            # Seed default SaaS subscription plans
            from app.services.payment_service import PaymentService
            await PaymentService.seed_plans(session)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifespan manager."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await async_engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Paid Multi-Marketplace E-commerce SaaS Platform Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(SellSyncException)
async def sellsync_exception_handler(request: Request, exc: SellSyncException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail if isinstance(exc.detail, dict) else {"message": exc.detail},
        headers=exc.headers,
    )


# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "One Product. Every Marketplace. One Dashboard.",
        "status": "online",
        "docs": "/docs",
    }

