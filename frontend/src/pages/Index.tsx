// CI ERP — Premium Login Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
  const { login, token, isReady } = useAuth();

  // Keep login form empty by default (no credentials pre-filled)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return;
    if (token) navigate('/dashboard', { replace: true });
  }, [isReady, token, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Logged in');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const getErrorMsg = () => {
        if (err && typeof err === 'object') {
          if ('detail' in err) {
            const detail = (err as { detail: unknown }).detail;
            return typeof detail === 'string' ? detail : JSON.stringify(detail);
          }
          if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
            return (err as { message: string }).message;
          }
        }
        return 'Login failed';
      }
      const raw = getErrorMsg();

      // Avoid dumping HTML (e.g. 502 Bad Gateway) into the UI
      const msg = typeof raw === 'string' && raw.trim().startsWith('<')
        ? 'Backend unavailable (check Docker / API logs)'
        : raw;

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050A14] relative overflow-hidden flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.18),transparent_45%)]" />
        <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-lg">CI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CI ERP</h1>
              <p className="text-xs text-slate-400">Crispin Intelligence</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cierp.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-slate-500/60 focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-slate-500/60 focus:ring-2 focus:ring-slate-500/20"
              />
            </div>

            {error ? (
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white text-slate-950 font-semibold text-sm py-2.5 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-xs text-slate-500">Demo: admin123@cierp.com / admin123</p>
          </form>
        </div>
      </div>
    </div>
  );
}
