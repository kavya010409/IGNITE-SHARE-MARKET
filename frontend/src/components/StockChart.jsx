import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function StockChart({ ticker, currentPrice }) {
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    fetchStockHistory(ticker, currentPrice);
  }, [ticker, currentPrice]);

  const fetchStockHistory = async (symbol, price) => {
    try {
      const resp = await fetch(`/api/stocks/${symbol}/analytics`);
      if (resp.ok) {
        const data = await resp.json();
        setHistoryData(data.history);
        return;
      }
    } catch (e) {}

    // Standalone Demo Mock Data
    const mock = [];
    let cur = price || 5.0;
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      mock.push({
        closing_price: Math.max(1.5, cur),
        recorded_at: new Date(now - i * 86400000).toISOString(),
      });
      cur *= 1 + (Math.random() * 0.06 - 0.03);
    }
    setHistoryData(mock);
  };

  const chartData = {
    labels: historyData.map((p) =>
      new Date(p.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Closing Price (IG)',
        data: historyData.map((p) => p.closing_price),
        borderColor: '#2962ff',
        backgroundColor: 'rgba(41, 98, 255, 0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 10 } } },
      y: { grid: { color: '#232936' }, ticks: { color: '#6b7280', font: { size: 10 } } },
    },
  };

  return (
    <div class="flex-1 min-h-[280px] bg-[#0b0e14]/50 rounded-xl p-3 border border-[#232936]/60 relative">
      <Line data={chartData} options={options} />
    </div>
  );
}
