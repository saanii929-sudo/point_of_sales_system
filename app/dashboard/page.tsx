'use client';

import { useEffect, useState, useCallback } from 'react';
import { BusinessHealthIndicator } from '@/components/dashboard/BusinessHealthIndicator';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import {
  AlertTriangle, TrendingUp, DollarSign, ShoppingCart, Users,
  RefreshCw, Pause, Play, Package, ArrowUpRight, ArrowDownRight,
  ExternalLink,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────
interface DashboardData {
  summary: {
    totalSales:     number;
    totalProfit:    number;
    salesCount:     number;
    totalCustomers: number;
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
      boxShadow: 'var(--shadow-elevated)',
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
      boxShadow: 'var(--shadow-card)',
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

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  title, value, change, up, icon, iconBg, iconColor,
}: {
  title: string;
  value: string;
  change: string;
  up: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 20,
      padding: 20,
      boxShadow: 'var(--shadow-card)',
    }}>
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
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data,               setData]               = useState<DashboardData | null>(null);
  const [isLoading,          setIsLoading]          = useState(true);
  const [period,             setPeriod]             = useState('today');
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [lastUpdate,         setLastUpdate]         = useState<Date>(new Date());
  const [isRealTime,         setIsRealTime]         = useState(true);
  const [outOfStockDismissed, setOutOfStockDismissed] = useState(false);

  const fetchOutOfStockProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const result = await res.json();
        setOutOfStockProducts(result.products.filter((p: Product) => p.stock <= 0));
      }
    } catch { /* silent */ }
  }, []);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch(`/api/analytics/dashboard?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const result = await res.json();

      const hasChanged = data && (
        data.summary.totalSales !== result.summary.totalSales ||
        data.summary.salesCount !== result.summary.salesCount
      );

      setData(result);
      setLastUpdate(new Date());

      if (!silent) toast.success('Dashboard updated', { duration: 2000 });
      else if (hasChanged) {
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
  }, [period, data]);

  useEffect(() => {
    fetchDashboardData();
    fetchOutOfStockProducts();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time polling every 30s
  useEffect(() => {
    if (!isRealTime) return;
    const id = setInterval(() => {
      fetchDashboardData(true);
      fetchOutOfStockProducts();
    }, 30_000);
    return () => clearInterval(id);
  }, [period, isRealTime]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `GH₵${data.summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: '+12.5%', up: true,
      icon: <DollarSign style={{ width: 20, height: 20 }} />,
      iconBg: '#ecfdf5', iconColor: '#059669',
    },
    {
      title: 'Net Profit',
      value: `GH₵${data.summary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: data.summary.totalProfit >= 0 ? 'Positive' : 'Below cost',
      up: data.summary.totalProfit >= 0,
      icon: <TrendingUp style={{ width: 20, height: 20 }} />,
      iconBg: data.summary.totalProfit >= 0 ? '#eff6ff' : '#fef2f2',
      iconColor: data.summary.totalProfit >= 0 ? '#3b82f6' : '#dc2626',
    },
    {
      title: 'Transactions',
      value: data.summary.salesCount.toLocaleString(),
      change: '+5.3%', up: true,
      icon: <ShoppingCart style={{ width: 20, height: 20 }} />,
      iconBg: '#f5f3ff', iconColor: '#7c3aed',
    },
    {
      title: 'Customers',
      value: data.summary.totalCustomers.toLocaleString(),
      change: '+2.8%', up: true,
      icon: <Users style={{ width: 20, height: 20 }} />,
      iconBg: '#fffbeb', iconColor: '#d97706',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">

      {/* ── Out of stock alert ── */}
      {outOfStockProducts.length > 0 && !outOfStockDismissed && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up" style={{ maxWidth: 360 }}>
          <div style={{
            background: '#dc2626', color: '#fff',
            borderRadius: 20, padding: 16,
            boxShadow: '0 20px 60px rgba(220,38,38,0.35)',
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <KpiCard key={i} {...kpi} />
        ))}
        <BusinessHealthIndicator />
      </div>

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
