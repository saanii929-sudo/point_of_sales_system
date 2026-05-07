'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  Receipt, TrendingUp, CircleDollarSign,
  Search, X, ChevronDown, ChevronUp, CreditCard,
  Banknote, Smartphone, RefreshCw, ShoppingCart,
  Clock, Package, GitBranch,
} from 'lucide-react';
import { useBranchStore } from '@/store/useBranchStore';

// ── Interfaces ───────────────────────────────────────────────
interface SaleItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Sale {
  _id: string;
  saleNumber: string;
  total: number;
  items: SaleItem[];
  paymentMethod: string;
  cashier: { name: string };
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const CASHIER_COLORS = [
  '#10b981','#3b82f6','#8b5cf6','#f59e0b',
  '#ef4444','#ec4899','#06b6d4','#84cc16',
];
function cashierColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return CASHIER_COLORS[Math.abs(h) % CASHIER_COLORS.length];
}

type PayMethod = 'cash' | 'card' | 'momo' | string;

function PaymentBadge({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m === 'cash')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
        <Banknote className="w-3 h-3" /> Cash
      </span>
    );
  if (m === 'card')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
        <CreditCard className="w-3 h-3" /> Card
      </span>
    );
  if (m.includes('momo') || m.includes('mobile'))
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
        <Smartphone className="w-3 h-3" /> MoMo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface-3)] text-[var(--text-secondary)]">
      {method}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function SalesPage() {
  const { selectedBranchId, selectedBranchName, branches } = useBranchStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Keep branch filter in sync with store selection
  useEffect(() => {
    setBranchFilter(selectedBranchId ?? '');
  }, [selectedBranchId]);

  useEffect(() => { fetchSales(); }, [branchFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSales = async () => {
    try {
      setIsFetching(true);
      const branchParam = branchFilter ? `?branchId=${branchFilter}` : '';
      const { data } = await fetchWithOfflineFallback(`/api/sales${branchParam}`);
      setSales(data.sales || []);
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setIsFetching(false);
    }
  };

  // ── Derived KPIs (scoped to period) ─────────────────────
  const stats = useMemo(() => {
    const scope = sales.filter(s => {
      const d = new Date(s.createdAt);
      if (periodFilter === 'today') return isToday(d);
      if (periodFilter === 'week')  return isThisWeek(d, { weekStartsOn: 1 });
      if (periodFilter === 'month') return isThisMonth(d);
      return true;
    });
    if (!scope.length) return { total: 0, revenue: 0, avg: 0, topMethod: '—' };
    const revenue = scope.reduce((s, x) => s + x.total, 0);
    const methodCount: Record<string, number> = {};
    for (const s of scope) methodCount[s.paymentMethod] = (methodCount[s.paymentMethod] || 0) + 1;
    const topMethod = Object.entries(methodCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { total: scope.length, revenue, avg: revenue / scope.length, topMethod };
  }, [sales, periodFilter]);

  // ── Unique payment methods for filter ───────────────────
  const paymentMethods = useMemo(() => [...new Set(sales.map((s) => s.paymentMethod))], [sales]);

  // ── Filtered + searched list ─────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return sales.filter((s) => {
      if (q && !s.saleNumber.toLowerCase().includes(q) && !s.cashier.name.toLowerCase().includes(q)) return false;
      if (paymentFilter && s.paymentMethod !== paymentFilter) return false;
      if (dateFilter) {
        const saleDate = format(new Date(s.createdAt), 'yyyy-MM-dd');
        if (saleDate !== dateFilter) return false;
      }
      if (periodFilter !== 'all') {
        const d = new Date(s.createdAt);
        if (periodFilter === 'today' && !isToday(d)) return false;
        if (periodFilter === 'week'  && !isThisWeek(d,  { weekStartsOn: 1 })) return false;
        if (periodFilter === 'month' && !isThisMonth(d)) return false;
      }
      return true;
    });
  }, [sales, searchQuery, paymentFilter, dateFilter, periodFilter]);

  const hasFilters = searchQuery || paymentFilter || dateFilter || (branchFilter && branchFilter !== selectedBranchId);
  const clearFilters = () => { setSearchQuery(''); setPaymentFilter(''); setDateFilter(''); setPeriodFilter('all'); };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  // Close receipt modal on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReceiptSale(null); };
    if (receiptSale) { document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }
  }, [receiptSale]);

  // ── Skeleton ──────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded-xl bg-[var(--bg-surface-3)] animate-pulse mb-2" />
            <div className="h-4 w-56 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-[var(--bg-surface-3)] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => (
            <Card key={i} className="p-5">
              <div className="h-3 w-20 rounded bg-[var(--bg-surface-3)] animate-pulse mb-3" />
              <div className="h-8 w-16 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
            </Card>
          ))}
        </div>
        <Card>
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 rounded bg-[var(--bg-surface-3)] animate-pulse" />
                <div className="h-3 w-36 rounded bg-[var(--bg-surface-3)] animate-pulse" />
              </div>
              <div className="h-4 w-16 rounded bg-[var(--bg-surface-3)] animate-pulse" />
              <div className="h-6 w-16 rounded-full bg-[var(--bg-surface-3)] animate-pulse" />
              <div className="h-5 w-20 rounded bg-[var(--bg-surface-3)] animate-pulse" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Sales History</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Every transaction, all in one place
          </p>
        </div>
        <button
          onClick={fetchSales}
          className="p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Sales</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] leading-none">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] leading-none">
                <span className="text-lg font-semibold">GH₵</span>
                {stats.revenue >= 1000
                  ? `${(stats.revenue / 1000).toFixed(1)}k`
                  : stats.revenue.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Avg Order Value</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] leading-none">
                <span className="text-lg font-semibold">GH₵</span>
                {stats.avg.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Top Payment</p>
              <p className="text-xl font-bold text-[var(--text-primary)] leading-none capitalize mt-1">{stats.topMethod}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Period tabs ── */}
      <div className="flex gap-1.5 p-1.5 bg-[var(--bg-surface-2)] rounded-2xl border border-[var(--border-subtle)] w-fit">
        {([
          { key: 'all',   label: 'All Time' },
          { key: 'today', label: 'Today' },
          { key: 'week',  label: 'This Week' },
          { key: 'month', label: 'This Month' },
        ] as { key: typeof periodFilter; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriodFilter(key)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              periodFilter === key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <Card>
        <div className="px-5 py-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search by sale # or cashier…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment method filter */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="">All Payments</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
          </div>

          {/* Branch filter */}
          {branches.length > 1 && (
            <div className="relative">
              <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="">All Branches</option>
                {branches.filter(b => b.isActive).map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            </div>
          )}

          {/* Date filter */}
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9 pr-3 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-red-600 hover:border-red-300 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </Card>

      {/* ── Sales list ── */}
      <Card>
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--border-subtle)]">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Transaction</p>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider text-center">Items</p>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Cashier</p>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Payment</p>
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider text-right">Total</p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--text-primary)]">
                {hasFilters ? 'No sales match your filters' : 'No sales yet'}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Sales will appear here once transactions are made at the POS.'}
              </p>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm font-semibold text-[var(--primary-color)] hover:opacity-80 transition-opacity mt-1">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((sale) => {
              const isOpen = expandedId === sale._id;
              const color = cashierColor(sale.cashier.name);
              const saleDate = new Date(sale.createdAt);
              const itemsTotal = sale.items.reduce((s, i) => s + i.price * i.quantity, 0);

              return (
                <div key={sale._id}>
                  {/* Main row */}
                  <button
                    onClick={() => toggleExpand(sale._id)}
                    className="w-full px-5 py-4 hover:bg-[var(--bg-surface-2)] transition-colors text-left group"
                  >
                    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4">

                      {/* Transaction info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface-3)] flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-4 h-4 text-[var(--text-tertiary)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                            #{sale.saleNumber}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(saleDate, 'MMM d, yyyy')}
                            <span className="text-[var(--border-strong)]">·</span>
                            {format(saleDate, 'HH:mm')}
                          </p>
                        </div>
                      </div>

                      {/* Items count */}
                      <div className="hidden sm:flex items-center justify-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface-3)] text-[var(--text-secondary)]">
                          <Package className="w-3 h-3" />
                          {sale.items.length}
                        </span>
                      </div>

                      {/* Cashier */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(sale.cashier.name)}
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[80px]">
                          {sale.cashier.name}
                        </span>
                      </div>

                      {/* Payment */}
                      <div className="hidden sm:block">
                        <PaymentBadge method={sale.paymentMethod} />
                      </div>

                      {/* Total + chevron */}
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                          GH₵{sale.total.toFixed(2)}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
                          : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                      </div>
                    </div>

                    {/* Mobile sub-row */}
                    <div className="sm:hidden flex items-center gap-3 mt-2 ml-12">
                      <PaymentBadge method={sale.paymentMethod} />
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} · {sale.cashier.name}
                      </span>
                    </div>
                  </button>

                  {/* Expanded items breakdown */}
                  {isOpen && (
                    <div className="px-5 pb-4 bg-[var(--bg-surface-2)] border-t border-[var(--border-subtle)]">
                      <div className="pt-3">
                        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                          Items Breakdown
                        </p>
                        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                          {/* Items header */}
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-[var(--bg-surface-3)] border-b border-[var(--border-subtle)]">
                            <p className="text-xs font-semibold text-[var(--text-tertiary)]">Product</p>
                            <p className="text-xs font-semibold text-[var(--text-tertiary)] text-center">Qty</p>
                            <p className="text-xs font-semibold text-[var(--text-tertiary)] text-right">Unit Price</p>
                            <p className="text-xs font-semibold text-[var(--text-tertiary)] text-right">Subtotal</p>
                          </div>
                          {sale.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface)] transition-colors"
                            >
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.productName}</p>
                              <p className="text-sm text-[var(--text-secondary)] text-center tabular-nums">×{item.quantity}</p>
                              <p className="text-sm text-[var(--text-secondary)] text-right tabular-nums">GH₵{item.price.toFixed(2)}</p>
                              <p className="text-sm font-semibold text-[var(--text-primary)] text-right tabular-nums">
                                GH₵{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                          {/* Total row */}
                          <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 bg-[var(--bg-surface-3)] border-t border-[var(--border-default)]">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {getInitials(sale.cashier.name)}
                              </div>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {sale.cashier.name} · <PaymentBadge method={sale.paymentMethod} />
                              </span>
                            </div>
                            <p className="text-sm font-bold text-[var(--text-primary)] text-right tabular-nums">
                              Total: GH₵{sale.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={e => { e.stopPropagation(); setReceiptSale(sale); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            View Receipt
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-tertiary)]">
              Showing <span className="font-semibold text-[var(--text-secondary)]">{filtered.length}</span>
              {hasFilters ? ` of ${sales.length}` : ''} transaction{filtered.length !== 1 ? 's' : ''}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>

      {/* ── Receipt Modal ── */}
      {receiptSale && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setReceiptSale(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Receipt header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-dashed border-[var(--border-default)]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Sale Receipt</h3>
              <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">#{receiptSale.saleNumber}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {format(new Date(receiptSale.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            {/* Items */}
            <div className="px-6 py-4 space-y-2 max-h-64 overflow-y-auto">
              {receiptSale.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.productName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{item.quantity} × GH₵{item.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                    GH₵{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-6 pb-4 border-t border-dashed border-[var(--border-default)] pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="font-medium text-[var(--text-primary)] tabular-nums">
                  GH₵{receiptSale.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-[var(--border-subtle)] pt-2 mt-2">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)] tabular-nums">GH₵{receiptSale.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: cashierColor(receiptSale.cashier.name) }}
                >
                  {getInitials(receiptSale.cashier.name)}
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{receiptSale.cashier.name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">Cashier</p>
                </div>
              </div>
              <PaymentBadge method={receiptSale.paymentMethod} />
            </div>

            {/* Actions */}
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all flex items-center justify-center gap-2"
              >
                <Receipt className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={() => setReceiptSale(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
