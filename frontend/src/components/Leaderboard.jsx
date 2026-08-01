import React, { useEffect, useState } from 'react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const resp = await fetch('/api/leaderboard');
      if (resp.ok) {
        const data = await resp.json();
        setRankings(data);
      }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div class="bg-[#151922] border border-[#232936] rounded-3xl p-6 shadow-2xl space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-[#232936]">
        <div>
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🏆 Tournament Leaderboard</span>
          </h2>
          <p class="text-xs text-gray-400 mt-1">Real-time Net Asset Value (NAV = Cash Balance + Held Stock Valuation)</p>
        </div>
        <button onClick={fetchLeaderboard} class="text-xs text-[#2962ff] hover:underline font-semibold">
          Force Refresh (30s Loop)
        </button>
      </div>

      {loading ? (
        <div class="py-12 text-center text-xs text-gray-500">
          Scanning portfolio valuations and computing tournament NAV standings...
        </div>
      ) : rankings.length === 0 ? (
        <div class="py-12 text-center text-xs text-gray-500">
          No registered active traders found on the exchange leaderboard.
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-[#0b0e14]/60 text-gray-400 uppercase font-semibold">
              <tr>
                <th class="py-3 px-4 rounded-l-lg text-center">Rank</th>
                <th class="py-3 px-4">Trader Email</th>
                <th class="py-3 px-4 text-right">Cash Balance</th>
                <th class="py-3 px-4 text-right">Portfolio Value</th>
                <th class="py-3 px-4 text-right rounded-r-lg font-bold text-white">Net Worth (NAV)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#232936]/40">
              {rankings.map((player) => {
                let rankColor = "text-gray-300";
                let rankBadge = "";
                if (player.rank === 1) {
                  rankColor = "text-amber-400 font-extrabold";
                  rankBadge = "🥇";
                } else if (player.rank === 2) {
                  rankColor = "text-gray-300 font-bold";
                  rankBadge = "🥈";
                } else if (player.rank === 3) {
                  rankColor = "text-amber-600 font-bold";
                  rankBadge = "🥉";
                }

                return (
                  <tr key={player.email} class="hover:bg-[#0b0e14] transition-colors">
                    <td class={`py-3.5 px-4 text-center font-mono ${rankColor}`}>
                      {rankBadge ? `${rankBadge} ` : ''}#{player.rank}
                    </td>
                    <td class="py-3.5 px-4 text-gray-200 font-medium font-mono">{player.email}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-gray-400">{player.cash_balance.toFixed(2)} IG</td>
                    <td class="py-3.5 px-4 text-right font-mono text-gray-400">{player.portfolio_value.toFixed(2)} IG</td>
                    <td class="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 bg-emerald-500/5">{player.net_worth.toFixed(2)} IG</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
