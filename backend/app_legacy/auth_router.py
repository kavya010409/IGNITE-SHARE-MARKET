from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Trader
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    trader_id: int
    email: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(Trader).where(Trader.email == payload.email.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trader email already registered.",
        )

    # Initializes account with exactly 20,000.00 Ignite Coins
    new_trader = Trader(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        cash_balance=20000.00,
    )
    db.add(new_trader)
    await db.commit()
    await db.refresh(new_trader)

    token = create_access_token(subject=new_trader.id, email=new_trader.email)
    return TokenResponse(
        access_token=token,
        trader_id=new_trader.id,
        email=new_trader.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    trader = await db.scalar(select(Trader).where(Trader.email == payload.email.lower()))
    if not trader or not verify_password(payload.password, trader.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(subject=trader.id, email=trader.email)
    return TokenResponse(
        access_token=token,
        trader_id=trader.id,
        email=trader.email,
    )
