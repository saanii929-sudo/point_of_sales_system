'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { prefetchOfflineData } from '@/lib/offlineDataCache';
import toast from 'react-hot-toast';
import {
  Store, Mail, Lock, Eye, EyeOff, ArrowLeft,
  CheckCircle2, Zap, WifiOff, BarChart3, ArrowRight, Sun, Moon,
} from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

const featureHighlights = [
  { icon: Zap,         text: 'Process sales in under 3 seconds' },
  { icon: WifiOff,     text: 'Works fully offline, syncs on reconnect' },
  { icon: BarChart3,   text: 'Real-time analytics & insights' },
  { icon: CheckCircle2,text: 'Role-based access for your whole team' },
];



export default function LoginPage() {
  const router  = useRouter();
  const setUser = useAuthStore(state => state.setUser);

  const [isLoading,   setIsLoading]   = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [formData,    setFormData]    = useState({ email: '', password: '' });
  const { theme, toggleTheme } = useThemeStore();
  const { prefetchForOffline } = useServiceWorker();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Offline login — check localStorage auth
    if (!isOnline) {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        try {
          const { state } = JSON.parse(stored);
          if (state?.user?.email === formData.email) {
            setUser(state.user);
            toast.success('Signed in offline');
            const roleMap: Record<string, string> = {
              super_admin:     '/superadmin',
              cashier:         '/dashboard/pos',
              inventory_staff: '/dashboard/products',
            };
            router.push(roleMap[state.user.role] ?? '/dashboard');
            return;
          }
        } catch {}
      }
      toast.error('Cannot verify credentials offline. Please connect to the internet for first login.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      setUser(data.user);
      toast.success('Welcome back! 🎉');

      // Prefetch pages and data for offline use (non-blocking)
      try { prefetchForOffline(); } catch {}
      prefetchOfflineData().catch(() => {});

      const roleMap: Record<string, string> = {
        super_admin:     '/superadmin',
        cashier:         '/dashboard/pos',
        inventory_staff: '/dashboard/products',
      };
      // Hard redirect ensures the browser sends the fresh cookie on the next request
      window.location.href = roleMap[data.user.role] ?? '/dashboard';
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">
      <div className="hidden lg:flex lg:w-[46%] xl:w-5/12 relative flex-col bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden p-10">
        
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white leading-none block">SmartVendr</span>
              <span className="text-[10px] font-semibold text-emerald-400/80 tracking-widest uppercase">Smart Selling</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Run your business<br />
              <span className="text-emerald-400">smarter every day.</span>
            </h2>
            <p className="text-base text-slate-300 leading-relaxed mb-10 max-w-xs">
              The all-in-one POS platform with offline support, real-time analytics, and a checkout experience your customers will love.
            </p>

            {/* Feature bullets */}
            <div className="space-y-3.5 mb-12">
              {featureHighlights.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300">{text}</span>
                </div>
              ))}
            </div>

            {/* Floating stat card */}
            <div className="bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl p-5 max-w-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today&apos;s Revenue</p>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full">↑ 23.4%</span>
              </div>
              <p className="text-3xl font-extrabold text-white mb-3">GH₵18,420.00</p>
              {/* Mini sparkline */}
              <div className="flex items-end gap-1 h-10">
                {[35, 55, 42, 70, 58, 88, 65, 95, 72, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-400/60 rounded-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-600">
            © {new Date().getFullYear()} SmartVendr · Built for modern businesses
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          {/* Mobile logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--text-secondary)]" /> : <Moon className="w-5 h-5 text-[var(--text-secondary)]" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">SmartVendr</span>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-14">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1.5">
                Welcome back 👋
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Sign in to your SmartVendr account to continue.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    required
                    autoComplete="email"
                    className="input-base pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                    className="input-base pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-default)] text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                  Keep me signed in for 30 days
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            {/* Footer */}
            <p className="mt-8 text-center text-xs text-[var(--text-tertiary)]">
              Design by{' '}
              <a
                href="https://github.com/saanii929-sudo"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                Shani Iddris
              </a>
              {' '}· SmartVendr © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
