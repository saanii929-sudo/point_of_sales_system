'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { BranchSelector } from '@/components/dashboard/BranchSelector';
import { OfflineBanner, OnlineStatusIndicator } from '@/components/ui/OfflineBanner';
import { prefetchOfflineData } from '@/lib/offlineDataCache';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Factory,
  DollarSign, RotateCcw, Users, UserCircle, Wallet, TrendingUp,
  Settings, Moon, Sun, LogOut, Menu, X, Calendar, Tag,
  ChevronLeft, ChevronRight, Clock, AlertTriangle, GitBranch, Building2, Plus,
  Star, Activity, Bell,
} from 'lucide-react';
import type { SubscriptionState } from '@/lib/subscription';

// ── Types ──────────────────────────────────────────────────
interface Branding {
  businessName:   string;
  primaryColor:   string;
  secondaryColor: string;
  accentColor:    string;
  logoUrl:        string | null;
  faviconUrl:     string | null;
  companyTagline: string;
}

interface NavSection {
  label: string;
  items: { name: string; href: string; icon: React.ElementType }[];
}

// ── Navigation config by role ──────────────────────────────
function getNavSections(role: string): NavSection[] {
  if (role === 'cashier') {
    return [
      { label: 'Main', items: [
        { name: 'POS Terminal', href: '/dashboard/pos',       icon: ShoppingCart },
        { name: 'Sales',        href: '/dashboard/sales',     icon: DollarSign },
        { name: 'Customers',   href: '/dashboard/customers',  icon: Users },
      ]},
    ];
  }

  if (role === 'inventory_staff') {
    return [
      { label: 'Inventory', items: [
        { name: 'Products',         href: '/dashboard/products',  icon: Package },
        { name: 'Expiring Products',href: '/dashboard/expiring',  icon: Calendar },
        { name: 'Inventory',        href: '/dashboard/inventory', icon: BarChart3 },
        { name: 'Suppliers',        href: '/dashboard/suppliers', icon: Factory },
      ]},
    ];
  }

  const sections: NavSection[] = [
    { label: 'Main', items: [
      { name: 'Dashboard',    href: '/dashboard',       icon: LayoutDashboard },
      { name: 'POS Terminal', href: '/dashboard/pos',   icon: ShoppingCart },
    ]},
    { label: 'Inventory', items: [
      { name: 'Products',          href: '/dashboard/products',  icon: Package },
      { name: 'Expiring Products', href: '/dashboard/expiring',  icon: Calendar },
      { name: 'Inventory',         href: '/dashboard/inventory', icon: BarChart3 },
      { name: 'Suppliers',         href: '/dashboard/suppliers', icon: Factory },
    ]},
    { label: 'Sales & Finance', items: [
      { name: 'Sales',           href: '/dashboard/sales',     icon: DollarSign },
      { name: 'Returns',         href: '/dashboard/returns',   icon: RotateCcw  },
      { name: 'Discounts',       href: '/dashboard/discounts', icon: Tag        },
      { name: 'Payroll',         href: '/dashboard/payroll',   icon: Wallet     },
      { name: 'Loyalty Program', href: '/dashboard/loyalty',   icon: Star       },
    ]},
    { label: 'Team & Customers', items: [
      { name: 'Customers', href: '/dashboard/customers', icon: Users      },
      { name: 'Employees', href: '/dashboard/employees', icon: UserCircle },
    ]},
    { label: 'Analytics', items: [
      { name: 'Reports',       href: '/dashboard/reports',       icon: TrendingUp },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell       },
    ]},
  ];

  if (role === 'business_owner' || role === 'manager') {
    sections.push({
      label: 'Settings',
      items: [
        { name: 'Branches',     href: '/dashboard/branches', icon: GitBranch },
        { name: 'Activity Log', href: '/dashboard/activity', icon: Activity  },
        ...(role === 'business_owner' ? [{ name: 'Settings', href: '/dashboard/settings', icon: Settings }] : []),
      ],
    });
  }

  return sections;
}

// ── Path → page title ──────────────────────────────────────
function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/dashboard':           'Dashboard',
    '/dashboard/pos':       'POS Terminal',
    '/dashboard/products':  'Products',
    '/dashboard/expiring':  'Expiring Products',
    '/dashboard/inventory': 'Inventory',
    '/dashboard/suppliers': 'Suppliers',
    '/dashboard/sales':     'Sales',
    '/dashboard/returns':   'Returns',
    '/dashboard/discounts': 'Discounts',
    '/dashboard/payroll':   'Payroll',
    '/dashboard/customers': 'Customers',
    '/dashboard/employees': 'Employees',
    '/dashboard/reports':   'Reports',
    '/dashboard/settings':  'Settings',
    '/dashboard/branches':     'Branch Management',
    '/dashboard/loyalty':      'Loyalty Program',
    '/dashboard/activity':     'Activity Log',
    '/dashboard/notifications':'Notifications',
  };
  return map[pathname] ?? 'Dashboard';
}

// ── Helpers ────────────────────────────────────────────────
const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
};

// ── Component ──────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout } = useAuthStore();
  const { theme, toggleTheme }    = useThemeStore();

  const [subscription,   setSubscription]   = useState<SubscriptionState | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed,  setIsCollapsed]  = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [branding,       setBranding]       = useState<Branding | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [,    setNotifUnread]    = useState(0);
  // Onboarding gate: owner must create a branch before using the app
  const [branchGate, setBranchGate] = useState(false);

  // Dismiss gate when a branch is created
  useEffect(() => {
    const handler = () => setBranchGate(false);
    window.addEventListener('branch-created', handler);
    return () => window.removeEventListener('branch-created', handler);
  }, []);

  // Apply branding colors to CSS vars
  const applyBrandingColors = useCallback((b: Branding) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color',   b.primaryColor);
    root.style.setProperty('--secondary-color', b.secondaryColor);
    root.style.setProperty('--accent-color',    b.accentColor);
    const p = hexToRgb(b.primaryColor);
    const s = hexToRgb(b.secondaryColor);
    const a = hexToRgb(b.accentColor);
    if (p) {
      root.style.setProperty('--primary-rgb',   `${p.r}, ${p.g}, ${p.b}`);
      root.style.setProperty('--brand-50',  `rgba(${p.r}, ${p.g}, ${p.b}, 0.05)`);
      root.style.setProperty('--brand-100', `rgba(${p.r}, ${p.g}, ${p.b}, 0.10)`);
    }
    if (s) root.style.setProperty('--secondary-rgb', `${s.r}, ${s.g}, ${s.b}`);
    if (a) root.style.setProperty('--accent-rgb',    `${a.r}, ${a.g}, ${a.b}`);
  }, []);

  // Session validation
  const validateSession = useCallback(async () => {
    try {
      const res  = await fetch('/api/auth/session');
      const data = res.ok ? await res.json() : {};
      setUser(data.user ?? null);
      if (data.subscription) setSubscription(data.subscription);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  // Fetch branding
  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/business/branding');
      if (res.ok) {
        const data = await res.json();
        if (data.branding) {
          setBranding(data.branding);
          applyBrandingColors(data.branding);
        }
      }
    } catch {
      // silent fail
    }
  }, [applyBrandingColors]);


  useEffect(() => { validateSession(); }, [validateSession]);

  useEffect(() => {
    if (!isLoading) {
      if (!user)                            router.push('/login');
      else if (user.role === 'super_admin') router.push('/superadmin');
      else if (subscription && !subscription.isActive) {
        router.push('/subscription-expired');
      } else {
        fetchBranding();
        // Check onboarding gate for business owners
        if (user.role === 'business_owner') {
          fetch('/api/branches')
            .then(r => r.json())
            .then(d => { if ((d.branches?.length ?? 0) === 0) setBranchGate(true); })
            .catch(() => {});
        }
        // Refresh offline data cache in background
        try { prefetchOfflineData().catch(() => {}); } catch {}
      }
    }
  }, [user, router, isLoading, subscription, fetchBranding]);

  // Listen for branding updates from settings
  useEffect(() => {
    const handler = (e: Event) => {
      const b = (e as CustomEvent<Branding>).detail;
      setBranding(b);
      applyBrandingColors(b);
    };
    window.addEventListener('brandingUpdated', handler);
    return () => window.removeEventListener('brandingUpdated', handler);
  }, [applyBrandingColors]);

  // Desktop resize
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setIsMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Persist collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(c => {
      const next = !c;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  // ── Loading skeleton ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto animate-pulse">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-2.5 w-28 mx-auto rounded" />
            <div className="skeleton h-2 w-20 mx-auto rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ── Branch onboarding gate ─────────────────────────────
  if (branchGate && pathname !== '/dashboard/branches') {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-6">
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] max-w-md w-full p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Set Up Your First Branch</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
              Before you can start selling, managing inventory, or adding employees, you need to create at least one branch for your business.
            </p>
          </div>
          <Link
            href="/dashboard/branches"
            onClick={() => setBranchGate(false)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Create Your First Branch
          </Link>
          <p className="text-xs text-[var(--text-tertiary)]">
            You can add more branches later from Branch Management.
          </p>
        </div>
      </div>
    );
  }

  const navSections = getNavSections(user.role);
  const pageTitle   = getPageTitle(pathname);
  const primaryColor   = branding?.primaryColor   ?? '#10b981';
  const secondaryColor = branding?.secondaryColor ?? '#059669';

  const userInitials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <CommandPalette />

      {/* ── Offline banner ── */}
      <OfflineBanner />

      {/* NotificationCenter handles its own dropdown panel */}

      {/* ── Mobile overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen flex flex-col
          bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]
          sidebar-transition sidebar-scroll
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ width: isCollapsed ? '72px' : '260px' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-3 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.businessName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
              )}
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate leading-none">
                    {branding?.businessName || 'SmartVendr'}
                  </p>
                  {branding?.companyTagline && (
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{branding.companyTagline}</p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile close */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)] transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Branch selector */}
        {user.role !== 'inventory_staff' && (
          <div className="flex-shrink-0 pt-2 relative">
            <BranchSelector collapsed={isCollapsed} />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 sidebar-scroll">
          {navSections.map(section => (
            <div key={section.label} className={isCollapsed ? 'mb-2' : 'mb-4'}>
              {!isCollapsed && <p className="section-label">{section.label}</p>}
              {isCollapsed && section.label !== navSections[0].label && (
                <div className="my-2 border-t border-[var(--border-subtle)]" />
              )}
              {section.items.map(item => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    onClick={() => { if (window.innerWidth < 1024) setIsMobileOpen(false); }}
                    className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0 w-full' : ''}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-2 pb-3 pt-2 border-t border-[var(--border-subtle)] space-y-2">
          {/* Online status */}
          {!isCollapsed && (
            <div className="px-3 py-1">
              <OnlineStatusIndicator />
            </div>
          )}

          {/* User info */}
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[var(--bg-surface-2)] ${isCollapsed ? 'flex-col py-2' : ''}`}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-none">{user.name}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] capitalize truncate mt-0.5">{user.role.replace(/_/g, ' ')}</p>
              </div>
            )}
            <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full items-center justify-center hover:bg-[var(--bg-surface-2)] transition-colors z-50"
        >
          {isCollapsed
            ? <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            : <ChevronLeft  className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
        </button>
      </aside>

      {/* ── Main content ── */}
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-300 ${
          isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 lg:px-6 gap-4">
          {/* Hamburger (mobile) + collapse toggle visual feedback */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{pageTitle}</h2>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Online status */}
            <div className="hidden sm:block">
              <OnlineStatusIndicator />
            </div>

            {/* Date */}
            <span className="hidden md:block text-xs font-medium text-[var(--text-tertiary)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>

            {/* Command palette hint */}
            <div
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-2)] cursor-pointer transition-colors"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}
            >
              <span>⌘K</span>
            </div>

            {/* Notifications */}
            <NotificationCenter onUnreadChange={setNotifUnread} />

            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              title={user.name}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Trial / expiry banner */}
        {subscription?.isTrial && subscription.daysLeft <= 14 && (
          <div className={`flex items-center gap-3 px-4 lg:px-6 py-2.5 text-sm font-medium ${
            subscription.daysLeft <= 3
              ? 'bg-red-500 text-white'
              : subscription.daysLeft <= 7
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-800 border-b border-amber-200'
          }`}>
            {subscription.daysLeft <= 3 ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Clock className="w-4 h-4 flex-shrink-0" />
            )}
            <span>
              {subscription.daysLeft === 0
                ? 'Your free trial expires today.'
                : `Your free trial expires in ${subscription.daysLeft} day${subscription.daysLeft === 1 ? '' : 's'}.`}
              {' '}Contact the admin to subscribe and keep full access.
            </span>
          </div>
        )}

        {/* Page content — fade-in on route change */}
        <main className="flex-1 p-4 lg:p-6 animate-fade-in" key={pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}
