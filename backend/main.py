import asyncio
import logging
import random
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.admin_router import router as admin_router
from app.auth_router import router as auth_router
from app.config import settings
from app.database import Base, engine, AsyncSessionFactory
from app.market_simulator import start_market_simulator
from app.models import Stock, StockHistory
from app.stocks_router import router as stocks_router
from app.trade_router import router as trade_router
from app.websocket_manager import RedisBroadcaster, router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("main")

BASE_DIR = Path(__file__).resolve().parent.parent

INITIAL_STOCKS = [
    ("APEX", "Apex Dynamics Corp", 4.50),
    ("CRPT", "Cryptonix Global Systems", 5.20),
    ("METV", "Metaverse Vision Ltd", 3.80),
    ("ROBO", "Robotech Automations", 6.10),
    ("NVRA", "Nova Era Technologies", 7.40),
    ("HYDR", "HydroClean Energy", 2.90),
    ("VRTX", "Vortex Aerospace", 5.50),
    ("QNTM", "Quantum Computing Labs", 6.80),
    ("PLSM", "Plasma Medical Devices", 4.10),
    ("ORBT", "Orbital Satellite Networks", 3.40),
    ("STRM", "StreamFlow Cloud Services", 7.90),
    ("AERO", "Aerovault Logistics", 4.70),
    ("SOLR", "Solaria Power Group", 5.00),
    ("CELL", "CelluGen BioLabs", 6.30),
    ("DATA", "DataSphere Analytics", 3.60),
    ("CYBR", "CyberFort Defense Systems", 7.10),
    ("GENM", "Genomix Research Inc", 2.50),
    ("PHOX", "Phox Photonics Corp", 4.30),
    ("NANO", "NanoScale Innovations", 5.80),
    ("AURA", "Aura Spatial Tech", 3.20),
    ("TITN", "Titan Heavy Machinery", 6.50),
    ("SYNX", "Synapse Neural Networks", 7.70),
    ("ZEUS", "Zeus Energy Grids", 4.90),
    ("LUNA", "Lunar Mining Resources", 3.10),
    ("EDGE", "Edge Compute Infrastructure", 5.40),
    ("FUSE", "Fusion Nuclear Labs", 6.70),
    ("FLUX", "Flux Power Dynamics", 4.20),
    ("HELI", "Helios Solar Tech", 5.90),
    ("ECHO", "Echo Media Streaming", 3.70),
    ("VIRT", "Virtualis Gaming Interactive", 6.00),
]


async def seed_initial_stocks_if_empty():
    async with AsyncSessionFactory() as session:
        async with session.begin():
            from sqlalchemy import select
            existing = (await session.scalars(select(Stock))).all()
            if existing:
                return

            logger.info("🌱 Seeding database with initial 30 virtual stocks and 30-day historical quotes...")
            now = datetime.now(timezone.utc)

            for ticker, name, base_price in INITIAL_STOCKS:
                stock = Stock(ticker=ticker, name=name, current_price=base_price)
                session.add(stock)
                await session.flush()

                # Generate 30 days of historical quotes
                price = base_price
                for day_offset in range(30, -1, -1):
                    rec_time = now - timedelta(days=day_offset)
                    hist = StockHistory(
                        stock_id=stock.id,
                        closing_price=round(price, 2),
                        recorded_at=rec_time,
                    )
                    session.add(hist)
                    price = max(0.50, price * (1 + random.uniform(-0.03, 0.03)))

            logger.info("✅ Database seeded successfully with 30 stocks.")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("🚀 Starting Virtual Stock Exchange Engine Backend...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database schema initialized.")

    await seed_initial_stocks_if_empty()

    broadcaster = RedisBroadcaster(
        redis_url=settings.REDIS_URL,
        channel=settings.REDIS_PRICE_TICKER_CHANNEL,
    )
    await broadcaster.start()

    simulator_task = asyncio.create_task(start_market_simulator())

    yield

    logger.info("🛑 Initiating graceful system shutdown...")
    simulator_task.cancel()
    await broadcaster.stop()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
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
        "version": "2.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
