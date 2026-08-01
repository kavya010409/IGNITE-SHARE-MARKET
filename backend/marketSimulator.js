const db = require('./db');

const TICK_INTERVAL_MS = 15000;       // 15 seconds
const NEWS_SHOCK_DELAY_MS = 120000;   // 2 minutes
const PRICE_FLOOR = parseFloat(process.env.PRICE_FLOOR || '0.50');

let wss = null; // WebSocket server reference — injected from server.js

function setWebSocketServer(server) {
  wss = server;
}

function broadcastToAll(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      try { client.send(msg); } catch (_) {}
    }
  });
}

function processMarketTick() {
  try {
    const stocks = db.prepare('SELECT * FROM stocks').all();
    if (!stocks.length) return;

    const now = new Date();
    const nowMs = now.getTime();

    // ── Apply any pending 2-minute news shocks ────────────────────────────
    const pendingNews = db.prepare(
      `SELECT * FROM news_logs
       WHERE is_active = 1 AND impact_applied = 0
       AND (expires_at IS NULL OR expires_at > datetime('now'))`
    ).all();

    const stockShocks = {};  // stock_id -> multiplier
    let globalShock = 1.0;

    for (const news of pendingNews) {
      const createdMs = new Date(news.created_at).getTime();
      const elapsedMs = nowMs - createdMs;

      if (elapsedMs >= NEWS_SHOCK_DELAY_MS) {
        // Mark as applied
        db.prepare("UPDATE news_logs SET impact_applied = 1 WHERE id = ?").run(news.id);
        console.log(`💥 2-MIN SHOCK: News #${news.id} "${news.headline}" | Multiplier: ${news.sentiment_multiplier}x`);

        if (news.stock_id === null) {
          globalShock *= news.sentiment_multiplier;
        } else {
          stockShocks[news.stock_id] = (stockShocks[news.stock_id] || 1.0) * news.sentiment_multiplier;
        }
      }
    }

    // ── Update all stock prices ───────────────────────────────────────────
    const updateStock = db.prepare(
      "UPDATE stocks SET current_price = ?, updated_at = ? WHERE id = ?"
    );
    const insertHistory = db.prepare(
      "INSERT INTO stock_history (stock_id, closing_price, recorded_at) VALUES (?, ?, ?)"
    );

    const wsTicks = [];
    const nowIso = now.toISOString();

    const applyTick = db.transaction(() => {
      for (const stock of stocks) {
        const oldPrice = parseFloat(stock.current_price);
        const baseNoise = (Math.random() * 0.008) - 0.004; // ±0.4%

        const stockMult = stockShocks[stock.id] || 1.0;
        const effectiveMult = stockMult * globalShock;

        let changePct;
        if (effectiveMult !== 1.0) {
          changePct = (effectiveMult - 1.0) + baseNoise;
        } else {
          changePct = baseNoise;
        }

        const rawNew = oldPrice * (1.0 + changePct);
        const newPrice = Math.round(Math.max(PRICE_FLOOR, rawNew) * 100) / 100;
        const netChangePct = Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100;

        updateStock.run(newPrice, nowIso, stock.id);
        insertHistory.run(stock.id, newPrice, nowIso);

        wsTicks.push({
          ticker: stock.ticker,
          name: stock.name,
          current_price: newPrice,
          change_percentage: netChangePct,
        });
      }
    });

    applyTick();

    // ── Broadcast to WebSocket clients ────────────────────────────────────
    broadcastToAll({
      event: 'market_tick',
      timestamp: nowIso,
      data: wsTicks,
    });

  } catch (err) {
    console.error('❌ Market tick error:', err.message);
  }
}

function startMarketSimulator() {
  console.log('🚀 Market Simulator started — ticking every 15 seconds.');
  setInterval(processMarketTick, TICK_INTERVAL_MS);
}

module.exports = { startMarketSimulator, setWebSocketServer };
