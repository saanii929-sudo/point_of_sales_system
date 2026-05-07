'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { useBranchStore } from '@/store/useBranchStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  BarChart3, CircleDollarSign, Package, Users, Download,
  TrendingUp, Receipt, Banknote, CreditCard, Smartphone,
  RefreshCw, ShoppingBag, Layers, Tag, Crown,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportData {
  salesReport: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesByDay: { date: string; sales: number; revenue: number }[];
    salesByPaymentMethod: { method: string; count: number; total: number }[];
    topSellingProducts: { name: string; quantity: number; revenue: number }[];
  };
  inventoryReport: {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    categoryBreakdown: { category: string; count: number; value: number }[];
    stockMovement: { product: string; sold: number; remaining: number }[];
  };
  profitAnalysis: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    profitByProduct: { name: string; profit: number; margin: number }[];
    monthlyTrend: { month: string; profit: number }[];
  };
  customerInsights: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    topCustomers: { name: string; purchases: number; lifetime: number }[];
    averageLifetimeValue: number;
  };
}

type ReportTab = 'sales' | 'inventory' | 'profit' | 'customer';
type DateRange = 'week' | 'month' | 'year';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const PALETTE = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];

function pickColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function payIcon(method: string) {
  const m = method.toLowerCase();
  if (m === 'cash') return <Banknote className="w-4 h-4" />;
  if (m === 'card') return <CreditCard className="w-4 h-4" />;
  return <Smartphone className="w-4 h-4" />;
}

// ── Reusable components ───────────────────────────────────────────────────────

function GradientCard({
  label, value, sub, icon: Icon, from: f, to: t,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; from: string; to: string;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden select-none"
      style={{ background: `linear-gradient(135deg, ${f}, ${t})` }}
    >
      <div className="relative z-10">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-white leading-none tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-white/75 uppercase tracking-wider mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>}
      </div>
      <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
    </div>
  );
}

function SectionCard({
  title, subtitle, action, children,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

function DataRow({
  rank, name, color, left, right, pct, sub,
}: {
  rank?: number; name: string; color?: string;
  left?: React.ReactNode; right: React.ReactNode;
  pct: number; sub?: string;
}) {
  const medalBg  = rank === 0 ? 'bg-amber-500' : rank === 1 ? 'bg-slate-400' : rank === 2 ? 'bg-orange-500' : 'bg-[var(--bg-surface-3)]';
  const medalTxt = (rank ?? 99) < 3 ? 'text-white' : 'text-[var(--text-tertiary)]';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-surface-2)] transition-colors">
      {rank !== undefined && (
        <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${medalBg} ${medalTxt}`}>
          {rank + 1}
        </span>
      )}

      {left ?? (color && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 relative"
          style={{ backgroundColor: color }}
        >
          {initials(name)}
          {rank === 0 && <Crown className="absolute -top-2.5 -right-1 w-3.5 h-3.5 text-amber-500" />}
        </div>
      ))}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{name}</p>
          <div className="flex-shrink-0">{right}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color ?? '#10b981' }}
            />
          </div>
          {sub && (
            <span className="text-[11px] tabular-nums text-[var(--text-tertiary)] w-9 text-right flex-shrink-0">{sub}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="py-12 text-center text-sm text-[var(--text-secondary)]">{label}</div>;
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-xs min-w-[130px]">
      {label && <p className="font-semibold text-[var(--text-secondary)] mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-bold text-[var(--text-primary)] tabular-nums">
            {['revenue', 'profit', 'value'].includes(p.dataKey)
              ? `GH₵${Number(p.value).toFixed(2)}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { selectedBranchId, selectedBranchName } = useBranchStore();

  const [reportData, setReportData]   = useState<ReportData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange]     = useState<DateRange>('month');
  const [activeTab, setActiveTab]     = useState<ReportTab>('sales');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    try {
      const branchParam = selectedBranchId ? `&branchId=${selectedBranchId}` : '';
      const { data } = await fetchWithOfflineFallback(`/api/reports?range=${dateRange}${branchParam}`);
      setReportData(data);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedBranchId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  const exportReport = (type: ReportTab) => {
    if (!reportData) return;
    let csv = '';
    const filename = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    if (type === 'sales') {
      const r = reportData.salesReport;
      csv = `Sales Report\n\nTotal Sales,${r.totalSales}\nTotal Revenue,GH₵${r.totalRevenue.toFixed(2)}\nAvg Order Value,GH₵${r.averageOrderValue.toFixed(2)}\n\nPayment Method,Transactions,Total\n`;
      r.salesByPaymentMethod.forEach(m => { csv += `${m.method},${m.count},GH₵${m.total.toFixed(2)}\n`; });
      csv += '\nTop Products\nProduct,Units,Revenue\n';
      r.topSellingProducts.forEach(p => { csv += `${p.name},${p.quantity},GH₵${p.revenue.toFixed(2)}\n`; });
    } else if (type === 'inventory') {
      const r = reportData.inventoryReport;
      csv = `Inventory Report\n\nTotal Products,${r.totalProducts}\nTotal Value,GH₵${r.totalValue.toFixed(2)}\nLow Stock,${r.lowStockItems}\nOut of Stock,${r.outOfStockItems}\n\nCategory,Products,Value\n`;
      r.categoryBreakdown.forEach(c => { csv += `${c.category},${c.count},GH₵${c.value.toFixed(2)}\n`; });
    } else if (type === 'profit') {
      const r = reportData.profitAnalysis;
      csv = `Profit Analysis\n\nRevenue,GH₵${r.totalRevenue.toFixed(2)}\nCost,GH₵${r.totalCost.toFixed(2)}\nProfit,GH₵${r.totalProfit.toFixed(2)}\nMargin,${r.profitMargin.toFixed(2)}%\n\nProduct,Profit,Margin\n`;
      r.profitByProduct.forEach(p => { csv += `${p.name},GH₵${p.profit.toFixed(2)},${p.margin.toFixed(2)}%\n`; });
    } else {
      const r = reportData.customerInsights;
      csv = `Customer Insights\n\nTotal,${r.totalCustomers}\nNew,${r.newCustomers}\nReturning,${r.returningCustomers}\nRetention,${r.retentionRate.toFixed(2)}%\nAvg LTV,GH₵${r.averageLifetimeValue.toFixed(2)}\n\nCustomer,Purchases,Lifetime Value\n`;
      r.topCustomers.forEach(c => { csv += `${c.name},${c.purchases},GH₵${c.lifetime.toFixed(2)}\n`; });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    toast.success('Report exported');
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="h-7 w-52 rounded-xl bg-[var(--bg-surface-2)] mb-2" />
            <div className="h-4 w-64 rounded-lg bg-[var(--bg-surface-2)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-xl bg-[var(--bg-surface-2)]" />
            <div className="h-9 w-9  rounded-xl bg-[var(--bg-surface-2)]" />
            <div className="h-9 w-24 rounded-xl bg-[var(--bg-surface-2)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[var(--bg-surface-2)]" />)}
        </div>
        <div className="h-11 w-80 rounded-2xl bg-[var(--bg-surface-2)]" />
        <div className="h-64 rounded-2xl bg-[var(--bg-surface-2)]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-56 rounded-2xl bg-[var(--bg-surface-2)]" />
          <div className="h-56 rounded-2xl bg-[var(--bg-surface-2)]" />
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const { salesReport: sr, inventoryReport: ir, profitAnalysis: pr, customerInsights: cr } = reportData;

  // ── Chart data ────────────────────────────────────────────────────────────────

  const salesChartData = sr.salesByDay.map(d => ({
    date:    format(parseISO(d.date), 'MMM d'),
    revenue: d.revenue,
    sales:   d.sales,
  }));

  const categoryChartData = ir.categoryBreakdown.map((c, i) => ({
    name:  c.category.length > 10 ? c.category.slice(0, 10) + '…' : c.category,
    value: c.value,
    count: c.count,
    fill:  PALETTE[i % PALETTE.length],
  }));

  const profitChartData = pr.profitByProduct.slice(0, 7).map(p => ({
    name:   p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
    profit: p.profit,
    margin: p.margin,
  }));

  // ── Maxes for progress bar scaling ───────────────────────────────────────────

  const maxPayment = Math.max(...sr.salesByPaymentMethod.map(m => m.total), 1);
  const maxRevenue = Math.max(...sr.topSellingProducts.map(p => p.revenue), 1);
  const maxValue   = Math.max(...ir.categoryBreakdown.map(c => c.value), 1);
  const maxProfit  = Math.max(...pr.profitByProduct.map(p => p.profit), 1);
  const maxLTV     = Math.max(...cr.topCustomers.map(c => c.lifetime), 1);

  const RANGE_LABELS: Record<DateRange, string> = {
    week: 'Last 7 days', month: 'Last 30 days', year: 'Last year',
  };

  const TABS = [
    { key: 'sales'     as ReportTab, label: 'Sales',     Icon: Receipt    },
    { key: 'inventory' as ReportTab, label: 'Inventory', Icon: Package    },
    { key: 'profit'    as ReportTab, label: 'Profit',    Icon: TrendingUp },
    { key: 'customer'  as ReportTab, label: 'Customers', Icon: Users      },
  ];

  type StatDef = { label: string; value: string; sub?: string; icon: React.ElementType; from: string; to: string };
  const TAB_STATS: Record<ReportTab, StatDef[]> = {
    sales: [
      { label: 'Total Transactions', value: sr.totalSales.toString(),                icon: Receipt,          from: '#10b981', to: '#059669' },
      { label: 'Total Revenue',      value: `GH₵${fmt(sr.totalRevenue)}`,            icon: CircleDollarSign, from: '#0ea5e9', to: '#0284c7' },
      { label: 'Avg Order Value',    value: `GH₵${sr.averageOrderValue.toFixed(2)}`, icon: BarChart3,        from: '#8b5cf6', to: '#7c3aed' },
      { label: 'Payment Methods',    value: sr.salesByPaymentMethod.length.toString(), icon: CreditCard,     from: '#f59e0b', to: '#d97706' },
    ],
    inventory: [
      { label: 'Total Products',  value: ir.totalProducts.toString(),   icon: Package,          from: '#0ea5e9', to: '#0284c7' },
      { label: 'Inventory Value', value: `GH₵${fmt(ir.totalValue)}`,   icon: CircleDollarSign, from: '#10b981', to: '#059669' },
      { label: 'Low Stock',       value: ir.lowStockItems.toString(),   icon: BarChart3,        from: '#f59e0b', to: '#d97706', sub: 'items need restocking' },
      { label: 'Out of Stock',    value: ir.outOfStockItems.toString(), icon: Layers,           from: '#ef4444', to: '#dc2626', sub: 'items unavailable'     },
    ],
    profit: [
      { label: 'Total Revenue', value: `GH₵${fmt(pr.totalRevenue)}`,         icon: CircleDollarSign, from: '#0ea5e9', to: '#0284c7' },
      { label: 'Total Cost',    value: `GH₵${fmt(pr.totalCost)}`,            icon: ShoppingBag,      from: '#ef4444', to: '#dc2626' },
      { label: 'Net Profit',    value: `GH₵${fmt(pr.totalProfit)}`,          icon: TrendingUp,       from: '#10b981', to: '#059669' },
      { label: 'Profit Margin', value: `${pr.profitMargin.toFixed(1)}%`,     icon: BarChart3,        from: '#8b5cf6', to: '#7c3aed' },
    ],
    customer: [
      { label: 'Total Customers', value: cr.totalCustomers.toString(),      icon: Users,          from: '#0ea5e9', to: '#0284c7' },
      { label: 'New Customers',   value: cr.newCustomers.toString(),         icon: ArrowUpRight,   from: '#10b981', to: '#059669' },
      { label: 'Returning',       value: cr.returningCustomers.toString(),   icon: ArrowDownRight, from: '#8b5cf6', to: '#7c3aed' },
      { label: 'Retention Rate',  value: `${cr.retentionRate.toFixed(1)}%`, icon: BarChart3,      from: '#f59e0b', to: '#d97706' },
    ],
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </span>
            Reports & Analytics
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 pl-[46px] flex items-center gap-2 flex-wrap">
            Business performance insights — {RANGE_LABELS[dateRange]}
            {selectedBranchName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'var(--brand-100)', color: 'var(--primary-color)' }}>
                · {selectedBranchName}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Date range pills */}
          <div className="flex gap-1 p-1 bg-[var(--bg-surface-2)] rounded-xl border border-[var(--border-subtle)]">
            {([['week', '7D'], ['month', '30D'], ['year', '1Y']] as [DateRange, string][]).map(([r, lbl]) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={[
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  dateRange === r
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadData(true)}
            title="Refresh"
            className="w-9 h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export */}
          <button
            onClick={() => exportReport(activeTab)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Gradient stat cards — update per tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TAB_STATS[activeTab].map((s, i) => (
          <GradientCard key={i} label={s.label} value={s.value} sub={s.sub} icon={s.icon} from={s.from} to={s.to} />
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 p-1.5 bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          SALES
      ════════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-5">

          {/* Revenue trend chart */}
          {salesChartData.length > 0 && (
            <SectionCard title="Revenue Trend" subtitle="Daily revenue over the selected period">
              <div className="px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={salesChartData} margin={{ top: 6, right: 18, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad_rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `GH₵${fmt(v)}`}
                      width={54}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#grad_rev)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {/* Payment Methods + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <SectionCard
              title="Payment Methods"
              subtitle="Revenue split by payment type"
              action={<span className="text-xs text-[var(--text-tertiary)]">{sr.salesByPaymentMethod.reduce((a, m) => a + m.count, 0)} total</span>}
            >
              {sr.salesByPaymentMethod.length === 0 ? <EmptyRow label="No payment data" /> : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {sr.salesByPaymentMethod.map(m => (
                    <DataRow
                      key={m.method}
                      name={m.method.charAt(0).toUpperCase() + m.method.slice(1)}
                      left={
                        <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface-2)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)]">
                          {payIcon(m.method)}
                        </div>
                      }
                      right={
                        <div className="text-right">
                          <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">GH₵{m.total.toFixed(2)}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{m.count} txns</p>
                        </div>
                      }
                      pct={Math.round((m.total / maxPayment) * 100)}
                      sub={`${Math.round((m.total / maxPayment) * 100)}%`}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Top Selling Products" subtitle="Ranked by revenue">
              {sr.topSellingProducts.length === 0 ? <EmptyRow label="No sales data yet" /> : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {sr.topSellingProducts.map((p, i) => (
                    <DataRow
                      key={i}
                      rank={i}
                      name={p.name}
                      color={pickColor(p.name)}
                      right={
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600 tabular-nums">GH₵{p.revenue.toFixed(2)}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{p.quantity} units</p>
                        </div>
                      }
                      pct={Math.round((p.revenue / maxRevenue) * 100)}
                      sub={`${Math.round((p.revenue / maxRevenue) * 100)}%`}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          INVENTORY
      ════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">

          {/* Category Bar Chart */}
          {categoryChartData.length > 0 && (
            <SectionCard title="Inventory Value by Category" subtitle="Current stock value (GH₵) per category">
              <div className="px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={categoryChartData} margin={{ top: 6, right: 18, left: 0, bottom: 0 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `GH₵${fmt(v)}`}
                      width={58}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            <SectionCard title="Inventory by Category" subtitle="Products and stock value">
              {ir.categoryBreakdown.length === 0 ? <EmptyRow label="No categories found" /> : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {ir.categoryBreakdown.map((cat, i) => {
                    const color = PALETTE[i % PALETTE.length];
                    const pct   = Math.round((cat.value / maxValue) * 100);
                    return (
                      <DataRow
                        key={cat.category}
                        name={cat.category}
                        left={
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: color + '22' }}
                          >
                            <Tag className="w-4 h-4" style={{ color }} />
                          </div>
                        }
                        color={color}
                        right={
                          <div className="text-right">
                            <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">GH₵{cat.value.toFixed(2)}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">{cat.count} products</p>
                          </div>
                        }
                        pct={pct}
                        sub={`${pct}%`}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Stock Movement" subtitle="Units sold vs remaining">
              {ir.stockMovement.length === 0 ? <EmptyRow label="No movement data yet" /> : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {ir.stockMovement.map((item, i) => {
                    const total   = item.sold + item.remaining;
                    const soldPct = total > 0 ? Math.round((item.sold / total) * 100) : 0;
                    return (
                      <DataRow
                        key={i}
                        name={item.product}
                        color="#10b981"
                        right={
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-600">{item.sold} sold</p>
                            <p className="text-xs text-[var(--text-tertiary)]">{item.remaining} left</p>
                          </div>
                        }
                        pct={soldPct}
                        sub={`${soldPct}%`}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          PROFIT
      ════════════════════════════════════════ */}
      {activeTab === 'profit' && (
        <div className="space-y-5">

          {/* Revenue breakdown visual */}
          <Card className="p-5">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Revenue Breakdown</p>
            <div className="h-5 rounded-full overflow-hidden bg-[var(--bg-surface-3)] flex mb-4">
              {pr.totalRevenue > 0 && (
                <>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(pr.totalCost / pr.totalRevenue) * 100}%`,
                      background: 'linear-gradient(90deg, #f87171, #fb923c)',
                    }}
                  />
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(pr.totalProfit / pr.totalRevenue) * 100}%`,
                      background: 'linear-gradient(90deg, #34d399, #2dd4bf)',
                    }}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Cost',    value: pr.totalCost,    pct: pr.totalRevenue > 0 ? (pr.totalCost / pr.totalRevenue) * 100 : 0, dot: '#f87171' },
                { label: 'Profit',  value: pr.totalProfit,  pct: pr.profitMargin,                                                   dot: '#34d399' },
                { label: 'Revenue', value: pr.totalRevenue, pct: 100,                                                               dot: '#94a3b8' },
              ].map(({ label, value, pct, dot }) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0" style={{ backgroundColor: dot }} />
                  <div>
                    <p className="font-bold text-[var(--text-primary)] tabular-nums">GH₵{fmt(value)}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{label} — {pct.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Horizontal profit chart */}
          {profitChartData.length > 0 && (
            <SectionCard title="Profit by Product" subtitle="Top products by net profit">
              <div className="px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={Math.max(180, profitChartData.length * 38)}>
                  <BarChart
                    data={profitChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 18, left: 0, bottom: 0 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={v => `GH₵${fmt(v)}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      axisLine={false} tickLine={false}
                      width={112}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="profit" name="Profit" radius={[0, 6, 6, 0]} fill="#10b981" fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {/* Most profitable products list */}
          <SectionCard title="Most Profitable Products" subtitle="Ranked by net profit">
            {pr.profitByProduct.length === 0 ? <EmptyRow label="No profit data yet" /> : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {pr.profitByProduct.map((p, i) => {
                  const marginColor = p.margin >= 30
                    ? 'text-emerald-700 bg-emerald-50'
                    : p.margin >= 15
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-red-700 bg-red-50';
                  return (
                    <DataRow
                      key={i}
                      rank={i}
                      name={p.name}
                      color={pickColor(p.name)}
                      right={
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${marginColor}`}>
                            {p.margin.toFixed(1)}%
                          </span>
                          <p className="text-sm font-bold text-emerald-600 tabular-nums">
                            GH₵{p.profit.toFixed(2)}
                          </p>
                        </div>
                      }
                      pct={Math.round((p.profit / maxProfit) * 100)}
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>

        </div>
      )}

      {/* ════════════════════════════════════════
          CUSTOMERS
      ════════════════════════════════════════ */}
      {activeTab === 'customer' && (
        <div className="space-y-5">

          {/* Average LTV spotlight */}
          <Card className="overflow-hidden">
            <div
              className="p-6"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(59,130,246,0.07))' }}
            >
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                    Average Customer Lifetime Value
                  </p>
                  <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums leading-none">
                    <span className="text-xl font-semibold text-[var(--text-secondary)] mr-0.5">GH₵</span>
                    {cr.averageLifetimeValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">per customer over their lifetime</p>
                </div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #10b981, #0d9488)' }}
                >
                  <CircleDollarSign className="w-8 h-8 text-white" />
                </div>
              </div>

              {cr.totalCustomers > 0 && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">New vs Returning</p>
                    <div className="h-2.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(cr.newCustomers / cr.totalCustomers) * 100}%` }}
                      />
                      <div
                        className="h-full bg-violet-500 transition-all"
                        style={{ width: `${(cr.returningCustomers / cr.totalCustomers) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />New ({cr.newCustomers})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />Returning ({cr.returningCustomers})
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">
                      Retention Rate —{' '}
                      <span className="font-bold text-[var(--text-primary)]">{cr.retentionRate.toFixed(1)}%</span>
                    </p>
                    <div className="h-2.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${cr.retentionRate}%` }} />
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                      {cr.returningCustomers} of {cr.totalCustomers} customers returned
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Top customers */}
          <SectionCard title="Top Customers by Lifetime Value" subtitle="Your highest-value customers">
            {cr.topCustomers.length === 0 ? <EmptyRow label="No customer data yet" /> : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {cr.topCustomers.map((c, i) => (
                  <DataRow
                    key={i}
                    rank={i}
                    name={c.name}
                    color={pickColor(c.name)}
                    right={
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">GH₵{c.lifetime.toFixed(2)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {c.purchases} purchase{c.purchases !== 1 ? 's' : ''}
                        </p>
                      </div>
                    }
                    pct={Math.round((c.lifetime / maxLTV) * 100)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

        </div>
      )}

    </div>
  );
}
