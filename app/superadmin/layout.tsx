'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Button } from '@/components/ui/Button';
import { OnlineStatusIndicator } from '@/components/ui/OfflineBanner';
import toast from 'react-hot-toast';
import {
  Crown,
  Building2,
  CreditCard,
  Mail,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  LayoutDashboard,
  Shield,
  Bell,
} from 'lucide-react';

const navigation = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard',     href: '/superadmin',              icon: LayoutDashboard },
      { name: 'Businesses',    href: '/superadmin/businesses',   icon: Building2 },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Subscription Plans', href: '/superadmin/plans',    icon: CreditCard },
      { name: 'Contact Submissions', href: '/superadmin/contacts', icon: Mail },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, setUser, logout } = useAuthStore();
  const { theme, toggleTheme }    = useThemeStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);

  // Desktop sidebar open by default
  useEffect(() => {
    const onResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { validateSession(); }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user)                         router.push('/login');
      else if (user.role !== 'super_admin') router.push('/dashboard');
    }
  }, [user, router, isLoading]);

  const validateSession = async () => {
    try {
      const res  = await fetch('/api/auth/session');
      const data = res.ok ? await res.json() : {};
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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

  // ── Loading skeleton ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto shadow-xl">
            <Crown className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1.5">
            <div className="skeleton h-2.5 w-32 mx-auto rounded" />
            <div className="skeleton h-2 w-20 mx-auto rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') return null;

  const userInitials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SA';

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">

      {/* ── Mobile overlay ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen flex flex-col
          sidebar-transition sidebar-scroll
          w-[260px] bg-[var(--bg-surface)]
          border-r border-[var(--border-subtle)]
          shadow-[var(--shadow-elevated)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md flex-shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)] leading-none">Super Admin</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Platform Control</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navigation.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="section-label">{section.label}</p>
              {section.items.map((item) => {
                const isActive =
                  item.href === '/superadmin'
                    ? pathname === '/superadmin'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
          {/* Online status */}
          <div className="px-3 py-1.5">
            <OnlineStatusIndicator />
          </div>

          {/* User info */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">Super Administrator</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors"
                title="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-[var(--text-tertiary)] hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="lg:ml-[260px] flex flex-col min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 lg:px-6 gap-4">
          {/* Hamburger */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Platform badge */}
          <div className="flex-1 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-[var(--text-secondary)]">
                Platform Administration
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <OnlineStatusIndicator />
            <span className="hidden md:block text-sm text-[var(--text-tertiary)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <div className="px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-700 text-white rounded-full text-xs font-bold">
              Super Admin
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
