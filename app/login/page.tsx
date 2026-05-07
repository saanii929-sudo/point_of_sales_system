'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { prefetchOfflineData } from '@/lib/offlineDataCache';
import toast from 'react-hot-toast';
import {
  Store, Mail, Lock, Eye, EyeOff, ArrowLeft,
  CheckCircle2, Zap, WifiOff, BarChart3, ArrowRight, Sun, Moon,
  AlertCircle, HelpCircle,
} from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

const featureHighlights = [
  { icon: Zap,          text: 'Process sales in under 3 seconds' },
  { icon: WifiOff,      text: 'Works fully offline, syncs on reconnect' },
  { icon: BarChart3,    text: 'Real-time analytics & insights' },
  { icon: CheckCircle2, text: 'Role-based access for your whole team' },
];

const REMEMBER_KEY = 'sv_remember_email';

function FieldError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
      <span className="text-xs font-medium text-red-600 dark:text-red-400">{msg}</span>
    </div>
  );
}

export default function LoginPage() {
  const router  = useRouter();
  const setUser = useAuthStore(state => state.setUser);

  const [isLoading,   setIsLoading]   = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [formData,    setFormData]    = useState({ email: '', password: '' });
  const [errors,      setErrors]      = useState<{ email?: string; password?: string }>({});
  const [mounted,     setMounted]     = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const isDev = process.env.NODE_ENV === 'development';

  // On mount: hydrate theme + restore saved email
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setFormData(f => ({ ...f, email: saved }));
      setRememberMe(true);
    }
  }, []);

  // ── Inline validation ──────────────────────────────────
  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 4) {
      errs.password = 'Password must be at least 4 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearError = (field: 'email' | 'password') =>
    setErrors(e => ({ ...e, [field]: undefined }));

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    // Offline login
    if (!isOnline) {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        try {
          const { state } = JSON.parse(stored);
          if (state?.user?.email === formData.email) {
            setUser(state.user);
            if (rememberMe) localStorage.setItem(REMEMBER_KEY, formData.email);
            else localStorage.removeItem(REMEMBER_KEY);
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

      if (!res.ok) {
        // Map API errors to inline field errors
        const msg: string = data.error || 'Login failed';
        if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('user') || msg.toLowerCase().includes('found')) {
          setErrors({ email: msg });
        } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('incorrect')) {
          setErrors({ password: 'Incorrect password. Please try again.' });
        } else {
          toast.error(msg);
        }
        return;
      }

      // Persist email if remember me
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, formData.email);
      else localStorage.removeItem(REMEMBER_KEY);

      setUser(data.user);
      toast.success('Welcome back! 🎉');
      prefetchOfflineData().catch(() => {});

      const roleMap: Record<string, string> = {
        super_admin:     '/superadmin',
        cashier:         '/dashboard/pos',
        inventory_staff: '/dashboard/products',
      };
      window.location.href = roleMap[data.user.role] ?? '/dashboard';
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (hasErr?: string) =>
    `input-base pl-10 transition-all duration-150 ${hasErr ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30 bg-red-50/50 dark:bg-red-950/10' : ''}`;

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">

      {/* ── Left panel ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-5/12 relative flex-col bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden p-10">

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
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

            {/* Feature bullets — skeleton until mounted */}
            <div className="space-y-3.5 mb-12">
              {featureHighlights.map(({ icon: Icon, text }, i) =>
                !mounted ? (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse flex-shrink-0" />
                    <div className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${60 + i * 15}%` }} />
                  </div>
                ) : (
                  <div key={text} className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-300">{text}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600">
            © {new Date().getFullYear()} SmartVendr · Built for modern businesses
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ─────────────────────── */}
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
          <div className="w-full max-w-md animate-fade-in-up">

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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className={`w-4 h-4 ${errors.email ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                  </div>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={e => { setFormData(f => ({ ...f, email: e.target.value })); clearError('email'); }}
                    autoComplete="email"
                    className={inputCls(errors.email)}
                  />
                </div>
                {errors.email && <FieldError msg={errors.email} />}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-[var(--text-primary)]">Password</label>
                  <button
                    type="button"
                    onClick={() => toast('Contact your admin to reset your password.', { icon: '🔑', duration: 4000 })}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className={`w-4 h-4 ${errors.password ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={e => { setFormData(f => ({ ...f, password: e.target.value })); clearError('password'); }}
                    autoComplete="current-password"
                    className={`${inputCls(errors.password)} pr-11`}
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
                {errors.password && <FieldError msg={errors.password} />}
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
                className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
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

            {/* Register link */}
            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Register your business
              </Link>
            </p>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
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
