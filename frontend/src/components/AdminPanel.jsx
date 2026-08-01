import React, { useEffect, useState } from 'react';

const STOCK_TICKERS = [
  'GLOBAL', 'APEX', 'CRPT', 'METV', 'ROBO', 'NVRA', 'HYDR', 'VRTX', 'QNTM', 'PLSM',
  'ORBT', 'STRM', 'AERO', 'SOLR', 'CELL', 'DATA', 'CYBR', 'GENM', 'PHOX', 'NANO',
  'AURA', 'TITN', 'SYNX', 'ZEUS', 'LUNA', 'EDGE', 'FUSE', 'FLUX', 'HELI', 'ECHO', 'VIRT'
];

export default function AdminPanel({ showToast, onNewsDispatched }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    localStorage.getItem('apex_admin_auth') === 'true'
  );
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [targetStock, setTargetStock] = useState('GLOBAL');
  const [headline, setHeadline] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchNewsLogs();
    }
  }, [isAdminAuthenticated]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      if (resp.ok) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('apex_admin_auth', 'true');
        localStorage.setItem('apex_admin_password', adminPassword);
        showToast('Admin access granted.', 'success');
      } else {
        showToast('Invalid admin email or password.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to authentication service.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('apex_admin_auth');
    localStorage.removeItem('apex_admin_password');
    setAdminPassword('');
    showToast('Admin session closed.', 'info');
  };

  const fetchNewsLogs = async () => {
    const password = localStorage.getItem('apex_admin_password') || '';
    try {
      const resp = await fetch('/api/admin/news', {
        headers: { 'X-Admin-Password': password }
      });
      if (resp.ok) {
        const data = await resp.json();
        setLogs(data);
        return;
      }
    } catch (e) {}

    const localLogs = JSON.parse(localStorage.getItem('apex_news_archive') || '[]');
    setLogs(localLogs);
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setLoading(true);
    const password = localStorage.getItem('apex_admin_password') || '';

    const newsPacket = {
      type: 'news',
      event: 'news_flash',
      stock_ticker: targetStock === 'GLOBAL' ? 'GLOBAL' : targetStock,
      target: targetStock,
      headline: headline.trim(),
      sentiment_multiplier: parseFloat(multiplier),
      created_at: new Date().toISOString(),
    };

    // Broadcast across tabs
    onNewsDispatched(newsPacket);

    try {
      await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Password': password 
        },
        body: JSON.stringify({
          stock_ticker: targetStock === 'GLOBAL' ? null : targetStock,
          headline: headline.trim(),
          content: headline.trim(),
          sentiment_multiplier: parseFloat(multiplier),
          duration_minutes: 15,
        }),
      });
    } catch (err) {}

    showToast(`Event Dispatched: [${newsPacket.stock_ticker}] ${headline}`, 'success');
    setHeadline('');
    setLoading(false);
    fetchNewsLogs();
  };

  if (!isAdminAuthenticated) {
    return (
      <div class="max-w-md mx-auto my-12 bg-[#151922] border border-[#232936] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>
        <div class="text-center mb-6">
          <div class="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            🔒
          </div>
          <h2 class="text-lg font-bold text-white">Admin Credentials Required</h2>
          <p class="text-xs text-gray-400 mt-1">Enter admin email and password to unlock dispatcher tools</p>
        </div>

        <form onSubmit={handleAdminLogin} class="space-y-4">
          <input
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@gmail.com"
            class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors font-mono"
          />
          <input
            type="password"
            required
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter Admin Password..."
            class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors text-center font-mono"
          />
          <button
            type="submit"
            disabled={authLoading}
            class="w-full py-3 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 transition-all"
          >
            {authLoading ? 'Verifying Credentials...' : 'Unlock Console'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Form */}
      <section class="lg:col-span-7 bg-[#151922] border border-[#232936] rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-[#232936] mb-6">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span>Dispatch Market Event</span>
              </h2>
              <p class="text-xs text-gray-400 mt-1">Injects volatility multipliers into the continuous 15-second market simulator</p>
            </div>
            <button
              onClick={handleAdminLogout}
              class="text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-bold hover:bg-rose-500 hover:text-white transition-all"
            >
              Lock Console ✕
            </button>
          </div>

          <form onSubmit={handleDispatch} class="space-y-5">
            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-2">Target Stock / Market Segment</label>
              <select
                value={targetStock}
                onChange={(e) => setTargetStock(e.target.value)}
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2962ff] transition-colors font-mono"
              >
                {STOCK_TICKERS.map((t) => (
                  <option key={t} value={t}>
                    {t === 'GLOBAL' ? '🌐 GLOBAL MARKET (Impact All 30 Stocks)' : `${t} - Virtual Stock`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-2">Market Headline</label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., Tech Corp announces massive regulatory audit failure..."
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
              />
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-400 block mb-2">Impact Severity & Volatility Multiplier</label>
              <select
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#2962ff] transition-colors font-mono"
              >
                <option value="1.35">🟢 Heavy Bullish Surge (+35% Multiplier Impact)</option>
                <option value="1.15">🟢 Moderate Bullish Growth (+15% Multiplier Impact)</option>
                <option value="1.00">⚪ Neutral / Standard Noise (1.0x Baseline)</option>
                <option value="0.85">🔴 Moderate Bearish Dip (-15% Multiplier Impact)</option>
                <option value="0.65">🔴 Heavy Bearish Crash (-35% Multiplier Impact)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full py-4 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 text-white shadow-xl shadow-rose-500/20 hover:opacity-95 transition-all mt-4"
            >
              {loading ? 'Dispatching Payload...' : '🚀 Dispatch Event & Broadcast Volatility'}
            </button>
          </form>
        </div>
      </section>

      {/* Right Column: Logs */}
      <section class="lg:col-span-5 bg-[#151922] border border-[#232936] rounded-3xl p-6 shadow-2xl flex flex-col">
        <div class="flex items-center justify-between pb-4 border-b border-[#232936] mb-4">
          <h3 class="text-base font-bold text-white">Active Event Logs</h3>
          <button onClick={fetchNewsLogs} class="text-xs text-[#2962ff] hover:underline font-semibold">Refresh</button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-3 max-h-[500px]">
          {logs.length === 0 ? (
            <div class="p-4 rounded-2xl bg-[#0b0e14] border border-[#232936] text-center text-xs text-gray-500">
              No active news events dispatched yet.
            </div>
          ) : (
            logs.map((log, idx) => {
              const mult = log.sentiment_multiplier || 1.0;
              const isBull = mult > 1.0;
              const isBear = mult < 1.0;
              const badgeColor = isBull
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isBear
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

              return (
                <div key={idx} class="p-4 rounded-2xl bg-[#0b0e14] border border-[#232936] space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold font-mono text-white">{log.stock_ticker || log.target || 'GLOBAL'}</span>
                    <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {mult}x Multiplier
                    </span>
                  </div>
                  <p class="text-xs text-gray-300 font-medium">{log.headline}</p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
