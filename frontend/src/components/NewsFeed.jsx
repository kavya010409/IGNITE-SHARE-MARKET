import React from 'react';

export default function NewsFeed({ archive }) {
  return (
    <div class="bg-[#151922] border border-[#232936] rounded-2xl p-5 shadow-2xl flex flex-col">
      <div class="flex items-center justify-between pb-3 border-b border-[#232936] mb-3">
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
          </svg>
          Live Market News Archive Feed
        </h3>
        <span class="text-[10px] font-mono text-gray-400 bg-[#0b0e14] px-2 py-0.5 rounded border border-[#232936]">
          {archive.length} Articles Logged
        </span>
      </div>

      <div class="space-y-2.5 max-h-40 overflow-y-auto pr-1">
        {archive.length === 0 ? (
          <div class="text-[11px] text-gray-500 text-center py-4 italic">
            Waiting for live breaking news broadcasts...
          </div>
        ) : (
          archive.map((item, idx) => {
            const mult = item.sentiment_multiplier || 1.0;
            const isBull = mult > 1.0;
            const isBear = mult < 1.0;
            const badgeColor = isBull
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : isBear
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

            const timeStr = item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now';

            return (
              <div key={idx} class="p-3 rounded-xl bg-[#0b0e14] border border-[#232936] flex items-center justify-between text-xs transition-all">
                <div class="flex items-center gap-3">
                  <span class="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#151922] border border-[#232936]">
                    {item.stock_ticker || item.target || 'GLOBAL'}
                  </span>
                  <span class="font-medium text-gray-200">{item.headline}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class={`text-[10px] font-mono font-bold ${badgeColor} px-2 py-0.5 rounded-full border`}>
                    {mult}x
                  </span>
                  <span class="text-[10px] text-gray-500 font-mono">{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
