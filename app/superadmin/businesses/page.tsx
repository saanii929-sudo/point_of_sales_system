'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Building2, Clock, CheckCircle2, XCircle, Search, X,
  Plus, RefreshCw, ChevronRight, Users, Package,
  ShoppingCart, DollarSign, Check, Ban, RotateCcw,
  AlertCircle, Loader2, Medal, Award, Trophy,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNotes?: string;
  createdAt: string;
  stats: { users: number; products: number; sales: number; revenue: number };
}

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

// ── Helpers ────────────────────────────────────────────────────────────────────
const PLAN_CFG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  starter:      { label: 'Starter',      bg: '#fffbeb', text: '#92400e', icon: Medal  },
  professional: { label: 'Professional', bg: '#ede9fe', text: '#5b21b6', icon: Award  },
  enterprise:   { label: 'Enterprise',   bg: '#d1fae5', text: '#065f46', icon: Trophy },
};

const APPROVAL_CFG = {
  pending:  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pending'  },
  approved: { bg: '#d1fae5', text: '#065f46', dot: '#10b981', label: 'Approved' },
  rejected: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', label: 'Rejected' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarBg(name: string) {
  const colors = [
    ['#8b5cf6','#7c3aed'], ['#3b82f6','#2563eb'], ['#10b981','#059669'],
    ['#f59e0b','#d97706'], ['#ec4899','#db2777'], ['#06b6d4','#0891b2'],
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  const [from, to] = colors[Math.abs(h) % colors.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ background: 'var(--bg-surface-3)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded" style={{ background: 'var(--bg-surface-3)' }} />
          <div className="h-3 w-56 rounded" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-20 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
            <div className="h-5 w-16 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-8 w-24 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-8 w-24 rounded-xl" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BusinessesManagement() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [businesses,  setBusinesses]  = useState<Business[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState<Tab>('all');
  const [approving,   setApproving]   = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Businesses | SmartVendr Admin';
    if (!user || user.role !== 'super_admin') { router.push('/dashboard'); return; }
    fetchBusinesses();
  }, [user, router]);

  const fetchBusinesses = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/superadmin/businesses');
      setBusinesses(data.businesses || []);
    } catch { toast.error('Failed to load businesses'); }
    finally { setIsLoading(false); }
  };

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', businessId: id }),
      });
      if (res.ok) { toast.success('Business approved'); fetchBusinesses(); }
      else toast.error('Failed to approve');
    } catch { toast.error('Failed to approve'); }
    finally { setApproving(null); }
  };

  const handleReject = async (id: string) => {
    setApproving(id);
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', businessId: id }),
      });
      if (res.ok) { toast.success('Registration rejected'); fetchBusinesses(); }
      else toast.error('Failed to reject');
    } catch { toast.error('Failed to reject'); }
    finally { setApproving(null); }
  };

  const toggleStatus = async (id: string) => {
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status', businessId: id }),
      });
      if (res.ok) { toast.success('Status updated'); fetchBusinesses(); }
      else toast.error('Failed to update');
    } catch { toast.error('Failed to update'); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingCount = businesses.filter(b => b.approvalStatus === 'pending').length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return businesses.filter(b => {
      const matchTab =
        activeTab === 'all'      ? true :
        activeTab === 'pending'  ? b.approvalStatus === 'pending' :
        activeTab === 'approved' ? b.approvalStatus === 'approved' :
        b.approvalStatus === 'rejected';
      const matchSearch = !q || b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [businesses, activeTab, search]);

  const kpi = useMemo(() => ({
    total:    businesses.length,
    pending:  businesses.filter(b => b.approvalStatus === 'pending').length,
    approved: businesses.filter(b => b.approvalStatus === 'approved').length,
    active:   businesses.filter(b => b.isActive && b.approvalStatus === 'approved').length,
  }), [businesses]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Business Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Approve, manage and monitor all businesses on SmartVendr
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => { setIsLoading(true); fetchBusinesses(); }}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/superadmin/businesses/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
          >
            <Plus className="w-4 h-4" /> Create Business
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Registered', value: kpi.total,    icon: Building2,    color: '#8b5cf6' },
          { label: 'Pending Approval', value: kpi.pending,  icon: Clock,        color: '#f59e0b' },
          { label: 'Approved',         value: kpi.approved, icon: CheckCircle2, color: '#10b981' },
          { label: 'Active Now',        value: kpi.active,   icon: Users,        color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
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

      {/* Main card: tabs + search + list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>

        {/* Tab bar */}
        <div className="flex items-stretch border-b px-5 gap-1 overflow-x-auto"
          style={{ borderColor: 'var(--border-subtle)' }}>
          {([
            { key: 'all',      label: `All (${businesses.length})` },
            { key: 'pending',  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`, urgent: pendingCount > 0 },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ] as { key: Tab; label: string; urgent?: boolean }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0"
              style={activeTab === tab.key
                ? { borderColor: tab.urgent ? '#f59e0b' : '#8b5cf6', color: tab.urgent ? '#f59e0b' : '#8b5cf6' }
                : { borderColor: 'transparent', color: tab.urgent ? '#f59e0b' : 'var(--text-secondary)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-all"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {activeTab === 'pending' ? 'No businesses awaiting approval' : 'No businesses found'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'Try a different name or email.' : 'New registrations will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filtered.map(biz => {
              const approvalCfg = APPROVAL_CFG[biz.approvalStatus];
              const planCfg     = PLAN_CFG[biz.subscriptionPlan] ?? PLAN_CFG.starter;
              const PlanIcon    = planCfg.icon;
              const isActing    = approving === biz.id;

              return (
                <div key={biz.id} className="p-5 hover:bg-[var(--bg-surface-2)] transition-colors">
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: avatarBg(biz.name) }}
                    >
                      {getInitials(biz.name)}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link
                          href={`/superadmin/businesses/${biz.id}`}
                          className="font-bold text-base hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {biz.name}
                        </Link>
                        {/* Approval badge */}
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: approvalCfg.bg, color: approvalCfg.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: approvalCfg.dot }} />
                          {approvalCfg.label}
                        </span>
                        {/* Plan badge */}
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: planCfg.bg, color: planCfg.text }}
                        >
                          <PlanIcon className="w-3 h-3" />
                          {planCfg.label}
                        </span>
                        {/* Active/Inactive */}
                        {biz.approvalStatus === 'approved' && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={biz.isActive
                              ? { background: '#f0fdf4', color: '#15803d' }
                              : { background: '#f1f5f9', color: '#64748b' }}
                          >
                            {biz.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>

                      {/* Contact */}
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{biz.email}</p>
                      {biz.phone && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{biz.phone}</p>
                      )}

                      {/* Stats mini-row (approved businesses only) */}
                      {biz.approvalStatus === 'approved' && (
                        <div className="flex items-center gap-5 mt-3 flex-wrap">
                          {[
                            { icon: Users,       value: biz.stats.users,    label: 'users'    },
                            { icon: Package,     value: biz.stats.products, label: 'products' },
                            { icon: ShoppingCart,value: biz.stats.sales,    label: 'sales'    },
                            { icon: DollarSign,  value: `GH₵${biz.stats.revenue >= 1000 ? (biz.stats.revenue/1000).toFixed(1)+'k' : biz.stats.revenue.toFixed(0)}`, label: 'revenue' },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5 text-sm">
                              <s.icon className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                              <span style={{ color: 'var(--text-tertiary)' }}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {biz.approvalNotes && (
                        <p className="text-xs mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>
                          Note: {biz.approvalNotes}
                        </p>
                      )}

                      {/* Registered date */}
                      <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                        Registered {formatDistanceToNow(new Date(biz.createdAt), { addSuffix: true })} ·{' '}
                        {format(new Date(biz.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {biz.approvalStatus === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApprove(biz.id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#10b981' }}
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(biz.id)}
                            disabled={isActing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                            style={{ background: '#fef2f2', color: '#b91c1c' }}
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/superadmin/businesses/${biz.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff' }}
                          >
                            View Details <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          {biz.approvalStatus === 'approved' && (
                            <button
                              onClick={() => toggleStatus(biz.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                              style={biz.isActive
                                ? { background: '#fef2f2', color: '#b91c1c' }
                                : { background: '#f0fdf4', color: '#15803d' }}
                            >
                              {biz.isActive ? <><Ban className="w-3.5 h-3.5" /> Deactivate</> : <><Check className="w-3.5 h-3.5" /> Activate</>}
                            </button>
                          )}
                          {biz.approvalStatus === 'rejected' && (
                            <button
                              onClick={() => handleApprove(biz.id)}
                              disabled={isActing}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                              style={{ background: '#d1fae5', color: '#065f46' }}
                            >
                              {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              Re-approve
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filtered.length}</span> of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{businesses.length}</span> businesses
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
