import asyncio
from datetime import datetime, timedelta, timezone
import random
from typing import List, Tuple

from rich.console import Console
from sqlalchemy import select

from app.database import AsyncSessionFactory, Base, engine
from app.models import Stock, StockHistory

console = Console()

STOCKS_DATA: List[Tuple[str, str]] = [
    ("APEX", "Apex Dynamics Corp"),
    ("CRPT", "Cryptonix Global Systems"),
    ("METV", "Metaverse Vision Ltd"),
    ("ROBO", "Robotech Automations"),
    ("NVRA", "Nova Era Technologies"),
    ("HYDR", "HydroClean Energy"),
    ("VRTX", "Vortex Aerospace"),
    ("QNTM", "Quantum Computing Labs"),
    ("PLSM", "Plasma Medical Devices"),
    ("ORBT", "Orbital Satellite Networks"),
    ("STRM", "StreamFlow Cloud Services"),
    ("AERO", "Aerovault Logistics"),
    ("SOLR", "Solaria Power Group"),
    ("CELL", "CelluGen BioLabs"),
    ("DATA", "DataSphere Analytics"),
    ("CYBR", "CyberFort Defense Systems"),
    ("GENM", "Genomix Research Inc"),
    ("PHOX", "Phox Photonics Corp"),
    ("NANO", "NanoScale Innovations"),
    ("AURA", "Aura Spatial Tech"),
    ("TITN", "Titan Heavy Machinery"),
    ("SYNX", "Synapse Neural Networks"),
    ("ZEUS", "Zeus Energy Grids"),
    ("LUNA", "Lunar Mining Resources"),
    ("EDGE", "Edge Compute Infrastructure"),
    ("FUSE", "Fusion Nuclear Labs"),
    ("FLUX", "Flux Power Dynamics"),
    ("HELI", "Helios Solar Tech"),
    ("ECHO", "Echo Media Streaming"),
    ("VIRT", "Virtualis Gaming Interactive"),
]


def generate_30day_price_series(target_final_price: float) -> List[Tuple[datetime, float]]:
    """Generates 30 days of historical daily closing prices ending at target_final_price."""
    today = datetime.now(timezone.utc).replace(hour=16, minute=0, second=0, microsecond=0)
    prices: List[Tuple[datetime, float]] = []
    
    current = target_final_price
    for days_ago in range(0, 30):
        record_date = today - timedelta(days=days_ago)
        prices.append((record_date, round(current, 2)))
        
        # Simulate daily random walk volatility (-3.5% to +3.5%)
        daily_pct_change = random.uniform(-0.035, 0.035)
        prev_price = current / (1.0 + daily_pct_change)
        current = max(1.50, min(9.50, prev_price))
        
    prices.reverse()
    return prices


async def seed_data() -> None:
    console.print("[bold cyan]🚀 Initializing Database Tables & Checking Seed Status...[/bold cyan]")

    # 1. Verify schema tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed 30 stocks with initial prices & 30 days history
    async with AsyncSessionFactory() as session:
        async with session.begin():
            existing = await session.scalars(select(Stock.id))
            if existing.first() is not None:
                console.print("[yellow]⚠️ Stocks already populated in database. Skipping seed execution.[/yellow]")
                return

            console.print("[bold green]📊 Seeding 30 unique stocks (Price range: 2.00 IG - 8.00 IG)...[/bold green]")

            for ticker, name in STOCKS_DATA:
                # Random initial price strictly between 2.00 IG and 8.00 IG
                initial_price = round(random.uniform(2.00, 8.00), 2)
                
                stock = Stock(
                    ticker=ticker,
                    name=name,
                    current_price=initial_price,
                )
                session.add(stock)
                await session.flush()

                # Generate 30-day historical time-series quotes
                history_series = generate_30day_price_series(initial_price)
                for rec_date, close_price in history_series:
                    session.add(
                        StockHistory(
                            stock_id=stock.id,
                            closing_price=close_price,
                            recorded_at=rec_date,
                        )
                    )

        console.print("[bold green]✅ Successfully seeded 30 stocks with 900 historical quotes![/bold green]")


async def main() -> None:
    try:
        await seed_data()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
