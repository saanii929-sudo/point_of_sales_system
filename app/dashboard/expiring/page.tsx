'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  AlertTriangle, Calendar, RefreshCw,
  Clock, ShieldAlert, CircleDollarSign,
  CheckCircle2, ChevronRight, Tag, Hash, Layers,
  Trash2, X, Loader2, Percent, Plus,
} from 'lucide-react';

// ── Interfaces ──────────────────────────────────────────────
interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  expiryDate: string;
  category: { name: string; color: string };
}

interface ExpiringData {
  expired: Product[];
  expiringSoon: Product[];
  expiringThisMonth: Product[];
  total: number;
}

type Tab = 'expired' | 'soon' | 'month';

// ── Helpers ─────────────────────────────────────────────────
function getDaysLeft(expiryDate: string) {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// ── Input style ──────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

// ── Discount Modal ────────────────────────────────────────────
function DiscountModal({ product, onClose, onCreated }: {
  product: Product;
  onClose: () => void;
  onCreated: () => void;
}) {
  const code = `EXPIRE-${product.sku.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const [form, setForm] = useState({ code, value: 20, type: 'percentage' as 'percentage' | 'fixed', name: `${product.name} Clearance`, });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const end   = product.expiryDate.split('T')[0];
      const res = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:         form.code,
          name:         form.name,
          type:         form.type,
          value:        form.value,
          applicableTo: 'specific_products',
          products:     [product._id],
          startDate:    today,
          endDate:      end || today,
          minPurchaseAmount: 0,
          usageLimit:   null,
        }),
      });
      if (res.ok) {
        toast.success(`Discount code ${form.code} created!`);
        onCreated();
        onClose();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed to create discount');
      }
    } catch { toast.error('Failed to create discount'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
              <Tag className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Apply Clearance Discount</h3>
              <p className="text-xs truncate max-w-[220px]" style={{ color: 'var(--text-tertiary)' }}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Discount Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Discount Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))} className={inputCls + ' appearance-none'}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (GH₵)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {form.type === 'percentage' ? 'Discount %' : 'Amount (GH₵)'}
                </label>
                <div className="relative">
                  <input type="number" min={1} max={form.type === 'percentage' ? 100 : undefined} value={form.value} onChange={e => setForm(f => ({ ...f, value: +e.target.value }))} className={inputCls + ' pr-8'} required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {form.type === 'percentage' ? '%' : '₵'}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-surface-2)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                Code <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{form.code}</strong> will give{' '}
                <strong style={{ color: '#f59e0b' }}>{form.type === 'percentage' ? `${form.value}% off` : `GH₵${form.value} off`}</strong>{' '}
                on <strong style={{ color: 'var(--text-primary)' }}>{product.name}</strong> until expiry.
              </p>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#f59e0b' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Percent className="w-4 h-4" /> Create Discount</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Dispose Modal ─────────────────────────────────────
function ConfirmDisposeModal({ product, onClose, onConfirm, loading }: {
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)' }} onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#fef2f2' }}>
            <Trash2 className="w-7 h-7" style={{ color: '#ef4444' }} />
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Mark as Disposed?</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This will set the stock of <strong style={{ color: 'var(--text-primary)' }}>{product.name}</strong> to{' '}
            <strong>0 units</strong>. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#ef4444' }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Disposing…</> : <><Trash2 className="w-4 h-4" /> Dispose</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function ExpiringProductsPage() {
  const [data, setData] = useState<ExpiringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('expired');
  const [discountProduct, setDiscountProduct] = useState<Product | null>(null);
  const [disposingProduct, setDisposingProduct] = useState<Product | null>(null);
  const [disposing, setDisposing] = useState(false);

  useEffect(() => {
    document.title = 'Expiring Products | SmartVendr';
    fetchData();
  }, []);

  const handleDispose = async () => {
    if (!disposingProduct) return;
    setDisposing(true);
    try {
      const res = await fetch(`/api/products/${disposingProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: 0 }),
      });
      if (res.ok) {
        toast.success(`${disposingProduct.name} marked as disposed.`);
        setDisposingProduct(null);
        fetchData();
      } else {
        toast.error('Failed to dispose product');
      }
    } catch { toast.error('Failed to dispose product'); }
    finally { setDisposing(false); }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: result } = await fetchWithOfflineFallback('/api/products/expiring');
      setData(result);
    } catch {
      toast.error('Failed to load expiring products');
    } finally {
      setIsLoading(false);
    }
  };

  const currentProducts = useMemo(() => {
    if (!data) return [];
    return activeTab === 'expired'
      ? data.expired
      : activeTab === 'soon'
      ? data.expiringSoon
      : data.expiringThisMonth;
  }, [data, activeTab]);

  const valueAtRisk = useMemo(() => {
    if (!data) return 0;
    const all = [...data.expired, ...data.expiringSoon];
    return all.reduce((s, p) => s + p.price * p.stock, 0);
  }, [data]);

  // ── Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 rounded-xl bg-[var(--bg-surface-3)] animate-pulse mb-2" />
            <div className="h-4 w-64 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-[var(--bg-surface-3)] animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5">
              <div className="h-4 w-20 rounded bg-[var(--bg-surface-3)] animate-pulse mb-3" />
              <div className="h-9 w-12 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
            </Card>
          ))}
        </div>
        <Card>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-3)] animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-[var(--bg-surface-3)] animate-pulse" />
                <div className="h-3 w-24 rounded bg-[var(--bg-surface-3)] animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-[var(--bg-surface-3)] animate-pulse" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const tabs: { key: Tab; label: string; count: number; color: string; urgency: string }[] = [
    { key: 'expired', label: 'Expired', count: data.expired.length, color: 'red', urgency: 'Immediate action required' },
    { key: 'soon', label: 'Expiring Soon', count: data.expiringSoon.length, color: 'orange', urgency: 'Within 7 days' },
    { key: 'month', label: 'This Month', count: data.expiringThisMonth.length, color: 'amber', urgency: '8 – 30 days' },
  ];

  const tabColors: Record<string, { active: string; badge: string; dot: string }> = {
    red:    { active: 'border-red-500 text-red-600',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
    orange: { active: 'border-orange-500 text-orange-600', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    amber:  { active: 'border-amber-500 text-amber-600',  badge: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  };

  const urgencyConfig: Record<Tab, { bg: string; border: string; label: string; icon: typeof AlertTriangle }> = {
    expired: { bg: 'bg-red-50',    border: 'border-red-200',    label: 'Expired',        icon: ShieldAlert },
    soon:    { bg: 'bg-orange-50', border: 'border-orange-200', label: 'Expiring Soon',   icon: AlertTriangle },
    month:   { bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Expiring Soon',   icon: Clock },
  };

  const dayBadgeStyle = (days: number) => {
    if (days < 0)  return 'bg-red-100 text-red-700 border border-red-200';
    if (days <= 7) return 'bg-orange-100 text-orange-700 border border-orange-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Expiry Tracker
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Monitor products approaching or past their expiry date
          </p>
        </div>
        <Button onClick={fetchData} variant="secondary" className="gap-2 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Flagged</p>
              <p className="text-3xl font-bold text-[var(--text-primary)] leading-none">{data.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-slate-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Value at Risk</p>
              <p className="text-3xl font-bold text-red-600 leading-none">
                <span className="text-lg font-semibold">GH₵</span>
                {valueAtRisk >= 1000 ? `${(valueAtRisk / 1000).toFixed(1)}k` : valueAtRisk.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Expired</p>
              <p className="text-3xl font-bold text-red-600 leading-none">{data.expired.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 leading-none">{data.expiringSoon.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tabs + List ── */}
      <Card>
        {/* Tab bar */}
        <div className="flex items-stretch border-b border-[var(--border-subtle)] px-5 gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const tc = tabColors[tab.color];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? `${tc.active} border-current`
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tc.dot} ${!isActive && 'opacity-50'}`} />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? tc.badge : 'bg-[var(--bg-surface-3)] text-[var(--text-tertiary)]'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product list */}
        {currentProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--text-primary)]">All clear!</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {activeTab === 'expired' && 'No expired products in your inventory'}
                {activeTab === 'soon' && 'No products expiring within the next 7 days'}
                {activeTab === 'month' && 'No products expiring this month'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {currentProducts.map((product) => {
              const days = getDaysLeft(product.expiryDate);
              const expiryDateStr = new Date(product.expiryDate).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              const stockValue = product.price * product.stock;

              return (
                <div key={product._id} className="px-5 py-4 hover:bg-[var(--bg-surface-2)] transition-colors group">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: product.category.color }}
                    >
                      {getInitials(product.name)}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{product.name}</p>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: product.category.color + '18', color: product.category.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: product.category.color }} />
                          {product.category.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {product.sku}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {product.stock} units
                        </span>
                        <span className="flex items-center gap-1">
                          <CircleDollarSign className="w-3 h-3" />
                          GH₵{product.price.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {expiryDateStr}
                        </span>
                      </div>

                      {/* Action required banner */}
                      {days < 0 && product.stock > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          Action required — remove {product.stock} unit{product.stock > 1 ? 's' : ''} from inventory
                        </div>
                      )}
                    </div>

                    {/* Right side: action buttons + stock value + days badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Hover-reveal action buttons */}
                      <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setDiscountProduct(product)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: '#fef3c7', color: '#b45309' }}
                          title="Create clearance discount for this product"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          Discount
                        </button>
                        <button
                          onClick={() => setDisposingProduct(product)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: '#fee2e2', color: '#b91c1c' }}
                          title="Mark product as disposed (set stock to 0)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Dispose
                        </button>
                      </div>

                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-[var(--text-tertiary)]">Stock value</p>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">GH₵{stockValue.toFixed(2)}</p>
                      </div>

                      <div className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-xl text-center ${dayBadgeStyle(days)}`}>
                        {days < 0 ? (
                          <>
                            <p className="text-xs font-bold uppercase tracking-wide leading-none">Expired</p>
                            <p className="text-xs mt-0.5 opacity-80">{Math.abs(days)}d ago</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-bold leading-none">{days}</p>
                            <p className="text-xs mt-0.5 opacity-80">day{days !== 1 ? 's' : ''} left</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {currentProducts.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-tertiary)]">
              <span className="font-semibold text-[var(--text-secondary)]">{currentProducts.length}</span> product{currentProducts.length !== 1 ? 's' : ''} listed
            </p>
            <a
              href="/dashboard/products"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--primary-color)] hover:opacity-80 transition-opacity"
            >
              Manage products <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </Card>

      {/* Modals */}
      {discountProduct && (
        <DiscountModal
          product={discountProduct}
          onClose={() => setDiscountProduct(null)}
          onCreated={fetchData}
        />
      )}
      {disposingProduct && (
        <ConfirmDisposeModal
          product={disposingProduct}
          onClose={() => setDisposingProduct(null)}
          onConfirm={handleDispose}
          loading={disposing}
        />
      )}
    </div>
  );
}
