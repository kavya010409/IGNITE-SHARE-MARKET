from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Stock, StockHistory

router = APIRouter(prefix="/api/stocks", tags=["Stock Analytics"])


class StockSummaryResponse(BaseModel):
    id: int
    ticker: str
    name: str
    current_price: float


class StockHistoryPoint(BaseModel):
    closing_price: float
    recorded_at: datetime


class StockAnalyticsResponse(BaseModel):
    ticker: str
    name: str
    current_price: float
    history: List[StockHistoryPoint]


@router.get("", response_model=List[StockSummaryResponse])
async def list_all_stocks(db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(Stock).order_by(Stock.ticker))
    stocks = result.all()
    return [
        StockSummaryResponse(
            id=s.id,
            ticker=s.ticker,
            name=s.name,
            current_price=float(s.current_price),
        )
        for s in stocks
    ]


@router.get("/{ticker}/analytics", response_model=StockAnalyticsResponse)
async def get_stock_analytics(ticker: str, db: AsyncSession = Depends(get_db)):
    ticker_upper = ticker.strip().upper()
    stock = await db.scalar(select(Stock).where(Stock.ticker == ticker_upper))

    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock ticker '{ticker_upper}' not found.",
        )

    stmt = (
        select(StockHistory)
        .where(StockHistory.stock_id == stock.id)
        .order_by(StockHistory.recorded_at.asc())
        .limit(30)
    )
    history_records = (await db.scalars(stmt)).all()

    return StockAnalyticsResponse(
        ticker=stock.ticker,
        name=stock.name,
        current_price=float(stock.current_price),
        history=[
            StockHistoryPoint(
                closing_price=float(h.closing_price),
                recorded_at=h.recorded_at,
            )
            for h in history_records
        ],
    )
