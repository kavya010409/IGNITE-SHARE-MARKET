from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models import Trader, Portfolio, Stock

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    email: str
    cash_balance: float
    portfolio_value: float
    net_worth: float


@router.get("", response_model=List[LeaderboardEntry])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    # Scan all traders
    traders_result = await db.scalars(select(Trader))
    traders = traders_result.all()

    entries = []
    for trader in traders:
        # Fetch holdings
        portfolio_result = await db.scalars(
            select(Portfolio).where(Portfolio.trader_id == trader.id)
        )
        holdings = portfolio_result.all()

        portfolio_value = 0.0
        for position in holdings:
            stock = await db.scalar(select(Stock).where(Stock.id == position.stock_id))
            if stock:
                portfolio_value += position.quantity * float(stock.current_price)

        net_worth = float(trader.cash_balance) + portfolio_value

        entries.append({
            "email": trader.email,
            "cash_balance": float(trader.cash_balance),
            "portfolio_value": portfolio_value,
            "net_worth": net_worth
        })

    # Sort descending by Net Worth
    entries.sort(key=lambda x: x["net_worth"], reverse=True)

    # Assign ranks
    leaderboard = []
    for idx, entry in enumerate(entries):
        leaderboard.append(
            LeaderboardEntry(
                rank=idx + 1,
                email=entry["email"],
                cash_balance=entry["cash_balance"],
                portfolio_value=entry["portfolio_value"],
                net_worth=entry["net_worth"]
            )
        )

    return leaderboard
