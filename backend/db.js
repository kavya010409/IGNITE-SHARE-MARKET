const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'virtual_trading.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema Creation ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS traders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT    NOT NULL UNIQUE,
    hashed_password TEXT    NOT NULL,
    cash_balance    REAL    NOT NULL DEFAULT 20000.00,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker        TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    current_price REAL    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id      INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    closing_price REAL    NOT NULL,
    recorded_at   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id        INTEGER NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    stock_id         INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    quantity         INTEGER NOT NULL DEFAULT 0,
    average_buy_price REAL   NOT NULL DEFAULT 0.0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(trader_id, stock_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trader_id       INTEGER NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    stock_id        INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    order_type      TEXT    NOT NULL,
    quantity        INTEGER NOT NULL,
    price_per_share REAL    NOT NULL,
    total_amount    REAL    NOT NULL,
    executed_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS news_logs (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id             INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
    headline             TEXT    NOT NULL,
    content              TEXT    NOT NULL DEFAULT '',
    sentiment_multiplier REAL    NOT NULL DEFAULT 1.0,
    impact_applied       INTEGER NOT NULL DEFAULT 0,
    is_active            INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at           TEXT
  );
`);

// ─── Seed Data ───────────────────────────────────────────────────────────────

const STOCKS = [
  ['APEX', 'Apex Dynamics Corp', 4.50],
  ['CRPT', 'Cryptonix Global Systems', 5.20],
  ['METV', 'Metaverse Vision Ltd', 3.80],
  ['ROBO', 'Robotech Automations', 6.10],
  ['NVRA', 'Nova Era Technologies', 7.40],
  ['HYDR', 'HydroClean Energy', 2.90],
  ['VRTX', 'Vortex Aerospace', 5.50],
  ['QNTM', 'Quantum Computing Labs', 6.80],
  ['PLSM', 'Plasma Medical Devices', 4.10],
  ['ORBT', 'Orbital Satellite Networks', 3.40],
  ['STRM', 'StreamFlow Cloud Services', 7.90],
  ['AERO', 'Aerovault Logistics', 4.70],
  ['SOLR', 'Solaria Power Group', 5.00],
  ['CELL', 'CelluGen BioLabs', 6.30],
  ['DATA', 'DataSphere Analytics', 3.60],
  ['CYBR', 'CyberFort Defense Systems', 7.10],
  ['GENM', 'Genomix Research Inc', 2.50],
  ['PHOX', 'Phox Photonics Corp', 4.30],
  ['NANO', 'NanoScale Innovations', 5.80],
  ['AURA', 'Aura Spatial Tech', 3.20],
  ['TITN', 'Titan Heavy Machinery', 6.50],
  ['SYNX', 'Synapse Neural Networks', 7.70],
  ['ZEUS', 'Zeus Energy Grids', 4.90],
  ['LUNA', 'Lunar Mining Resources', 3.10],
  ['EDGE', 'Edge Compute Infrastructure', 5.40],
  ['FUSE', 'Fusion Nuclear Labs', 6.70],
  ['FLUX', 'Flux Power Dynamics', 4.20],
  ['HELI', 'Helios Solar Tech', 5.90],
  ['ECHO', 'Echo Media Streaming', 3.70],
  ['VIRT', 'Virtualis Gaming Interactive', 6.00],
];

function seedStocks() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM stocks').get();
  if (existing.count > 0) {
    console.log('✅ Stocks already seeded. Skipping.');
    return;
  }

  console.log('🌱 Seeding 30 stocks with 30-day price history...');
  const insertStock = db.prepare(
    'INSERT INTO stocks (ticker, name, current_price) VALUES (?, ?, ?)'
  );
  const insertHistory = db.prepare(
    'INSERT INTO stock_history (stock_id, closing_price, recorded_at) VALUES (?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    for (const [ticker, name, basePrice] of STOCKS) {
      const result = insertStock.run(ticker, name, basePrice);
      const stockId = result.lastInsertRowid;

      // Generate 30 days of historical price data
      let price = basePrice;
      for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const recordedAt = date.toISOString();
        insertHistory.run(stockId, Math.round(price * 100) / 100, recordedAt);
        price = Math.max(0.5, price * (1 + (Math.random() * 0.06 - 0.03)));
      }
    }
  });

  seedAll();
  console.log('✅ Seeded 30 stocks with 900 historical price points.');
}

seedStocks();

module.exports = db;
