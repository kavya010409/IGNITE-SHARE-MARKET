#!/usr/bin/env python3
"""
ApexTrader Virtual Stock Exchange - Live Terminal Dashboard (TUI)
Connects to the WebSocket price stream and renders a 30-stock live trading floor.
"""

import asyncio
import json
import sys
import uuid
import httpx
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
import websockets

API_BASE_URL = "http://localhost:8000"
WS_BASE_URL = "ws://localhost:8000"

console = Console()


async def get_authenticated_token() -> str:
    """Creates a temporary test trader account and retrieves a JWT access token."""
    email = f"tui_trader_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPassword123!"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Register
            reg_resp = await client.post(
                f"{API_BASE_URL}/api/auth/register",
                json={"email": email, "password": password},
            )
            if reg_resp.status_code == 201:
                return reg_resp.json()["access_token"]

            # Fallback Login
            login_resp = await client.post(
                f"{API_BASE_URL}/api/auth/login",
                json={"email": email, "password": password},
            )
            login_resp.raise_for_status()
            return login_resp.json()["access_token"]
        except Exception as err:
            console.print(f"[bold red]❌ Failed to authenticate with exchange API: {err}[/bold red]")
            console.print("[yellow]Ensure the server is running with 'docker-compose up' or 'uvicorn app.main:app'[/yellow]")
            sys.exit(1)


def generate_dashboard(stocks_data: list, prev_prices: dict) -> Layout:
    """Renders a dual-column Rich Layout displaying all 30 stocks with directional trend indicators."""
    layout = Layout()
    layout.split_row(
        Layout(name="left"),
        Layout(name="right"),
    )

    half = (len(stocks_data) + 1) // 2
    left_stocks = stocks_data[:half]
    right_stocks = stocks_data[half:]

    def build_stock_table(subset: list, feed_name: str) -> Table:
        table = Table(
            expand=True,
            header_style="bold magenta",
            box=None,
            show_edge=False,
        )
        table.add_column("Ticker", style="bold cyan", width=8)
        table.add_column("Name", width=22)
        table.add_column("Price (IG)", justify="right", width=12)
        table.add_column("Change", justify="right", width=12)
        table.add_column("Trend", justify="center", width=8)

        for stock in subset:
            ticker = stock.get("ticker", "N/A")
            name = stock.get("name", "N/A")
            price = float(stock.get("current_price", 0.0))
            change_pct = float(stock.get("change_percentage", 0.0))

            old_price = prev_prices.get(ticker, price)
            if price > old_price:
                trend = "[bold green]▲ UP[/bold green]"
                price_str = f"[bold green]{price:.2f} IG[/bold green]"
                change_str = f"[bold green]+{change_pct:.2f}%[/bold green]"
            elif price < old_price:
                trend = "[bold red]▼ DOWN[/bold red]"
                price_str = f"[bold red]{price:.2f} IG[/bold red]"
                change_str = f"[bold red]{change_pct:.2f}%[/bold red]"
            else:
                trend = "[dim]► FLAT[/dim]"
                price_str = f"{price:.2f} IG"
                change_str = f"{change_pct:+.2f}%"

            table.add_row(ticker, name, price_str, change_str, trend)
            prev_prices[ticker] = price

        return table

    layout["left"].update(Panel(build_stock_table(left_stocks, "A"), title="[bold cyan]Exchange Floor - Feed A[/bold cyan]", border_style="blue"))
    layout["right"].update(Panel(build_stock_table(right_stocks, "B"), title="[bold cyan]Exchange Floor - Feed B[/bold cyan]", border_style="blue"))

    return layout


async def stream_live_market() -> None:
    """Connects to the WebSocket price stream and continuously updates the terminal UI."""
    console.print("[bold cyan]🔄 Authenticating with ApexTrader Virtual Stock Exchange...[/bold cyan]")
    token = await get_authenticated_token()
    console.print("[bold green]✅ Authenticated successfully. Connecting to real-time price feed...[/bold green]")

    ws_url = f"{WS_BASE_URL}/api/ws/watchlist?token={token}"
    prev_prices: dict = {}

    try:
        async with websockets.connect(ws_url) as websocket:
            console.print("[bold green]📡 Persistent WebSocket pipeline established![/bold green]")
            
            with Live(console=console, refresh_per_second=4, screen=True) as live:
                async for message in websocket:
                    try:
                        payload = json.loads(message)
                        if payload.get("event") == "market_tick":
                            stocks_list = payload.get("data", [])
                            dashboard = generate_dashboard(stocks_list, prev_prices)
                            live.update(dashboard)
                    except json.JSONDecodeError:
                        pass
    except websockets.exceptions.ConnectionClosed:
        console.print("[bold red]🔌 Connection to market exchange lost.[/bold red]")
    except Exception as exc:
        console.print(f"[bold red]❌ WebSocket Error: {exc}[/bold red]")


if __name__ == "__main__":
    try:
        asyncio.run(stream_live_market())
    except KeyboardInterrupt:
        console.print("\n[bold yellow]👋 Live Terminal Dashboard closed.[/bold yellow]")
