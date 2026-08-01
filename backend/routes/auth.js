const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'super-secret-key-change-in-production-123456789';
const TOKEN_EXPIRY = '24h';

function createToken(traderId, email) {
  return jwt.sign({ sub: String(traderId), email }, SECRET_KEY, { expiresIn: TOKEN_EXPIRY });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ detail: 'Password must be at least 8 characters.' });
    }

    const existing = db.prepare('SELECT id FROM traders WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ detail: 'Trader email address already registered. Please sign in instead.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO traders (email, hashed_password, cash_balance) VALUES (?, ?, 20000.00)'
    ).run(email.toLowerCase(), hashedPassword);

    const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(result.lastInsertRowid);
    const token = createToken(trader.id, trader.email);

    return res.status(201).json({
      access_token: token,
      token_type: 'bearer',
      trader_id: trader.id,
      email: trader.email,
      cash_balance: trader.cash_balance,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required.' });
    }

    const trader = db.prepare('SELECT * FROM traders WHERE email = ?').get(email.toLowerCase());
    if (!trader) {
      return res.status(401).json({ detail: 'Invalid email address or password credentials.' });
    }

    const valid = await bcrypt.compare(password, trader.hashed_password);
    if (!valid) {
      return res.status(401).json({ detail: 'Invalid email address or password credentials.' });
    }

    const token = createToken(trader.id, trader.email);
    return res.status(200).json({
      access_token: token,
      token_type: 'bearer',
      trader_id: trader.id,
      email: trader.email,
      cash_balance: trader.cash_balance,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  const trader = req.trader;
  const token = createToken(trader.id, trader.email);
  return res.json({
    access_token: token,
    token_type: 'bearer',
    trader_id: trader.id,
    email: trader.email,
    cash_balance: trader.cash_balance,
  });
});

module.exports = router;
