import React, { useEffect, useState } from 'react';

export default function BreakingNewsModal({ news, onClose }) {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!news) { setVisible(false); return; }
    setVisible(true);
    setTimeLeft(15);

    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(countdown); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [news]);

  if (!news || !visible) return null;

  const mult = parseFloat(news.sentiment_multiplier) || 1.0;
  const isBull = mult > 1.0;
  const isBear = mult < 1.0;
  const ticker = news.stock_ticker || news.target || 'GLOBAL';

  const impactLabel = isBull
    ? `📈 Bullish +${((mult - 1) * 100).toFixed(0)}% Surge`
    : isBear
    ? `📉 Bearish -${((1 - mult) * 100).toFixed(0)}% Drop`
    : '⚪ Neutral Impact';

  const impactColor = isBull
    ? { bg: 'bg-emerald-950', border: 'border-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500', text: 'text-emerald-400' }
    : isBear
    ? { bg: 'bg-rose-950', border: 'border-rose-500', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30', bar: 'bg-rose-500', text: 'text-rose-400' }
    : { bg: 'bg-gray-900', border: 'border-gray-600', badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30', bar: 'bg-gray-500', text: 'text-gray-400' };

  return (
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-6 px-4 pointer-events-none">
      <div
        class={`w-full max-w-2xl rounded-2xl border-2 ${impactColor.border} ${impactColor.bg}/95 backdrop-blur-xl shadow-2xl pointer-events-auto overflow-hidden`}
        style={{ animation: 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Timer bar at top */}
        <div class="h-1 bg-white/10 relative overflow-hidden">
          <div
            class={`absolute top-0 left-0 h-full ${impactColor.bar} transition-all ease-linear`}
            style={{ width: `${(timeLeft / 15) * 100}%`, transitionDuration: '1s' }}
          />
        </div>

        <div class="p-4">
          {/* Header row */}
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class={`animate-pulse inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] tracking-widest uppercase`}>
                🚨 BREAKING
              </span>
              <span class={`font-mono font-bold text-xs px-2 py-1 rounded-lg border ${impactColor.badge}`}>
                {ticker === 'GLOBAL' ? '🌐 ALL MARKETS' : `${ticker}`}
              </span>
              <span class={`text-xs font-bold px-2 py-1 rounded-lg border ${impactColor.badge}`}>
                {impactLabel}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-gray-400 font-mono">{timeLeft}s</span>
              <button
                onClick={onClose}
                class="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center text-xs transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Headline */}
          <p class="text-white font-bold text-sm leading-snug mb-3">{news.headline}</p>

          {/* Stats row */}
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-black/30 rounded-xl p-2.5 text-center">
              <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Multiplier</div>
              <div class={`text-sm font-black font-mono ${impactColor.text}`}>{mult}×</div>
            </div>
            <div class="bg-black/30 rounded-xl p-2.5 text-center">
              <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Est. Price Impact</div>
              <div class={`text-sm font-black font-mono ${impactColor.text}`}>
                {isBull ? '+' : isBear ? '-' : ''}{Math.abs(((mult - 1) * 100)).toFixed(0)}%
              </div>
            </div>
            <div class="bg-black/30 rounded-xl p-2.5 text-center">
              <div class="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Shock Window</div>
              <div class="text-sm font-black font-mono text-amber-400">~2 min</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
