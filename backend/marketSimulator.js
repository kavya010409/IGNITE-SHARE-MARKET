const db = require('./db');

const TICK_INTERVAL_MS = 15000;  // 15 seconds per tick
const PRICE_FLOOR = parseFloat(process.env.PRICE_FLOOR || '0.50');

let wss = null;

function setWebSocketServer(server) {
  wss = server;
}

function broadcastToAll(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      try { client.send(msg); } catch (_) {}
    }
  });
}

function processMarketTick() {
  try {
    const stocks = db.prepare('SELECT * FROM stocks').all();
    if (!stocks.length) return;

    const now = new Date();
    const nowIso = now.toISOString();

    // ── Apply ALL pending news shocks immediately (no delay) ─────────────────
    // Admin dispatches a news event → it applies on the VERY NEXT tick (≤15s)
    const pendingNews = db.prepare(
      `SELECT * FROM news_logs
       WHERE is_active = 1 AND impact_applied = 0`
    ).all();

    const stockShocks = {};  // stock_id → combined multiplier
    let globalShock = 1.0;

    for (const news of pendingNews) {
      // Mark applied immediately
      db.prepare('UPDATE news_logs SET impact_applied = 1 WHERE id = ?').run(news.id);
      console.log(`💥 NEWS SHOCK APPLIED: "${news.headline}" | Multiplier: ${news.sentiment_multiplier}x | Target: ${news.stock_id ? `stock #${news.stock_id}` : 'GLOBAL'}`);

      if (news.stock_id === null) {
        globalShock *= news.sentiment_multiplier;
      } else {
        stockShocks[news.stock_id] = (stockShocks[news.stock_id] || 1.0) * news.sentiment_multiplier;
      }
    }

    // ── Prepare DB statements ────────────────────────────────────────────────
    const updateStock = db.prepare(
      'UPDATE stocks SET current_price = ?, updated_at = ? WHERE id = ?'
    );
    const insertHistory = db.prepare(
      'INSERT INTO stock_history (stock_id, closing_price, recorded_at) VALUES (?, ?, ?)'
    );

    const wsTicks = [];

    const applyTick = db.transaction(() => {
      for (const stock of stocks) {
        const oldPrice = parseFloat(stock.current_price);

        // Small random noise ±0.4% always
        const baseNoise = (Math.random() * 0.008) - 0.004;

        const stockMult = stockShocks[stock.id] || 1.0;
        const effectiveMult = stockMult * globalShock;

        let changePct;
        if (effectiveMult !== 1.0) {
          // News shock: apply the full multiplier impact
          changePct = (effectiveMult - 1.0) + baseNoise;
        } else {
          // Normal drift: tiny random walk
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

    // ── Broadcast updated prices to all connected traders ────────────────────
    broadcastToAll({
      event: 'market_tick',
      timestamp: nowIso,
      data: wsTicks,
    });

    if (pendingNews.length > 0) {
      console.log(`📊 Market tick complete. Applied ${pendingNews.length} news shock(s). Global multiplier: ${globalShock.toFixed(3)}x`);
    }

  } catch (err) {
    console.error('❌ Market tick error:', err.message);
  }
}

function broadcastNewsFlash(news) {
  broadcastToAll({
    event: 'news_flash',
    stock_ticker: news.stock_ticker || 'GLOBAL',
    headline: news.headline,
    sentiment_multiplier: parseFloat(news.sentiment_multiplier),
    created_at: news.created_at,
  });
}

function startMarketSimulator() {
  console.log('🚀 Market Simulator started — ticking every 15 seconds. News shocks apply on next tick.');
  setInterval(processMarketTick, TICK_INTERVAL_MS);
}

module.exports = { startMarketSimulator, setWebSocketServer, broadcastNewsFlash };
