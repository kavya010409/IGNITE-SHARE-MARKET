import React from 'react';

function getImpactStyle(mult) {
  const m = parseFloat(mult) || 1.0;
  if (m > 1.0) return {
    label: `▲ +${((m - 1) * 100).toFixed(0)}% Bullish`,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
    border: 'border-l-emerald-500',
  };
  if (m < 1.0) return {
    label: `▼ -${((1 - m) * 100).toFixed(0)}% Bearish`,
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dot: 'bg-rose-400',
    border: 'border-l-rose-500',
  };
  return {
    label: '● Neutral',
    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    dot: 'bg-gray-400',
    border: 'border-l-gray-600',
  };
}

export default function NewsFeed({ archive }) {
  return (
    <div class="bg-[#151922] border border-[#232936] rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-[#232936] bg-[#0d1017]">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <h3 class="text-xs font-bold text-white tracking-wider uppercase">Market News Console</h3>
        </div>
        <span class="text-[10px] font-mono text-gray-500 bg-[#151922] px-2 py-0.5 rounded border border-[#232936]">
          {archive.length} {archive.length === 1 ? 'Event' : 'Events'} Logged
        </span>
      </div>

      {/* News list */}
      <div class="divide-y divide-[#1c2333] max-h-64 overflow-y-auto">
        {archive.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-10 gap-2">
            <span class="text-2xl">📡</span>
            <p class="text-[11px] text-gray-500 italic">Waiting for live market events...</p>
          </div>
        ) : (
          archive.map((item, idx) => {
            const mult = parseFloat(item.sentiment_multiplier) || 1.0;
            const style = getImpactStyle(mult);
            const ticker = item.stock_ticker || item.target || 'GLOBAL';
            const timeStr = item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Just now';

            return (
              <div
                key={idx}
                class={`flex items-start gap-3 px-4 py-3 border-l-2 ${style.border} bg-[#151922] hover:bg-[#1a2030] transition-colors`}
              >
                {/* Dot */}
                <div class={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style.dot}`} />

                {/* Content */}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="font-mono font-bold text-[11px] text-white bg-[#0b0e14] px-1.5 py-0.5 rounded border border-[#232936]">
                      {ticker}
                    </span>
                    <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {style.label}
                    </span>
                    <span class={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {mult}× multiplier
                    </span>
                  </div>
                  <p class="text-xs text-gray-300 font-medium leading-snug">{item.headline}</p>
                </div>

                {/* Time */}
                <div class="shrink-0 text-right">
                  <span class="text-[10px] text-gray-500 font-mono">{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      {archive.length > 0 && (
        <div class="px-4 py-2 bg-[#0d1017] border-t border-[#232936]">
          <p class="text-[10px] text-gray-600 font-mono text-center">
            📊 Price shocks apply ~2 minutes after dispatch • Market volatility reflects event multiplier
          </p>
        </div>
      )}
    </div>
  );
}
