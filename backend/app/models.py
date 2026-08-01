from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Trader(Base):
    __tablename__ = "traders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    cash_balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=20000.00)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    portfolios: Mapped[List["Portfolio"]] = relationship("Portfolio", back_populates="trader", cascade="all, delete-orphan")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="trader", cascade="all, delete-orphan")


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    current_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    history: Mapped[List["StockHistory"]] = relationship("StockHistory", back_populates="stock", cascade="all, delete-orphan")
    portfolios: Mapped[List["Portfolio"]] = relationship("Portfolio", back_populates="stock", cascade="all, delete-orphan")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="stock", cascade="all, delete-orphan")
    news: Mapped[List["NewsLog"]] = relationship("NewsLog", back_populates="stock", cascade="all, delete-orphan")


class StockHistory(Base):
    __tablename__ = "stock_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False)
    closing_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    stock: Mapped["Stock"] = relationship("Stock", back_populates="history")

    __table_args__ = (
        Index("ix_stock_history_stock_id_recorded_at", "stock_id", "recorded_at"),
    )


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("traders.id", ondelete="CASCADE"), nullable=False)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=0)
    average_buy_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    trader: Mapped["Trader"] = relationship("Trader", back_populates="portfolios")
    stock: Mapped["Stock"] = relationship("Stock", back_populates="portfolios")

    __table_args__ = (
        UniqueConstraint("trader_id", "stock_id", name="uq_trader_stock_portfolio"),
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("traders.id", ondelete="CASCADE"), nullable=False)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False)
    order_type: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    price_per_share: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    trader: Mapped["Trader"] = relationship("Trader", back_populates="transactions")
    stock: Mapped["Stock"] = relationship("Stock", back_populates="transactions")


class NewsLog(Base):
    __tablename__ = "news_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    stock_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), nullable=True)
    headline: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    impact_applied: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    stock: Mapped[Optional["Stock"]] = relationship("Stock", back_populates="news")
