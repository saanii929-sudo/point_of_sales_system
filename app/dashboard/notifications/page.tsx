'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell, BellOff, Check, CheckCheck, X, Search,
  ShoppingCart, Package, AlertTriangle, Info,
  RefreshCw, Trash2, ChevronRight, Settings,
  TrendingUp, Users, Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'sale' | 'inventory' | 'system' | 'employee' | 'alert';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; text: string; label: string }> = {
  sale:      { icon: ShoppingCart,   bg: '#d1fae5', text: '#065f46', label: 'Sales'     },
  inventory: { icon: Package,        bg: '#dbeafe', text: '#1e40af', label: 'Inventory'  },
  system:    { icon: Info,           bg: '#f1f5f9', text: '#475569', label: 'System'     },
  employee:  { icon: Users,          bg: '#ede9fe', text: '#6d28d9', label: 'Team'       },
  alert:     { icon: AlertTriangle,  bg: '#fef3c7', text: '#92400e', label: 'Alerts'     },
};

// ── Mock notifications ────────────────────────────────────────────────────────
function generateMockNotifications(): Notification[] {
  const now = Date.now();
  return [
    { _id: 'n1',  title: 'New sale completed',         message: 'Kwame processed a sale of GH₵245.00 at the POS terminal.',            type: 'sale',      isRead: false, link: '/dashboard/sales',     createdAt: new Date(now - 2*60*1000).toISOString()     },
    { _id: 'n2',  title: 'Low stock alert',            message: '"Coca Cola 500ml" is running low — only 3 units remaining.',           type: 'alert',     isRead: false, link: '/dashboard/inventory', createdAt: new Date(now - 15*60*1000).toISOString()    },
    { _id: 'n3',  title: 'New employee added',         message: 'Abena Darko has been added to your team as a Cashier.',               type: 'employee',  isRead: false, link: '/dashboard/employees', createdAt: new Date(now - 1*3600*1000).toISOString()   },
    { _id: 'n4',  title: 'Daily sales summary',        message: "You made 28 sales today totalling GH₵3,450.00. Great work!",          type: 'sale',      isRead: true,  link: '/dashboard/reports',   createdAt: new Date(now - 3*3600*1000).toISOString()   },
    { _id: 'n5',  title: 'Product expiring soon',      message: '"Yogurt (500g)" expires in 5 days. Consider applying a discount.',     type: 'inventory', isRead: true,  link: '/dashboard/expiring',  createdAt: new Date(now - 5*3600*1000).toISOString()   },
    { _id: 'n6',  title: 'Stock restocked',            message: 'Indomie Noodles restocked by Akua — 200 units added.',                type: 'inventory', isRead: true,  link: '/dashboard/inventory', createdAt: new Date(now - 8*3600*1000).toISOString()   },
    { _id: 'n7',  title: 'System backup complete',     message: 'Your data was backed up successfully at 2:00 AM.',                    type: 'system',    isRead: true,  link: undefined,              createdAt: new Date(now - 24*3600*1000).toISOString()  },
    { _id: 'n8',  title: 'New sale completed',         message: 'Ama processed a sale of GH₵128.50.',                                  type: 'sale',      isRead: true,  link: '/dashboard/sales',     createdAt: new Date(now - 26*3600*1000).toISOString()  },
    { _id: 'n9',  title: 'Low stock alert',            message: '"Fan Ice (Vanilla)" is out of stock. Please restock soon.',            type: 'alert',     isRead: true,  link: '/dashboard/inventory', createdAt: new Date(now - 2*24*3600*1000).toISOString()},
    { _id: 'n10', title: 'Weekly report ready',        message: 'Your weekly performance report for Mar 3–9 is now available.',        type: 'system',    isRead: true,  link: '/dashboard/reports',   createdAt: new Date(now - 3*24*3600*1000).toISOString()},
  ];
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'unread' | 'sale' | 'inventory' | 'system' | 'employee' | 'alert'>('all');
  const [search, setSearch]     = useState('');

  useEffect(() => { document.title = 'Notifications | SmartVendr'; }, []);

  useEffect(() => {
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        } else {
          if (!silent) setNotifications(generateMockNotifications());
        }
      } catch {
        if (!silent) setNotifications(generateMockNotifications());
      } finally {
        if (!silent) setLoading(false);
      }
    };
    load();
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return notifications.filter(n => {
      const matchFilter = filter === 'all' ? true : filter === 'unread' ? !n.isRead : n.type === filter;
      const matchSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [notifications, filter, search]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read.');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markRead(notif._id);
    if (notif.link) router.push(notif.link);
  };

  const tabs: Array<{ key: typeof filter; label: string }> = [
    { key: 'all',       label: `All (${notifications.length})`  },
    { key: 'unread',    label: `Unread (${unreadCount})`         },
    { key: 'sale',      label: 'Sales'                           },
    { key: 'inventory', label: 'Inventory'                       },
    { key: 'alert',     label: 'Alerts'                          },
    { key: 'system',    label: 'System'                          },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : "You're all caught up — nothing new to see here"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            title="Notification settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: notifications.length,                             icon: Bell,           color: '#10b981' },
          { label: 'Unread',     value: unreadCount,                                      icon: Zap,            color: '#3b82f6' },
          { label: 'Alerts',     value: notifications.filter(n => n.type === 'alert').length,    icon: AlertTriangle,  color: '#f59e0b' },
          { label: 'Sales',      value: notifications.filter(n => n.type === 'sale').length,     icon: ShoppingCart,   color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + '22' }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {/* Tabs + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-1 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={filter === tab.key
                  ? { background: 'var(--primary-color)', color: '#fff' }
                  : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-8 pr-8 py-2 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}><X className="w-3 h-3" /></button>}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                  <div className="h-3 w-72 rounded" style={{ background: 'var(--bg-surface-3)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BellOff className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications here'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {filter === 'unread' ? "You're all caught up! Great job staying on top of things." : 'Notifications will appear here as activity happens in your account.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filtered.map((notif, idx) => {
              const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <div
                  key={notif._id || idx}
                  className="group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
                  style={{ background: notif.isRead ? 'transparent' : 'var(--bg-surface-2)' }}
                  onClick={() => handleClick(notif)}
                >
                  {/* Unread dot */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                      <Icon className="w-5 h-5" style={{ color: cfg.text }} />
                    </div>
                    {!notif.isRead && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] bg-blue-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug" style={{ color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: notif.isRead ? '500' : '600' }}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            onClick={e => { e.stopPropagation(); markRead(notif._id); }}
                            className="p-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteNotification(notif._id); }}
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background: '#fef2f2', color: '#b91c1c' }}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.text }}>
                        {cfg.label}
                      </span>
                      {notif.link && (
                        <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--primary-color)' }}>
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
              {filter !== 'all' ? ` matching "${filter}"` : ''}
            </p>
            <button
              onClick={() => setNotifications([])}
              className="text-xs flex items-center gap-1 transition-all hover:opacity-80"
              style={{ color: '#b91c1c' }}
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
