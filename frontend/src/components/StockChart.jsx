import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const today = new Date();
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function StockChart({ ticker, currentPrice, livePrice }) {
  const [historyData, setHistoryData] = useState([]);
  const [openPrice, setOpenPrice] = useState(null);
  const [changePct, setChangePct] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);

  // Re-fetch history when ticker changes
  useEffect(() => {
    setLoading(true);
    fetchHistory(ticker);
  }, [ticker]);

  // Append live price tick to chart in real-time
  useEffect(() => {
    if (!livePrice || !livePrice.price) return;
    setHistoryData(prev => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      // Only skip if both time and price are exactly matches of last (highly unlikely with timestamp)
      if (last && parseFloat(last.closing_price) === parseFloat(livePrice.price) && last.recorded_at === new Date(livePrice.time).toISOString()) return prev;
      
      const updated = [...prev, {
        closing_price: parseFloat(livePrice.price),
        recorded_at: new Date(livePrice.time).toISOString(),
      }];
      // Keep latest 120 points
      return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
    });
  }, [livePrice]);

  const fetchHistory = async (symbol) => {
    try {
      const resp = await fetch(`/api/stocks/${symbol}/analytics`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoryData(data.history || []);
        setOpenPrice(data.open_price || null);
        setChangePct(data.change_pct ?? null);
        setLoading(false);
        return;
      }
    } catch (_) {}

    // Fallback: generate plausible mock history
    const mock = [];
    let cur = currentPrice || 5.0;
    for (let i = 60; i >= 0; i--) {
      mock.push({
        closing_price: Math.max(0.5, Math.round(cur * 100) / 100),
        recorded_at: new Date(Date.now() - i * 15000).toISOString(),
      });
      cur *= 1 + (Math.random() * 0.008 - 0.004);
    }
    setHistoryData(mock);
    setOpenPrice(mock[0]?.closing_price || cur);
    setChangePct(null);
    setLoading(false);
  };

  const prices = historyData.map(p => parseFloat(p.closing_price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 10;
  const firstPrice = prices[0] || openPrice || currentPrice || 0;
  const lastPrice = prices[prices.length - 1] || currentPrice || 0;
  const sessionChangePct = changePct !== null
    ? changePct
    : firstPrice > 0 ? Math.round(((lastPrice - firstPrice) / firstPrice) * 10000) / 100 : 0;

  const isPositive = sessionChangePct >= 0;
  const lineColor = isPositive ? '#10b981' : '#f43f5e';
  const fillColor = isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)';
  const shadowGradient = isPositive ? '#10b98120' : '#f43f5e20';

  const chartData = {
    labels: historyData.map(p => formatTime(p.recorded_at)),
    datasets: [{
      data: prices,
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      fill: true,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: lineColor,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0]?.label || '',
          label: ctx => ` ${parseFloat(ctx.parsed.y).toFixed(2)} IG`,
        },
        backgroundColor: '#0d1117',
        titleColor: '#9ca3af',
        bodyColor: '#ffffff',
        borderColor: '#232936',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#4b5563',
          font: { size: 9 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        border: { display: false },
      },
      y: {
        position: 'right',
        grid: { color: '#1a2033' },
        ticks: {
          color: '#4b5563',
          font: { size: 9 },
          callback: v => v.toFixed(2),
          maxTicksLimit: 6,
        },
        border: { display: false },
        min: prices.length > 1 ? Math.max(0, minPrice * 0.96) : undefined,
        max: prices.length > 1 ? maxPrice * 1.04 : undefined,
      },
    },
  };

  const changeAbs = Math.abs(lastPrice - firstPrice).toFixed(2);

  return (
    <div class="flex-1 flex flex-col gap-3">
      {/* Stats bar */}
      <div class="grid grid-cols-4 gap-2">
        {[
          ['Open', firstPrice > 0 ? `${firstPrice.toFixed(2)} IG` : '--'],
          ['Current', `${parseFloat(currentPrice || lastPrice || 0).toFixed(2)} IG`],
          ['High', prices.length ? `${maxPrice.toFixed(2)} IG` : '--'],
          ['Low', prices.length ? `${minPrice.toFixed(2)} IG` : '--'],
        ].map(([label, val]) => (
          <div key={label} class="bg-[#0b0e14] rounded-xl p-2.5 border border-[#232936] text-center">
            <div class="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
            <div class="text-xs font-bold text-white font-mono mt-0.5">{val}</div>
          </div>
        ))}
      </div>

      {/* Session change badge */}
      <div class="flex items-center gap-2">
        <span class={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
          {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{sessionChangePct.toFixed(2)}% &nbsp;
          <span class="font-normal opacity-70">({isPositive ? '+' : '-'}{changeAbs} IG)</span>
        </span>
        <span class="text-[10px] text-gray-600 font-mono">Session change · {prices.length} data points</span>
      </div>

      {/* Chart */}
      <div class="flex-1 min-h-[220px] rounded-xl p-3 border border-[#232936]/60 bg-[#0b0e14]/50 relative overflow-hidden">
        {loading ? (
          <div class="flex items-center justify-center h-full text-gray-500 text-xs gap-2">
            <span class="animate-spin">⟳</span> Loading chart data...
          </div>
        ) : prices.length > 1 ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div class="flex items-center justify-center h-full text-gray-500 text-xs">
            Waiting for market data...
          </div>
        )}
      </div>
    </div>
  );
}
