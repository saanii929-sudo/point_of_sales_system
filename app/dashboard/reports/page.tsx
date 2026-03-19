'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  BarChart3, CircleDollarSign, Package, Users, Download,
  TrendingUp, Receipt, Banknote, CreditCard, Smartphone,
  ArrowUpRight, ArrowDownRight, ChevronDown, RefreshCw,
  ShoppingBag, Layers, Tag, Crown
} from 'lucide-react';

// ── Interfaces ───────────────────────────────────────────────
interface ReportData {
  salesReport: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesByDay: Array<{ date: string; sales: number; revenue: number }>;
    salesByPaymentMethod: Array<{ method: string; count: number; total: number }>;
    topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  };
  inventoryReport: {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    categoryBreakdown: Array<{ category: string; count: number; value: number }>;
    stockMovement: Array<{ product: string; sold: number; remaining: number }>;
  };
  profitAnalysis: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
    profitByProduct: Array<{ name: string; profit: number; margin: number }>;
    monthlyTrend: Array<{ month: string; profit: number }>;
  };
  customerInsights: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    topCustomers: Array<{ name: string; purchases: number; lifetime: number }>;
    averageLifetimeValue: number;
  };
}

type ReportTab = 'sales' | 'inventory' | 'profit' | 'customer';
type DateRange = 'week' | 'month' | 'year';

// ── Helpers ──────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function paymentIcon(method: string) {
  const m = method.toLowerCase();
  if (m === 'cash') return <Banknote className="w-4 h-4" />;
  if (m === 'card') return <CreditCard className="w-4 h-4" />;
  return <Smartphone className="w-4 h-4" />;
}

// Reusable KPI card
function KpiCard({ label, value, prefix = '', suffix = '', color = 'emerald', icon: Icon }:
  { label: string; value: string | number; prefix?: string; suffix?: string; color?: string; icon: typeof TrendingUp }) {
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    blue:    'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    purple:  'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
    amber:   'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    red:     'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
    orange:  'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] leading-none tabular-nums">
            {prefix && <span className="text-lg font-semibold">{prefix}</span>}
            {value}
            {suffix && <span className="text-lg font-semibold ml-0.5">{suffix}</span>}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[color] ?? iconColors.emerald}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

// Section header with export
function SectionTitle({ title, onExport }: { title: string; onExport: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
      >
        <Download className="w-3.5 h-3.5" /> Export CSV
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');

  useEffect(() => { fetchReportData(); }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reports?range=${dateRange}`);
      if (res.ok) setReportData(await res.json());
      else toast.error('Failed to load reports');
    } catch { toast.error('Failed to load reports'); }
    finally { setIsLoading(false); }
  };

  const exportReport = (type: ReportTab) => {
    if (!reportData) return;
    let csv = '';
    let filename = `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    if (type === 'sales') {
      const r = reportData.salesReport;
      csv = `Sales Report\n\nTotal Sales,${r.totalSales}\nTotal Revenue,GH₵${r.totalRevenue.toFixed(2)}\nAvg Order Value,GH₵${r.averageOrderValue.toFixed(2)}\n\nPayment Method,Transactions,Total\n`;
      r.salesByPaymentMethod.forEach((m) => { csv += `${m.method},${m.count},GH₵${m.total.toFixed(2)}\n`; });
      csv += '\nTop Products\nProduct,Units,Revenue\n';
      r.topSellingProducts.forEach((p) => { csv += `${p.name},${p.quantity},GH₵${p.revenue.toFixed(2)}\n`; });
    } else if (type === 'inventory') {
      const r = reportData.inventoryReport;
      csv = `Inventory Report\n\nTotal Products,${r.totalProducts}\nTotal Value,GH₵${r.totalValue.toFixed(2)}\nLow Stock,${r.lowStockItems}\nOut of Stock,${r.outOfStockItems}\n\nCategory,Products,Value\n`;
      r.categoryBreakdown.forEach((c) => { csv += `${c.category},${c.count},GH₵${c.value.toFixed(2)}\n`; });
    } else if (type === 'profit') {
      const r = reportData.profitAnalysis;
      csv = `Profit Analysis\n\nRevenue,GH₵${r.totalRevenue.toFixed(2)}\nCost,GH₵${r.totalCost.toFixed(2)}\nProfit,GH₵${r.totalProfit.toFixed(2)}\nMargin,${r.profitMargin.toFixed(2)}%\n\nProduct,Profit,Margin\n`;
      r.profitByProduct.forEach((p) => { csv += `${p.name},GH₵${p.profit.toFixed(2)},${p.margin.toFixed(2)}%\n`; });
    } else {
      const r = reportData.customerInsights;
      csv = `Customer Insights\n\nTotal,${r.totalCustomers}\nNew,${r.newCustomers}\nReturning,${r.returningCustomers}\nRetention,${r.retentionRate.toFixed(2)}%\nAvg LTV,GH₵${r.averageLifetimeValue.toFixed(2)}\n\nCustomer,Purchases,Lifetime Value\n`;
      r.topCustomers.forEach((c) => { csv += `${c.name},${c.purchases},GH₵${c.lifetime.toFixed(2)}\n`; });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    toast.success('Report exported');
  };

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-52 rounded-xl bg-[var(--bg-surface-3)] animate-pulse mb-2" />
            <div className="h-4 w-64 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-xl bg-[var(--bg-surface-3)] animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[0,1,2,3].map((i) => <div key={i} className="h-10 w-32 rounded-xl bg-[var(--bg-surface-3)] animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => (
            <Card key={i} className="p-5">
              <div className="h-3 w-20 rounded bg-[var(--bg-surface-3)] animate-pulse mb-3" />
              <div className="h-8 w-16 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
            </Card>
          ))}
        </div>
        {[0,1].map((i) => (
          <Card key={i}>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <div className="h-5 w-40 rounded bg-[var(--bg-surface-3)] animate-pulse" />
            </div>
            {[0,1,2,3].map((j) => (
              <div key={j} className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface-3)] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-[var(--bg-surface-3)] animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-[var(--bg-surface-3)] animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-[var(--bg-surface-3)] animate-pulse" />
              </div>
            ))}
          </Card>
        ))}
      </div>
    );
  }

  if (!reportData) return null;

  const tabs: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'sales',     label: 'Sales',     icon: Receipt },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'profit',    label: 'Profit',    icon: TrendingUp },
    { key: 'customer',  label: 'Customers', icon: Users },
  ];

  const rangeLabels: Record<DateRange, string> = {
    week: 'Last 7 days', month: 'Last 30 days', year: 'Last year',
  };

  // ── Derived ───────────────────────────────────────────────
  const sr = reportData.salesReport;
  const ir = reportData.inventoryReport;
  const pr = reportData.profitAnalysis;
  const cr = reportData.customerInsights;

  const maxPayment = Math.max(...sr.salesByPaymentMethod.map((m) => m.total), 1);
  const maxRevenue = Math.max(...sr.topSellingProducts.map((p) => p.revenue), 1);
  const maxValue   = Math.max(...ir.categoryBreakdown.map((c) => c.value), 1);
  const maxProfit  = Math.max(...pr.profitByProduct.map((p) => p.profit), 1);
  const maxLTV     = Math.max(...cr.topCustomers.map((c) => c.lifetime), 1);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports & Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Business performance insights — {rangeLabels[dateRange]}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchReportData}
            className="p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="pl-3.5 pr-8 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all appearance-none cursor-pointer font-medium"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          SALES
      ══════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-5">
          <SectionTitle title="Sales Report" onExport={() => exportReport('sales')} />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Total Transactions" value={sr.totalSales} icon={Receipt} color="blue" />
            <KpiCard label="Total Revenue" value={fmt(sr.totalRevenue)} prefix="GH₵" icon={CircleDollarSign} color="emerald" />
            <KpiCard label="Avg Order Value" value={`${sr.averageOrderValue.toFixed(2)}`} prefix="GH₵" icon={BarChart3} color="purple" />
          </div>

          {/* Payment methods */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Revenue by Payment Method</h3>
            </div>
            {sr.salesByPaymentMethod.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No payment data</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {sr.salesByPaymentMethod.map((m) => {
                  const pct = Math.round((m.total / maxPayment) * 100);
                  return (
                    <div key={m.method} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface-3)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)]">
                        {paymentIcon(m.method)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{m.method}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--text-tertiary)]">{m.count} txns</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">GH₵{m.total.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--primary-color)] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Top selling products */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Selling Products</h3>
            </div>
            {sr.topSellingProducts.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No sales data yet</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {sr.topSellingProducts.map((p, i) => {
                  const pct = Math.round((p.revenue / maxRevenue) * 100);
                  const color = avatarColor(p.name);
                  return (
                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                          {getInitials(p.name)}
                        </div>
                        <span className={`absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-600' : 'bg-[var(--bg-surface-3)] text-[var(--text-tertiary)]'}`}>
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate pr-4">{p.name}</p>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-[var(--text-tertiary)]">{p.quantity} units</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">GH₵{p.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          INVENTORY
      ══════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          <SectionTitle title="Inventory Report" onExport={() => exportReport('inventory')} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Products" value={ir.totalProducts} icon={Package} color="blue" />
            <KpiCard label="Inventory Value" value={fmt(ir.totalValue)} prefix="GH₵" icon={CircleDollarSign} color="emerald" />
            <KpiCard label="Low Stock" value={ir.lowStockItems} icon={BarChart3} color="amber" />
            <KpiCard label="Out of Stock" value={ir.outOfStockItems} icon={Layers} color="red" />
          </div>

          {/* Category breakdown */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Inventory by Category</h3>
            </div>
            {ir.categoryBreakdown.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No categories found</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {ir.categoryBreakdown.map((cat) => {
                  const pct = Math.round((cat.value / maxValue) * 100);
                  const color = avatarColor(cat.category);
                  return (
                    <div key={cat.category} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: color }}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{cat.category}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--text-tertiary)]">{cat.count} products</span>
                            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">GH₵{cat.value.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Stock movement */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Stock Movement — Top Products</h3>
            </div>
            {ir.stockMovement.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No movement data yet</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {ir.stockMovement.map((item, i) => {
                  const total = item.sold + item.remaining;
                  const soldPct = total > 0 ? Math.round((item.sold / total) * 100) : 0;
                  return (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate pr-4">{item.product}</p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{item.sold} sold</span>
                          <span className="text-xs text-[var(--text-tertiary)]">{item.remaining} left</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--primary-color)]" style={{ width: `${soldPct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--text-tertiary)] w-9 text-right tabular-nums">{soldPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          PROFIT
      ══════════════════════════════════════ */}
      {activeTab === 'profit' && (
        <div className="space-y-5">
          <SectionTitle title="Profit Analysis" onExport={() => exportReport('profit')} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={fmt(pr.totalRevenue)} prefix="GH₵" icon={CircleDollarSign} color="blue" />
            <KpiCard label="Total Cost" value={fmt(pr.totalCost)} prefix="GH₵" icon={ShoppingBag} color="orange" />
            <KpiCard label="Total Profit" value={fmt(pr.totalProfit)} prefix="GH₵" icon={TrendingUp} color="emerald" />
            <KpiCard label="Profit Margin" value={`${pr.profitMargin.toFixed(1)}`} suffix="%" icon={BarChart3} color="purple" />
          </div>

          {/* Revenue breakdown visual */}
          <Card className="p-5">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Revenue Breakdown</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-4 rounded-full overflow-hidden bg-[var(--bg-surface-3)] flex">
                {pr.totalRevenue > 0 && (
                  <>
                    <div
                      className="h-full bg-red-400 dark:bg-red-500 transition-all"
                      style={{ width: `${(pr.totalCost / pr.totalRevenue) * 100}%` }}
                      title="Cost"
                    />
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${(pr.totalProfit / pr.totalRevenue) * 100}%` }}
                      title="Profit"
                    />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <span className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-500" /> Cost — {pr.totalRevenue > 0 ? ((pr.totalCost / pr.totalRevenue) * 100).toFixed(1) : 0}%
              </span>
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Profit — {pr.profitMargin.toFixed(1)}%
              </span>
            </div>
          </Card>

          {/* Most profitable products */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Most Profitable Products</h3>
            </div>
            {pr.profitByProduct.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No profit data yet</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {pr.profitByProduct.map((p, i) => {
                  const pct = Math.round((p.profit / maxProfit) * 100);
                  const color = avatarColor(p.name);
                  const marginColor = p.margin >= 30 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : p.margin >= 15 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
                    : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30';
                  return (
                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                          {getInitials(p.name)}
                        </div>
                        {i === 0 && (
                          <Crown className="absolute -top-2 -right-1 w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${marginColor}`}>
                              {p.margin.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0 ml-3">
                            GH₵{p.profit.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          CUSTOMERS
      ══════════════════════════════════════ */}
      {activeTab === 'customer' && (
        <div className="space-y-5">
          <SectionTitle title="Customer Insights" onExport={() => exportReport('customer')} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Customers" value={cr.totalCustomers} icon={Users} color="blue" />
            <KpiCard label="New Customers" value={cr.newCustomers} icon={ArrowUpRight} color="emerald" />
            <KpiCard label="Returning" value={cr.returningCustomers} icon={ArrowDownRight} color="purple" />
            <KpiCard label="Retention Rate" value={`${cr.retentionRate.toFixed(1)}`} suffix="%" icon={BarChart3} color="amber" />
          </div>

          {/* Average LTV spotlight */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Average Customer Lifetime Value</p>
                <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums">
                  <span className="text-2xl font-semibold">GH₵</span>
                  {cr.averageLifetimeValue.toFixed(2)}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">per customer over their lifetime</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[var(--brand-100)] flex items-center justify-center flex-shrink-0">
                <CircleDollarSign className="w-8 h-8 text-[var(--primary-color)]" />
              </div>
            </div>
            {cr.totalCustomers > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">New vs Returning</p>
                  <div className="h-2 rounded-full bg-[var(--bg-surface-3)] overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(cr.newCustomers / cr.totalCustomers) * 100}%` }} />
                    <div className="h-full bg-purple-500" style={{ width: `${(cr.returningCustomers / cr.totalCustomers) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />New</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />Returning</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Retention</p>
                  <div className="h-2 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${cr.retentionRate}%` }} />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1.5">{cr.retentionRate.toFixed(1)}% of customers returned</p>
                </div>
              </div>
            )}
          </Card>

          {/* Top customers */}
          <Card>
            <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Customers by Lifetime Value</h3>
            </div>
            {cr.topCustomers.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">No customer data yet</div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {cr.topCustomers.map((c, i) => {
                  const pct = Math.round((c.lifetime / maxLTV) * 100);
                  const color = avatarColor(c.name);
                  return (
                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
                          {getInitials(c.name)}
                        </div>
                        {i === 0 && <Crown className="absolute -top-2 -right-1 w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{c.name}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">{c.purchases} purchase{c.purchases !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums flex-shrink-0 ml-3">
                            GH₵{c.lifetime.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color + 'cc' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
