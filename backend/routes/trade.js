const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/trade/buy
router.post('/buy', authMiddleware, (req, res) => {
  try {
    const { ticker, quantity } = req.body;
    const trader = req.trader;

    if (!ticker || !quantity || quantity <= 0) {
      return res.status(400).json({ detail: 'Valid ticker and quantity (> 0) are required.' });
    }

    const tickerUpper = ticker.trim().toUpperCase();
    const stock = db.prepare('SELECT * FROM stocks WHERE ticker = ?').get(tickerUpper);
    if (!stock) {
      return res.status(404).json({ detail: `Stock ticker '${tickerUpper}' does not exist in exchange catalog.` });
    }

    const execPrice = parseFloat(stock.current_price);
    const totalCost = Math.round(execPrice * quantity * 100) / 100;
    const currentCash = parseFloat(trader.cash_balance);

    if (currentCash < totalCost) {
      return res.status(400).json({
        detail: `Insufficient IG cash balance. Required: ${totalCost.toFixed(2)} IG, Available: ${currentCash.toFixed(2)} IG.`,
      });
    }

    const executeTrade = db.transaction(() => {
      // Deduct cash
      const newCash = Math.round((currentCash - totalCost) * 100) / 100;
      db.prepare("UPDATE traders SET cash_balance = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newCash, trader.id);

      // Update or insert portfolio
      const existing = db.prepare(
        'SELECT * FROM portfolios WHERE trader_id = ? AND stock_id = ?'
      ).get(trader.id, stock.id);

      let newQty, newAvg;
      if (!existing) {
        newQty = quantity;
        newAvg = execPrice;
        db.prepare(
          'INSERT INTO portfolios (trader_id, stock_id, quantity, average_buy_price) VALUES (?, ?, ?, ?)'
        ).run(trader.id, stock.id, newQty, newAvg);
      } else {
        const oldQty = existing.quantity;
        const oldAvg = parseFloat(existing.average_buy_price);
        newQty = oldQty + quantity;
        newAvg = Math.round(((oldQty * oldAvg) + totalCost) / newQty * 100) / 100;
        db.prepare(
          "UPDATE portfolios SET quantity = ?, average_buy_price = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(newQty, newAvg, existing.id);
      }

      // Record transaction
      const txResult = db.prepare(
        "INSERT INTO transactions (trader_id, stock_id, order_type, quantity, price_per_share, total_amount) VALUES (?, ?, 'BUY', ?, ?, ?)"
      ).run(trader.id, stock.id, quantity, execPrice, totalCost);

      return { newCash, newQty, txId: txResult.lastInsertRowid };
    });

    const { newCash, newQty, txId } = executeTrade();

    return res.json({
      transaction_id: txId,
      order_type: 'BUY',
      ticker: stock.ticker,
      quantity,
      executed_price: execPrice,
      total_amount: totalCost,
      remaining_cash: newCash,
      portfolio_quantity: newQty,
      executed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Buy error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// POST /api/trade/sell
router.post('/sell', authMiddleware, (req, res) => {
  try {
    const { ticker, quantity } = req.body;
    const trader = req.trader;

    if (!ticker || !quantity || quantity <= 0) {
      return res.status(400).json({ detail: 'Valid ticker and quantity (> 0) are required.' });
    }

    const tickerUpper = ticker.trim().toUpperCase();
    const stock = db.prepare('SELECT * FROM stocks WHERE ticker = ?').get(tickerUpper);
    if (!stock) {
      return res.status(404).json({ detail: `Stock ticker '${tickerUpper}' does not exist in exchange catalog.` });
    }

    const portfolio = db.prepare(
      'SELECT * FROM portfolios WHERE trader_id = ? AND stock_id = ?'
    ).get(trader.id, stock.id);

    if (!portfolio || portfolio.quantity <= 0) {
      return res.status(400).json({ detail: `You do not own any shares of ${stock.ticker} in your portfolio.` });
    }
    if (portfolio.quantity < quantity) {
      return res.status(400).json({
        detail: `Cannot sell ${quantity} shares. You only own ${portfolio.quantity} shares of ${stock.ticker}.`,
      });
    }

    const execPrice = parseFloat(stock.current_price);
    const totalProceeds = Math.round(execPrice * quantity * 100) / 100;
    const currentCash = parseFloat(trader.cash_balance);

    const executeSell = db.transaction(() => {
      const newCash = Math.round((currentCash + totalProceeds) * 100) / 100;
      db.prepare("UPDATE traders SET cash_balance = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newCash, trader.id);

      const newQty = portfolio.quantity - quantity;
      db.prepare(
        "UPDATE portfolios SET quantity = ?, average_buy_price = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newQty, newQty === 0 ? 0 : portfolio.average_buy_price, portfolio.id);

      const txResult = db.prepare(
        "INSERT INTO transactions (trader_id, stock_id, order_type, quantity, price_per_share, total_amount) VALUES (?, ?, 'SELL', ?, ?, ?)"
      ).run(trader.id, stock.id, quantity, execPrice, totalProceeds);

      return { newCash, newQty, txId: txResult.lastInsertRowid };
    });

    const { newCash, newQty, txId } = executeSell();

    return res.json({
      transaction_id: txId,
      order_type: 'SELL',
      ticker: stock.ticker,
      quantity,
      executed_price: execPrice,
      total_amount: totalProceeds,
      remaining_cash: newCash,
      portfolio_quantity: newQty,
      executed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sell error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// GET /api/trade/portfolio
router.get('/portfolio', authMiddleware, (req, res) => {
  try {
    const trader = req.trader;

    const holdings = db.prepare(
      `SELECT p.*, s.ticker, s.name, s.current_price
       FROM portfolios p
       JOIN stocks s ON s.id = p.stock_id
       WHERE p.trader_id = ? AND p.quantity > 0`
    ).all(trader.id);

    const result = holdings.map(item => {
      const curPrice = parseFloat(item.current_price);
      const avgPrice = parseFloat(item.average_buy_price);
      const curVal = Math.round(curPrice * item.quantity * 100) / 100;
      const totalCost = Math.round(avgPrice * item.quantity * 100) / 100;
      const pnl = Math.round((curVal - totalCost) * 100) / 100;
      const pnlPct = totalCost > 0 ? Math.round((pnl / totalCost) * 10000) / 100 : 0;

      return {
        ticker: item.ticker,
        name: item.name,
        quantity: item.quantity,
        average_buy_price: avgPrice,
        current_price: curPrice,
        current_value: curVal,
        total_cost: totalCost,
        unrealized_pnl: pnl,
        pnl_percentage: pnlPct,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Portfolio error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

module.exports = router;
