'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { ShoppingCart, AlertCircle, Clock, ArrowRight, LogOut } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

export default function SubscriptionExpiredPage() {
  const { user, logout } = useAuthStore();
  const { theme } = useThemeStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-6">
      <div className="max-w-lg w-full">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-extrabold text-[var(--text-primary)]">SmartVendr</span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-2">
            Subscription Expired
          </h1>
          <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
            {user
              ? `Hi ${user.name.split(' ')[0]}, your subscription has expired.`
              : 'Your subscription has expired.'}{' '}
            To continue using SmartVendr, please contact the admin to renew your plan.
          </p>

          {/* Steps */}
          <div className="bg-[var(--bg-surface-2)] rounded-xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">How to renew</p>
            {[
              'Contact the SmartVendr admin.',
              'Choose a subscription plan that suits your business.',
              'Make payment — your account will be reactivated immediately.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          {/* Trial info box */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-left">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              All your data — products, customers, sales history — is safely preserved and will be accessible immediately upon renewal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/#contact"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:-translate-y-0.5 transition-all"
            >
              Contact Admin <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[var(--text-secondary)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
