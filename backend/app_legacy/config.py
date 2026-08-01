import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ApexTrader Virtual Stock Exchange"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(
        default="SUPER_SECRET_PRODUCTION_KEY_CHANGE_IN_ENV_64_BYTES_LONG_HEX",
        description="JWT signature secret key",
    )

    # Server binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # PostgreSQL Parameters
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "trader_admin"
    POSTGRES_PASSWORD: str = "SuperSecretSecurePassword123!"
    POSTGRES_DB: str = "virtual_trading_db"
    DATABASE_URL: str = (
        "postgresql+asyncpg://trader_admin:SuperSecretSecurePassword123!@localhost:5432/virtual_trading_db"
    )

    # DB Connection Pool
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False

    # Redis Parameters
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PRICE_TICKER_CHANNEL: str = "market_ticks"

    # Auth & Security
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 Hours

    # Trading Parameters
    INITIAL_TRADER_CASH_BALANCE: float = 20000.00
    PRICE_TICK_INTERVAL_SECONDS: float = 15.0
    PRICE_FLOOR: float = 0.50

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
