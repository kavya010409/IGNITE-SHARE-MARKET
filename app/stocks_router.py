from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Stock

router = APIRouter(prefix="/api/stocks", tags=["Stock Analytics"])


class HistoryPoint(BaseModel):
    closing_price: float
    recorded_at: datetime


class AnalyticsResponse(BaseModel):
    ticker: str
    name: str
    current_price: float
    history: List[HistoryPoint]


@router.get("/{ticker}/analytics", response_model=AnalyticsResponse)
async def get_analytics(ticker: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Stock)
        .options(selectinload(Stock.history))
        .where(Stock.ticker == ticker.upper())
    )
    stock = await db.scalar(stmt)
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock '{ticker.upper()}' not found.",
        )

    sorted_history = sorted(stock.history, key=lambda h: h.recorded_at)
    history_points = [
        HistoryPoint(closing_price=float(h.closing_price), recorded_at=h.recorded_at)
        for h in sorted_history
    ]

    return AnalyticsResponse(
        ticker=stock.ticker,
        name=stock.name,
        current_price=float(stock.current_price),
        history=history_points,
    )
