# ⚡ IGNITE VIRTUAL STOCK MARKET PLATFORM

A high-performance, real-time virtual stock market trading platform and market volatility simulation engine. Built with FastAPI (Async Python), Redis Pub/Sub WebSockets, SQLAlchemy 2.0 ORM, and modern Upstox-inspired Tailwind CSS & Chart.js frontend.

---

## 🌟 Key Features

1. **30 Virtual Stocks Watchlist**:
   * Initialized with 30 unique stocks (`APEX`, `CRPT`, `ROBO`, `FUSE`, etc.) with 30 days of daily historical closing quotes.
   * Enforces a strict **$0.50 IG Price Floor** across all market fluctuations.
2. **Continuous Market Simulator (`app/market_simulator.py`)**:
   * Continuous 15-second simulation loop with subtle organic noise step (`-0.4% to +0.4%`).
   * Powered by Redis Pub/Sub WebSocket broadcasting (`ws://localhost:8000/api/ws/watchlist`).
3. **Admin Volatility & Breaking News Engine (`admin.html`)**:
   * Admin panel for injecting market-moving news events with customizable sentiment multipliers (`+35% Bullish` down to `-35% Bearish`).
   * **2-Minute Shock Execution Gate**: When news is dispatched, prices tick organically for 2 minutes while traders anticipate the news impact. After 120 seconds, a **Drastic Market Realignment** applies the sentiment shock to target stock prices.
4. **Trader Dashboard (`index.html` & `app.js`)**:
   * Gated Authentication Screen with starting capital of **20,000.00 IG**.
   * Interactive Chart.js 1-month historical analytics line graphs.
   * Atomic Buy/Sell order placement with row-level locks (`SELECT FOR UPDATE`).
   * **Instant Breaking News Alert Modal** and **Live Market News Archive Feed**.

---

## 📂 Project Architecture

```text
virtual_trading_platform/
├── app/
│   ├── admin_router.py       # Admin news dispatch API (/api/admin/news)
│   ├── auth_router.py        # Trader registration & JWT login API (/api/auth)
│   ├── config.py             # Pydantic BaseSettings environment configurations
│   ├── database.py           # Async SQLAlchemy engine & sessionmaker
│   ├── main.py               # FastAPI application entrypoint & static routes
│   ├── market_simulator.py   # Continuous 15s ticker loop with 2-min shock engine
│   ├── models.py             # SQLAlchemy models (Trader, Stock, History, Portfolio, NewsLog)
│   ├── security.py           # Passlib password hashing & PyJWT token utilities
│   ├── stocks_router.py      # Stock analytics historical query API (/api/stocks)
│   ├── trade_router.py       # Atomic row-locked buy & sell endpoints (/api/trade)
│   └── websocket_manager.py  # WebSocket connection manager & Redis listener
├── scripts/
│   └── seed_data.py          # Database seeding script (30 stocks + 30-day history)
├── admin.html                # Admin Volatility & News Overlay Control Panel
├── index.html                # Trader Dashboard Web Interface
├── app.js                    # Client-side JavaScript Engine
├── view_live_market.py       # Terminal TUI live ticker visualizer
├── docker-compose.yml        # Multi-container orchestration (FastAPI + Postgres + Redis)
├── Dockerfile                # Production multi-stage Docker build file
├── requirements.txt          # Python dependencies manifest
└── README.md                 # Project Documentation
```

---

## 🚀 Quick Start Guide

### Option 1: Standalone Demo Mode (No External Services Required)
1. Serve static files using Python's built-in HTTP server:
   ```bash
   python -m http.server 8000
   ```
2. Open your web browser:
   * **Trader Floor**: [http://localhost:8000/index.html](http://localhost:8000/index.html)
   * **Admin Panel**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)

---

### Option 2: Docker Compose (Full Stack with PostgreSQL & Redis)
1. Launch all services:
   ```bash
   docker-compose up --build -d
   ```
2. Seed initial stock data:
   ```bash
   docker-compose exec web python scripts/seed_data.py
   ```
3. Open interface:
   * **Web Terminal**: [http://localhost:8000/index.html](http://localhost:8000/index.html)
   * **Admin Overlay**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)

---

## 🛠️ API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new trader account (Grants 20,000 IG) |
| `POST` | `/api/auth/login` | Authenticate trader and receive JWT token |
| `GET` | `/api/stocks/{ticker}/analytics` | 30-day chronological historical closing prices |
| `POST` | `/api/trade/buy` | Atomic buy order with row-level locking |
| `POST` | `/api/trade/sell` | Atomic sell order with weighted average cost basis |
| `POST` | `/api/admin/news` | Dispatch market news & volatility multiplier |
| `WS` | `/api/ws/watchlist` | Redis Pub/Sub real-time market price stream |

---

## 📄 License
MIT License - Open for team collaboration & development.
