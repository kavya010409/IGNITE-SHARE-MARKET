const express = require('express');
const db = require('../db');
const { broadcastNewsFlash } = require('../marketSimulator');

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo';

// Admin auth middleware (header-based)
function adminAuth(req, res, next) {
  const headerPassword = req.headers['x-admin-password'];
  if (!headerPassword || headerPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ detail: 'Access Denied: Invalid admin credentials.' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ detail: 'Access Denied: Invalid admin credentials.' });
  }
  return res.json({ status: 'success', message: 'Admin authorization granted.' });
});

// POST /api/admin/news
router.post('/news', adminAuth, (req, res) => {
  try {
    const { stock_ticker, headline, content, sentiment_multiplier = 1.0, duration_minutes = 15 } = req.body;

    if (!headline || headline.length < 3) {
      return res.status(400).json({ detail: 'Headline must be at least 3 characters.' });
    }

    let stockId = null;
    let targetStr = 'GLOBAL';

    if (stock_ticker && stock_ticker !== 'GLOBAL') {
      const stock = db.prepare('SELECT * FROM stocks WHERE ticker = ?').get(stock_ticker.toUpperCase());
      if (!stock) {
        return res.status(404).json({ detail: `Stock ticker '${stock_ticker}' not found.` });
      }
      stockId = stock.id;
      targetStr = stock.ticker;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60 * 1000);

    const result = db.prepare(
      `INSERT INTO news_logs (stock_id, headline, content, sentiment_multiplier, impact_applied, is_active, created_at, expires_at)
       VALUES (?, ?, ?, ?, 0, 1, ?, ?)`
    ).run(stockId, headline, content || headline, sentiment_multiplier, now.toISOString(), expiresAt.toISOString());

    const entry = db.prepare('SELECT * FROM news_logs WHERE id = ?').get(result.lastInsertRowid);

    // Broadcast breaking news in real-time to all trader tabs via WebSocket
    try {
      broadcastNewsFlash({
        stock_ticker: targetStr,
        headline: entry.headline,
        sentiment_multiplier: entry.sentiment_multiplier,
        created_at: entry.created_at,
      });
    } catch (wsErr) {
      console.error('Error broadcasting news via WS:', wsErr);
    }

    return res.status(201).json({
      id: entry.id,
      stock_ticker: targetStr,
      headline: entry.headline,
      sentiment_multiplier: entry.sentiment_multiplier,
      impact_applied: entry.impact_applied === 1,
      is_active: entry.is_active === 1,
      created_at: entry.created_at,
      expires_at: entry.expires_at,
    });
  } catch (err) {
    console.error('Admin news error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// GET /api/admin/news
router.get('/news', adminAuth, (req, res) => {
  try {
    const items = db.prepare(
      'SELECT * FROM news_logs ORDER BY created_at DESC LIMIT 20'
    ).all();

    const response = items.map(item => {
      let ticker = 'GLOBAL';
      if (item.stock_id) {
        const stock = db.prepare('SELECT ticker FROM stocks WHERE id = ?').get(item.stock_id);
        if (stock) ticker = stock.ticker;
      }
      return {
        id: item.id,
        stock_ticker: ticker,
        headline: item.headline,
        sentiment_multiplier: item.sentiment_multiplier,
        impact_applied: item.impact_applied === 1,
        is_active: item.is_active === 1,
        created_at: item.created_at,
        expires_at: item.expires_at,
      };
    });

    return res.json(response);
  } catch (err) {
    console.error('Admin news list error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

module.exports = router;
