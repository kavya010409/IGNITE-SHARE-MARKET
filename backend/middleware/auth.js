const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET_KEY = process.env.SECRET_KEY || 'super-secret-key-change-in-production-123456789';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or malformed Authorization Bearer token header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const trader = db.prepare('SELECT * FROM traders WHERE id = ?').get(parseInt(payload.sub));
    if (!trader) {
      return res.status(404).json({ detail: 'Trader account not found.' });
    }
    req.trader = trader;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired JWT token credentials.' });
  }
}

module.exports = authMiddleware;
