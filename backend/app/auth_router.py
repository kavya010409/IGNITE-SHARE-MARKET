from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Trader
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    trader_id: int
    email: str
    cash_balance: float


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_trader(payload: AuthRegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(Trader).where(Trader.email == payload.email.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trader email address already registered. Please sign in instead.",
        )

    new_trader = Trader(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        cash_balance=20000.00,
    )

    db.add(new_trader)
    await db.commit()
    await db.refresh(new_trader)

    token = create_access_token({"sub": str(new_trader.id), "email": new_trader.email})

    return AuthTokenResponse(
        access_token=token,
        trader_id=new_trader.id,
        email=new_trader.email,
        cash_balance=float(new_trader.cash_balance),
    )


@router.post("/login", response_model=AuthTokenResponse, status_code=status.HTTP_200_OK)
async def login_trader(payload: AuthLoginRequest, db: AsyncSession = Depends(get_db)):
    trader = await db.scalar(select(Trader).where(Trader.email == payload.email.lower()))
    if not trader or not verify_password(payload.password, trader.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password credentials.",
        )

    token = create_access_token({"sub": str(trader.id), "email": trader.email})

    return AuthTokenResponse(
        access_token=token,
        trader_id=trader.id,
        email=trader.email,
        cash_balance=float(trader.cash_balance),
    )


@router.get("/me", response_model=AuthTokenResponse)
async def get_current_trader_profile(
    trader_id: int,
    db: AsyncSession = Depends(get_db)
):
    trader = await db.scalar(select(Trader).where(Trader.id == trader_id))
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found.")
    token = create_access_token({"sub": str(trader.id), "email": trader.email})
    return AuthTokenResponse(
        access_token=token,
        trader_id=trader.id,
        email=trader.email,
        cash_balance=float(trader.cash_balance),
    )
