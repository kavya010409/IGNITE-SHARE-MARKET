import React, { useEffect, useState } from 'react';

export default function PortfolioLedger({ cashBalance, onQuickSell, showToast }) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
  }, [cashBalance]);

  const fetchPortfolio = async () => {
    const token = localStorage.getItem('apex_jwt_token') || '';
    try {
      const resp = await fetch('/api/trade/portfolio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setHoldings(data);
        setLoading(false);
        return;
      }
    } catch (e) {}
    setLoading(false);
  };

  const totalHoldingsValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.total_cost, 0);
  const netUnrealizedPnL = totalHoldingsValue - totalCostBasis;

  return (
    <div class="space-y-6">
      {/* Portfolio Overview Header Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex items-center justify-between">
          <div>
            <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Portfolio Market Value</span>
            <div class="text-2xl font-extrabold text-white font-mono">{totalHoldingsValue.toFixed(2)} <span class="text-xs text-emerald-400">IG</span></div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-500/20">
            💼
          </div>
        </div>

        <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex items-center justify-between">
          <div>
            <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Total Cost Basis</span>
            <div class="text-2xl font-extrabold text-gray-300 font-mono">{totalCostBasis.toFixed(2)} <span class="text-xs text-gray-500">IG</span></div>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-[#2962ff]/10 text-[#2962ff] flex items-center justify-center font-bold text-xl border border-[#2962ff]/20">
            💵
          </div>
        </div>

        <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex items-center justify-between">
          <div>
            <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-1">Net Unrealized P&L</span>
            <div class={`text-2xl font-extrabold font-mono ${netUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netUnrealizedPnL >= 0 ? '+' : ''}{netUnrealizedPnL.toFixed(2)} <span class="text-xs">IG</span>
            </div>
          </div>
          <div class={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border ${
            netUnrealizedPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {netUnrealizedPnL >= 0 ? '📈' : '📉'}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div class="bg-[#151922] border border-[#232936] rounded-2xl p-6 shadow-2xl">
        <div class="flex items-center justify-between pb-4 border-b border-[#232936] mb-5">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>Portfolio Position Ledger</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-[#0b0e14] text-gray-400 border border-[#232936]">
              {holdings.length} Active Positions
            </span>
          </h3>
          <button onClick={fetchPortfolio} class="text-xs text-[#2962ff] hover:underline font-semibold">Refresh Ledger</button>
        </div>

        {holdings.length === 0 ? (
          <div class="py-12 text-center text-gray-500 text-xs">
            No active share positions in your portfolio yet. Buy stocks on the Trading Floor to build your position!
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-[#0b0e14]/60 text-gray-400 uppercase font-semibold">
                <tr>
                  <th class="py-3 px-4 rounded-l-lg">Ticker</th>
                  <th class="py-3 px-4">Company Name</th>
                  <th class="py-3 px-4 text-right">Shares Owned</th>
                  <th class="py-3 px-4 text-right">Avg Price</th>
                  <th class="py-3 px-4 text-right">Current Price</th>
                  <th class="py-3 px-4 text-right">Market Value</th>
                  <th class="py-3 px-4 text-right">Unrealized P&L</th>
                  <th class="py-3 px-4 text-center rounded-r-lg">Quick Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#232936]/40">
                {holdings.map((item) => (
                  <tr key={item.ticker} class="hover:bg-[#0b0e14] transition-colors">
                    <td class="py-3.5 px-4 font-bold text-white font-mono">{item.ticker}</td>
                    <td class="py-3.5 px-4 text-gray-300 font-medium">{item.name}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-white">{item.quantity}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-gray-300">{item.average_buy_price.toFixed(2)} IG</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-white">{item.current_price.toFixed(2)} IG</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-white">{item.current_value.toFixed(2)} IG</td>
                    <td class={`py-3.5 px-4 text-right font-mono font-bold ${item.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.unrealized_pnl >= 0 ? '+' : ''}{item.unrealized_pnl.toFixed(2)} IG ({item.pnl_percentage.toFixed(2)}%)
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onQuickSell(item.ticker)}
                        class="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all"
                      >
                        Sell Shares
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
