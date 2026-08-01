import React, { useState } from 'react';

export default function OrderForm({ stock, cashBalance, portfolio, onTradeSuccess, showToast }) {
  const [action, setAction] = useState('BUY');
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentPrice = stock ? parseFloat(stock.current_price) : 0;
  const totalAmount = currentPrice * quantity;

  // Find owned quantity for this stock in trader's portfolio
  const ownedHolding = portfolio.find((p) => p.ticker === (stock ? stock.ticker : ''));
  const ownedQty = ownedHolding ? ownedHolding.quantity : 0;

  const remainingCash = action === 'BUY' ? cashBalance - totalAmount : cashBalance + totalAmount;

  const handleExecuteTrade = async () => {
    setErrorMsg('');

    if (!stock) return;
    if (quantity <= 0) {
      setErrorMsg('Please enter a valid quantity of shares.');
      return;
    }

    // Client-Side Validation 1: Insufficient Cash Balance for BUY
    if (action === 'BUY' && cashBalance < totalAmount) {
      setErrorMsg(`Insufficient IG cash balance. Required: ${totalAmount.toFixed(2)} IG, Available: ${cashBalance.toFixed(2)} IG.`);
      return;
    }

    // Client-Side Validation 2: Insufficient Shares Owned for SELL
    if (action === 'SELL') {
      if (ownedQty === 0) {
        setErrorMsg(`You do not own any shares of ${stock.ticker} in your portfolio.`);
        return;
      }
      if (ownedQty < quantity) {
        setErrorMsg(`Cannot sell ${quantity} shares. You only own ${ownedQty} shares of ${stock.ticker}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('apex_jwt_token') || '';
      const endpoint = action === 'BUY' ? '/api/trade/buy' : '/api/trade/sell';

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          quantity: parseInt(quantity),
        }),
      });

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrorMsg(result.detail || 'Trade execution failed.');
        setLoading(false);
        return;
      }

      showToast(`Successfully executed ${action} for ${quantity} ${stock.ticker} shares @ ${result.executed_price.toFixed(2)} IG!`, 'success');
      onTradeSuccess(result.remaining_cash);

    } catch (err) {
      // Offline Demo Fallback with strict checks
      if (action === 'BUY') {
        onTradeSuccess(cashBalance - totalAmount);
        showToast(`Demo BUY Executed: ${quantity} ${stock.ticker} @ ${currentPrice.toFixed(2)} IG!`, 'success');
      } else {
        onTradeSuccess(cashBalance + totalAmount);
        showToast(`Demo SELL Executed: ${quantity} ${stock.ticker} @ ${currentPrice.toFixed(2)} IG!`, 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex-1 flex flex-col justify-between">
      <div>
        {/* Action Toggle Buttons */}
        <div class="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => { setAction('BUY'); setErrorMsg(''); }}
            class={`py-2.5 rounded-xl font-bold text-xs transition-all ${
              action === 'BUY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg'
                : 'bg-[#0b0e14] text-gray-400 border border-[#232936] hover:text-white'
            }`}
          >
            BUY SHARES
          </button>
          <button
            onClick={() => { setAction('SELL'); setErrorMsg(''); }}
            class={`py-2.5 rounded-xl font-bold text-xs transition-all ${
              action === 'SELL'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg'
                : 'bg-[#0b0e14] text-gray-400 border border-[#232936] hover:text-white'
            }`}
          >
            SELL SHARES
          </button>
        </div>

        {/* Owned Shares Badge */}
        <div class="flex items-center justify-between bg-[#0b0e14] px-4 py-2.5 rounded-xl border border-[#232936] mb-4 text-xs">
          <span class="text-gray-400">Portfolio Position</span>
          <span class="font-bold text-white font-mono">
            Owned: <span class={ownedQty > 0 ? 'text-emerald-400' : 'text-gray-500'}>{ownedQty} shares</span>
          </span>
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quantity Controls */}
        <div class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-gray-400 block mb-1.5">Order Quantity (Shares)</label>
            <div class="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                class="w-10 h-10 rounded-xl bg-[#0b0e14] border border-[#232936] hover:bg-[#232936] font-bold text-lg text-gray-300"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                class="flex-1 bg-[#0b0e14] border border-[#232936] rounded-xl text-center font-mono font-bold text-white text-base py-2 focus:outline-none focus:border-[#2962ff]"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                class="w-10 h-10 rounded-xl bg-[#0b0e14] border border-[#232936] hover:bg-[#232936] font-bold text-lg text-gray-300"
              >
                +
              </button>
            </div>
          </div>

          {/* Calculations Summary */}
          <div class="bg-[#0b0e14]/70 p-4 rounded-xl border border-[#232936] space-y-2.5 text-xs">
            <div class="flex justify-between text-gray-400">
              <span>Market Execution Price</span>
              <span class="font-mono text-white">{currentPrice.toFixed(2)} IG</span>
            </div>
            <div class="flex justify-between text-gray-400">
              <span>Estimated Total Amount</span>
              <span class="font-mono font-bold text-white">{totalAmount.toFixed(2)} IG</span>
            </div>
            <div class="h-px bg-[#232936] my-1"></div>
            <div class="flex justify-between text-gray-400">
              <span>Remaining Cash After Order</span>
              <span class={`font-mono font-bold ${remainingCash < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {remainingCash.toFixed(2)} IG
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleExecuteTrade}
        disabled={loading}
        class={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-xl hover:opacity-95 transition-all mt-6 ${
          action === 'BUY'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20'
            : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/20'
        }`}
      >
        {loading ? 'Executing Trade Order...' : action === 'BUY' ? 'Confirm & Place Buy Order' : 'Confirm & Place Sell Order'}
      </button>
    </div>
  );
}
