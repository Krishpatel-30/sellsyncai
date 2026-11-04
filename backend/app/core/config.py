import os
from typing import List, Optional
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "SellSync AI"
    APP_URL: str = "http://localhost:3000"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "dev-secret-key-change-this-in-production-min-32-chars-long"
    ENCRYPTION_KEY: str = "change-this-32-char-key-for-aes-256-gcm-01234567"

    # JWT Settings
    JWT_SECRET: str = "super-secret-jwt-signing-key-for-sellsync-ai-2026"
    JWT_REFRESH_SECRET: str = "super-secret-jwt-refresh-signing-key-for-sellsync-ai-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://localhost:8002",
        "https://sellsync.ai",
    ]

    # Database URLs
    DATABASE_URL: str = "sqlite+aiosqlite:///./sellsync.db"
    DATABASE_SYNC_URL: str = "sqlite:///./sellsync.db"
    DB_ECHO: bool = False

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # AI Configurations
    DEFAULT_AI_PROVIDER: str = "openai"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    # Storage
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_REGION: str = "ap-south-1"
    S3_ENDPOINT_URL: Optional[str] = None

    # Payments
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Marketplace Placeholders
    FLIPKART_CLIENT_ID: Optional[str] = None
    FLIPKART_CLIENT_SECRET: Optional[str] = None
    SHOPIFY_API_KEY: Optional[str] = None
    SHOPIFY_API_SECRET: Optional[str] = None
    WOOCOMMERCE_CLIENT_ID: Optional[str] = None
    WOOCOMMERCE_CLIENT_SECRET: Optional[str] = None

    # Initial Super Admin Seed
    FIRST_SUPERADMIN_EMAIL: str = "admin@sellsync.ai"
    FIRST_SUPERADMIN_PASSWORD: str = "AdminSecurePassword123!"
    FIRST_SUPERADMIN_NAME: str = "SellSync Platform Admin"


settings = Settings()

