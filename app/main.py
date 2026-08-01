import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.admin_router import router as admin_router
from app.auth_router import router as auth_router
from app.config import settings
from app.database import Base, engine
from app.market_simulator import start_market_simulator
from app.stocks_router import router as stocks_router
from app.trade_router import router as trade_router
from app.websocket_manager import RedisBroadcaster, router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("main")

BASE_DIR = Path(__file__).resolve().parent.parent

broadcaster = RedisBroadcaster(
    redis_url=settings.REDIS_URL,
    channel=settings.REDIS_PRICE_TICKER_CHANNEL,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("🚀 Starting Virtual Stock Exchange Engine...")

    try:
        async with engine.begin() as conn:
            logger.info("🛠️ Verifying database schema & tables...")
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database schema initialized successfully.")
    except Exception as db_err:
        logger.critical(f"❌ Database initialization failed: {db_err}", exc_info=True)
        raise db_err

    try:
        logger.info("📡 Initializing Redis Pub/Sub WebSocket Broadcaster...")
        await broadcaster.start()
    except Exception as redis_err:
        logger.critical(f"❌ Redis Broadcaster failed to start: {redis_err}", exc_info=True)
        raise redis_err

    logger.info("📈 Launching continuous 15-second market simulation task...")
    simulator_task = asyncio.create_task(start_market_simulator())

    yield

    logger.info("🛑 Initiating graceful system shutdown...")
    simulator_task.cancel()
    try:
        await simulator_task
    except asyncio.CancelledError:
        logger.info("✅ Market simulator task cancelled cleanly.")

    await broadcaster.stop()
    await engine.dispose()
    logger.info("👋 Virtual Stock Exchange Engine shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-concurrency, asynchronous virtual stock market trading platform engine.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(stocks_router)
app.include_router(trade_router)
app.include_router(admin_router)
app.include_router(ws_router)


@app.get("/health", tags=["System Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }


# Static Files Mount at Root "/"
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
