from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Portfolio, Stock, Trader, Transaction

router = APIRouter(prefix="/api/trade", tags=["Atomic Trading"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_trader(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Trader:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        trader_id = payload.get("sub")
        if not trader_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token decode error")

    trader = await db.scalar(select(Trader).where(Trader.id == int(trader_id)))
    if not trader:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Trader not found")
    return trader


class TradeRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=4)
    quantity: int = Field(gt=0)


class TradeResponse(BaseModel):
    transaction_id: int
    order_type: str
    ticker: str
    quantity: int
    executed_price: float
    total_amount: float
    remaining_cash: float
    updated_holding_quantity: int
    average_buy_price: float


@router.post("/buy", response_model=TradeResponse)
async def buy(
    payload: TradeRequest,
    current_trader: Trader = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    async with db.begin():
        # PostgreSQL Row Lock on Trader
        trader = await db.scalar(select(Trader).where(Trader.id == current_trader.id).with_for_update())
        stock = await db.scalar(select(Stock).where(Stock.ticker == payload.ticker.upper()))
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")

        exec_price = float(stock.current_price)
        total_cost = round(exec_price * payload.quantity, 2)
        current_cash = float(trader.cash_balance)

        if current_cash < total_cost:
            raise HTTPException(status_code=400, detail="Insufficient cash balance")

        # Row Lock on Portfolio
        portfolio = await db.scalar(
            select(Portfolio)
            .where(Portfolio.trader_id == trader.id, Portfolio.stock_id == stock.id)
            .with_for_update()
        )

        if portfolio is None:
            new_qty = payload.quantity
            new_avg = exec_price
            portfolio = Portfolio(
                trader_id=trader.id,
                stock_id=stock.id,
                quantity=new_qty,
                average_buy_price=new_avg,
            )
            db.add(portfolio)
        else:
            old_qty = portfolio.quantity
            old_avg = float(portfolio.average_buy_price)
            new_qty = old_qty + payload.quantity
            new_avg = round(((old_qty * old_avg) + (payload.quantity * exec_price)) / new_qty, 2)
            portfolio.quantity = new_qty
            portfolio.average_buy_price = new_avg

        trader.cash_balance = current_cash - total_cost

        trade_log = Transaction(
            trader_id=trader.id,
            stock_id=stock.id,
            order_type="BUY",
            quantity=payload.quantity,
            price_per_share=exec_price,
            total_amount=total_cost,
            executed_at=datetime.now(timezone.utc),
        )
        db.add(trade_log)
        await db.flush()

        return TradeResponse(
            transaction_id=trade_log.id,
            order_type="BUY",
            ticker=stock.ticker,
            quantity=payload.quantity,
            executed_price=exec_price,
            total_amount=total_cost,
            remaining_cash=float(trader.cash_balance),
            updated_holding_quantity=portfolio.quantity,
            average_buy_price=float(portfolio.average_buy_price),
        )


@router.post("/sell", response_model=TradeResponse)
async def sell(
    payload: TradeRequest,
    current_trader: Trader = Depends(get_current_trader),
    db: AsyncSession = Depends(get_db),
):
    async with db.begin():
        trader = await db.scalar(select(Trader).where(Trader.id == current_trader.id).with_for_update())
        stock = await db.scalar(select(Stock).where(Stock.ticker == payload.ticker.upper()))
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")

        portfolio = await db.scalar(
            select(Portfolio)
            .where(Portfolio.trader_id == trader.id, Portfolio.stock_id == stock.id)
            .with_for_update()
        )

        current_qty = portfolio.quantity if portfolio else 0
        if portfolio is None or current_qty < payload.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock quantity to sell")

        exec_price = float(stock.current_price)
        total_proceeds = round(exec_price * payload.quantity, 2)

        portfolio.quantity -= payload.quantity
        trader.cash_balance = float(trader.cash_balance) + total_proceeds

        trade_log = Transaction(
            trader_id=trader.id,
            stock_id=stock.id,
            order_type="SELL",
            quantity=payload.quantity,
            price_per_share=exec_price,
            total_amount=total_proceeds,
            executed_at=datetime.now(timezone.utc),
        )
        db.add(trade_log)
        await db.flush()

        return TradeResponse(
            transaction_id=trade_log.id,
            order_type="SELL",
            ticker=stock.ticker,
            quantity=payload.quantity,
            executed_price=exec_price,
            total_amount=total_proceeds,
            remaining_cash=float(trader.cash_balance),
            updated_holding_quantity=portfolio.quantity,
            average_buy_price=float(portfolio.average_buy_price),
        )
