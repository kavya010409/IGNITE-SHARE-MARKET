import React, { useState } from 'react';

export default function AuthScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      setLoading(true);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data.access_token) {
        onLoginSuccess(data.access_token, data.email, data.cash_balance);
        return;
      }

      // Hard Validation Check: Block entry on 401, 409 or any non-OK status. Clear password field.
      setPassword('');
      if (resp.status === 409) {
        setError('This email address is already registered. Please sign in instead.');
      } else if (resp.status === 401) {
        setError('Invalid email address or password. Access Denied.');
      } else {
        setError(data.detail || 'Authentication failed. Please verify credentials and try again.');
      }
    } catch (err) {
      // Security Constraint: Disable client-side mock login bypasses. Reject if API server is offline.
      setPassword('');
      setError('Secure API Server unreachable. Offline fallback bypass blocked.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0b0e14] via-[#151922] to-[#0b0e14]">
      <div class="w-full max-w-md bg-[#151922] border border-[#232936] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#2962ff]/20 rounded-full blur-3xl"></div>

        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2962ff] to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-[#2962ff]/30">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-extrabold text-white tracking-wide">IGNITE EXCHANGE</h1>
          <p class="text-xs text-gray-400 mt-1">Institutional Virtual Stock Market Terminal</p>
        </div>

        <div class="flex items-center p-1 bg-[#0b0e14] rounded-2xl border border-[#232936] mb-6">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            class={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'login'
                ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            class={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'register'
                ? 'text-white bg-[#151922] shadow-md border border-[#232936]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="text-xs font-semibold text-gray-400 block mb-1.5">Trader Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@domain.com"
              class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
            />
          </div>

          <div>
            <label class="text-xs font-semibold text-gray-400 block mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              class="w-full bg-[#0b0e14] border border-[#232936] rounded-xl px-4 py-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#2962ff] transition-colors"
            />
          </div>

          {mode === 'register' && (
            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
              🎁 New accounts automatically receive <strong>20,000.00 IG</strong> starting cash balance!
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            class="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#2962ff] to-indigo-600 text-white shadow-xl shadow-[#2962ff]/20 hover:opacity-95 transition-all mt-2"
          >
            {loading ? 'Authenticating...' : mode === 'register' ? 'Create Account & Get 20,000 IG' : 'Sign In to Portfolio'}
          </button>
        </form>
      </div>
    </div>
  );
}
