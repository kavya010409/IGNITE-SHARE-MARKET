import React from 'react';

export default function Navbar({ traderEmail, cashBalance, portfolioValue, isConnected, activeTab, setActiveTab, onLogout }) {
  const totalAccountValue = (parseFloat(cashBalance) + parseFloat(portfolioValue)).toFixed(2);

  return (
    <header class="bg-[#151922] border-b border-[#232936] px-6 py-3.5 sticky top-0 z-40 flex flex-wrap items-center justify-between shadow-xl gap-4">
      {/* Brand & Title */}
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2962ff] to-indigo-500 flex items-center justify-center shadow-lg shadow-[#2962ff]/20">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
            IGNITE <span class="text-xs font-semibold px-2 py-0.5 rounded bg-[#2962ff]/20 text-[#2962ff] border border-[#2962ff]/30">REACT PRO</span>
          </h1>
          <p class="text-xs text-gray-400 font-medium">Virtual Stock Market Exchange Engine</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div class="flex items-center gap-2 bg-[#0b0e14] p-1 rounded-xl border border-[#232936]">
        <button
          onClick={() => setActiveTab('trading')}
          class={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'trading'
              ? 'bg-[#151922] text-white shadow-md border border-[#232936]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📈 Trading Floor
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          class={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'portfolio'
              ? 'bg-[#151922] text-white shadow-md border border-[#232936]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          💼 My Portfolio
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          class={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'leaderboard'
              ? 'bg-[#151922] text-white shadow-md border border-[#232936]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          class={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'admin'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'text-gray-400 hover:text-rose-400'
          }`}
        >
          ⚡ Admin Panel
        </button>
      </div>

      {/* User Balance & Connection Info */}
      <div class="flex items-center gap-5">
        <div class="flex items-center gap-2 bg-[#0b0e14] px-3.5 py-1.5 rounded-full border border-[#232936]">
          <span class={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-yellow-500 animate-pulse'}`}></span>
          <span class="text-xs font-semibold text-gray-300">{isConnected ? 'Live Feed' : 'Demo Engine'}</span>
        </div>

        <div class="flex items-center gap-4 bg-gradient-to-r from-[#0b0e14] to-[#151922] border border-[#232936] px-4 py-1.5 rounded-xl shadow-inner">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cash Balance</div>
            <div class="text-sm font-bold text-white font-mono">{parseFloat(cashBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span class="text-xs text-emerald-400">IG</span></div>
          </div>
          <div class="h-6 w-px bg-[#232936]"></div>
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Net Worth</div>
            <div class="text-sm font-bold text-emerald-400 font-mono">{parseFloat(totalAccountValue).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span class="text-xs text-gray-400">IG</span></div>
          </div>
        </div>

        <button
          onClick={onLogout}
          class="p-2 rounded-xl bg-[#0b0e14] border border-[#232936] text-gray-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
          title="Sign Out"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
        </button>
      </div>
    </header>
  );
}
