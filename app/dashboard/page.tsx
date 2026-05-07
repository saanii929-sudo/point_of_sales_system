'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { BusinessHealthIndicator } from '@/components/dashboard/BusinessHealthIndicator';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import Link from 'next/link';
import {
  AlertTriangle, TrendingUp, DollarSign, ShoppingCart, Users,
  RefreshCw, Pause, Play, Package, ArrowUpRight, ArrowDownRight,
  ExternalLink, Target, ChevronRight, UserCircle,
  Zap, X, Edit2, Check,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────
interface DashboardData {
  summary: {
    totalSales:       number;
    totalProfit:      number;
    salesCount:       number;
    totalCustomers:   number;
    salesChange:      number;
    profitChange:     number;
    salesCountChange: number;
  };
  topProducts:      Array<{ name: string; quantity: number; revenue: number }>;
  lowStockProducts: Array<{ name: string; stock: number; lowStockThreshold: number }>;
  topEmployees:     Array<{ name: string; totalSales: number; salesCount: number }>;
  salesTrend?:      Array<{ date: string; sales: number; profit: number }>;
  categoryBreakdown?: Array<{ name: string; value: number }>;
}

interface Product { _id: string; name: string; stock: number; }

const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316'];

const MEDAL_STYLES = [
  { bg: '#fefce8', border: '#fde68a', barColor: '#f59e0b' },
  { bg: '#f8fafc', border: '#e2e8f0', barColor: '#94a3b8' },
  { bg: '#fff7ed', border: '#fed7aa', barColor: '#f97316' },
];

// ── Animated counter hook ──────────────────────────────────
function useAnimatedValue(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return; // only animate once
    mounted.current = true;
    if (target === 0) return;
    let start = 0;
    const steps = Math.ceil(duration / 16);
    const inc = target / steps;
    const id = setInterval(() => {
      start += inc;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(start);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

// ── Greeting ───────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Skeleton card ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 16,
      padding: 20,
    }}>
      <div className="flex items-start justify-between mb-3">
        <div className="animate-pulse rounded-xl" style={{ width: 44, height: 44, background: 'var(--bg-surface-2)' }} />
        <div className="animate-pulse rounded-full" style={{ width: 64, height: 20, background: 'var(--bg-surface-2)' }} />
      </div>
      <div className="animate-pulse rounded mb-2" style={{ height: 12, width: 96, background: 'var(--bg-surface-2)' }} />
      <div className="animate-pulse rounded" style={{ height: 28, width: 128, background: 'var(--bg-surface-3)' }} />
    </div>
  );
}

// ── Custom chart tooltip ────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {typeof p.value === 'number' ? `GH₵${p.value.toFixed(2)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Section card wrapper ────────────────────────────────────
function SectionCard({
  title, subtitle, action, children, noPad = false,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {(title || action) && (
        <div className="flex items-center justify-between" style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            {title && (
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
            )}
            {subtitle && (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={noPad ? {} : { padding: 24 }}>
        {children}
      </div>
    </div>
  );
}

// ── KPI Card with animated counter ────────────────────────
function KpiCard({
  title, value, rawValue, change, up, icon, iconBg, iconColor, prefix = '', suffix = '',
}: {
  title: string;
  value: string;
  rawValue?: number;
  change: string;
  up: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  prefix?: string;
  suffix?: string;
}) {
  const animated = useAnimatedValue(rawValue ?? 0);
  const displayValue = rawValue !== undefined
    ? `${prefix}${animated.toLocaleString('en-US', { minimumFractionDigits: rawValue % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}${suffix}`
    : value;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 20,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
    className="hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: up ? '#ecfdf5' : '#fef2f2',
          color: up ? '#059669' : '#dc2626',
        }}>
          {up ? <ArrowUpRight style={{ width: 12, height: 12 }} /> : <ArrowDownRight style={{ width: 12, height: 12 }} />}
          {change}
        </span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{displayValue}</p>
    </div>
  );
}

// ── Goals widget ───────────────────────────────────────────
const GOAL_KEY = 'sv_daily_goal';

function GoalsWidget({ todayRevenue }: { todayRevenue: number }) {
  const [goal, setGoal] = useState<number>(0);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const animated = useAnimatedValue(todayRevenue);

  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY);
    if (saved) setGoal(Number(saved));
  }, []);

  const pct = goal > 0 ? Math.min((todayRevenue / goal) * 100, 100) : 0;
  const color = pct < 25 ? '#ef4444' : pct < 75 ? '#f59e0b' : '#10b981';
  const msg   = pct === 0 ? 'Set a daily goal to track progress' :
                pct < 25  ? "Let's get started! You can do it." :
                pct < 75  ? 'Great progress, keep pushing!' :
                pct < 100 ? "Almost there! Push a little harder!" :
                            'Goal crushed! 🎉';

  const saveGoal = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v > 0) {
      setGoal(v);
      localStorage.setItem(GOAL_KEY, String(v));
    }
    setEditing(false);
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20, padding: 20,
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target style={{ width: 18, height: 18, color: '#059669' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>Daily Goal</p>
            {editing ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGoal()}
                  placeholder="Set target..."
                  autoFocus
                  className="input-base"
                  style={{ width: 110, height: 26, fontSize: 12, padding: '2px 8px' }}
                />
                <button onClick={saveGoal} style={{ color: '#10b981' }}>
                  <Check style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                {goal > 0 ? `GH₵${goal.toLocaleString()}` : '—'}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => { setEditing(true); setInputVal(goal > 0 ? String(goal) : ''); }}
          style={{ color: 'var(--text-tertiary)' }}
          className="hover:text-[var(--text-primary)] transition-colors"
          title="Edit goal"
        >
          <Edit2 style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {goal > 0 && (
        <>
          <div style={{ position: 'relative', height: 6, background: 'var(--bg-surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${pct}%`,
              background: color,
              borderRadius: 99,
              transition: 'width 1s ease',
            }} />
          </div>
          <div className="flex items-center justify-between">
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{msg}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0 }}>
              GH₵{animated.toLocaleString('en-US', { maximumFractionDigits: 0 })} / {pct.toFixed(0)}%
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Recent Activity feed ───────────────────────────────────
interface RecentSale {
  _id: string;
  saleNumber: string;
  total: number;
  cashier?: { name?: string };
  createdAt: string;
}

function RecentActivityFeed({ branchId }: { branchId?: string | null }) {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    fetch(`/api/sales?limit=5${branchParam}`)
      .then(r => r.ok ? r.json() : { sales: [] })
      .then(d => setSales((d.sales || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }} className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Last 5 transactions</p>
        </div>
        <Link href="/dashboard/sales" style={{ fontSize: 12, fontWeight: 600, color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          View all <ChevronRight style={{ width: 12, height: 12 }} />
        </Link>
      </div>
      <div>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-surface-2)' }} />
              <div className="flex-1">
                <div style={{ height: 11, width: '60%', background: 'var(--bg-surface-2)', borderRadius: 6, marginBottom: 4 }} />
                <div style={{ height: 10, width: '40%', background: 'var(--bg-surface-3)', borderRadius: 6 }} />
              </div>
            </div>
          ))
        ) : sales.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <ShoppingCart style={{ width: 28, height: 28, color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No sales yet today</p>
          </div>
        ) : (
          sales.map((sale, i) => (
            <div key={sale._id} className="flex items-center gap-3 hover:bg-[var(--bg-surface-2)] transition-colors" style={{
              padding: '10px 20px',
              borderBottom: i < sales.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserCircle style={{ width: 16, height: 16, color: '#059669' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="truncate">
                  {sale.cashier?.name || 'Cashier'} sold{' '}
                  <span style={{ color: '#059669', fontWeight: 700 }}>GH₵{sale.total.toFixed(2)}</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  #{sale.saleNumber} · {timeAgo(sale.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Quick Actions FAB ──────────────────────────────────────
function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: 'New Sale',      href: '/dashboard/pos',       color: '#10b981', icon: ShoppingCart },
    { label: 'Add Product',   href: '/dashboard/products',  color: '#3b82f6', icon: Package },
    { label: 'Add Customer',  href: '/dashboard/customers', color: '#8b5cf6', icon: Users },
    { label: 'View Reports',  href: '/dashboard/reports',   color: '#f59e0b', icon: TrendingUp },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {open && (
        <>
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={a.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl hover:-translate-y-0.5 transition-all animate-fade-in-up"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  animationDelay: `${i * 50}ms`,
                  textDecoration: 'none',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 14, height: 14, color: a.color }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</span>
              </Link>
            );
          })}
        </>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
        title="Quick Actions"
      >
        {open ? <X style={{ width: 20, height: 20 }} /> : <Zap style={{ width: 20, height: 20 }} />}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { selectedBranchId, selectedBranchName } = useBranchStore();
  const [data,               setData]               = useState<DashboardData | null>(null);
  const [isLoading,          setIsLoading]          = useState(true);
  const [period,             setPeriod]             = useState('today');
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [lastUpdate,         setLastUpdate]         = useState<Date>(new Date());
  const [isRealTime,         setIsRealTime]         = useState(true);
  const [outOfStockDismissed, setOutOfStockDismissed] = useState(false);

  const fetchOutOfStockProducts = useCallback(async () => {
    try {
      const branchParam = selectedBranchId ? `?branchId=${selectedBranchId}` : '';
      const { data: result } = await fetchWithOfflineFallback(`/api/products${branchParam}`);
      setOutOfStockProducts(
        (result.products || []).filter((p: any) => (p.branchStock ?? p.stock) <= 0)
      );
    } catch { /* silent */ }
  }, [selectedBranchId]);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const branchParam = selectedBranchId ? `&branchId=${selectedBranchId}` : '';
      const url = `/api/analytics/dashboard?period=${period}${branchParam}`;
      const { data: result, fromCache } = await fetchWithOfflineFallback(url);

      const hasChanged = data && (
        data.summary.totalSales !== result.summary.totalSales ||
        data.summary.salesCount !== result.summary.salesCount
      );

      setData(result);
      setLastUpdate(new Date());

      if (fromCache) {
        toast('Showing cached dashboard data', { icon: '📡', duration: 2000 });
      } else if (!silent) {
        toast.success('Dashboard updated', { duration: 2000 });
      } else if (hasChanged) {
        toast.success('New data available', {
          duration: 2000, icon: '🔄',
          style: { background: '#10b981', color: '#fff' },
        });
      }
    } catch (err: unknown) {
      if (!silent) toast.error(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [period, data, selectedBranchId]);

  useEffect(() => {
    fetchDashboardData();
    fetchOutOfStockProducts();
  }, [period, selectedBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling every 30s
  useEffect(() => {
    if (!isRealTime) return;
    const id = setInterval(() => {
      fetchDashboardData(true);
      fetchOutOfStockProducts();
    }, 30_000);
    return () => clearInterval(id);
  }, [period, isRealTime, selectedBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading skeleton ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="animate-pulse rounded" style={{ height: 28, width: 256, background: 'var(--bg-surface-2)' }} />
          <div className="animate-pulse rounded" style={{ height: 14, width: 192, background: 'var(--bg-surface-2)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {[300, 300].map((h, i) => (
            <div key={i} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 20, padding: 24,
            }}>
              <div className="animate-pulse rounded mb-6" style={{ height: 14, width: 160, background: 'var(--bg-surface-2)' }} />
              <div className="animate-pulse rounded w-full" style={{ height: h, background: 'var(--bg-surface-2)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const salesTrendData       = data.salesTrend       ?? [];
  const categoryData         = data.categoryBreakdown ?? [];
  const topProductsChartData = data.topProducts.slice(0, 5).map(p => ({
    name:     p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    revenue:  p.revenue,
    quantity: p.quantity,
  }));

  const maxRevenue = Math.max(...data.topProducts.map(p => p.revenue), 1);

  const fmtChange = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `GH₵${data.summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawValue: data.summary.totalSales,
      prefix: 'GH₵',
      change: fmtChange(data.summary.salesChange),
      up: data.summary.salesChange >= 0,
      icon: <DollarSign style={{ width: 20, height: 20 }} />,
      iconBg: '#ecfdf5', iconColor: '#059669',
    },
    {
      title: 'Net Profit',
      value: `GH₵${data.summary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      rawValue: data.summary.totalProfit,
      prefix: 'GH₵',
      change: data.summary.totalProfit >= 0 ? fmtChange(data.summary.profitChange) : 'Below cost',
      up: data.summary.totalProfit >= 0,
      icon: <TrendingUp style={{ width: 20, height: 20 }} />,
      iconBg: data.summary.totalProfit >= 0 ? '#eff6ff' : '#fef2f2',
      iconColor: data.summary.totalProfit >= 0 ? '#3b82f6' : '#dc2626',
    },
    {
      title: 'Transactions',
      value: data.summary.salesCount.toLocaleString(),
      rawValue: data.summary.salesCount,
      change: fmtChange(data.summary.salesCountChange),
      up: data.summary.salesCountChange >= 0,
      icon: <ShoppingCart style={{ width: 20, height: 20 }} />,
      iconBg: '#f5f3ff', iconColor: '#7c3aed',
    },
    {
      title: 'Customers',
      value: data.summary.totalCustomers.toLocaleString(),
      rawValue: data.summary.totalCustomers,
      change: '+0.0%',
      up: true,
      icon: <Users style={{ width: 20, height: 20 }} />,
      iconBg: '#fffbeb', iconColor: '#d97706',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative pb-16">

      {/* ── Out of stock alert ── */}
      {outOfStockProducts.length > 0 && !outOfStockDismissed && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up" style={{ maxWidth: 360 }}>
          <div style={{
            background: '#dc2626', color: '#fff',
            borderRadius: 20, padding: 16,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div className="flex items-start gap-3">
              <div style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <AlertTriangle style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>Out of Stock Alert</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
                  {outOfStockProducts.length} product{outOfStockProducts.length > 1 ? 's are' : ' is'} out of stock
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {outOfStockProducts.slice(0, 3).map(p => (
                    <span key={p._id} style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 11,
                      background: 'rgba(0,0,0,0.25)',
                    }}>{p.name}</span>
                  ))}
                  {outOfStockProducts.length > 3 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 11,
                      background: 'rgba(0,0,0,0.25)',
                    }}>+{outOfStockProducts.length - 3} more</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Link href="/dashboard/products" style={{
                    fontSize: 12, fontWeight: 700,
                    background: '#fff', color: '#dc2626',
                    padding: '6px 12px', borderRadius: 8,
                    textDecoration: 'none',
                  }}>
                    View Products
                  </Link>
                  <button
                    onClick={() => setOutOfStockDismissed(true)}
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Today at a Glance bar ── */}
      {period === 'today' && (
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-50), var(--brand-100))',
          border: '1px solid var(--border-brand)',
          borderRadius: 16,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--border-default)]" />
          <div className="flex items-center gap-1.5">
            <ShoppingCart style={{ width: 14, height: 14, color: '#059669' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{data.summary.salesCount}</strong> sales today
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--border-default)] hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <DollarSign style={{ width: 14, height: 14, color: '#059669' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                GH₵{data.summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong> revenue
            </span>
          </div>
          <div className="flex-1" />
          <span style={{ fontSize: 12, fontWeight: 600, color: data.summary.salesChange >= 0 ? '#059669' : '#dc2626' }}>
            {data.summary.salesChange >= 0 ? '↑' : '↓'} {Math.abs(data.summary.salesChange).toFixed(1)}% vs yesterday
          </span>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5" style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            {getGreeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            {isRealTime && (
              <span className="relative flex" style={{ width: 10, height: 10 }}>
                <span className="animate-ping absolute inline-flex rounded-full" style={{
                  width: '100%', height: '100%',
                  background: '#34d399', opacity: 0.75,
                }} />
                <span className="relative inline-flex rounded-full" style={{
                  width: 10, height: 10, background: '#10b981',
                }} />
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Here&apos;s what&apos;s happening with your business
            {isRealTime ? ` · Live · Updated ${lastUpdate.toLocaleTimeString()}` : ''}
          </p>
          {selectedBranchName && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--brand-100)', color: 'var(--primary-color)', border: '1px solid var(--brand-100)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-color)', display: 'inline-block' }} />
              Viewing: {selectedBranchName}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRealTime(r => !r)}
            className="inline-flex items-center gap-1.5"
            style={{
              padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: isRealTime ? '#ecfdf5' : 'var(--bg-surface-2)',
              color:      isRealTime ? '#059669' : 'var(--text-secondary)',
              borderColor: isRealTime ? '#a7f3d0' : 'var(--border-subtle)',
            }}
          >
            {isRealTime
              ? <Pause style={{ width: 13, height: 13 }} />
              : <Play  style={{ width: 13, height: 13 }} />}
            {isRealTime ? 'Pause' : 'Resume'} Live
          </button>

          <button
            onClick={() => fetchDashboardData()}
            className="inline-flex items-center gap-1.5"
            style={{
              padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
            Refresh
          </button>

          {/* Period selector */}
          <div className="flex items-center overflow-hidden" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
          }}>
            {(['today','week','month','year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '7px 12px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                  background: period === p
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'Today'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Sale',     href: '/dashboard/pos',       color: '#10b981', bg: '#ecfdf5', icon: ShoppingCart },
          { label: 'Add Product',  href: '/dashboard/products',  color: '#3b82f6', bg: '#eff6ff', icon: Package },
          { label: 'Add Customer', href: '/dashboard/customers', color: '#8b5cf6', bg: '#f5f3ff', icon: Users },
          { label: 'View Reports', href: '/dashboard/reports',   color: '#f59e0b', bg: '#fffbeb', icon: TrendingUp },
        ].map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', textDecoration: 'none'}}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 16, height: 16, color: a.color }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{a.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <KpiCard key={i} {...kpi} />
        ))}
        <BusinessHealthIndicator />
      </div>

      {/* ── Goals + Recent Activity row ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <GoalsWidget todayRevenue={data.summary.totalSales} />
        <div className="lg:col-span-2">
          <RecentActivityFeed branchId={selectedBranchId} />
        </div>
      </div>

      {/* ── Quick Actions FAB ── */}
      <QuickActionsFAB />

      {/* ── Upcoming Alerts ── */}
      {(data.lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }} className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Upcoming Alerts</h3>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Items that need your attention</p>
            </div>
            <Link href="/dashboard/inventory" style={{ fontSize: 12, fontWeight: 600, color: '#10b981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
            <Link href="/dashboard/inventory" className="flex items-center gap-3 p-5 hover:bg-[var(--bg-surface-2)] transition-colors" style={{ textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle style={{ width: 18, height: 18, color: '#dc2626' }} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', lineHeight: 1, margin: 0 }}>{outOfStockProducts.length}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Out of stock</p>
              </div>
            </Link>
            <Link href="/dashboard/inventory" className="flex items-center gap-3 p-5 hover:bg-[var(--bg-surface-2)] transition-colors" style={{ textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package style={{ width: 18, height: 18, color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#d97706', lineHeight: 1, margin: 0 }}>{data.lowStockProducts.length}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Low stock items</p>
              </div>
            </Link>
            <Link href="/dashboard/expiring" className="flex items-center gap-3 p-5 hover:bg-[var(--bg-surface-2)] transition-colors" style={{ textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ExternalLink style={{ width: 18, height: 18, color: '#3b82f6' }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Expiring Soon</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>View expiring products</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Charts row 1 ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {salesTrendData.length > 0 && (
          <SectionCard title="Revenue & Profit Trend" subtitle="Sales performance over time">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="sales"  stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} name="Revenue (GH₵)" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} name="Profit (GH₵)" />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {topProductsChartData.length > 0 && (
          <SectionCard title="Top Products by Revenue" subtitle="Best performing items this period">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topProductsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
                <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Revenue (GH₵)" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>

      {/* ── Charts row 2 ── */}
      {(categoryData.length > 0 || topProductsChartData.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {categoryData.length > 0 && (
            <SectionCard title="Sales by Category" subtitle="Revenue distribution across categories">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={95}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {topProductsChartData.length > 0 && (
            <SectionCard title="Units Sold by Product" subtitle="Quantity sold this period">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProductsChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── Tables row ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Top products table */}
        <SectionCard
          title="Top Products"
          noPad
          action={
            <Link href="/dashboard/products" className="inline-flex items-center gap-1" style={{
              fontSize: 12, fontWeight: 600, color: '#10b981', textDecoration: 'none',
            }}>
              View all <ExternalLink style={{ width: 12, height: 12 }} />
            </Link>
          }
        >
          {data.topProducts.length > 0 ? (
            <div>
              {data.topProducts.map((product, i) => {
                const rankColors: Record<number, string> = { 0: '#f59e0b', 1: '#94a3b8', 2: '#f97316' };
                return (
                  <TopProductRow
                    key={i}
                    rank={i + 1}
                    rankBg={rankColors[i] ?? '#e2e8f0'}
                    name={product.name}
                    quantity={product.quantity}
                    revenue={product.revenue}
                    barWidth={(product.revenue / maxRevenue) * 100}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
              <Package style={{ width: 32, height: 32, color: 'var(--text-tertiary)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No sales data for this period</p>
            </div>
          )}
        </SectionCard>

        {/* Low stock alert */}
        <SectionCard
          title="Low Stock Alert"
          noPad
          action={
            <Link href="/dashboard/inventory" className="inline-flex items-center gap-1" style={{
              fontSize: 12, fontWeight: 600, color: '#10b981', textDecoration: 'none',
            }}>
              View all <ExternalLink style={{ width: 12, height: 12 }} />
            </Link>
          }
        >
          {data.lowStockProducts.length > 0 ? (
            <div>
              {data.lowStockProducts.map((product, i) => (
                <LowStockRow key={i} name={product.name} stock={product.stock} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: '#ecfdf5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Package style={{ width: 20, height: 20, color: '#10b981' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>All stocked up!</p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>No low stock items right now</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Top employees ── */}
      <SectionCard title="Top Performing Employees">
        {data.topEmployees.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {data.topEmployees.map((emp, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const style  = MEDAL_STYLES[i] ?? { bg: 'var(--bg-surface-2)', border: 'var(--border-subtle)', barColor: '#94a3b8' };
              return (
                <div key={i} style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: 20, padding: 20,
                }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span style={{ fontSize: 24 }}>{medals[i] ?? '🎖️'}</span>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: `linear-gradient(135deg, ${style.barColor}, ${style.barColor}cc)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }} className="truncate">
                        {emp.name}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{emp.salesCount} sales</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: style.barColor, margin: 0 }}>
                    GH₵{emp.totalSales.toFixed(2)}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Total revenue</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 0' }}>
            <Users style={{ width: 32, height: 32, color: 'var(--text-tertiary)', marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No employee data available</p>
          </div>
        )}
      </SectionCard>

    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────
function TopProductRow({ rank, rankBg, name, quantity, revenue, barWidth }: {
  rank: number; rankBg: string; name: string; quantity: number; revenue: number; barWidth: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--bg-surface-2)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800,
        background: rank <= 3 ? rankBg : 'var(--bg-surface-3)',
        color: rank <= 3 ? '#fff' : 'var(--text-tertiary)',
        flexShrink: 0,
      }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="truncate">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{quantity} sold</p>
          <div style={{ flex: 1, maxWidth: 96, height: 4, borderRadius: 99, background: 'var(--bg-surface-3)' }}>
            <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 99, background: '#10b981' }} />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
        GH₵{revenue.toFixed(2)}
      </p>
    </div>
  );
}

function LowStockRow({ name, stock }: { name: string; stock: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--bg-surface-2)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        <div style={{
          width: 32, height: 32,
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <AlertTriangle style={{ width: 15, height: 15, color: '#ef4444' }} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }} className="truncate">
          {name}
        </p>
      </div>
      <span style={{
        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
        background: '#fef2f2', color: '#dc2626', flexShrink: 0,
      }}>
        {stock} left
      </span>
    </div>
  );
}
