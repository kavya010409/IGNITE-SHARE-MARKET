import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "IGNITE VIRTUAL STOCK EXCHANGE"
    SECRET_KEY: str = "super-secret-key-change-in-production-123456789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours

    # SQLite fallback database for instant zero-config local execution
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./virtual_trading.db"
    )

    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_PRICE_TICKER_CHANNEL: str = "market_ticks"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    PRICE_FLOOR: float = 0.50
    ADMIN_EMAIL: str = "admin@gmail.com"
    ADMIN_PASSWORD: str = "demo"

    class Config:
        case_sensitive = True


settings = Settings()
