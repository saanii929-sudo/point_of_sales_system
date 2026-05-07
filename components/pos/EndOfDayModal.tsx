'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  X, TrendingUp, ShoppingCart, DollarSign, CreditCard,
  Banknote, SplitSquareHorizontal, Users, Package,
  Printer, RefreshCw, Moon,
} from 'lucide-react';

interface EODData {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalDiscount: number;
  totalTax: number;
  avgOrderValue: number;
  byPaymentMethod: Array<{ method: string; count: number; total: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  cashierBreakdown: Array<{ name: string; count: number; total: number }>;
  uniqueCustomers: number;
}

interface EndOfDayModalProps {
  branchId?: string;
  branchName?: string;
  onClose: () => void;
}

const METHOD_ICON: Record<string, React.ElementType> = {
  cash:  Banknote,
  card:  CreditCard,
  split: SplitSquareHorizontal,
};

function fmt(n: number) {
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function EndOfDayModal({ branchId, branchName, onClose }: EndOfDayModalProps) {
  const [data, setData]       = useState<EODData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const start = new Date(today); start.setHours(0, 0, 0, 0);
      const end   = new Date(today); end.setHours(23, 59, 59, 999);
      const branch = branchId ? `&branchId=${branchId}` : '';
      const res = await fetch(
        `/api/sales?startDate=${start.toISOString()}&endDate=${end.toISOString()}${branch}&limit=500`
      );
      if (!res.ok) throw new Error('Failed');
      const { sales } = await res.json();

      // Aggregate client-side
      let totalRevenue = 0, totalProfit = 0, totalDiscount = 0, totalTax = 0;
      const byMethod: Record<string, { count: number; total: number }> = {};
      const byProduct: Record<string, { quantity: number; revenue: number }> = {};
      const byCashier: Record<string, { name: string; count: number; total: number }> = {};
      const customerSet = new Set<string>();

      for (const s of sales) {
        totalRevenue  += s.total;
        totalProfit   += s.profit ?? 0;
        totalDiscount += s.discount ?? 0;
        totalTax      += s.tax ?? 0;

        const m = s.paymentMethod;
        if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
        byMethod[m].count++;
        byMethod[m].total += s.total;

        for (const item of s.items ?? []) {
          if (!byProduct[item.productName]) byProduct[item.productName] = { quantity: 0, revenue: 0 };
          byProduct[item.productName].quantity += item.quantity;
          byProduct[item.productName].revenue  += item.price * item.quantity;
        }

        const cid = s.cashier?._id ?? s.cashier;
        const cname = s.cashier?.name ?? 'Unknown';
        if (!byCashier[cid]) byCashier[cid] = { name: cname, count: 0, total: 0 };
        byCashier[cid].count++;
        byCashier[cid].total += s.total;

        if (s.customer) customerSet.add(s.customer?._id ?? s.customer);
      }

      setData({
        date: format(today, 'EEEE, MMMM d, yyyy'),
        totalSales: sales.length,
        totalRevenue,
        totalProfit,
        totalDiscount,
        totalTax,
        avgOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
        byPaymentMethod: Object.entries(byMethod).map(([method, v]) => ({ method, ...v }))
          .sort((a, b) => b.total - a.total),
        topProducts: Object.entries(byProduct).map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        cashierBreakdown: Object.values(byCashier).sort((a, b) => b.total - a.total),
        uniqueCustomers: customerSet.size,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>End of Day Report</title>
<style>
  body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 8mm; font-size: 11px; color: #000; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 4px; }
  .sub { text-align: center; font-size: 10px; margin-bottom: 12px; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; margin: 3px 0; }
  .bold { font-weight: bold; }
  .section { margin: 8px 0; }
  .section-title { font-weight: bold; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; }
  .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 6px 0; }
</style></head><body>
<h1>END OF DAY REPORT</h1>
<div class="sub">${branchName ?? 'All Branches'}<br/>${data.date}</div>
<div class="divider"></div>
<div class="total-row"><span>TOTAL REVENUE</span><span>${fmt(data.totalRevenue)}</span></div>
<div class="section">
  <div class="row"><span>Transactions</span><span class="bold">${data.totalSales}</span></div>
  <div class="row"><span>Avg Order Value</span><span>${fmt(data.avgOrderValue)}</span></div>
  <div class="row"><span>Total Profit</span><span>${fmt(data.totalProfit)}</span></div>
  <div class="row"><span>Discounts Given</span><span>-${fmt(data.totalDiscount)}</span></div>
  <div class="row"><span>Tax Collected</span><span>${fmt(data.totalTax)}</span></div>
  <div class="row"><span>Customers Served</span><span>${data.uniqueCustomers}</span></div>
</div>
<div class="divider"></div>
<div class="section">
  <div class="section-title">Payment Methods</div>
  ${data.byPaymentMethod.map(m => `<div class="row"><span>${m.method.toUpperCase()} (${m.count})</span><span>${fmt(m.total)}</span></div>`).join('')}
</div>
<div class="divider"></div>
<div class="section">
  <div class="section-title">Top Products</div>
  ${data.topProducts.map((p, i) => `<div class="row"><span>${i + 1}. ${p.name.slice(0, 20)}</span><span>${p.quantity} × ${fmt(p.revenue / p.quantity)}</span></div>`).join('')}
</div>
<div class="divider"></div>
<div class="section">
  <div class="section-title">Cashier Summary</div>
  ${data.cashierBreakdown.map(c => `<div class="row"><span>${c.name} (${c.count})</span><span>${fmt(c.total)}</span></div>`).join('')}
</div>
<div class="divider"></div>
<div style="text-align:center;font-size:10px;margin-top:8px;">Printed ${format(new Date(), 'HH:mm')} · SmartVendr</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Moon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>End of Day Report</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {branchName ?? 'All Branches'} · {format(today, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={load}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[80, 60, 100, 60, 80].map((w, i) => (
                <div key={i} className="h-4 rounded-lg" style={{ width: `${w}%`, background: 'var(--bg-surface-2)' }} />
              ))}
            </div>
          ) : !data || data.totalSales === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No sales today</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Sales processed today will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Hero total */}
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf622, #10b98122)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  Total Revenue Today
                </p>
                <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {fmt(data.totalRevenue)}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {data.totalSales} transaction{data.totalSales !== 1 ? 's' : ''} · {fmt(data.totalProfit)} profit
                </p>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Transactions', value: data.totalSales,                    icon: ShoppingCart, color: '#3b82f6' },
                  { label: 'Avg Order',    value: fmt(data.avgOrderValue),             icon: TrendingUp,   color: '#10b981' },
                  { label: 'Customers',    value: data.uniqueCustomers,                icon: Users,        color: '#8b5cf6' },
                  { label: 'Profit',       value: fmt(data.totalProfit),               icon: DollarSign,   color: '#10b981' },
                  { label: 'Discounts',    value: fmt(data.totalDiscount),             icon: Package,      color: '#f59e0b' },
                  { label: 'Tax',          value: fmt(data.totalTax),                  icon: CreditCard,   color: '#06b6d4' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 flex flex-col gap-1.5"
                    style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-1.5">
                      <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Payment methods */}
              {data.byPaymentMethod.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Payment Methods
                  </p>
                  <div className="space-y-2">
                    {data.byPaymentMethod.map(m => {
                      const Icon = METHOD_ICON[m.method] ?? CreditCard;
                      const pct  = data.totalRevenue > 0 ? (m.total / data.totalRevenue) * 100 : 0;
                      return (
                        <div key={m.method} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--bg-surface-2)' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                                {m.method} <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>({m.count})</span>
                              </span>
                              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(m.total)}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary-color)' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top products */}
              {data.topProducts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Top Products
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                    {data.topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3 px-4 py-2.5"
                        style={{ borderBottom: i < data.topProducts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : 'var(--bg-surface-3)', color: i < 3 ? '#fff' : 'var(--text-tertiary)' }}>
                          {i + 1}
                        </span>
                        <p className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.quantity} sold</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>{fmt(p.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cashier breakdown */}
              {data.cashierBreakdown.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Cashier Summary
                  </p>
                  <div className="space-y-2">
                    {data.cashierBreakdown.map(c => (
                      <div key={c.name} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                        style={{ background: 'var(--bg-surface-2)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ background: 'var(--primary-color)' }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.count} transaction{c.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(c.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && data && data.totalSales > 0 && (
          <div className="flex gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
              Close
            </button>
            <button onClick={handlePrint}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Printer className="w-4 h-4" /> Print Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
