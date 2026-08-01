const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/leaderboard
router.get('/', (req, res) => {
  try {
    const traders = db.prepare('SELECT * FROM traders').all();

    const entries = traders.map(trader => {
      const holdings = db.prepare(
        `SELECT p.quantity, s.current_price
         FROM portfolios p
         JOIN stocks s ON s.id = p.stock_id
         WHERE p.trader_id = ? AND p.quantity > 0`
      ).all(trader.id);

      const portfolioValue = holdings.reduce((sum, h) => {
        return sum + h.quantity * parseFloat(h.current_price);
      }, 0);

      const netWorth = parseFloat(trader.cash_balance) + portfolioValue;

      return {
        email: trader.email,
        cash_balance: parseFloat(trader.cash_balance),
        portfolio_value: Math.round(portfolioValue * 100) / 100,
        net_worth: Math.round(netWorth * 100) / 100,
      };
    });

    entries.sort((a, b) => b.net_worth - a.net_worth);

    const leaderboard = entries.map((entry, idx) => ({
      rank: idx + 1,
      ...entry,
    }));

    return res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

module.exports = router;
