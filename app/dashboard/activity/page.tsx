'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Activity, Search, X,
  Plus, Edit, Trash2, LogIn, ShoppingCart,
  User, RefreshCw, Clock,
  AlertTriangle, Calendar,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ActivityLog {
  _id: string;
  user: { name: string; role: string };
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'login' | 'sale' | 'system';
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  create: { bg: '#dcfce7', text: '#15803d', icon: Plus,         label: 'Create'  },
  update: { bg: '#dbeafe', text: '#1e40af', icon: Edit,         label: 'Update'  },
  delete: { bg: '#fef2f2', text: '#b91c1c', icon: Trash2,       label: 'Delete'  },
  login:  { bg: '#f1f5f9', text: '#475569', icon: LogIn,        label: 'Login'   },
  sale:   { bg: '#d1fae5', text: '#065f46', icon: ShoppingCart, label: 'Sale'    },
  system: { bg: '#fef9c3', text: '#854d0e', icon: AlertTriangle,label: 'System'  },
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  business_owner:  { label: 'Owner',           bg: '#fef9c3', text: '#854d0e' },
  manager:         { label: 'Manager',         bg: '#ede9fe', text: '#6d28d9' },
  cashier:         { label: 'Cashier',         bg: '#dcfce7', text: '#15803d' },
  inventory_staff: { label: 'Inventory Staff', bg: '#dbeafe', text: '#1e40af' },
};

const AVATAR_COLORS = [
  ['#10b981','#059669'],['#3b82f6','#2563eb'],['#8b5cf6','#7c3aed'],
  ['#f59e0b','#d97706'],['#ec4899','#db2777'],['#06b6d4','#0891b2'],
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b animate-pulse" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-56 rounded" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="h-3 w-28 rounded" style={{ background: 'var(--bg-surface-3)' }} />
      </div>
      <div className="h-5 w-16 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="h-4 w-24 rounded" style={{ background: 'var(--bg-surface-3)' }} />
    </div>
  );
}

const PAGE_SIZE = 20;

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActivityLogPage() {
  const [logs, setLogs]         = useState<ActivityLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);

  useEffect(() => { document.title = 'Activity Log | SmartVendr'; }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      toast.error('Failed to load activity log');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const uniqueUsers = useMemo(() => {
    const names = [...new Set(logs.map(l => l.user.name))].sort();
    return names;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase();
    const from = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const to   = dateTo   ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
    return logs.filter(log => {
      const matchQ    = !q || log.action.toLowerCase().includes(q) || log.user.name.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || log.actionType === typeFilter;
      const matchUser = userFilter === 'all' || log.user.name === userFilter;
      const ts = new Date(log.createdAt).getTime();
      const matchFrom = !from || ts >= from;
      const matchTo   = !to   || ts <= to;
      return matchQ && matchType && matchUser && matchFrom && matchTo;
    });
  }, [logs, search, typeFilter, userFilter, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, typeFilter, userFilter, dateFrom, dateTo]);

  const paged = filteredLogs.slice(0, page * PAGE_SIZE);
  const hasMore = paged.length < filteredLogs.length;

  const typeFilters = ['all', 'create', 'update', 'delete', 'login', 'sale', 'system'];

  // Stats
  const todayLogs = logs.filter(l => {
    const d = new Date(l.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Activity Log</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track every action taken in your account for full transparency</p>
        </div>
        <button
          onClick={loadLogs}
          className="p-2 rounded-xl border transition-all self-start sm:self-auto hover:opacity-80"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',    value: logs.length,                          icon: Activity,     color: '#10b981' },
          { label: "Today's Actions", value: todayLogs.length,                     icon: Clock,        color: '#3b82f6' },
          { label: 'Sales Logged',    value: logs.filter(l => l.actionType === 'sale').length,   icon: ShoppingCart, color: '#8b5cf6' },
          { label: 'System Users',    value: new Set(logs.map(l => l.user.name)).size, icon: User,     color: '#f59e0b' },
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

      {/* ── Filters ── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)'}}>
        {/* Row 1: search + user + date range */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by action or user…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}><X className="w-3.5 h-3.5" /></button>}
          </div>

          {/* User filter */}
          <div className="relative min-w-[160px]">
            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all appearance-none"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div className="relative min-w-[148px]">
            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          </div>

          {/* Date to */}
          <div className="relative min-w-[148px]">
            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          </div>

          {/* Clear filters */}
          {(userFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => { setUserFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all hover:opacity-80"
              style={{ background: '#fef2f2', color: '#b91c1c' }}
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Row 2: Type filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {typeFilters.map(t => {
            const cfg = ACTION_CONFIG[t];
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                style={typeFilter === t
                  ? { background: cfg?.text ?? 'var(--primary-color)', color: '#fff' }
                  : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                {t === 'all' ? 'All Events' : cfg?.label ?? t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Log Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
          <div className="w-8 flex-shrink-0" />
          <div className="w-9 flex-shrink-0" />
          <p className="flex-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Action</p>
          <p className="w-28 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>User</p>
          <p className="w-24 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: 'var(--text-tertiary)' }}>Type</p>
          <p className="w-28 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-tertiary)' }}>Time</p>
        </div>

        {loading ? (
          <div>{[0,1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}</div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No activity found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {search || typeFilter !== 'all' ? 'Try adjusting your filters.' : 'Actions taken in your account will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {paged.map(log => {
                const cfg = ACTION_CONFIG[log.actionType] ?? ACTION_CONFIG.system;
                const ActionIcon = cfg.icon;
                const roleCfg = ROLE_CONFIG[log.user.role];
                const [g1, g2] = avatarGrad(log.user.name);
                const dateStr = new Date(log.createdAt);

                return (
                  <div key={log._id} className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 hover:bg-[var(--bg-surface-2)] transition-colors">
                    {/* Action type icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <ActionIcon className="w-3.5 h-3.5" style={{ color: cfg.text }} />
                    </div>

                    {/* User avatar */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      {initials(log.user.name)}
                    </div>

                    {/* Action text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{log.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{log.user.name}</p>
                        {roleCfg && (
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: roleCfg.bg, color: roleCfg.text }}>
                            {roleCfg.label}
                          </span>
                        )}
                        {log.ipAddress && (
                          <span className="hidden lg:inline text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{log.ipAddress}</span>
                        )}
                      </div>
                    </div>

                    {/* Hidden on mobile: user name */}
                    <div className="hidden md:block w-28">
                      {roleCfg && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: roleCfg.bg, color: roleCfg.text }}>
                          {roleCfg.label}
                        </span>
                      )}
                    </div>

                    {/* Type badge */}
                    <div className="hidden md:flex items-center justify-center w-24">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <div className="hidden md:block w-28 text-right flex-shrink-0">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatDistanceToNow(dateStr, { addSuffix: true })}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {format(dateStr, 'MMM d, HH:mm')}
                      </p>
                    </div>

                    {/* Mobile timestamp */}
                    <p className="md:hidden text-[10px] flex-shrink-0 text-right" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(dateStr, { addSuffix: true })}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  Load more ({filteredLogs.length - paged.length} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* Footer count */}
        {!loading && paged.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{paged.length}</span> of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filteredLogs.length}</span> events
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
