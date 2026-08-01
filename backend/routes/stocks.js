const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/stocks
router.get('/', (req, res) => {
  try {
    const stocks = db.prepare('SELECT id, ticker, name, current_price FROM stocks ORDER BY ticker').all();
    return res.json(stocks.map(s => ({
      id: s.id,
      ticker: s.ticker,
      name: s.name,
      current_price: parseFloat(s.current_price),
    })));
  } catch (err) {
    console.error('Stocks list error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// GET /api/stocks/:ticker/analytics
router.get('/:ticker/analytics', (req, res) => {
  try {
    const ticker = req.params.ticker.trim().toUpperCase();
    const stock = db.prepare('SELECT * FROM stocks WHERE ticker = ?').get(ticker);

    if (!stock) {
      return res.status(404).json({ detail: `Stock ticker '${ticker}' not found.` });
    }

    const history = db.prepare(
      `SELECT closing_price, recorded_at FROM stock_history
       WHERE stock_id = ? ORDER BY recorded_at ASC LIMIT 30`
    ).all(stock.id);

    return res.json({
      ticker: stock.ticker,
      name: stock.name,
      current_price: parseFloat(stock.current_price),
      history: history.map(h => ({
        closing_price: parseFloat(h.closing_price),
        recorded_at: h.recorded_at,
      })),
    });
  } catch (err) {
    console.error('Stock analytics error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

module.exports = router;
