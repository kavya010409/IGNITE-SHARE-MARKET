import asyncio
import json
import logging
import random
from datetime import datetime, timezone
from typing import Dict, List
import redis.asyncio as aioredis
from sqlalchemy import or_, select, update

from app.config import settings
from app.database import AsyncSessionFactory
from app.models import NewsLog, Stock, StockHistory

logger = logging.getLogger("market.simulator")

TICK_INTERVAL_SECONDS = 15.0
NEWS_SHOCK_DELAY_SECONDS = 120.0  # 2 Minutes


async def process_market_tick(redis_client: aioredis.Redis = None) -> None:
    async with AsyncSessionFactory() as session:
        async with session.begin():
            stocks = (await session.scalars(select(Stock))).all()
            if not stocks:
                return

            tick_time = datetime.now(timezone.utc)

            # Query active news items where impact_applied == False
            stmt = select(NewsLog).where(
                NewsLog.is_active == True,
                NewsLog.impact_applied == False,
                or_(NewsLog.expires_at == None, NewsLog.expires_at > tick_time),
            )
            unapplied_news: List[NewsLog] = (await session.scalars(stmt)).all()

            stock_shocks: Dict[int, float] = {}
            global_shock = 1.0

            for news in unapplied_news:
                created_time = news.created_at
                if created_time.tzinfo is None:
                    created_time = created_time.replace(tzinfo=timezone.utc)

                elapsed_seconds = (tick_time - created_time).total_seconds()

                if elapsed_seconds >= NEWS_SHOCK_DELAY_SECONDS:
                    # 2 minutes elapsed! Force massive price realignment shock
                    news.impact_applied = True
                    logger.info(
                        f"💥 2-MINUTE SHOCK EXECUTION: News #{news.id} ('{news.headline}') triggered market realignment! Multiplier: {news.sentiment_multiplier}x"
                    )

                    if news.stock_id is None:
                        global_shock *= news.sentiment_multiplier
                    else:
                        stock_shocks[news.stock_id] = stock_shocks.get(news.stock_id, 1.0) * news.sentiment_multiplier

            stock_updates: List[Dict] = []
            history_inserts: List[StockHistory] = []
            ws_ticks: List[Dict] = []

            for stock in stocks:
                old_price = float(stock.current_price)

                # Basic subtle organic noise (-0.4% to +0.4%)
                base_noise = random.uniform(-0.004, 0.004)

                # Check if stock has a 2-minute shock realignment multiplier
                stock_mult = stock_shocks.get(stock.id, 1.0)
                effective_mult = stock_mult * global_shock

                if effective_mult != 1.0:
                    shock_shift = (effective_mult - 1.0)
                    final_change_pct = shock_shift + base_noise
                else:
                    final_change_pct = base_noise

                # Enforce Strict $0.50 IG Price Floor
                raw_new_price = old_price * (1.0 + final_change_pct)
                new_price = max(settings.PRICE_FLOOR, round(raw_new_price, 2))
                net_change_pct = round(((new_price - old_price) / old_price) * 100, 2)

                stock_updates.append({"id": stock.id, "current_price": new_price, "updated_at": tick_time})
                history_inserts.append(StockHistory(stock_id=stock.id, closing_price=new_price, recorded_at=tick_time))
                ws_ticks.append({
                    "ticker": stock.ticker,
                    "name": stock.name,
                    "current_price": new_price,
                    "change_percentage": net_change_pct,
                })

            await session.execute(update(Stock), stock_updates)
            session.add_all(history_inserts)

        # Broadcast Real-time Ticks to Redis Channel if available
        if redis_client:
            try:
                payload = {
                    "event": "market_tick",
                    "timestamp": tick_time.isoformat(),
                    "data": ws_ticks,
                }
                await redis_client.publish(settings.REDIS_PRICE_TICKER_CHANNEL, json.dumps(payload))
            except Exception:
                pass


async def start_market_simulator() -> None:
    logger.info("Initializing Continuous 15-Second Market Simulator...")
    redis_client = None
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        pass

    try:
        while True:
            start_t = asyncio.get_event_loop().time()
            try:
                await process_market_tick(redis_client)
            except Exception as exc:
                logger.error(f"Error in market tick: {exc}", exc_info=True)

            elapsed = asyncio.get_event_loop().time() - start_t
            sleep_time = max(0.1, TICK_INTERVAL_SECONDS - elapsed)
            await asyncio.sleep(sleep_time)
    except asyncio.CancelledError:
        pass
    finally:
        if redis_client:
            await redis_client.close()
        logger.info("Market simulator stopped gracefully.")
