import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import Watchlist from './components/Watchlist';
import StockChart from './components/StockChart';
import OrderForm from './components/OrderForm';
import PortfolioLedger from './components/PortfolioLedger';
import AdminPanel from './components/AdminPanel';
import BreakingNewsModal from './components/BreakingNewsModal';
import NewsFeed from './components/NewsFeed';
import Leaderboard from './components/Leaderboard';

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
  // Token and Session Context
  const [token, setToken] = useState(localStorage.getItem('apex_jwt_token') || '');
  const [traderEmail, setTraderEmail] = useState(localStorage.getItem('apex_trader_email') || '');
  const [cashBalance, setCashBalance] = useState(parseFloat(localStorage.getItem('apex_cash_balance')) || 20000.00);

  // Routing State Machine: "trader-auth" | "dashboard" | "admin-auth" | "admin-panel"
  const [view, setView] = useState(() => (token ? 'dashboard' : 'trader-auth'));
  const [activeTab, setActiveTab] = useState('trading');
  const [rightPanelTab, setRightPanelTab] = useState('chart');

  // Controlled Auth State Inputs
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Market Engine State
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState('APEX');
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);

  const [newsModal, setNewsModal] = useState(null);
  const [newsArchive, setNewsArchive] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Sync BroadcastChannel and Market Loop
  useEffect(() => {
    const channel = new BroadcastChannel('apex_market_news');
    channel.onmessage = (event) => {
      if (event.data) {
        handleNewsReceived(event.data);
      }
    };

    const archived = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    setNewsArchive(archived);

    fetchStocks();
    if (token) fetchPortfolio();

    const timer = setInterval(runMarketSimulation, 3000);
    return () => {
      clearInterval(timer);
      channel.close();
    };
  }, [token]);

  const runMarketSimulation = () => {
    setStocks((prev) =>
      prev.map((s) => {
        const oldPrice = parseFloat(s.current_price);
        const noisePct = (Math.random() * 0.016 - 0.008);
        const newPrice = Math.max(0.50, Math.round(oldPrice * (1 + noisePct) * 100) / 100);
        const changePct = Math.round(((newPrice - oldPrice) / oldPrice) * 100 * 100) / 100;
        return { ...s, current_price: newPrice, change_percentage: changePct };
      })
    );
  };

  const fetchStocks = async () => {
    try {
      const resp = await fetch('/api/stocks');
      if (resp.ok) {
        const data = await resp.json();
        setStocks(data.map((s) => ({ ...s, change_percentage: (Math.random() * 2 - 1) })));
      }
    } catch (e) {}
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
    } catch (e) {}
  };

  // Strict API Handshaking & Authentication Submit Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = {
      email: emailInput.trim(),
      password: passwordInput,
    };

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data.access_token) {
        // Unlock State Machine & Transition to Dashboard
        setToken(data.access_token);
        setTraderEmail(data.email);
        setCashBalance(data.cash_balance);

        localStorage.setItem('apex_jwt_token', data.access_token);
        localStorage.setItem('apex_trader_email', data.email);
        localStorage.setItem('apex_cash_balance', data.cash_balance.toString());

        // Wipe sensitive controlled state inputs upon unlock
        setPasswordInput('');
        setUsernameInput('');
        setEmailInput('');

        setView('dashboard');
        showToast(`Authenticated as ${data.email}. Cash Balance: 20,000.00 IG`, 'success');
        return;
      }

      // Explicit Failure Handshake: Map Error Status to Local State & Lock Dashboard
      setPasswordInput('');
      if (resp.status === 409) {
        setAuthError('Trader account already registered. Please sign in instead.');
      } else if (resp.status === 401) {
        setAuthError('Invalid credentials. Password or email verification failed.');
      } else {
        setAuthError(data.detail || 'Authentication handshake rejected by server.');
      }
    } catch (err) {
      setPasswordInput('');
      setAuthError('Secure API Server offline. Unauthenticated access blocked.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Explicit Logout Handler: Wipes token, memory, and controlled state inputs
  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setTraderEmail('');
    setCashBalance(20000.00);
    setPortfolio([]);

    setUsernameInput('');
    setEmailInput('');
    setPasswordInput('');
    setAuthError('');

    setView('trader-auth');
    showToast('Logged out cleanly. State & session memory wiped.', 'info');
  };

  const handleTradeSuccess = (newCashBalance) => {
    setCashBalance(newCashBalance);
    localStorage.setItem('apex_cash_balance', newCashBalance.toString());
    fetchPortfolio();
  };

  const handleQuickSell = (ticker) => {
    setSelectedTicker(ticker);
    setActiveTab('trading');
    setRightPanelTab('order');
  };

  const handleNewsReceived = (newsPacket) => {
    setNewsModal(newsPacket);
    setNewsArchive((prev) => [newsPacket, ...prev]);

    const existing = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    localStorage.setItem('apex_news_archive', JSON.stringify([newsPacket, ...existing]));

    setTimeout(() => setNewsModal(null), 15000);
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const activeStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];

  // RENDER ROUTING STATE MACHINE: "trader-auth"
  if (view === 'trader-auth') {
    return (
      <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b0e14] via-[#151922] to-[#0b0e14]">
        <div class="w-full max-w-md bg-[#151922] border border-[#232936] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#2962ff]/20 rounded-full blur-3xl"></div>

          <div class="text-center mb-8">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2962ff] to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#2962ff]/30">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <h1 class="text-2xl font-extrabold text-white tracking-wide">IGNITE EXCHANGE</h1>
            <p class="text-xs text-gray-400 mt-1">Institutional Virtual Stock Market Terminal</p>
          </div>

          <div class="flex items-center p-1 bg-[#0b0e14] rounded-2xl border border-[#232936] mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              class={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'login'
                  ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              class={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === 'register'
                  ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} class="space-y-4">
            {authMode === 'register' && (
              <div>
                <label class="text-xs font-semibold text-gray-400 block mb-1.5">Username Handle</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="trader_pro"
                  class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
                />
              </div>
            )}

            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-1.5">Trader Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="trader@domain.com"
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
              />
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
              />
            </div>

            {authMode === 'register' && (
              <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                🎁 New trader accounts automatically receive <strong>20,000.00 IG</strong> starting cash balance!
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              class="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#2962ff] to-indigo-600 text-white shadow-xl shadow-[#2962ff]/20 hover:opacity-95 transition-all mt-2"
            >
              {authLoading ? 'Authenticating...' : authMode === 'register' ? 'Create Account & Get 20,000 IG' : 'Sign In to Terminal'}
            </button>
          </form>

          {/* Utility Access to Admin Authentication Gate */}
          <div class="mt-6 pt-4 border-t border-[#232936] text-center">
            <button
              onClick={() => setView('admin-panel')}
              class="text-[11px] text-gray-500 hover:text-rose-400 transition-colors font-mono"
            >
              ⚡ Access Admin Identity Console
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER MAIN APPLICATION ROUTING STATES: "dashboard" | "admin-panel"
  return (
    <div class="min-h-screen flex flex-col bg-[#0b0e14]">
      {/* Floating News Alert */}
      <BreakingNewsModal news={newsModal} onClose={() => setNewsModal(null)} />

      {/* Navbar */}
      <Navbar
        traderEmail={traderEmail}
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        isConnected={isConnected}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'admin') {
            setView('admin-panel');
          } else {
            setView('dashboard');
            setActiveTab(tab);
          }
        }}
        onLogout={handleLogout}
      />

      {/* Main Content View Switcher */}
      <main class="flex-1 max-w-[1920px] w-full mx-auto p-4 md:p-6">
        {view === 'admin-panel' ? (
          <div class="space-y-4">
            <div class="flex items-center justify-between bg-[#151922] p-4 rounded-2xl border border-[#232936]">
              <span class="text-xs text-gray-400 font-mono">Viewing Mode: Admin Identity Gate</span>
              <button
                onClick={() => setView('dashboard')}
                class="px-3 py-1 rounded-lg bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/30 text-xs font-bold hover:bg-[#2962ff] hover:text-white transition-all"
              >
                ← Return to Trader Dashboard
              </button>
            </div>
            <AdminPanel
              showToast={showToast}
              onNewsDispatched={handleNewsReceived}
            />
          </div>
        ) : (
          <>
            {activeTab === 'trading' && (
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (7 cols): Watchlist & News Archive */}
                <div class="lg:col-span-7 flex flex-col gap-6">
                  <Watchlist
                    stocks={stocks}
                    selectedTicker={selectedTicker}
                    onSelectStock={setSelectedTicker}
                  />
                  <NewsFeed archive={newsArchive} />
                </div>

                {/* Right Column (5 cols): Analytics & Execution */}
                <div class="lg:col-span-5 flex flex-col gap-6">
                  {/* Selected Stock Header */}
                  <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl bg-[#2962ff]/10 text-[#2962ff] font-black text-lg flex items-center justify-center border border-[#2962ff]/20">
                        {activeStock ? activeStock.ticker : 'APEX'}
                      </div>
                      <div>
                        <h3 class="text-lg font-bold text-white">{activeStock ? activeStock.name : 'Apex Dynamics Corp'}</h3>
                        <p class="text-xs text-gray-400 font-mono">{activeStock ? activeStock.ticker : 'APEX'} / IG</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-xl font-bold font-mono text-white">
                        {activeStock ? parseFloat(activeStock.current_price).toFixed(2) : '0.00'} IG
                      </div>
                      <div class={`text-xs font-semibold ${activeStock?.change_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeStock?.change_percentage >= 0 ? '+' : ''}{activeStock?.change_percentage ? activeStock.change_percentage.toFixed(2) : '0.00'}%
                      </div>
                    </div>
                  </div>

                  {/* Tabs Container */}
                  <div class="flex-1 bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex flex-col">
                    <div class="flex items-center gap-2 p-1 bg-[#0b0e14] rounded-xl border border-[#232936] mb-5">
                      <button
                        onClick={() => setRightPanelTab('chart')}
                        class={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          rightPanelTab === 'chart'
                            ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        📈 Chart & Analytics
                      </button>
                      <button
                        onClick={() => setRightPanelTab('order')}
                        class={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          rightPanelTab === 'order'
                            ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ⚡ Execute Order
                      </button>
                    </div>

                    {rightPanelTab === 'chart' ? (
                      <StockChart
                        ticker={activeStock ? activeStock.ticker : 'APEX'}
                        currentPrice={activeStock ? activeStock.current_price : 5.0}
                      />
                    ) : (
                      <OrderForm
                        stock={activeStock}
                        cashBalance={cashBalance}
                        portfolio={portfolio}
                        onTradeSuccess={handleTradeSuccess}
                        showToast={showToast}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <PortfolioLedger
                cashBalance={cashBalance}
                onQuickSell={handleQuickSell}
                showToast={showToast}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard />
            )}
          </>
        )}
      </main>

      {/* Toast Notifications */}
      <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            class={`px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 text-white ${
              t.type === 'success'
                ? 'bg-emerald-500'
                : t.type === 'error'
                ? 'bg-rose-500'
                : 'bg-[#2962ff]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
