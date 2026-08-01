require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

// ─── Initialize DB (runs schema + seed) ──────────────────────────────────────
require('./db');

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stocks');
const tradeRoutes = require('./routes/trade');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');

// ─── Market Simulator ────────────────────────────────────────────────────────
const { startMarketSimulator, setWebSocketServer } = require('./marketSimulator');

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'IGNITE VIRTUAL STOCK EXCHANGE',
    version: '2.0.0',
    runtime: 'Node.js/Express',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ detail: `Route ${req.method} ${req.path} not found.` });
});

// ─── Create HTTP + WebSocket Server ──────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws/watchlist' });

wss.on('connection', (ws) => {
  console.log(`🟢 WebSocket client connected. Active: ${wss.clients.size}`);
  ws.on('close', () => {
    console.log(`🔴 WebSocket client disconnected. Active: ${wss.clients.size}`);
  });
  ws.on('error', () => {});
});

// Inject WebSocket server into market simulator
setWebSocketServer(wss);

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🚀 IGNITE Virtual Stock Exchange Backend       ║');
  console.log('║   Runtime  : Node.js / Express                   ║');
  console.log(`║   Port     : ${PORT}                                ║`);
  console.log(`║   Health   : http://localhost:${PORT}/health          ║`);
  console.log(`║   API Docs : http://localhost:${PORT}/api             ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Start the 15-second market simulator
  startMarketSimulator();
});
