import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

export default function TraderDashboard({ token, traderEmail, cashBalance, onTradeSuccess, showToast }) {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selectedTicker, setSelectedTicker] = useState('APEX');
  const [priceFlashMap, setPriceFlashMap] = useState({});
  const [chartData, setChartData] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  
  // Trade Order Form State
  const [tradeType, setTradeType] = useState('buy');
  const [tradeQuantity, setTradeQuantity] = useState(10);
  const [tradeLoading, setTradeLoading] = useState(false);

  // Real-Time News State
  const [newsAlert, setNewsAlert] = useState(null);
  const [newsLogs, setNewsLogs] = useState([]);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);

  const wsRef = useRef(null);

  // 1. Persistent WebSocket Connection & Price Tickers
  useEffect(() => {
    fetchStocks();
    fetchPortfolio();
    fetchLeaderboard();

    // 30-Second Leaderboard Poll Loop
    const lbInterval = setInterval(fetchLeaderboard, 30000);

    // WebSocket Stream Connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/ticks`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'news') {
            handleNewsPayload(payload);
          } else if (payload.ticker || payload.stocks) {
            handleStockTicks(payload);
          }
        } catch (e) {}
      };
    } catch (err) {}

    // 3-Second Local Fallback Ticker for smooth price movement
    const simInterval = setInterval(runSimulationTick, 3000);

    return () => {
      clearInterval(lbInterval);
      clearInterval(simInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  // Load 1-Month Analytics Chart whenever selected ticker changes
  useEffect(() => {
    fetchStockAnalytics(selectedTicker);
  }, [selectedTicker]);

  const runSimulationTick = () => {
    setStocks((prev) =>
      prev.map((s) => {
        const oldPrice = parseFloat(s.current_price);
        const noisePct = (Math.random() * 0.016 - 0.008);
        const newPrice = Math.max(0.50, Math.round(oldPrice * (1 + noisePct) * 100) / 100);
        const changePct = Math.round(((newPrice - oldPrice) / oldPrice) * 100 * 100) / 100;

        if (newPrice !== oldPrice) {
          triggerFlash(s.ticker, newPrice > oldPrice ? 'up' : 'down');
        }

        return { ...s, current_price: newPrice, change_percentage: changePct };
      })
    );
  };

  const triggerFlash = (ticker, direction) => {
    setPriceFlashMap((prev) => ({ ...prev, [ticker]: direction }));
    setTimeout(() => {
      setPriceFlashMap((prev) => ({ ...prev, [ticker]: null }));
    }, 600);
  };

  const handleStockTicks = (payload) => {
    if (payload.ticker && payload.price) {
      setStocks((prev) =>
        prev.map((s) => {
          if (s.ticker === payload.ticker) {
            const oldPrice = s.current_price;
            const newPrice = payload.price;
            if (newPrice !== oldPrice) triggerFlash(s.ticker, newPrice > oldPrice ? 'up' : 'down');
            return { ...s, current_price: newPrice };
          }
          return s;
        })
      );
    }
  };

  const handleNewsPayload = (news) => {
    setNewsAlert(news);
    setNewsLogs((prev) => [news, ...prev]);
    setTimeout(() => setNewsAlert(null), 15000);
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
      }
    } catch (e) {}
  };

  const fetchLeaderboard = async () => {
    try {
      const resp = await fetch('/api/leaderboard');
      if (resp.ok) {
        const data = await resp.json();
        setLeaderboard(data);
      }
    } catch (e) {}
  };

  const fetchStockAnalytics = async (ticker) => {
    try {
      const resp = await fetch(`/api/stocks/${ticker}/analytics`);
      if (resp.ok) {
        const data = await resp.json();
        const labels = data.history.map((h) => new Date(h.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }));
        const prices = data.history.map((h) => h.closing_price);

        setChartData({
          labels,
          datasets: [
            {
              label: `${ticker} Price (30-Day History)`,
              data: prices,
              borderColor: '#2962ff',
              backgroundColor: 'rgba(41, 98, 255, 0.1)',
              fill: true,
              tension: 0.3,
            },
          ],
        });
        return;
      }
    } catch (e) {}

    // Fallback Chart Data
    const dummyDays = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    const activeS = stocks.find((s) => s.ticker === ticker) || stocks[0];
    const baseP = activeS.current_price;
    const dummyPrices = dummyDays.map(() => (baseP * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2));

    setChartData({
      labels: dummyDays,
      datasets: [
        {
          label: `${ticker} 30-Day Analytics`,
          data: dummyPrices,
          borderColor: '#2962ff',
          backgroundColor: 'rgba(41, 98, 255, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    });
  };

  // 3. Atomic Trade Execution Handshake
  const handleExecuteTrade = async (e) => {
    e.preventDefault();
    if (!token) {
      showToast('Authentication required to place trades.', 'error');
      return;
    }

    const activeStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
    const qty = parseInt(tradeQuantity, 10);

    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid positive share quantity.', 'error');
      return;
    }

    setTradeLoading(true);
    const endpoint = tradeType === 'buy' ? '/api/trade/buy' : '/api/trade/sell';

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock_id: activeStock.id || 1,
          stock_ticker: activeStock.ticker,
          quantity: qty,
          price: activeStock.current_price,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok) {
        showToast(
          `Success: ${tradeType.toUpperCase()} ${qty} shares of ${activeStock.ticker} at ${activeStock.current_price} IG`,
          'success'
        );
        onTradeSuccess(data.new_cash_balance);
        fetchPortfolio();
        fetchLeaderboard();
      } else {
        showToast(data.detail || `Trade failed. Check balance and position limits.`, 'error');
      }
    } catch (err) {
      showToast('Network error submitting trade order.', 'error');
    } finally {
      setTradeLoading(false);
    }
  };

  const activeStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  const ownedPosition = portfolio.find((p) => p.ticker === selectedTicker);
  const sharesOwned = ownedPosition ? ownedPosition.quantity : 0;
  const totalCost = (tradeQuantity * activeStock.current_price).toFixed(2);

  return (
    <div class="space-y-6">
      {/* 2. Breaking News Banner Alert Popup */}
      {newsAlert && (
        <div class="bg-rose-950/90 border-2 border-rose-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between animate-pulse">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-full bg-rose-600 font-extrabold text-[10px] uppercase tracking-wider">
              🚨 BREAKING NEWS SHOCK
            </span>
            <div>
              <h4 class="font-extrabold text-xs">
                [{newsAlert.stock_ticker || newsAlert.target || 'GLOBAL'}] {newsAlert.headline}
              </h4>
              <p class="text-[10px] text-rose-300 font-mono">
                Impact Multiplier: {newsAlert.sentiment_multiplier}x Volatility | 2-Minute Market Alignment Active
              </p>
            </div>
          </div>
          <button onClick={() => setNewsAlert(null)} class="text-rose-300 hover:text-white font-bold text-sm px-2">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid Dashboard System */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Watchlist & News Feed Logs */}
        <div class="lg:col-span-7 space-y-6">
          {/* Watchlist Container */}
          <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-[#232936] mb-4">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span>Real-Time Market Watchlist</span>
                <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Live 15s Tickers
                </span>
              </h3>
              <span class="text-xs text-gray-400 font-mono">30 Equities Listed</span>
            </div>

            <div class="overflow-x-auto max-h-[420px] overflow-y-auto pr-1">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-[#0b0e14]/60 text-gray-400 uppercase font-semibold sticky top-0 backdrop-blur-md">
                  <tr>
                    <th class="py-3 px-4 rounded-l-lg">Ticker</th>
                    <th class="py-3 px-4">Company Name</th>
                    <th class="py-3 px-4 text-right">Price (IG)</th>
                    <th class="py-3 px-4 text-right rounded-r-lg">24h Change</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#232936]/40">
                  {stocks.map((s) => {
                    const isSelected = s.ticker === selectedTicker;
                    const flash = priceFlashMap[s.ticker];
                    const flashClass = flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : '';

                    return (
                      <tr
                        key={s.ticker}
                        onClick={() => setSelectedTicker(s.ticker)}
                        class={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#2962ff]/10 border-l-4 border-[#2962ff]'
                            : 'hover:bg-[#0b0e14]'
                        } ${flashClass}`}
                      >
                        <td class="py-3.5 px-4 font-bold text-white font-mono">{s.ticker}</td>
                        <td class="py-3.5 px-4 text-gray-300 font-medium">{s.name}</td>
                        <td class="py-3.5 px-4 text-right font-mono font-bold text-white">
                          {parseFloat(s.current_price).toFixed(2)} IG
                        </td>
                        <td class={`py-3.5 px-4 text-right font-mono font-bold ${s.change_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {s.change_percentage >= 0 ? '+' : ''}{s.change_percentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rolling News Feed Logs */}
          <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl">
            <div class="pb-3 border-b border-[#232936] mb-3 flex items-center justify-between">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">Rolling Market News Feed</h4>
              <span class="text-[10px] text-gray-400 font-mono">{newsLogs.length} Events Broadcasted</span>
            </div>
            <div class="space-y-2 max-h-36 overflow-y-auto">
              {newsLogs.length === 0 ? (
                <p class="text-[11px] text-gray-500 italic py-2">Listening to live news shock broadcasts...</p>
              ) : (
                newsLogs.map((log, idx) => (
                  <div key={idx} class="p-2.5 rounded-xl bg-[#0b0e14] border border-[#232936] text-xs flex items-center justify-between">
                    <span class="font-bold text-white font-mono">[{log.stock_ticker || log.target || 'GLOBAL'}]</span>
                    <span class="text-gray-300 flex-1 mx-3 font-medium">{log.headline}</span>
                    <span class="text-[10px] text-rose-400 font-bold font-mono">{log.sentiment_multiplier}x</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Analytics Chart & Order Form & Leaderboard */}
        <div class="lg:col-span-5 space-y-6">
          {/* Selected Equity Banner & 1-Month Analytics Chart */}
          <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-white">{activeStock.name}</h3>
                <p class="text-xs text-gray-400 font-mono">{activeStock.ticker} / IG</p>
              </div>
              <div class="text-right">
                <div class="text-xl font-extrabold font-mono text-white">
                  {parseFloat(activeStock.current_price).toFixed(2)} IG
                </div>
                <div class={`text-xs font-semibold ${activeStock.change_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeStock.change_percentage >= 0 ? '+' : ''}{activeStock.change_percentage.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 30-Day Line Graph Analytics */}
            <div class="h-48 w-full bg-[#0b0e14] rounded-xl p-2 border border-[#232936]">
              {chartData ? (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { color: 'rgba(35, 41, 54, 0.4)' }, ticks: { color: '#9ca3af', font: { size: 9 } } },
                      y: { grid: { color: 'rgba(35, 41, 54, 0.4)' }, ticks: { color: '#9ca3af', font: { size: 9 } } },
                    },
                  }}
                />
              ) : (
                <div class="h-full flex items-center justify-center text-xs text-gray-500">Loading chart analytics...</div>
              )}
            </div>

            {/* Order Form Component */}
            <form onSubmit={handleExecuteTrade} class="space-y-4 pt-2 border-t border-[#232936]">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-gray-300 uppercase tracking-wider">Execute Trade Order</span>
                <span class="font-mono text-gray-400 bg-[#0b0e14] px-2 py-0.5 rounded border border-[#232936]">
                  Owned: <strong class="text-white">{sharesOwned}</strong> shares
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTradeType('buy')}
                  class={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    tradeType === 'buy'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#0b0e14] text-gray-400 border-[#232936]'
                  }`}
                >
                  BUY SHARES
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('sell')}
                  class={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    tradeType === 'sell'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                      : 'bg-[#0b0e14] text-gray-400 border-[#232936]'
                  }`}
                >
                  SELL SHARES
                </button>
              </div>

              <div>
                <label class="text-[11px] font-semibold text-gray-400 block mb-1">Order Share Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                  class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div class="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>Total Order Cost:</span>
                <span class="font-bold text-white text-sm">{totalCost} IG</span>
              </div>

              <button
                type="submit"
                disabled={tradeLoading}
                class={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xl transition-all ${
                  tradeType === 'buy'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-rose-500 to-red-600 hover:opacity-95 shadow-rose-500/20'
                }`}
              >
                {tradeLoading ? 'Transacting Order...' : `Confirm ${tradeType.toUpperCase()} ${tradeQuantity} ${activeStock.ticker}`}
              </button>
            </form>
          </div>

          {/* 4. Tournament Leaderboard Sidebar Widget */}
          <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-[#232936]">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🏆 Tournament Leaderboard</span>
              </h4>
              <span class="text-[10px] text-gray-400 font-mono">Auto 30s Sync</span>
            </div>

            <div class="space-y-2 max-h-48 overflow-y-auto">
              {leaderboard.length === 0 ? (
                <div class="text-[11px] text-gray-500 py-2 text-center">Loading tournament standings...</div>
              ) : (
                leaderboard.slice(0, 5).map((player) => (
                  <div key={player.email} class="p-2.5 rounded-xl bg-[#0b0e14] border border-[#232936] flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span class={`font-mono font-bold ${player.rank === 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                        #{player.rank}
                      </span>
                      <span class="text-gray-200 font-medium truncate max-w-[140px]">{player.email}</span>
                    </div>
                    <span class="font-mono font-bold text-emerald-400">{player.net_worth.toFixed(2)} IG</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
