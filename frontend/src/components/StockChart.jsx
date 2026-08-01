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

export default function StockChart({ ticker, currentPrice, livePrice }) {
  const [historyData, setHistoryData] = useState([]);
  const chartRef = useRef(null);

  // Fetch historical data when ticker changes
  useEffect(() => {
    fetchHistory(ticker);
  }, [ticker]);

  // Append live price tick to the chart in real-time
  useEffect(() => {
    if (!livePrice || historyData.length === 0) return;
    setHistoryData(prev => {
      const last = prev[prev.length - 1];
      // Only append if price actually changed
      if (last && parseFloat(last.closing_price) === parseFloat(livePrice)) return prev;
      const updated = [...prev, { closing_price: livePrice, recorded_at: new Date().toISOString() }];
      // Keep max 60 data points on chart
      return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
    });
  }, [livePrice]);

  const fetchHistory = async (symbol) => {
    try {
      const resp = await fetch(`/api/stocks/${symbol}/analytics`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoryData(data.history || []);
        return;
      }
    } catch (_) {}

    // Fallback mock data if backend offline
    const mock = [];
    let cur = currentPrice || 5.0;
    for (let i = 30; i >= 0; i--) {
      mock.push({
        closing_price: Math.max(0.5, cur),
        recorded_at: new Date(Date.now() - i * 86400000).toISOString(),
      });
      cur *= 1 + (Math.random() * 0.06 - 0.03);
    }
    setHistoryData(mock);
  };

  const prices = historyData.map(p => parseFloat(p.closing_price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const isPositive = prices.length > 1 ? prices[prices.length - 1] >= prices[0] : true;
  const lineColor = isPositive ? '#10b981' : '#f43f5e';
  const fillColor = isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)';

  const chartData = {
    labels: historyData.map(p =>
      new Date(p.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    ),
    datasets: [{
      data: prices,
      borderColor: lineColor,
      backgroundColor: fillColor,
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.parsed.y.toFixed(2)} IG`,
        },
        backgroundColor: '#151922',
        titleColor: '#9ca3af',
        bodyColor: '#ffffff',
        borderColor: '#232936',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 6 },
      },
      y: {
        grid: { color: '#1f2533' },
        ticks: { color: '#6b7280', font: { size: 9 }, callback: v => v.toFixed(2) },
        min: Math.max(0, minPrice * 0.97),
        max: maxPrice * 1.03,
      },
    },
  };

  return (
    <div class="flex-1 flex flex-col gap-2">
      {/* Mini stats */}
      <div class="grid grid-cols-3 gap-2">
        {[
          ['Current', `${parseFloat(currentPrice || 0).toFixed(2)} IG`],
          ['High (30d)', prices.length ? `${Math.max(...prices).toFixed(2)} IG` : '--'],
          ['Low (30d)', prices.length ? `${Math.min(...prices).toFixed(2)} IG` : '--'],
        ].map(([label, val]) => (
          <div key={label} class="bg-[#0b0e14] rounded-xl p-2.5 border border-[#232936] text-center">
            <div class="text-[10px] text-gray-500">{label}</div>
            <div class="text-xs font-bold text-white font-mono mt-0.5">{val}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div class="flex-1 min-h-[240px] bg-[#0b0e14]/50 rounded-xl p-3 border border-[#232936]/60">
        {historyData.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div class="flex items-center justify-center h-full text-gray-500 text-xs">Loading chart data...</div>
        )}
      </div>
    </div>
  );
}
