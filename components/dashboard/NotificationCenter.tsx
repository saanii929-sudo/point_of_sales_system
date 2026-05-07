'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, X, Package, AlertTriangle, RotateCcw, Wallet,
  CreditCard, CheckCheck, Loader2, ChevronRight,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'low_stock' | 'expiring_product' | 'pending_return' | 'pending_payroll' | 'subscription_expiry';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  link?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<Notification['type'], React.ElementType> = {
  low_stock:           Package,
  expiring_product:    AlertTriangle,
  pending_return:      RotateCcw,
  pending_payroll:     Wallet,
  subscription_expiry: CreditCard,
};

const SEVERITY_STYLE: Record<Notification['severity'], { bg: string; icon: string; badge: string }> = {
  error:   { bg: '#fef2f2', icon: '#ef4444',  badge: 'bg-red-500' },
  warning: { bg: '#fffbeb', icon: '#f59e0b',  badge: 'bg-amber-500' },
  info:    { bg: '#eff6ff', icon: '#3b82f6',  badge: 'bg-blue-500' },
};

interface NotificationCenterProps {
  /** Callback to notify parent of unread count changes */
  onUnreadChange?: (count: number) => void;
}

export function NotificationCenter({ onUnreadChange }: NotificationCenterProps) {
  const [open, setOpen]         = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds]   = useState<Set<string>>(new Set());
  const [loading, setLoading]   = useState(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch + polling every 60s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(() => fetchNotifications(true), 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  // Notify parent whenever unread count changes — never inside a state updater
  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const markRead = (id: string) => {
    setReadIds(s => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-xl hover:bg-[var(--bg-surface-2)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />

          {/* Drawer */}
          <div
            className="fixed top-14 right-2 sm:right-4 lg:right-6 w-[340px] max-w-[calc(100vw-1rem)] z-[61] rounded-2xl shadow-[var(--shadow-floating)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden animate-fade-in-up"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                <p className="text-sm font-bold text-[var(--text-primary)]">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />
                  <span className="text-sm text-[var(--text-tertiary)]">Loading…</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up!</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">No alerts right now. Check back later.</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const Icon = TYPE_ICON[notif.type];
                  const style = SEVERITY_STYLE[notif.severity];
                  const isRead = readIds.has(notif.id);
                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--bg-surface-2)] cursor-pointer ${isRead ? 'opacity-60' : ''}`}
                      onClick={() => markRead(notif.id)}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: style.bg }}
                      >
                        <Icon className="w-4 h-4" style={{ color: style.icon }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{notif.title}</p>
                          {!isRead && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{notif.message}</p>
                        {notif.link && (
                          <Link
                            href={notif.link}
                            onClick={e => { e.stopPropagation(); markRead(notif.id); setOpen(false); }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
                          >
                            View details <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <button
                  onClick={() => fetchNotifications()}
                  className="text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Refresh
                </button>
                <p className="text-[11px] text-[var(--text-tertiary)]">{notifications.length} alert{notifications.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
