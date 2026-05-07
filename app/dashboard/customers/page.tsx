'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Users, Phone, Mail, Search, X, ShoppingCart,
  TrendingUp, Star, Crown, ChevronDown,
  DollarSign, RefreshCw, Eye, Clock,
  SortAsc,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  totalPurchases: number;
  lifetimeValue: number;
  visitCount: number;
  lastVisit?: string;
  createdAt?: string;
}

interface SaleItem { productName: string; quantity: number; price: number }
interface HistorySale {
  _id: string;
  saleNumber: string;
  total: number;
  items: SaleItem[];
  paymentMethod: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount: number) {
  return `GH₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTier(visits: number): { label: string; bg: string; text: string; icon: React.ElementType } {
  if (visits >= 20) return { label: 'VIP',       bg: '#fef9c3', text: '#854d0e', icon: Crown  };
  if (visits >= 6)  return { label: 'Loyal',     bg: '#ede9fe', text: '#6d28d9', icon: Star   };
  if (visits >= 2)  return { label: 'Returning', bg: '#dbeafe', text: '#1e40af', icon: TrendingUp };
  return               { label: 'New',       bg: '#dcfce7', text: '#15803d', icon: Users  };
}

const AVATAR_GRADIENTS: [string, string][] = [
  ['#10b981', '#059669'], ['#3b82f6', '#2563eb'], ['#8b5cf6', '#7c3aed'],
  ['#f59e0b', '#d97706'], ['#ef4444', '#dc2626'], ['#ec4899', '#db2777'],
  ['#06b6d4', '#0891b2'], ['#84cc16', '#65a30d'],
];

function avatarGradient(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 rounded w-28" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-3 rounded w-36" style={{ background: 'var(--bg-surface-3)' }} />
          <div className="h-5 rounded-full w-20" style={{ background: 'var(--bg-surface-2)' }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {[0,1,2].map(i => <div key={i} className="h-10 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />)}
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── History Modal ─────────────────────────────────────────────────────────────
function HistoryModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [history, setHistory] = useState<HistorySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [grad] = useState(() => avatarGradient(customer.name));

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/sales?customerPhone=${encodeURIComponent(customer.phone || '')}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.sales || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    if (customer.phone) fetchHistory();
    else setLoading(false);
  }, [customer]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[85vh] flex flex-col" style={{ background: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}>
              {initials(customer.name)}
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{customer.name}</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Last 10 purchases</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface-2)' }} />)}
            </div>
          ) : !customer.phone ? (
            <div className="text-center py-10">
              <Phone className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No phone number on file</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Purchase history is linked to phone numbers.</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No purchases found</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>This customer hasn&apos;t made any purchases yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(sale => (
                <div key={sale._id} className="rounded-xl p-4" style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>#{sale.saleNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>{sale.paymentMethod}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>{fmt(sale.total)}</span>
                  </div>
                  <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Clock className="w-3 h-3" />
                    {format(new Date(sale.createdAt), 'MMM d, yyyy')} at {format(new Date(sale.createdAt), 'h:mm a')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sale.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>
                        {item.productName} ×{item.quantity}
                      </span>
                    ))}
                    {sale.items.length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>
                        +{sale.items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'New' | 'Returning' | 'Loyal' | 'VIP'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'visits' | 'name'>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  useEffect(() => { document.title = 'Customers | SmartVendr'; }, []);
  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const { data } = await fetchWithOfflineFallback('/api/customers', 'cached-customers');
      setCustomers(data.customers || []);
    } catch {
      toast.error('Something went wrong loading customers — please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!customers.length) return { total: 0, revenue: 0, avg: 0, repeatRate: 0 };
    const revenue = customers.reduce((s, c) => s + c.lifetimeValue, 0);
    const repeat = customers.filter(c => c.visitCount > 1).length;
    return {
      total: customers.length,
      revenue,
      avg: revenue / customers.length,
      repeatRate: Math.round((repeat / customers.length) * 100),
    };
  }, [customers]);

  // ── Filter + Sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = customers.filter(c => {
      const matchQ = !q || c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
      const tier = getTier(c.visitCount).label;
      const matchTier = tierFilter === 'all' || tier === tierFilter;
      return matchQ && matchTier;
    });
    if (sortBy === 'value')  list = [...list].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
    if (sortBy === 'visits') list = [...list].sort((a, b) => b.visitCount - a.visitCount);
    if (sortBy === 'name')   list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'recent') list = [...list].sort((a, b) => {
      const da = a.lastVisit || a.createdAt || '';
      const db = b.lastVisit || b.createdAt || '';
      return db.localeCompare(da);
    });
    return list;
  }, [customers, search, tierFilter, sortBy]);

  const sortLabels = { recent: 'Most Recent', value: 'Highest Value', visits: 'Most Visits', name: 'Name A–Z' };
  const tierFilters: Array<typeof tierFilter> = ['all', 'New', 'Returning', 'Loyal', 'VIP'];
  const tierColors: Record<string, { bg: string; active: string }> = {
    all:       { bg: 'var(--bg-surface-2)', active: 'var(--primary-color)' },
    New:       { bg: '#dcfce7', active: '#15803d' },
    Returning: { bg: '#dbeafe', active: '#1e40af' },
    Loyal:     { bg: '#ede9fe', active: '#6d28d9' },
    VIP:       { bg: '#fef9c3', active: '#854d0e' },
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage your customer relationships and track loyalty
          </p>
        </div>
        <button
          onClick={fetchCustomers}
          className="p-2 rounded-xl border transition-all self-start sm:self-auto hover:opacity-80"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers"      value={stats.total}          icon={Users}        color="#10b981" sub="all time" />
        <StatCard label="Lifetime Revenue"     value={fmt(stats.revenue)}   icon={DollarSign}   color="#3b82f6" sub="combined value" />
        <StatCard label="Avg Order Value"      value={fmt(stats.avg)}       icon={TrendingUp}   color="#8b5cf6" sub="per customer" />
        <StatCard label="Repeat Customer Rate" value={`${stats.repeatRate}%`} icon={Star}       color="#f59e0b" sub="returning buyers" />
      </div>

      {/* ── Search & Filter ── */}
      <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border outline-none transition-all"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontFamily: 'inherit' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {tierFilters.map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={tierFilter === t
                ? { background: tierColors[t].active, color: '#fff' }
                : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
            >
              {t === 'all' ? 'All Customers' : t}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(s => !s)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            <SortAsc className="w-3.5 h-3.5" />
            {sortLabels[sortBy]}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                {(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map(k => (
                  <button
                    key={k}
                    onClick={() => { setSortBy(k); setShowSortMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm transition-all hover:opacity-80"
                    style={{
                      background: sortBy === k ? 'var(--bg-surface-2)' : 'transparent',
                      color: sortBy === k ? 'var(--primary-color)' : 'var(--text-primary)',
                      fontWeight: sortBy === k ? '600' : '400',
                    }}
                  >
                    {sortLabels[k]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Result count */}
        {(search || tierFilter !== 'all') && (
          <span className="self-center text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Customer Grid ── */}
      {isFetching ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-surface-2)' }}>
            <ShoppingCart className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
            {search || tierFilter !== 'all' ? 'No customers match your search' : 'No customers yet'}
          </p>
          <p className="text-sm max-w-sm mx-auto px-4" style={{ color: 'var(--text-secondary)' }}>
            {search || tierFilter !== 'all'
              ? 'Try a different name, phone number, or adjust the tier filter.'
              : 'Your customers will appear here after their first purchase at the POS terminal.'}
          </p>
          {(search || tierFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setTierFilter('all'); }}
              className="mt-5 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--primary-color)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const [g1, g2] = avatarGradient(customer.name);
            const tier = getTier(customer.visitCount);
            const TierIcon = tier.icon;
            const lastVisitText = customer.lastVisit
              ? formatDistanceToNow(new Date(customer.lastVisit), { addSuffix: true })
              : customer.createdAt
              ? formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })
              : 'Unknown';

            return (
              <div
                key={customer._id}
                className="rounded-2xl p-5 transition-all group"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                    >
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-base leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{customer.name}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1"
                        style={{ background: tier.bg, color: tier.text }}>
                        <TierIcon className="w-3 h-3" />
                        {tier.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 mb-4">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <a href={`tel:${customer.phone}`} className="text-xs hover:underline" style={{ color: 'var(--text-secondary)' }}>{customer.phone}</a>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <a href={`mailto:${customer.email}`} className="text-xs truncate hover:underline" style={{ color: 'var(--text-secondary)' }}>{customer.email}</a>
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-3 mb-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
                      {fmt(customer.lifetimeValue)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Lifetime</p>
                  </div>
                  <div className="text-center" style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{customer.visitCount}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Visits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-secondary)' }}>{lastVisitText.replace('about ', '')}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Last visit</p>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => setHistoryCustomer(customer)}
                  className="w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Purchase History
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Result summary ── */}
      {!isFetching && filtered.length > 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
          Showing <span className="font-semibold">{filtered.length}</span>
          {(search || tierFilter !== 'all') ? ` of ${customers.length}` : ''} customer{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── History Modal ── */}
      {historyCustomer && (
        <HistoryModal customer={historyCustomer} onClose={() => setHistoryCustomer(null)} />
      )}
    </div>
  );
}
