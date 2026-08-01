import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import NewsLog, Stock

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])


class AdminNewsRequest(BaseModel):
    stock_ticker: Optional[str] = None
    headline: str = Field(min_length=3, max_length=255)
    content: Optional[str] = Field(default="")
    sentiment_multiplier: float = Field(default=1.0, gt=0)
    duration_minutes: int = Field(default=15, gt=0)


class NewsLogResponse(BaseModel):
    id: int
    stock_ticker: Optional[str]
    headline: str
    sentiment_multiplier: float
    impact_applied: bool
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]


class AdminLoginRequest(BaseModel):
    password: str


async def verify_admin(x_admin_password: Optional[str] = Header(None)):
    if not x_admin_password or x_admin_password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Invalid admin credentials.",
        )


@router.post("/login", status_code=status.HTTP_200_OK)
async def admin_login(payload: AdminLoginRequest):
    if payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access Denied: Invalid admin credentials.",
        )
    return {"status": "success", "message": "Admin authorization granted."}


@router.post("/news", response_model=NewsLogResponse, status_code=status.HTTP_201_CREATED)
async def post_admin_news(
    payload: AdminNewsRequest,
    db: AsyncSession = Depends(get_db),
    _admin_auth = Depends(verify_admin)
):
    stock_id = None
    target_str = "GLOBAL"
    if payload.stock_ticker and payload.stock_ticker != "GLOBAL":
        stock = await db.scalar(select(Stock).where(Stock.ticker == payload.stock_ticker.upper()))
        if not stock:
            raise HTTPException(status_code=404, detail=f"Stock ticker '{payload.stock_ticker}' not found.")
        stock_id = stock.id
        target_str = stock.ticker.upper()

    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=payload.duration_minutes)

    news_entry = NewsLog(
        stock_id=stock_id,
        headline=payload.headline,
        content=payload.content or payload.headline,
        sentiment_multiplier=payload.sentiment_multiplier,
        impact_applied=False,
        is_active=True,
        created_at=now,
        expires_at=expires,
    )

    db.add(news_entry)
    await db.commit()
    await db.refresh(news_entry)

    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        news_payload = {
            "type": "news",
            "event": "news_flash",
            "id": news_entry.id,
            "headline": news_entry.headline,
            "target": target_str,
            "stock_ticker": target_str,
            "sentiment_multiplier": news_entry.sentiment_multiplier,
            "created_at": now.isoformat(),
        }
        await redis_client.publish(settings.REDIS_PRICE_TICKER_CHANNEL, json.dumps(news_payload))
        await redis_client.close()
    except Exception:
        pass

    return NewsLogResponse(
        id=news_entry.id,
        stock_ticker=target_str,
        headline=news_entry.headline,
        sentiment_multiplier=news_entry.sentiment_multiplier,
        impact_applied=news_entry.impact_applied,
        is_active=news_entry.is_active,
        created_at=news_entry.created_at,
        expires_at=news_entry.expires_at,
    )


@router.get("/news", response_model=List[NewsLogResponse])
async def list_admin_news(
    db: AsyncSession = Depends(get_db),
    _admin_auth = Depends(verify_admin)
):
    result = await db.scalars(select(NewsLog).order_by(NewsLog.created_at.desc()).limit(20))
    news_items = result.all()

    response_list = []
    for item in news_items:
        ticker = "GLOBAL"
        if item.stock_id:
            s = await db.scalar(select(Stock).where(Stock.id == item.stock_id))
            if s:
                ticker = s.ticker
        response_list.append(
            NewsLogResponse(
                id=item.id,
                stock_ticker=ticker,
                headline=item.headline,
                sentiment_multiplier=item.sentiment_multiplier,
                impact_applied=item.impact_applied,
                is_active=item.is_active,
                created_at=item.created_at,
                expires_at=item.expires_at,
            )
        )
    return response_list
