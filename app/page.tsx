'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store, Menu, X, ArrowRight, CheckCircle2, Package, BarChart3,
  Shield, Zap, Users, Wifi, TrendingUp, Star, ChevronDown, ChevronUp,
  Mail, Phone, MapPin, Play, ShoppingCart, DollarSign, Clock,
  Check, Activity, Globe, Sparkles, Sun, Moon,
} from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast POS',
    desc: 'Process transactions in under 3 seconds with our optimized checkout flow. Barcode scanning, quick search, and one-tap products.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
  {
    icon: Package,
    title: 'Smart Inventory',
    desc: 'Real-time stock tracking with automatic low-stock alerts, expiry date monitoring, and multi-supplier management.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    icon: BarChart3,
    title: 'Rich Analytics',
    desc: 'Interactive dashboards with revenue trends, top products, employee performance, and category breakdowns.',
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    desc: 'Build lasting relationships. Track purchase history, lifetime value, visit frequency, and loyalty rewards.',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: Wifi,
    title: 'Works Offline',
    desc: 'Never lose a sale. SmartVendr keeps working without internet and automatically syncs when you reconnect.',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    desc: 'Role-based access control, JWT authentication, audit logs, and multi-tenant data isolation keep your business safe.',
    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  },
];

const faqs = [
  {
    q: 'Does SmartVendr work without internet?',
    a: 'Yes! SmartVendr is built offline-first. All sales, cart data, and product lookups work locally via IndexedDB. When you reconnect, everything syncs automatically with zero data loss.',
  },
  {
    q: 'Can I manage multiple store locations?',
    a: 'Absolutely. SmartVendr supports multi-branch setups with per-branch inventory, staff management, and consolidated reporting across all your locations.',
  },
  {
    q: 'How does the role-based access work?',
    a: 'You can assign roles: Business Owner (full access), Manager, Cashier (POS only), and Inventory Staff. Each role sees only what they need — keeping your data secure.',
  },
  {
    q: 'What payment methods does it support?',
    a: 'Cash, card, and split payments are all supported at the POS terminal. Discount codes, returns, and buy-now-pay-later transactions are also built in.',
  },
  {
    q: 'Is my business data safe?',
    a: 'Each business is completely isolated in a multi-tenant architecture. Your data is encrypted, never shared with other tenants, and backed up continuously.',
  },
];

const plans = [
  {
    name: 'Starter',
    icon: Package,
    price: { monthly: 29, yearly: 23 },
    desc: 'Perfect for small businesses just getting started.',
    color: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    features: [
      '1 store location',
      'Up to 500 products',
      '3 staff accounts',
      'Basic POS terminal',
      'Sales reports',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    icon: TrendingUp,
    price: { monthly: 65, yearly: 52 },
    desc: 'Everything you need to scale your retail operations.',
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    features: [
      '5 store locations',
      'Unlimited products',
      '15 staff accounts',
      'Advanced POS + offline mode',
      'Full analytics dashboard',
      'Customer CRM & loyalty',
      'Discount & return management',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    icon: Globe,
    price: { monthly: 129, yearly: 103 },
    desc: 'White-label, API access, and unlimited everything.',
    color: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    features: [
      'Unlimited locations',
      'Unlimited products & staff',
      'White-label branding',
      'REST API access',
      'Dedicated account manager',
      'SLA uptime guarantee',
      'Custom integrations',
      '24/7 phone support',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const testimonials = [
  {
    quote: "SmartVendr transformed how we run our three coffee shops. The offline mode alone saved us during a 4-hour internet outage — we didn't miss a single sale.",
    name: 'Ama Asante',
    role: 'Owner',
    company: 'Brew & Bean Co.',
    avatar: 'AA',
    rating: 5,
  },
  {
    quote: "The analytics dashboard gives me insights I never had before. I can see exactly which products drive profit and which are dead stock within seconds.",
    name: 'Kwame Osei',
    role: 'Retail Manager',
    company: 'TechMart Ghana',
    avatar: 'KO',
    rating: 5,
  },
  {
    quote: "Setting up took less than an hour. My cashiers needed zero training — the POS is that intuitive. The multi-location inventory sync is a game-changer.",
    name: 'Fatima Mensah',
    role: 'Operations Director',
    company: 'FreshMart Superstore',
    avatar: 'FM',
    rating: 5,
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Thank you! We will be in touch within 24 hours.');
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">

      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[var(--bg-surface)]/90 backdrop-blur-xl shadow-[var(--shadow-card)] border-b border-[var(--border-subtle)]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-emerald-500/30 transition-shadow">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[var(--text-primary)] leading-none block">SmartVendr</span>
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase">Smart Selling</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            {['Features', 'Pricing', 'FAQ', 'Contact'].map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--text-secondary)]" /> : <Moon className="w-5 h-5 text-[var(--text-secondary)]" />}
            </button>
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-surface-2)]">
              Sign in
            </Link>
            <Link href="/login" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-md hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-5 py-4 space-y-1 animate-fade-in-down">
            {['Features', 'Pricing', 'FAQ', 'Contact'].map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors"
              >
                {l}
              </a>
            ))}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <Link href="/login" className="px-3 py-2.5 text-sm font-semibold text-center text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] rounded-lg transition-colors">Sign in</Link>
              <Link href="/login" className="px-3 py-2.5 text-sm font-semibold text-center text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section id="home" className="pt-28 pb-20 px-5 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/6 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <div className="space-y-7 animate-fade-in-up">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Trusted by 320+ businesses worldwide
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold text-[var(--text-primary)] leading-[1.05] tracking-tight">
                The intelligent<br />
                <span className="text-gradient">point of sale</span><br />
                for modern teams.
              </h1>

              <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                SmartVendr combines a beautiful POS terminal, real-time analytics, and offline-first architecture into one platform your whole team will love.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-2)] transition-all">
                  <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                  Watch Demo
                </button>
              </div>

              <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-500" /> No credit card required</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-500" /> 14-day free trial</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-500" /> Cancel anytime</span>
              </p>
            </div>

            {/* Right — Dashboard mockup */}
            <div className="relative animate-fade-in delay-200">
              <div className="relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-floating)] overflow-hidden animate-float">
                {/* Mockup header */}
                <div className="bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)] px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 mx-3 h-5 bg-[var(--bg-surface-3)] rounded-md" />
                </div>
                {/* Mockup content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] font-medium">Today's Revenue</p>
                      <p className="text-2xl font-bold text-[var(--text-primary)] mt-0.5">$12,840.50</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">↑ 18.4%</span>
                  </div>
                  {/* Mini chart bars */}
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-400 opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Transactions', value: '247', icon: ShoppingCart },
                      { label: 'Customers', value: '89',  icon: Users },
                      { label: 'Net Profit',  value: '$3.2K', icon: TrendingUp },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-[var(--bg-surface-2)] rounded-xl p-3">
                        <Icon className="w-4 h-4 text-emerald-500 mb-1" />
                        <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Recent items */}
                  {[
                    { name: 'iPhone 15 Case',     amount: '$24.99', status: 'Sold' },
                    { name: 'AirPods Pro',         amount: '$189.00', status: 'Sold' },
                    { name: 'USB-C Cable (3pk)',   amount: '$34.99', status: 'Sold' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                          <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--text-primary)]">{item.amount}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 shadow-[var(--shadow-elevated)] animate-float delay-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Offline Mode</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">Always available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <section className="py-12 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Store,      value: '320+',   label: 'Retail Stores' },
                { icon: Users,      value: '92K+',   label: 'Active Users' },
                { icon: DollarSign, value: '$2.4M',  label: 'Daily Transactions' },
                { icon: Activity,   value: '99.9%',  label: 'Uptime Guarantee' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center text-white">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-extrabold leading-none">{value}</div>
                  <div className="text-sm text-emerald-100 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
              <Sparkles className="w-4 h-4" />
              Built for real businesses
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Everything you need to sell smarter
            </h2>
            <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              SmartVendr packs enterprise-grade features into a platform that&apos;s simple enough for any team to use from day one.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] hover:border-[var(--border-default)] transition-all duration-250 group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="py-20 px-5 bg-[var(--bg-surface)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-full text-sm font-semibold text-blue-700 dark:text-blue-400 mb-4">
            <Clock className="w-4 h-4" />
            Up and running in minutes
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-12">How it works</h2>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[25%] right-[25%] h-0.5 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300 dark:from-emerald-800 dark:to-emerald-800" />

            {[
              { step: '01', icon: Store,       title: 'Set up your store',    desc: 'Create your business profile, add your logo, and configure your tax rates and currency in minutes.' },
              { step: '02', icon: Package,     title: 'Add your products',    desc: 'Import products via CSV or add them one by one. Set prices, manage stock levels, and organize categories.' },
              { step: '03', icon: ShoppingCart, title: 'Start selling',       desc: 'Your POS terminal is ready. Process sales, accept payments, print receipts, and watch your analytics grow.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative z-10 w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
                  <Icon className="w-7 h-7 text-white" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--bg-surface)] border-2 border-emerald-500 rounded-full flex items-center justify-center text-[10px] font-extrabold text-emerald-600">
                    {step.replace('0', '')}
                  </div>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
              Loved by business owners
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">Real results from real businesses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] transition-all duration-250">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{t.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-5 bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-7">Start free. Upgrade when you&apos;re ready. Cancel anytime.</p>
            {/* Toggle */}
            <div className="inline-flex items-center gap-3 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-xl p-1">
              {(['monthly', 'yearly'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setBillingCycle(c)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    billingCycle === c
                      ? 'bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {c === 'monthly' ? 'Monthly' : 'Yearly'}
                  {c === 'yearly' && (
                    <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      SAVE 20%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-7 transition-all duration-250 ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-[var(--shadow-brand)] scale-[1.03]'
                    : 'bg-[var(--bg-page)] border border-[var(--border-subtle)] hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-400 text-amber-900 rounded-full text-xs font-bold shadow-md">
                    ⭐ Most Popular
                  </div>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${plan.highlight ? 'bg-white/20' : plan.iconBg}`}>
                  <plan.icon className={`w-5 h-5 ${plan.highlight ? 'text-white' : plan.color}`} />
                </div>
                <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>{plan.name}</h3>
                <p className={`text-sm mb-5 ${plan.highlight ? 'text-emerald-100' : 'text-[var(--text-secondary)]'}`}>{plan.desc}</p>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                    ${plan.price[billingCycle]}
                  </span>
                  <span className={`text-sm ml-1 ${plan.highlight ? 'text-emerald-200' : 'text-[var(--text-tertiary)]'}`}>/mo</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-emerald-200' : 'text-emerald-500'}`} />
                      <span className={plan.highlight ? 'text-emerald-50' : 'text-[var(--text-secondary)]'}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-all ${
                    plan.highlight
                      ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-emerald-500/25 hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mb-3">
              Frequently asked questions
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">Can&apos;t find what you&apos;re looking for? Contact our team.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[var(--bg-surface-2)] transition-colors"
                >
                  <span className="font-semibold text-[var(--text-primary)]">{faq.q}</span>
                  {expandedFaq === i
                    ? <ChevronUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)] pt-4 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ─────────────────────────────────────── */}
      <section className="py-20 px-5 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
            Ready to transform your business?
          </h2>
          <p className="text-lg text-emerald-100 mb-8">
            Join 320+ businesses already selling smarter with SmartVendr. Get started free — no credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-emerald-700 bg-white rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-emerald-200">14-day free trial · No credit card · Full access</p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────── */}
      <section id="contact" className="py-20 px-5 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* Left */}
            <div className="space-y-7">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
                  <Mail className="w-4 h-4" />
                  Contact Us
                </div>
                <h2 className="text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                  Have questions? We&apos;d love to hear from you.
                </h2>
                <p className="mt-3 text-[var(--text-secondary)] leading-relaxed">
                  Whether you need help choosing a plan, setting up your store, or have a technical question — our team is here for you.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: MapPin, label: 'Find Us',         value: 'O.A Street, Asafo, Kumasi, Ghana' },
                  { icon: Phone,  label: 'Call Us',         value: '+233 55 273 2025' },
                  { icon: Mail,   label: 'Email Us',        value: 'hello@smartvendr.app' },
                  { icon: Clock,  label: 'Business Hours',  value: 'Mon–Fri, 8am–6pm GMT' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] font-medium">{label}</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Form */}
            <div className="bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-[var(--shadow-soft)]">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">Send us a message</h3>
              <form onSubmit={handleContact} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {['Name', 'Email address'].map(field => (
                    <input
                      key={field}
                      type={field === 'Email address' ? 'email' : 'text'}
                      placeholder={field}
                      required
                      value={field === 'Name' ? contactForm.name : contactForm.email}
                      onChange={e => setContactForm(f => field === 'Name' ? { ...f, name: e.target.value } : { ...f, email: e.target.value })}
                      className="input-base"
                    />
                  ))}
                </div>
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-base"
                />
                <textarea
                  rows={5}
                  placeholder="Tell us how we can help..."
                  required
                  value={contactForm.message}
                  onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                  className="input-base resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="bg-slate-900 dark:bg-[var(--bg-surface)] text-white py-16 px-5 border-t border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">SmartVendr</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                The intelligent point of sale system that makes selling smarter, faster, and more profitable for modern businesses.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['POS Terminal', 'Inventory', 'Analytics', 'Customers', 'Payroll'],
              },
              {
                title: 'Company',
                links: ['About Us', 'Blog', 'Careers', 'Privacy Policy', 'Terms of Use'],
              },
              {
                title: 'Support',
                links: ['Documentation', 'API Reference', 'Status Page', 'Contact Us', 'Community'],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-bold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} SmartVendr. All rights reserved. Built with ❤️ for smart businesses.
            </p>
            <p className="text-sm text-slate-500">
              Designed & built by{' '}
              <a href="https://github.com/saanii929-sudo" target="_blank" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">Shani Iddris</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
