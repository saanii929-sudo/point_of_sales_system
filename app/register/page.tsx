'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Store, Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  User, Phone, Building2, Sun, Moon, Check, Package,
  TrendingUp, Globe, ChevronRight, Loader2, Clock,
} from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

interface Plan {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  features: string[];
  limits: { maxEmployees: number; maxBranches: number; maxProducts: number };
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter:      Package,
  professional: TrendingUp,
  enterprise:   Globe,
};

const PLAN_COLORS: Record<string, { ring: string; badge: string; icon: string }> = {
  starter:      { ring: 'border-slate-300 dark:border-slate-600',   badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',   icon: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  professional: { ring: 'border-emerald-500',                        badge: 'bg-emerald-500 text-white',                                            icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' },
  enterprise:   { ring: 'border-violet-400 dark:border-violet-500',  badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' },
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

// ── Password strength ──────────────────────────────────────
function getPasswordStrength(p: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (p.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  return { score: 3, label: 'Strong', color: '#10b981' };
}

// ── Phone formatter ────────────────────────────────────────
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

// ── Inline field error ─────────────────────────────────────
function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0">!</span>
      {msg}
    </p>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useThemeStore();

  const [step,      setStep]      = useState<1 | 2>(1);
  const [plans,     setPlans]     = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selected,  setSelected]  = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [billing,   setBilling]   = useState<'monthly' | 'yearly'>('monthly');
  const [form, setForm] = useState({ businessName: '', name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [registrationPending, setRegistrationPending] = useState(false);

  const passwordStrength = getPasswordStrength(form.password);

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = f === 'phone' ? formatPhone(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [f]: val }));
    setErrors(prev => ({ ...prev, [f]: undefined }));
  };

  useEffect(() => {
    const preselect = searchParams.get('plan');
    fetch('/api/public/plans')
      .then(r => r.json())
      .then(d => {
        const list: Plan[] = d.plans ?? [];
        setPlans(list);
        const match = preselect ? list.find(p => p.name === preselect) : null;
        const def   = match ?? list.find(p => p.name === 'professional') ?? list[0] ?? null;
        setSelected(def);
        if (match) setStep(2);
      })
      .catch(() => toast.error('Could not load plans'))
      .finally(() => setPlansLoading(false));
  }, [searchParams]);

  const validateStep2 = (): boolean => {
    const errs: typeof errors = {};
    if (!form.businessName.trim()) errs.businessName = 'Business name is required.';
    if (!form.name.trim()) errs.name = 'Your name is required.';
    if (!form.email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planName: selected?.name ?? 'starter' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setRegistrationPending(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const yearlyPrice = (p: Plan) => Math.round(p.price * 0.8);

  if (registrationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-3">Registration Received!</h1>
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
            Your account for <span className="font-semibold text-[var(--text-primary)]">{form.businessName}</span> has been submitted successfully.
            <br /><br />
            Before you can log in, you need to <span className="font-semibold text-[var(--text-primary)]">meet with our admin</span> to agree on payment terms and complete your onboarding. Once payment is confirmed, your account will be activated.
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Next steps</p>
            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
              Contact the SmartVendr admin to schedule your onboarding meeting.
            </div>
            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
              Agree on your subscription plan and make payment.
            </div>
            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
              The admin will approve your account and you can log in.
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:-translate-y-0.5 transition-all"
          >
            Go to Login
          </Link>
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">
            Registered email: <span className="font-medium">{form.email}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-page)]">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-5/12 relative flex-col bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden p-10">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white leading-none block">SmartVendr</span>
              <span className="text-[10px] font-semibold text-emerald-400/80 tracking-widest uppercase">Smart Selling</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center py-12">
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
              {step === 1 ? <>Pick your plan,<br /><span className="text-emerald-400">start for free.</span></> : <>Almost there,<br /><span className="text-emerald-400">set up your store.</span></>}
            </h2>
            <p className="text-base text-slate-300 leading-relaxed mb-8 max-w-xs">
              {step === 1
                ? 'Every plan starts with a 14-day free trial. No credit card required. Upgrade or cancel anytime.'
                : `You selected the ${selected?.displayName ?? 'Starter'} plan. Fill in your details and you\'ll be selling in minutes.`}
            </p>
            {selected && step === 2 && (
              <div className="bg-white/8 border border-white/12 rounded-2xl p-5 max-w-xs">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Your selected plan</p>
                <p className="text-xl font-extrabold text-white mb-1">{selected.displayName}</p>
                <p className="text-sm text-slate-400 mb-4">{selected.description}</p>
                <div className="space-y-2">
                  {selected.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(1)} className="mt-4 text-xs text-emerald-400 hover:underline">
                  Change plan →
                </button>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-600">© {new Date().getFullYear()} SmartVendr · Built for modern businesses</div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:px-10 flex-shrink-0">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--text-secondary)]" /> : <Moon className="w-5 h-5 text-[var(--text-secondary)]" />}
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center"><Store className="w-4 h-4 text-white" /></div>
              <span className="text-sm font-bold text-[var(--text-primary)]">SmartVendr</span>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="px-6 lg:px-10 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'}`}>
                {step > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              Choose plan
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-tertiary)]'}`}>2</span>
              Your details
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">

          {/* ── STEP 1: Plan selection ── */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">Choose your plan</h1>
                <p className="text-sm text-[var(--text-secondary)]">All plans include a 14-day free trial. No credit card needed.</p>
              </div>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-2 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-xl p-1 mb-6">
                {(['monthly', 'yearly'] as const).map(c => (
                  <button key={c} onClick={() => setBilling(c)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing === c ? 'bg-[var(--bg-surface)]' : 'text-[var(--text-secondary)]'}`}>
                    {c === 'monthly' ? 'Monthly' : 'Yearly'}
                    {c === 'yearly' && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">-20%</span>}
                  </button>
                ))}
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">No plans available. Please contact support.</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {plans.map(plan => {
                    const isSelected = selected?._id === plan._id;
                    const colors = PLAN_COLORS[plan.name] ?? PLAN_COLORS.starter;
                    const Icon = PLAN_ICONS[plan.name] ?? Package;
                    const isPro = plan.name === 'professional';
                    const displayPrice = billing === 'yearly' ? yearlyPrice(plan) : plan.price;
                    return (
                      <button key={plan._id} onClick={() => setSelected(plan)}
                        className={`relative text-left rounded-2xl border-2 p-5 transition-all hover:-translate-y-0.5 ${isSelected ? colors.ring + ' shadow' : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'} bg-[var(--bg-surface)]`}>
                        {isPro && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                            ⭐ Most Popular
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors.icon}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{plan.displayName}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mb-3 leading-relaxed">{plan.description}</p>
                        <div className="mb-4">
                          <span className="text-2xl font-extrabold text-[var(--text-primary)]">${displayPrice}</span>
                          <span className="text-xs text-[var(--text-tertiary)] ml-1">/mo</span>
                          {billing === 'yearly' && plan.price > 0 && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Billed ${yearlyPrice(plan) * 12}/yr</p>
                          )}
                        </div>
                        <ul className="space-y-1.5">
                          {plan.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => selected && setStep(2)}
                disabled={!selected || plansLoading}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Continue with {selected?.displayName ?? 'selected plan'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="mt-4 text-center text-xs text-[var(--text-tertiary)]">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Account details ── */}
          {step === 2 && (
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] mb-3 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
                </button>
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">Set up your account</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Plan: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selected?.displayName}</span>
                  {' · '}14-day free trial
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" noValidate>
                {/* Business name */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Business name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className={`w-4 h-4 ${errors.businessName ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                    <input type="text" placeholder="Acme Store" value={form.businessName} onChange={set('businessName')}
                      className={`input-base pl-10 ${errors.businessName ? 'border-red-400 bg-red-50/50 dark:bg-red-950/10' : ''}`} />
                  </div>
                  <FieldErr msg={errors.businessName} />
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Your full name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className={`w-4 h-4 ${errors.name ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                    <input type="text" placeholder="Jane Doe" value={form.name} onChange={set('name')}
                      className={`input-base pl-10 ${errors.name ? 'border-red-400 bg-red-50/50 dark:bg-red-950/10' : ''}`} />
                  </div>
                  <FieldErr msg={errors.name} />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className={`w-4 h-4 ${errors.email ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                    <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} autoComplete="email"
                      className={`input-base pl-10 ${errors.email ? 'border-red-400 bg-red-50/50 dark:bg-red-950/10' : ''}`} />
                  </div>
                  <FieldErr msg={errors.email} />
                </div>

                {/* Phone (formatted) */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                    Phone <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                    <input type="tel" placeholder="055 273 2025" value={form.phone} onChange={set('phone')} className="input-base pl-10" />
                  </div>
                </div>

                {/* Password + strength indicator */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className={`w-4 h-4 ${errors.password ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`} />
                    </div>
                    <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                      value={form.password} onChange={set('password')} autoComplete="new-password"
                      className={`input-base pl-10 pr-11 ${errors.password ? 'border-red-400 bg-red-50/50 dark:bg-red-950/10' : ''}`} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" tabIndex={-1}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldErr msg={errors.password} />
                  {/* Strength bar */}
                  {form.password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{ background: i <= passwordStrength.score ? passwordStrength.color : 'var(--bg-surface-3)' }} />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <p className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label} password
                          {passwordStrength.score === 1 && ' — add numbers and uppercase letters'}
                          {passwordStrength.score === 2 && ' — add special characters to strengthen'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-[var(--text-tertiary)]">
                  By creating an account you agree to our{' '}
                  <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms of Service</a> and{' '}
                  <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</a>.
                </p>
                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                  ) : (
                    <>Create Free Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
              <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">SmartVendr © {new Date().getFullYear()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
