from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Portfolio, Stock, Trader, Transaction
from app.security import decode_access_token

router = APIRouter(prefix="/api/trade", tags=["Trade Operations"])


class TradeOrderRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    quantity: int = Field(gt=0)


class TradeOrderResponse(BaseModel):
    transaction_id: int
    order_type: str
    ticker: str
    quantity: int
    executed_price: float
    total_amount: float
    remaining_cash: float
    portfolio_quantity: int
    executed_at: datetime


class PortfolioHoldingResponse(BaseModel):
    ticker: str
    name: str
    quantity: int
    average_buy_price: float
    current_price: float
    current_value: float
    total_cost: float
    unrealized_pnl: float
    pnl_percentage: float


async def get_current_trader(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Trader:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization Bearer token header.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT token credentials.",
        )

    trader_id = int(payload["sub"])
    trader = await db.scalar(select(Trader).where(Trader.id == trader_id))
    if not trader:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trader account not found.",
        )
    return trader


@router.post("/buy", response_model=TradeOrderResponse, status_code=status.HTTP_200_OK)
async def buy_shares(
    payload: TradeOrderRequest,
    trader: Trader = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    ticker_upper = payload.ticker.strip().upper()
    stock = await db.scalar(select(Stock).where(Stock.ticker == ticker_upper))
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock ticker '{ticker_upper}' does not exist in exchange catalog.",
        )

    exec_price = float(stock.current_price)
    total_cost = round(exec_price * payload.quantity, 2)
    current_cash = float(trader.cash_balance)

    # STRICT CASH BALANCE CHECK
    if current_cash < total_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient IG cash balance. Required: {total_cost:.2f} IG, Available: {current_cash:.2f} IG.",
        )

    # Atomic Cash Deduction
    trader.cash_balance = round(current_cash - total_cost, 2)

    # Update or Create Portfolio Holding
    stmt = select(Portfolio).where(
        Portfolio.trader_id == trader.id, Portfolio.stock_id == stock.id
    )
    portfolio = await db.scalar(stmt)

    if not portfolio:
        portfolio = Portfolio(
            trader_id=trader.id,
            stock_id=stock.id,
            quantity=payload.quantity,
            average_buy_price=exec_price,
        )
        db.add(portfolio)
    else:
        old_qty = portfolio.quantity
        old_avg = float(portfolio.average_buy_price)
        new_qty = old_qty + payload.quantity
        new_avg = round(((old_qty * old_avg) + total_cost) / new_qty, 2)
        portfolio.quantity = new_qty
        portfolio.average_buy_price = new_avg

    # Record Transaction Ledger
    now = datetime.now(timezone.utc)
    transaction = Transaction(
        trader_id=trader.id,
        stock_id=stock.id,
        order_type="BUY",
        quantity=payload.quantity,
        price_per_share=exec_price,
        total_amount=total_cost,
        executed_at=now,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(portfolio)

    return TradeOrderResponse(
        transaction_id=transaction.id,
        order_type="BUY",
        ticker=stock.ticker,
        quantity=payload.quantity,
        executed_price=exec_price,
        total_amount=total_cost,
        remaining_cash=float(trader.cash_balance),
        portfolio_quantity=portfolio.quantity,
        executed_at=now,
    )


@router.post("/sell", response_model=TradeOrderResponse, status_code=status.HTTP_200_OK)
async def sell_shares(
    payload: TradeOrderRequest,
    trader: Trader = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    ticker_upper = payload.ticker.strip().upper()
    stock = await db.scalar(select(Stock).where(Stock.ticker == ticker_upper))
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock ticker '{ticker_upper}' does not exist in exchange catalog.",
        )

    # STRICT PORTFOLIO QUANTITY CHECK
    stmt = select(Portfolio).where(
        Portfolio.trader_id == trader.id, Portfolio.stock_id == stock.id
    )
    portfolio = await db.scalar(stmt)

    if not portfolio or portfolio.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You do not own any shares of {stock.ticker} in your portfolio.",
        )

    if portfolio.quantity < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot sell {payload.quantity} shares. You only own {portfolio.quantity} shares of {stock.ticker}.",
        )

    exec_price = float(stock.current_price)
    total_proceeds = round(exec_price * payload.quantity, 2)
    current_cash = float(trader.cash_balance)

    # Atomic Cash Credit
    trader.cash_balance = round(current_cash + total_proceeds, 2)
    portfolio.quantity -= payload.quantity

    if portfolio.quantity == 0:
        portfolio.average_buy_price = 0.0

    # Record Transaction Ledger
    now = datetime.now(timezone.utc)
    transaction = Transaction(
        trader_id=trader.id,
        stock_id=stock.id,
        order_type="SELL",
        quantity=payload.quantity,
        price_per_share=exec_price,
        total_amount=total_proceeds,
        executed_at=now,
    )
    db.add(transaction)
    await db.commit()

    return TradeOrderResponse(
        transaction_id=transaction.id,
        order_type="SELL",
        ticker=stock.ticker,
        quantity=payload.quantity,
        executed_price=exec_price,
        total_amount=total_proceeds,
        remaining_cash=float(trader.cash_balance),
        portfolio_quantity=portfolio.quantity,
        executed_at=now,
    )


@router.get("/portfolio", response_model=List[PortfolioHoldingResponse])
async def get_trader_portfolio(
    trader: Trader = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Portfolio).where(
        Portfolio.trader_id == trader.id, Portfolio.quantity > 0
    )
    portfolios = (await db.scalars(stmt)).all()

    result = []
    for item in portfolios:
        stock = await db.scalar(select(Stock).where(Stock.id == item.stock_id))
        if stock:
            cur_price = float(stock.current_price)
            avg_price = float(item.average_buy_price)
            cur_val = round(cur_price * item.quantity, 2)
            total_cost = round(avg_price * item.quantity, 2)
            pnl = round(cur_val - total_cost, 2)
            pnl_pct = round((pnl / total_cost) * 100, 2) if total_cost > 0 else 0.0

            result.append(
                PortfolioHoldingResponse(
                    ticker=stock.ticker,
                    name=stock.name,
                    quantity=item.quantity,
                    average_buy_price=avg_price,
                    current_price=cur_price,
                    current_value=cur_val,
                    total_cost=total_cost,
                    unrealized_pnl=pnl,
                    pnl_percentage=pnl_pct,
                )
            )
    return result
