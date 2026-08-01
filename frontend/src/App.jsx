import React, { useEffect, useRef, useState } from 'react';
import Watchlist from './components/Watchlist';
import StockChart from './components/StockChart';
import OrderForm from './components/OrderForm';
import PortfolioLedger from './components/PortfolioLedger';
import BreakingNewsModal from './components/BreakingNewsModal';
import NewsFeed from './components/NewsFeed';
import Leaderboard from './components/Leaderboard';

// Admin is a completely separate page — /ignite-ctrl-9k2m.html
const ADMIN_PAGE = '/ignite-ctrl-9k2m.html';

const INITIAL_STOCKS = [
  { ticker: 'APEX', name: 'Apex Dynamics Corp', current_price: 4.50, change_percentage: 0.76 },
  { ticker: 'CRPT', name: 'Cryptonix Global Systems', current_price: 5.20, change_percentage: 0.00 },
  { ticker: 'METV', name: 'Metaverse Vision Ltd', current_price: 3.80, change_percentage: -0.58 },
  { ticker: 'ROBO', name: 'Robotech Automations', current_price: 6.10, change_percentage: 0.68 },
  { ticker: 'NVRA', name: 'Nova Era Technologies', current_price: 7.40, change_percentage: 0.15 },
  { ticker: 'HYDR', name: 'HydroClean Energy', current_price: 2.90, change_percentage: 0.63 },
  { ticker: 'VRTX', name: 'Vortex Aerospace', current_price: 5.50, change_percentage: -0.82 },
  { ticker: 'QNTM', name: 'Quantum Computing Labs', current_price: 6.80, change_percentage: 1.20 },
  { ticker: 'PLSM', name: 'Plasma Medical Devices', current_price: 4.10, change_percentage: -0.30 },
  { ticker: 'ORBT', name: 'Orbital Satellite Networks', current_price: 3.40, change_percentage: 0.45 },
  { ticker: 'STRM', name: 'StreamFlow Cloud Services', current_price: 7.90, change_percentage: 0.88 },
  { ticker: 'AERO', name: 'Aerovault Logistics', current_price: 4.70, change_percentage: -0.15 },
  { ticker: 'SOLR', name: 'Solaria Power Group', current_price: 5.00, change_percentage: 0.50 },
  { ticker: 'CELL', name: 'CelluGen BioLabs', current_price: 6.30, change_percentage: -0.40 },
  { ticker: 'DATA', name: 'DataSphere Analytics', current_price: 3.60, change_percentage: 0.30 },
  { ticker: 'CYBR', name: 'CyberFort Defense Systems', current_price: 7.10, change_percentage: 1.10 },
  { ticker: 'GENM', name: 'Genomix Research Inc', current_price: 2.50, change_percentage: -0.90 },
  { ticker: 'PHOX', name: 'Phox Photonics Corp', current_price: 4.30, change_percentage: 0.25 },
  { ticker: 'NANO', name: 'NanoScale Innovations', current_price: 5.80, change_percentage: 0.70 },
  { ticker: 'AURA', name: 'Aura Spatial Tech', current_price: 3.20, change_percentage: -0.20 },
  { ticker: 'TITN', name: 'Titan Heavy Machinery', current_price: 6.50, change_percentage: 0.40 },
  { ticker: 'SYNX', name: 'Synapse Neural Networks', current_price: 7.70, change_percentage: 1.50 },
  { ticker: 'ZEUS', name: 'Zeus Energy Grids', current_price: 4.90, change_percentage: -0.35 },
  { ticker: 'LUNA', name: 'Lunar Mining Resources', current_price: 3.10, change_percentage: 0.10 },
  { ticker: 'EDGE', name: 'Edge Compute Infrastructure', current_price: 5.40, change_percentage: 0.65 },
  { ticker: 'FUSE', name: 'Fusion Nuclear Labs', current_price: 6.70, change_percentage: -1.25 },
  { ticker: 'FLUX', name: 'Flux Power Dynamics', current_price: 4.20, change_percentage: 0.35 },
  { ticker: 'HELI', name: 'Helios Solar Tech', current_price: 5.90, change_percentage: 0.80 },
  { ticker: 'ECHO', name: 'Echo Media Streaming', current_price: 3.70, change_percentage: -0.45 },
  { ticker: 'VIRT', name: 'Virtualis Gaming Interactive', current_price: 6.00, change_percentage: 0.95 },
];

export default function App() {
  // ── Auth State ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState(localStorage.getItem('apex_jwt_token') || '');
  const [traderEmail, setTraderEmail] = useState(localStorage.getItem('apex_trader_email') || '');
  const [cashBalance, setCashBalance] = useState(parseFloat(localStorage.getItem('apex_cash_balance')) || 20000.00);
  const [view, setView] = useState(() => (token ? 'dashboard' : 'trader-auth'));
  const [activeTab, setActiveTab] = useState('trading');
  const [rightPanelTab, setRightPanelTab] = useState('chart');

  // ── Auth Form State ────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Market State ───────────────────────────────────────────────────────────
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState('APEX');
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // ── News & Toasts ──────────────────────────────────────────────────────────
  const [newsModal, setNewsModal] = useState(null);
  const [newsArchive, setNewsArchive] = useState([]);
  const [toasts, setToasts] = useState([]);

  // ── WebSocket Ref ──────────────────────────────────────────────────────────
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // ── WebSocket: connect to live market feed ─────────────────────────────────
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/api/ws/watchlist`;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('🟢 WebSocket connected to live market feed.');
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Live market tick — update all stock prices
          if (msg.event === 'market_tick' && Array.isArray(msg.data)) {
            setStocks(prev => {
              const map = {};
              prev.forEach(s => { map[s.ticker] = s; });
              msg.data.forEach(tick => {
                if (map[tick.ticker]) {
                  map[tick.ticker] = {
                    ...map[tick.ticker],
                    current_price: tick.current_price,
                    change_percentage: tick.change_percentage,
                  };
                }
              });
              return Object.values(map);
            });
          }

          // Breaking news event from admin
          if (msg.event === 'news_flash') {
            handleNewsReceived({
              headline: msg.headline,
              target: msg.stock_ticker || 'GLOBAL',
              sentiment_multiplier: msg.sentiment_multiplier,
              created_at: msg.created_at,
            });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('🔴 WebSocket disconnected. Reconnecting in 3s...');
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // ── Initial data + portfolio load ──────────────────────────────────────────
  useEffect(() => {
    fetchStocks();
    if (token) fetchPortfolio();
    const archived = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    setNewsArchive(archived);
  }, [token]);

  const fetchStocks = async () => {
    try {
      const resp = await fetch('/api/stocks');
      if (resp.ok) {
        const data = await resp.json();
        setStocks(data.map(s => ({ ...s, change_percentage: 0 })));
      }
    } catch (_) {}
  };

  const fetchPortfolio = async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/trade/portfolio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setPortfolio(data);
        const val = data.reduce((sum, item) => sum + item.current_value, 0);
        setPortfolioValue(val);
      }
    } catch (_) {}
  };

  // ── Auth Submit ────────────────────────────────────────────────────────────
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    // ── Admin shortcut: verify then hard-navigate to separate admin page ────────
    try {
      const adminResp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (adminResp.ok) {
        setPasswordInput('');
        setEmailInput('');
        setAuthLoading(false);
        // Store creds briefly so admin page can auto-login
        sessionStorage.setItem('ignite_admin_session', password);
        window.location.href = ADMIN_PAGE;
        return;
      }
    } catch (_) { /* not admin — continue to trader auth */ }

    // ── Normal trader auth ────────────────────────────────────────────────────
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.access_token) {
        setToken(data.access_token);
        setTraderEmail(data.email);
        setCashBalance(data.cash_balance);
        localStorage.setItem('apex_jwt_token', data.access_token);
        localStorage.setItem('apex_trader_email', data.email);
        localStorage.setItem('apex_cash_balance', data.cash_balance.toString());
        setPasswordInput('');
        setEmailInput('');
        setView('dashboard');
        showToast(`Welcome back! Cash Balance: ${data.cash_balance.toLocaleString()} IG`, 'success');
        return;
      }
      setPasswordInput('');
      if (resp.status === 409) setAuthError('Email already registered. Please sign in.');
      else if (resp.status === 401) setAuthError('Invalid email or password.');
      else setAuthError(data.detail || 'Authentication failed. Try again.');
    } catch (_) {
      setPasswordInput('');
      setAuthError('Server offline. Please try again shortly.');
    } finally {
      setAuthLoading(false);
    }
  };


  const handleLogout = () => {
    localStorage.clear();
    setToken(''); setTraderEmail(''); setCashBalance(20000); setPortfolio([]);
    setEmailInput(''); setPasswordInput(''); setAuthError('');
    setView('trader-auth');
    showToast('Signed out successfully.', 'info');
  };

  const handleTradeSuccess = (newCash) => {
    setCashBalance(newCash);
    localStorage.setItem('apex_cash_balance', newCash.toString());
    fetchPortfolio();
  };

  const handleNewsReceived = (newsPacket) => {
    setNewsModal(newsPacket);
    setNewsArchive(prev => [newsPacket, ...prev]);
    const existing = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    localStorage.setItem('apex_news_archive', JSON.stringify([newsPacket, ...existing]));
    setTimeout(() => setNewsModal(null), 15000);
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const activeStock = stocks.find(s => s.ticker === selectedTicker) || stocks[0];


  // ── Hidden Admin Access ────────────────────────────────────────────────────
  const [logoClickCount, setLogoClickCount] = useState(0);
  const logoClickTimer = useRef(null);

  const handleLogoClick = () => {
    // Triple-click on logo = go to admin page silently
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    if (newCount >= 3) {
      setLogoClickCount(0);
      sessionStorage.setItem('ignite_admin_session', '');
      window.location.href = ADMIN_PAGE;
      return;
    }
    logoClickTimer.current = setTimeout(() => setLogoClickCount(0), 800);
  };

  // Ctrl+Shift+A shortcut — only active on login screen
  useEffect(() => {
    if (view !== 'trader-auth') return;
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        window.location.href = ADMIN_PAGE;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  // ── Render: Auth Screen ────────────────────────────────────────────────────
  if (view === 'trader-auth') {
    return (
      <div class="min-h-screen flex items-center justify-center p-4 bg-[#0b0e14]">
        <div class="w-full max-w-sm bg-[#151922] border border-[#232936] rounded-2xl p-8 shadow-2xl">
          {/* Logo — triple-click = hidden admin access */}
          <div class="text-center mb-7">
            <div
              class="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2962ff] to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#2962ff]/30 cursor-pointer select-none"
              onClick={handleLogoClick}
            >
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 class="text-xl font-extrabold text-white tracking-wide">IGNITE EXCHANGE</h1>
            <p class="text-xs text-gray-500 mt-1">Virtual Stock Market Terminal</p>
          </div>

          {/* Tab Switch */}
          <div class="flex items-center bg-[#0b0e14] rounded-xl border border-[#232936] p-1 mb-5">
            <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
              class={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'login' ? 'bg-[#151922] text-white border border-[#232936]' : 'text-gray-500 hover:text-white'}`}>
              Sign In
            </button>
            <button onClick={() => { setAuthMode('register'); setAuthError(''); }}
              class={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'register' ? 'bg-[#151922] text-white border border-[#232936]' : 'text-gray-500 hover:text-white'}`}>
              Register
            </button>
          </div>

          {/* Error */}
          {authError && (
            <div class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              ⚠ {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} class="space-y-3">
            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-1.5">Email Address</label>
              <input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)}
                placeholder="trader@example.com"
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#2962ff] transition-colors" />
            </div>
            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-1.5">Password</label>
              <input type="password" required minLength={authMode === 'register' ? 8 : 1} value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-[#2962ff] transition-colors" />
            </div>

            {authMode === 'register' && (
              <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                🎁 New accounts start with <strong>20,000 IG</strong> cash balance!
              </div>
            )}

            <button type="submit" disabled={authLoading}
              class="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#2962ff] to-indigo-600 text-white shadow-lg shadow-[#2962ff]/20 hover:opacity-95 transition-all mt-1">
              {authLoading ? 'Authenticating...' : authMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: Main Dashboard ─────────────────────────────────────────────────
  return (
    <div class="min-h-screen flex flex-col bg-[#0b0e14]">
      <BreakingNewsModal news={newsModal} onClose={() => setNewsModal(null)} />

      {/* Navbar */}
      <header class="bg-[#151922] border-b border-[#232936] px-5 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2962ff] to-indigo-500 flex items-center justify-center shadow-md shadow-[#2962ff]/20">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-extrabold tracking-wider text-white">IGNITE</h1>
            <p class="text-[10px] text-gray-500">Virtual Exchange</p>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav class="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#232936]">
          {[['trading', '📈 Trading'], ['portfolio', '💼 Portfolio'], ['leaderboard', '🏆 Leaderboard']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              class={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-[#151922] text-white border border-[#232936]' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div class="flex items-center gap-3">
          {/* Live Status */}
          <div class="flex items-center gap-1.5 bg-[#0b0e14] px-3 py-1.5 rounded-full border border-[#232936]">
            <span class={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : 'bg-yellow-500 animate-pulse'}`} />
            <span class="text-[11px] font-semibold text-gray-300">{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Balances */}
          <div class="flex items-center gap-3 bg-[#0b0e14] border border-[#232936] px-3.5 py-1.5 rounded-xl">
            <div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wide">Cash</div>
              <div class="text-sm font-bold text-white font-mono">{parseFloat(cashBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span class="text-[10px] text-emerald-400">IG</span></div>
            </div>
            <div class="h-5 w-px bg-[#232936]" />
            <div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wide">Net Worth</div>
              <div class="text-sm font-bold text-emerald-400 font-mono">{(parseFloat(cashBalance) + portfolioValue).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span class="text-[10px] text-gray-400">IG</span></div>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} title="Sign Out"
            class="p-2 rounded-xl bg-[#0b0e14] border border-[#232936] text-gray-400 hover:text-rose-400 hover:border-rose-500/30 transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main class="flex-1 max-w-[1920px] w-full mx-auto p-4 md:p-5">
        {activeTab === 'trading' && (
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Watchlist + News */}
            <div class="lg:col-span-7 flex flex-col gap-5">
              <Watchlist stocks={stocks} selectedTicker={selectedTicker} onSelectStock={setSelectedTicker} isConnected={isConnected} />
              <NewsFeed archive={newsArchive} />
            </div>

            {/* Right: Chart + Order */}
            <div class="lg:col-span-5 flex flex-col gap-5">
              {/* Stock Header */}
              <div class="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-[#2962ff]/10 text-[#2962ff] font-black text-sm flex items-center justify-center border border-[#2962ff]/20">
                    {activeStock?.ticker}
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-white">{activeStock?.name}</h3>
                    <p class="text-[10px] text-gray-400 font-mono">{activeStock?.ticker} / IG</p>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold font-mono text-white">{parseFloat(activeStock?.current_price || 0).toFixed(2)} IG</div>
                  <div class={`text-xs font-semibold ${(activeStock?.change_percentage || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(activeStock?.change_percentage || 0) >= 0 ? '▲ +' : '▼ '}{(activeStock?.change_percentage || 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Chart / Order Tabs */}
              <div class="bg-[#151922] border border-[#232936] rounded-2xl p-4 flex flex-col flex-1">
                <div class="flex items-center gap-1 bg-[#0b0e14] p-1 rounded-xl border border-[#232936] mb-4">
                  <button onClick={() => setRightPanelTab('chart')}
                    class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${rightPanelTab === 'chart' ? 'bg-[#151922] text-white border border-[#232936]' : 'text-gray-400 hover:text-white'}`}>
                    📈 Chart
                  </button>
                  <button onClick={() => setRightPanelTab('order')}
                    class={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${rightPanelTab === 'order' ? 'bg-[#151922] text-white border border-[#232936]' : 'text-gray-400 hover:text-white'}`}>
                    ⚡ Trade
                  </button>
                </div>

                {rightPanelTab === 'chart' ? (
                  <StockChart ticker={activeStock?.ticker || 'APEX'} currentPrice={activeStock?.current_price || 5} livePrice={activeStock?.current_price} />
                ) : (
                  <OrderForm stock={activeStock} cashBalance={cashBalance} portfolio={portfolio} onTradeSuccess={handleTradeSuccess} showToast={showToast} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioLedger cashBalance={cashBalance} onQuickSell={(ticker) => { setSelectedTicker(ticker); setActiveTab('trading'); setRightPanelTab('order'); }} showToast={showToast} />
        )}

        {activeTab === 'leaderboard' && <Leaderboard />}
      </main>

      {/* Toasts */}
      <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} class={`px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold text-white ${
            t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-rose-500' : 'bg-[#2962ff]'
          }`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}
