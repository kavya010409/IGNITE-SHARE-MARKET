import React from 'react';

export default function BreakingNewsModal({ news, onClose }) {
  if (!news) return null;

  return (
    <div class="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full px-4">
      <div class="bg-rose-950/95 border-2 border-rose-600 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between animate-pulse">
        <div class="flex items-center gap-3">
          <span class="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] tracking-wider uppercase border border-rose-400/40 shrink-0">
            🚨 BREAKING NEWS
          </span>
          <div>
            <h4 class="font-extrabold text-xs text-white">
              [{news.stock_ticker || news.target || 'GLOBAL'}] {news.headline}
            </h4>
            <p class="text-[10px] text-rose-300 font-mono mt-0.5">
              Multiplier: {news.sentiment_multiplier}x Impact | 2-Minute Market Realignment Window Active
            </p>
          </div>
        </div>
        <button onClick={onClose} class="text-rose-300 hover:text-white font-bold text-sm px-2">
          ✕
        </button>
      </div>
    </div>
  );
}
