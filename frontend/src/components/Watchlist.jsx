import React, { useState } from 'react';

export default function Watchlist({ stocks, selectedTicker, onSelectStock }) {
  const [search, setSearch] = useState('');

  const filteredStocks = stocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div class="flex-1 bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex flex-col overflow-hidden">
      <div class="flex items-center justify-between pb-4 border-b border-[#232936] mb-4">
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            <span>Market Watchlist</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-[#0b0e14] text-gray-400 border border-[#232936]">
              {stocks.length} Active Stocks
            </span>
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">Real-time tick updates powered by Redis Pub/Sub</p>
        </div>
        <div class="relative w-48 sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker or name..."
            class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl text-xs px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
          />
          <svg class="w-3.5 h-3.5 text-gray-500 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto pr-1 max-h-[calc(100vh-380px)]">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-[#0b0e14]/80 text-gray-400 uppercase font-semibold sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th class="py-3 px-4 rounded-l-lg">Ticker</th>
              <th class="py-3 px-4">Company Name</th>
              <th class="py-3 px-4 text-right">Price (IG)</th>
              <th class="py-3 px-4 text-right rounded-r-lg">24h Change</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#232936]/40">
            {filteredStocks.map((stock) => {
              const isSelected = stock.ticker === selectedTicker;
              const changePct = stock.change_percentage || 0;
              const isUp = changePct > 0;
              const isDown = changePct < 0;

              return (
                <tr
                  key={stock.ticker}
                  onClick={() => onSelectStock(stock.ticker)}
                  class={`cursor-pointer transition-colors hover:bg-[#0b0e14] ${
                    isSelected ? 'bg-[#2962ff]/10 border-l-4 border-[#2962ff]' : ''
                  }`}
                >
                  <td class="py-3.5 px-4 font-bold text-white font-mono">{stock.ticker}</td>
                  <td class="py-3.5 px-4 text-gray-300 font-medium">{stock.name}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-bold text-white">
                    {parseFloat(stock.current_price).toFixed(2)} IG
                  </td>
                  <td
                    class={`py-3.5 px-4 text-right font-mono font-bold ${
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-gray-400'
                    }`}
                  >
                    {isUp ? '▲ +' : isDown ? '▼ ' : '► '}
                    {changePct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
