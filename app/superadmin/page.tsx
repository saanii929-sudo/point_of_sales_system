'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Building2, CheckCircle2, Users, DollarSign, Package,
  ShoppingCart, TrendingUp, ArrowUpRight, Medal, Award,
  Trophy, RefreshCw, Crown, Activity, ChevronRight,
  Clock, AlertCircle, BarChart3,
} from 'lucide-react';

interface SuperAdminStats {
  overview: {
    totalBusinesses: number;
    activeBusinesses: number;
    inactiveBusinesses: number;
    totalUsers: number;
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    newBusinessesThisMonth: number;
  };
  subscriptionBreakdown: Record<string, number>;
  recentBusinesses: Array<{
    id: string;
    name: string;
    email: string;
    subscriptionPlan: string;
    approvalStatus: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `GH₵${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `GH₵${(n / 1_000).toFixed(1)}k`;
  return `GH₵${n.toFixed(0)}`;
}

function KpiCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)'}}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
        {trend && (
          <p className="text-xs mt-1 flex items-center gap-1 font-medium" style={{ color: '#10b981' }}>
            <ArrowUpRight className="w-3 h-3" />{trend}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="w-9 h-9 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
      </div>
      <div className="h-7 w-16 rounded-lg" style={{ background: 'var(--bg-surface-3)' }} />
    </div>
  );
}

const PLAN_CONFIG: Record<string, { label: string; icon: React.ElementType; from: string; to: string; bg: string; text: string }> = {
  starter:      { label: 'Starter',      icon: Medal,  from: '#f59e0b', to: '#d97706', bg: '#fffbeb', text: '#92400e' },
  professional: { label: 'Professional', icon: Award,  from: '#8b5cf6', to: '#7c3aed', bg: '#ede9fe', text: '#5b21b6' },
  enterprise:   { label: 'Enterprise',   icon: Trophy, from: '#10b981', to: '#059669', bg: '#d1fae5', text: '#065f46' },
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats]     = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Platform Overview | SmartVendr Admin';
    if (!user || user.role !== 'super_admin') { router.push('/dashboard'); return; }
    load();
  }, [user, router]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchWithOfflineFallback('/api/superadmin/stats');
      setStats(data);
    } catch { toast.error('Failed to load platform stats'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Platform Overview
            </h1>
          </div>
          <p className="text-sm pl-12" style={{ color: 'var(--text-secondary)' }}>
            All businesses, users, and revenue across SmartVendr
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/superadmin/businesses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            Manage Businesses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3,4,5,6,7].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Businesses"  value={stats.overview.totalBusinesses}  icon={Building2}    color="#8b5cf6" trend={`+${stats.overview.newBusinessesThisMonth} this month`} />
          <KpiCard label="Active Businesses" value={stats.overview.activeBusinesses}  icon={CheckCircle2} color="#10b981" sub={`${stats.overview.inactiveBusinesses} inactive`} />
          <KpiCard label="Total Users"       value={stats.overview.totalUsers}        icon={Users}        color="#3b82f6" />
          <KpiCard label="Total Products"    value={stats.overview.totalProducts}     icon={Package}      color="#f59e0b" />
          <KpiCard label="Total Sales"       value={stats.overview.totalSales.toLocaleString()} icon={ShoppingCart} color="#06b6d4" />
          <KpiCard label="Total Revenue"     value={fmt(stats.overview.totalRevenue)} icon={DollarSign}   color="#10b981" sub={`${fmt(stats.overview.totalProfit)} profit`} />
          <KpiCard label="Avg Revenue / Biz" value={stats.overview.activeBusinesses > 0 ? fmt(stats.overview.totalRevenue / stats.overview.activeBusinesses) : 'GH₵0'} icon={BarChart3} color="#ec4899" />
          <KpiCard label="New This Month"    value={stats.overview.newBusinessesThisMonth} icon={TrendingUp} color="#f97316" sub="new registrations" />
        </div>
      ) : null}

      {/* Subscription Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(PLAN_CONFIG).map(([key, cfg]) => {
            const count = stats.subscriptionBreakdown[key] || 0;
            const total = stats.overview.totalBusinesses || 1;
            const pct   = Math.round((count / total) * 100);
            const Icon  = cfg.icon;
            return (
              <div key={key} className="rounded-2xl p-5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{cfg.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Subscription plan</p>
                  </div>
                  <span className="ml-auto text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cfg.from}, ${cfg.to})` }} />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{pct}% of all businesses</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Businesses */}
      {stats && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Recent Registrations</h2>
            </div>
            <Link href="/superadmin/businesses"
              className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: '#8b5cf6' }}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentBusinesses.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No businesses registered yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {stats.recentBusinesses.map(biz => {
                const planCfg = PLAN_CONFIG[biz.subscriptionPlan] ?? PLAN_CONFIG.starter;
                const isPending = biz.approvalStatus === 'pending';
                return (
                  <Link key={biz.id} href={`/superadmin/businesses/${biz.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--bg-surface-2)] group">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${planCfg.from}, ${planCfg.to})` }}>
                      {biz.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{biz.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{biz.email}</p>
                    </div>
                    {/* Plan badge */}
                    <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: planCfg.bg, color: planCfg.text }}>
                      {planCfg.label}
                    </span>
                    {/* Status */}
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: '#fef3c7', color: '#92400e' }}>
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : biz.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: '#d1fae5', color: '#065f46' }}>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: '#fef2f2', color: '#991b1b' }}>
                        <AlertCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                    {/* Time */}
                    <p className="hidden md:block text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(biz.createdAt), { addSuffix: true })}
                    </p>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: 'var(--text-tertiary)' }} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
