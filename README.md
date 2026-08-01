# ⚡ IGNITE VIRTUAL STOCK MARKET PLATFORM (React + FastAPI Monorepo)

A production-ready virtual stock trading platform and market volatility simulation engine. Built as a decoupled full-stack architecture with a **React.js + Vite** frontend (`frontend/`) and an asynchronous **FastAPI** backend (`backend/`).

---

## 📂 Monorepo Architecture

```text
virtual_trading_platform/
├── backend/
│   ├── app/
│   │   ├── admin_router.py       # Admin volatility dispatch API (/api/admin/news)
│   │   ├── auth_router.py        # Trader registration & JWT auth API (/api/auth)
│   │   ├── config.py             # App settings & SQLite zero-config fallback
│   │   ├── database.py           # Async SQLAlchemy engine & sessionmaker
│   │   ├── market_simulator.py   # Continuous 15s ticker loop with 2-min news shock
│   │   ├── models.py             # DB Models (Trader, Stock, History, Portfolio, News)
│   │   ├── security.py           # Password hashing & PyJWT token utilities
│   │   ├── stocks_router.py      # Stock analytics & 30-day history (/api/stocks)
│   │   ├── trade_router.py       # Strict row-locked trade execution (/api/trade)
│   │   └── websocket_manager.py  # Live WebSocket ticker & Pub/Sub stream
│   ├── main.py                   # FastAPI entrypoint & auto-seeding engine
│   └── requirements.txt          # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.jsx        # Admin news & volatility injection panel
│   │   │   ├── AuthScreen.jsx        # Trader registration & sign-in screen
│   │   │   ├── BreakingNewsModal.jsx # Floating breaking news modal banner
│   │   │   ├── Navbar.jsx            # Account balance & navigation header
│   │   │   ├── NewsFeed.jsx          # Live market news archive feed
│   │   │   ├── OrderForm.jsx         # Strict validation buy/sell form
│   │   │   ├── PortfolioLedger.jsx   # Portfolio position holdings ledger
│   │   │   ├── StockChart.jsx        # Chart.js 1-month analytics graph
│   │   │   └── Watchlist.jsx         # 30-Stock real-time price watchlist
│   │   ├── App.jsx                   # Main React application state container
│   │   ├── index.css                 # Tailwind CSS styling
│   │   └── main.jsx                  # React entrypoint
│   ├── index.html                    # Single Page App HTML container
│   ├── package.json                  # React + Vite dependencies
│   └── vite.config.js                # Vite development server config
├── .gitignore                        # Git exclusion rules
└── README.md                         # Repository documentation
```

---

## 🔒 Financial & Trading Logic Controls

1. **Strict Cash Balance Check on Buy**:
   * Order execution verifies `cash_balance >= (quantity * current_price)`.
   * If insufficient, blocks execution with an explicit error: `"Insufficient IG cash balance for this buy order."`
2. **Strict Share Ownership Check on Sell**:
   * Order execution queries trader's `Portfolio` position record (`portfolio.quantity >= sell_quantity`).
   * If the trader owns 0 shares or fewer shares than requested to sell, blocks execution with an explicit error: `"You cannot sell shares you do not own in your portfolio."`
3. **2-Minute News Shock Execution Gate**:
   * News events tick organically for 2 minutes (120s) while traders anticipate the news impact.
   * After 120 seconds, a **Drastic Market Realignment** applies the sentiment shock to target stock prices.

---

## 🚀 Quick Start Guide

### 1. Frontend Setup (React.js + Vite)
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --port 8000
```
