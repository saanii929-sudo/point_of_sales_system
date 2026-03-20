'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  RotateCcw, CircleDollarSign, CreditCard, Ticket,
  Check, X, Trash2, Plus, Clock, User, Package,
  Banknote, Smartphone, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, XCircle, Hourglass,
  RefreshCw, FileText, ShoppingBag, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReturnItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Return {
  _id: string;
  returnNumber: string;
  customerId?: { name: string; phone: string };
  items: ReturnItem[];
  subtotal: number;
  tax: number;
  total: number;
  reason: string;
  refundMethod: 'cash' | 'card' | 'store_credit';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdBy: { name: string };
  processedBy?: { name: string };
  processedDate?: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
}

type StatusKey = Return['status'] | 'all';

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Return['status'], {
  label: string; bg: string; text: string; dot: string; icon: React.ElementType;
}> = {
  pending:   { label: 'Pending',   bg: '#fffbeb', text: '#b45309', dot: '#f59e0b', icon: Hourglass    },
  approved:  { label: 'Approved',  bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', icon: CheckCircle2 },
  completed: { label: 'Completed', bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', icon: XCircle      },
};

const REFUND_CONFIG: Record<Return['refundMethod'], {
  label: string; bg: string; text: string; selBg: string; selBorder: string; icon: React.ElementType;
}> = {
  cash:         { label: 'Cash',         bg: '#f0fdf4', text: '#15803d', selBg: '#dcfce7', selBorder: '#22c55e', icon: Banknote    },
  card:         { label: 'Card',         bg: '#eff6ff', text: '#1d4ed8', selBg: '#dbeafe', selBorder: '#3b82f6', icon: CreditCard  },
  store_credit: { label: 'Store Credit', bg: '#faf5ff', text: '#7c3aed', selBg: '#ede9fe', selBorder: '#8b5cf6', icon: Ticket      },
};

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

const emptyForm = {
  items: [{ productId: '', name: '', quantity: 1, price: 0, subtotal: 0 }],
  reason: '',
  refundMethod: 'cash' as Return['refundMethod'],
  notes: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Return['status'] }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

function RefundBadge({ method }: { method: Return['refundMethod'] }) {
  const c = REFUND_CONFIG[method];
  const Icon = c.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function KpiCard({ label, value, prefix = '', sub, icon: Icon, color, urgent }: {
  label: string; value: string | number; prefix?: string; sub?: string;
  icon: React.ElementType; color: string; urgent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${urgent ? color + '44' : 'var(--border-subtle)'}`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: urgent ? color : 'var(--text-primary)' }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-5 py-4 animate-pulse flex items-start gap-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 rounded w-28" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-5 rounded-full w-20" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-5 rounded-full w-16" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
        <div className="h-3 rounded w-56" style={{ background: 'var(--bg-surface-3)' }} />
        <div className="h-3 rounded w-40" style={{ background: 'var(--bg-surface-3)' }} />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-5 rounded w-24" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex gap-1.5 justify-end">
          <div className="h-7 rounded-lg w-18" style={{ background: 'var(--bg-surface-3)' }} />
          <div className="h-7 rounded-lg w-16" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReturnsPage() {
  const [returns, setReturns]       = useState<Return[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<StatusKey>('all');
  const [formData, setFormData]     = useState(emptyForm);

  useEffect(() => { fetchReturns(); fetchProducts(); }, []);

  const fetchReturns = async () => {
    setIsFetching(true);
    try {
      const { data } = await fetchWithOfflineFallback('/api/returns');
      setReturns(data.returns || []);
    } catch { toast.error('Failed to load returns'); }
    finally { setIsFetching(false); }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/products');
      setProducts(data.products || []);
    } catch { /* silent */ }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    const items = [...formData.items];
    items[index] = { productId: product._id, name: product.name, quantity: 1, price: product.price, subtotal: product.price };
    setFormData(f => ({ ...f, items }));
  };

  const handleQtyChange = (index: number, qty: number) => {
    const items = [...formData.items];
    items[index] = { ...items[index], quantity: qty, subtotal: items[index].price * qty };
    setFormData(f => ({ ...f, items }));
  };

  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { productId: '', name: '', quantity: 1, price: 0, subtotal: 0 }] }));
  const removeItem = (i: number) => setFormData(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const closeModal = () => { setIsModalOpen(false); setFormData(emptyForm); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.productId && i.quantity > 0);
    if (!validItems.length) { toast.error('Add at least one item'); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems, reason: formData.reason, refundMethod: formData.refundMethod, notes: formData.notes }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Return created successfully');
      closeModal();
      fetchReturns();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/returns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Action failed');
      const label = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Completed';
      toast.success(`Return ${label}`);
      fetchReturns();
    } catch (error: any) { toast.error(error.message); }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:         returns.length,
    pending:       returns.filter(r => r.status === 'pending').length,
    completed:     returns.filter(r => r.status === 'completed').length,
    totalRefunded: returns.filter(r => r.status === 'completed').reduce((s, r) => s + r.total, 0),
  }), [returns]);

  const tabCounts = useMemo(() => ({
    all:       returns.length,
    pending:   returns.filter(r => r.status === 'pending').length,
    approved:  returns.filter(r => r.status === 'approved').length,
    completed: returns.filter(r => r.status === 'completed').length,
    rejected:  returns.filter(r => r.status === 'rejected').length,
  }), [returns]);

  const filtered = useMemo(() =>
    activeTab === 'all' ? returns : returns.filter(r => r.status === activeTab),
    [returns, activeTab]
  );

  const formSubtotal = formData.items.reduce((s, i) => s + i.subtotal, 0);
  const formTax      = formSubtotal * 0.1;
  const formTotal    = formSubtotal + formTax;

  const TABS: { key: StatusKey; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'pending',   label: 'Pending'   },
    { key: 'approved',  label: 'Approved'  },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected',  label: 'Rejected'  },
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Product Returns</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Review, approve, and process customer refunds
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchReturns}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--primary-color)', boxShadow: '0 2px 8px var(--primary-color)44' }}
          >
            <Plus className="w-4 h-4" /> Process Return
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Returns"    value={stats.total}         sub="all time"             icon={RotateCcw}      color="#3b82f6" />
        <KpiCard label="Awaiting Action"  value={stats.pending}       sub="need review"          icon={Hourglass}      color="#f59e0b" urgent={stats.pending > 0} />
        <KpiCard label="Completed"        value={stats.completed}     sub="fully processed"      icon={CheckCircle2}   color="#10b981" />
        <KpiCard
          label="Total Refunded"
          value={stats.totalRefunded >= 1000
            ? `${(stats.totalRefunded / 1000).toFixed(1)}k`
            : stats.totalRefunded.toFixed(2)}
          prefix="GH₵"
          sub="paid out"
          icon={CircleDollarSign}
          color="#ef4444"
        />
      </div>

      {/* ── Tab + List ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Tab bar */}
        <div
          className="flex items-stretch overflow-x-auto"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count    = tabCounts[tab.key as keyof typeof tabCounts];
            const cfg      = tab.key !== 'all' ? STATUS_CONFIG[tab.key as Return['status']] : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all border-b-2"
                style={{
                  borderBottomColor: isActive ? 'var(--primary-color)' : 'transparent',
                  color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                }}
              >
                {cfg && (
                  <span
                    className="w-2 h-2 rounded-full transition-opacity"
                    style={{ background: cfg.dot, opacity: isActive ? 1 : 0.4 }}
                  />
                )}
                {tab.label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={
                      isActive
                        ? { background: 'var(--primary-color)22', color: 'var(--primary-color)' }
                        : { background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }
                    }
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {isFetching ? (
          <div>
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-surface-2)' }}
            >
              <RotateCcw className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                {activeTab === 'all' ? 'No returns yet' : `No ${activeTab} returns`}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {activeTab === 'all'
                  ? 'Process a return when a customer brings back a product.'
                  : `There are no returns with "${activeTab}" status.`}
              </p>
            </div>
            {activeTab === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-1"
                style={{ background: 'var(--primary-color)' }}
              >
                <Plus className="w-4 h-4" /> Process Return
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(ret => {
              const isOpen = expandedId === ret._id;
              return (
                <div key={ret._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>

                  {/* Main row */}
                  <div
                    className="px-5 py-4 transition-colors"
                    style={{ background: isOpen ? 'var(--bg-surface-2)' : undefined }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--bg-surface-2)' }}
                      >
                        <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                            #{ret.returnNumber}
                          </p>
                          <StatusBadge status={ret.status} />
                          <RefundBadge method={ret.refundMethod} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          <span className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {format(new Date(ret.createdAt), 'MMM d, yyyy · HH:mm')}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <User className="w-3 h-3" />
                            {ret.createdBy.name}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Package className="w-3 h-3" />
                            {ret.items.length} item{ret.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-medium">Reason: </span>{ret.reason}
                        </p>
                      </div>

                      {/* Right: amount + actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <p className="text-base font-bold tabular-nums" style={{ color: '#ef4444' }}>
                          −GH₵{ret.total.toFixed(2)}
                        </p>

                        <div className="flex items-center gap-1.5">
                          {ret.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(ret._id, 'approve')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                                style={{ background: '#f0fdf4', color: '#15803d' }}
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleAction(ret._id, 'reject')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                                style={{ background: '#fef2f2', color: '#b91c1c' }}
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {ret.status === 'approved' && (
                            <button
                              onClick={() => handleAction(ret._id, 'complete')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                              style={{ background: '#eff6ff', color: '#1d4ed8' }}
                            >
                              <Check className="w-3.5 h-3.5" /> Complete
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isOpen ? null : ret._id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                          >
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {ret.processedDate && ret.processedBy && (
                          <p className="text-xs text-right" style={{ color: 'var(--text-tertiary)' }}>
                            By {ret.processedBy.name} · {format(new Date(ret.processedDate), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-4" style={{ background: 'var(--bg-surface-2)', borderTop: '1px solid var(--border-subtle)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
                        Returned Items
                      </p>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                        {/* Header */}
                        <div
                          className="grid grid-cols-[1fr_60px_90px_90px] gap-3 px-4 py-2.5 text-xs font-semibold"
                          style={{ background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <span>Product</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Unit Price</span>
                          <span className="text-right">Subtotal</span>
                        </div>
                        {/* Rows */}
                        {ret.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-[1fr_60px_90px_90px] gap-3 px-4 py-3 text-sm"
                            style={{ borderBottom: idx < ret.items.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                          >
                            <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                            <span className="text-center tabular-nums" style={{ color: 'var(--text-secondary)' }}>×{item.quantity}</span>
                            <span className="text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>GH₵{item.price.toFixed(2)}</span>
                            <span className="text-right font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>GH₵{item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                        {/* Totals */}
                        <div className="px-4 py-3 space-y-1.5" style={{ background: 'var(--bg-surface-3)', borderTop: '1px solid var(--border-subtle)' }}>
                          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>Subtotal</span>
                            <span className="tabular-nums">GH₵{ret.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span>Tax</span>
                            <span className="tabular-nums">GH₵{ret.tax.toFixed(2)}</span>
                          </div>
                          <div
                            className="flex justify-between text-sm font-bold pt-1.5"
                            style={{ borderTop: '1px solid var(--border-subtle)', color: '#ef4444' }}
                          >
                            <span>Total Refund</span>
                            <span className="tabular-nums">GH₵{ret.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer count */}
            <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filtered.length}</span>{' '}
                return{filtered.length !== 1 ? 's' : ''}{activeTab !== 'all' ? ` · ${activeTab}` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Process Return Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
                  <RotateCcw className="w-4 h-4" style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Process Return</h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create a new refund request</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <form id="return-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1">

              {/* Section 1: Items */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Return Items</p>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_72px_88px_32px] gap-2 px-1">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Product</p>
                    <p className="text-xs font-medium text-center" style={{ color: 'var(--text-tertiary)' }}>Qty</p>
                    <p className="text-xs font-medium text-right" style={{ color: 'var(--text-tertiary)' }}>Subtotal</p>
                    <div />
                  </div>

                  {formData.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_72px_88px_32px] gap-2 items-center">
                      <div className="relative">
                        <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                        <select
                          value={item.productId}
                          onChange={e => handleProductSelect(idx, e.target.value)}
                          required
                          className={inputCls + ' pl-8 appearance-none'}
                        >
                          <option value="">Select product…</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name} — GH₵{p.price.toFixed(2)}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                        required
                        className={inputCls + ' text-center'}
                      />
                      <div
                        className="px-3 py-2.5 rounded-xl text-sm font-semibold text-right tabular-nums"
                        style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                      >
                        GH₵{item.subtotal.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={formData.items.length === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ background: '#fef2f2', color: '#ef4444' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 2: Details */}
              <div className="px-6 py-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Details</p>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Return Reason <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <textarea
                      value={formData.reason}
                      onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                      required rows={2}
                      placeholder="Describe why the item is being returned…"
                      className={inputCls + ' pl-9 resize-none'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Refund Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(REFUND_CONFIG) as [Return['refundMethod'], typeof REFUND_CONFIG[keyof typeof REFUND_CONFIG]][]).map(([value, cfg]) => {
                      const Icon = cfg.icon;
                      const isSelected = formData.refundMethod === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData(f => ({ ...f, refundMethod: value }))}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all"
                          style={
                            isSelected
                              ? { background: cfg.selBg, borderColor: cfg.selBorder, color: cfg.text }
                              : { background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }
                          }
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Notes <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                    rows={2} placeholder="Any additional context…"
                    className={inputCls + ' resize-none'}
                  />
                </div>
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 3: Summary */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>Refund Summary</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                  <div className="flex justify-between px-4 py-3 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>GH₵{formSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 text-sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tax (10%)</span>
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>GH₵{formTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3" style={{ background: '#fef2f2' }}>
                    <span className="text-sm font-bold" style={{ color: '#b91c1c' }}>Total Refund</span>
                    <span className="text-base font-bold tabular-nums" style={{ color: '#b91c1c' }}>GH₵{formTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div
              className="flex gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="return-form"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: '#ef4444' }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><RotateCcw className="w-4 h-4" /> Process Return</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
