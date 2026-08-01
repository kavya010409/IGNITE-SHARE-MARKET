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
  { ticker: 'CELL', `CelluGen BioLabs`, current_price: 6.30, change_percentage: -0.40 },
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
  const [token, setToken] = useState(localStorage.getItem('apex_jwt_token') || '');
  const [traderEmail, setTraderEmail] = useState(localStorage.getItem('apex_trader_email') || 'trader@example.com');
  const [cashBalance, setCashBalance] = useState(parseFloat(localStorage.getItem('apex_cash_balance')) || 20000.00);
  
  const [activeTab, setActiveTab] = useState('trading');
  const [rightPanelTab, setRightPanelTab] = useState('chart');
  
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState('APEX');
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioValue, setPortfolioValue] = useState(0);

  const [newsModal, setNewsModal] = useState(null);
  const [newsArchive, setNewsArchive] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Broadcast Channel setup
  useEffect(() => {
    const channel = new BroadcastChannel('apex_market_news');
    channel.onmessage = (event) => {
      if (event.data) {
        handleNewsReceived(event.data);
      }
    };

    const archived = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    setNewsArchive(archived);

    // Initial stocks & portfolio fetch
    fetchStocks();
    if (token) fetchPortfolio();

    // 3-Second simulation ticker
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
    if (!token || token.startsWith('demo_')) return;
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

  const handleLoginSuccess = (authToken, email, balance) => {
    setToken(authToken);
    setTraderEmail(email);
    setCashBalance(balance);
    localStorage.setItem('apex_jwt_token', authToken);
    localStorage.setItem('apex_trader_email', email);
    localStorage.setItem('apex_cash_balance', balance.toString());
    showToast(`Authenticated as ${email}. Cash Balance: 20,000.00 IG`, 'success');
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken('');
    setTraderEmail('');
    setCashBalance(20000.00);
    setPortfolio([]);
    showToast('Logged out cleanly. Session cleared.', 'info');
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

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const activeStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];

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
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Content Areas */}
      <main class="flex-1 max-w-[1920px] w-full mx-auto p-4 md:p-6">
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

        {activeTab === 'admin' && (
          <AdminPanel
            showToast={showToast}
            onNewsDispatched={handleNewsReceived}
          />
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
