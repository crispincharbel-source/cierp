from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Core
    ENVIRONMENT: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in ("production", "prod")

    # DB / Cache
    DATABASE_URL: str = "postgresql+asyncpg://cierp:cierp_pass@postgres:5432/cierp"
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth / JWT
    JWT_SECRET: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Single-tenant install metadata (returned via /auth/me)
    TENANT_ID: str = "cierp"
    COMPANY_NAME: str = "CI ERP"
    COMPANY_CODE: str = "CIERP"

    # Seeded admin (first startup)
    # Default bootstrap admin (can be overridden via env)
    ADMIN_EMAIL: str = "admin@cierp.com"
    ADMIN_PASSWORD: str = "admin123"

    # CORS (JSON array string or comma-separated)
    # Examples:
    #   CORS_ORIGINS='["http://localhost:3000"]'
    #   CORS_ORIGINS="http://localhost:3000,https://erp.example.com"
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    @property
    def cors_list(self) -> List[str]:
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            return json.loads(raw)
        # comma-separated
        return [x.strip() for x in raw.split(",") if x.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()