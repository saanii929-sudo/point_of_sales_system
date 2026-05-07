'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { useBranchStore } from '@/store/useBranchStore';
import {
  TrendingUp, RefreshCw,
  Zap, BrainCircuit, BarChart3,
  CircleDollarSign, CheckCircle2,
  Boxes, ChevronRight, Flame, Ban,
  Search, X, Plus, Minus, Loader2, Edit, Package,
  AlertTriangle as AlertTriangleIcon,
} from 'lucide-react';

interface InventoryInsights {
  fastMoving: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  deadStock:  Array<{ id: string; name: string; stock: number; value: number }>;
  predictions: Array<{
    id: string; name: string; currentStock: number; dailyAverage: number;
    daysUntilStockout: number; reorderSuggestion: number; urgency: string;
  }>;
  restockSuggestions: Array<{
    id: string; name: string; currentStock: number;
    suggestedQuantity: number; estimatedCost: number; priority: string;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

type UrgencyKey = 'critical' | 'high' | 'medium' | 'low';

const URGENCY: Record<UrgencyKey, { bg: string; text: string; dot: string; label: string; barColor: string }> = {
  critical: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', label: 'Critical', barColor: '#ef4444' },
  high:     { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444', label: 'High',     barColor: '#ef4444' },
  medium:   { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b', label: 'Medium',   barColor: '#f59e0b' },
  low:      { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Low',      barColor: '#22c55e' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function urgency(key: string) {
  return URGENCY[(key as UrgencyKey)] ?? URGENCY.low;
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, prefix = '', sub, icon: Icon, color }: {
  label: string; value: string | number; prefix?: string; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {prefix}{value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, iconColor, title, subtitle, count, countColor, children, footer }: {
  icon: React.ElementType; iconColor: string; title: string; subtitle: string;
  count?: number; countColor?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: iconColor + '22' }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          </div>
        </div>
        {count !== undefined && (
          <span className="text-sm font-bold tabular-nums" style={{ color: countColor ?? 'var(--text-secondary)' }}>
            {count}
          </span>
        )}
      </div>
      {children}
      {footer && (
        <div
          className="px-5 py-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

function EmptySection({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-14 flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)' }}>
        <Icon className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}

function UrgencyBadge({ level }: { level: string }) {
  const u = urgency(level);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
      style={{ background: u.bg, color: u.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.dot }} />
      {u.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="px-5 py-4 flex items-center gap-4 animate-pulse" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 rounded" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-surface-3)' }} />
      </div>
      <div className="h-4 w-16 rounded" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="h-4 w-20 rounded" style={{ background: 'var(--bg-surface-2)' }} />
    </div>
  );
}

// ─── Stock Product type ───────────────────────────────────────────────────────
interface StockProduct {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  cost: number;
  category?: { name: string; color: string };
  supplier?: { name: string };
}

// ─── Stock Adjustment Modal ───────────────────────────────────────────────────
function AdjustModal({ product, onClose, onSave }: {
  product: StockProduct;
  onClose: () => void;
  onSave: (id: string, newStock: number, reason: string) => Promise<void>;
}) {
  const [mode, setMode]     = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty]       = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const newStock = mode === 'add' ? product.stock + qty : mode === 'remove' ? Math.max(0, product.stock - qty) : qty;
  const diff = newStock - product.stock;

  const handleSave = async () => {
    if (!reason) { toast.error('Please select a reason.'); return; }
    setSaving(true);
    try { await onSave(product._id, newStock, reason); }
    finally { setSaving(false); }
  };

  const reasons = mode === 'add'
    ? ['Restock', 'Return to inventory', 'Correction', 'Transfer in']
    : mode === 'remove'
    ? ['Damaged', 'Theft', 'Expired', 'Transfer out', 'Correction']
    : ['Correction', 'Stock count'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f622' }}>
              <Edit className="w-4 h-4" style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Adjust Stock</h2>
              <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Current stock display */}
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-surface-2)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Current stock</span>
            <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{product.stock} units</span>
          </div>

          {/* Mode selector */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Adjustment type</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'add',    label: '+ Add',      color: '#10b981' },
                { key: 'remove', label: '- Remove',   color: '#ef4444' },
                { key: 'set',    label: '= Set exact', color: '#3b82f6' },
              ] as const).map(m => (
                <button key={m.key} onClick={() => { setMode(m.key); setQty(0); setReason(''); }}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={mode === m.key ? { background: m.color, color: '#fff' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'set' ? 'New stock count' : 'Quantity'}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                <Minus className="w-4 h-4" />
              </button>
              <input type="number" min="0" value={qty} onChange={e => setQty(Math.max(0, Number(e.target.value)))}
                className="flex-1 text-center text-lg font-bold py-2 rounded-xl border outline-none transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
              <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New stock preview */}
          {qty > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: diff > 0 ? '#dcfce7' : diff < 0 ? '#fef2f2' : 'var(--bg-surface-2)' }}>
              <span className="text-sm font-medium" style={{ color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : 'var(--text-secondary)' }}>New stock level</span>
              <span className="text-lg font-bold" style={{ color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : 'var(--text-primary)' }}>
                {newStock} units {diff !== 0 ? `(${diff > 0 ? '+' : ''}${diff})` : ''}
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Reason <span style={{ color: '#ef4444' }}>*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all"
                  style={reason === r ? { background: 'var(--primary-color)', color: '#fff' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || qty === 0 || !reason} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { selectedBranchId, selectedBranchName } = useBranchStore();

  const [insights, setInsights] = useState<InventoryInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'insights'>('stock');
  const [products, setProducts]   = useState<StockProduct[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [adjustingProduct, setAdjustingProduct] = useState<StockProduct | null>(null);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const branchParam = selectedBranchId ? `?branchId=${selectedBranchId}` : '';
      const [insRes, prodRes] = await Promise.all([
        fetchWithOfflineFallback(`/api/inventory/insights${branchParam}`),
        fetch(`/api/products${branchParam ? '?' + branchParam.slice(1) : ''}`).then(r => r.ok ? r.json() : { products: [] }),
      ]);
      setInsights(insRes.data);
      setProducts(prodRes.products || []);
    } catch { toast.error('Failed to load inventory data'); }
    finally { setIsLoading(false); }
  }, [selectedBranchId]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const handleStockAdjust = async (id: string, newStock: number, reason: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock, adjustmentReason: reason }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p._id === id ? { ...p, stock: newStock } : p));
        toast.success(`Stock updated to ${newStock} units.`);
        setAdjustingProduct(null);
      } else {
        toast.error('Failed to update stock.');
      }
    } catch { toast.error('Something went wrong — please try again.'); }
  };

  const filteredProducts = products.filter(p => {
    const q = stockSearch.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const status = p.stock <= 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'ok';
    const matchFilter = stockFilter === 'all' || status === stockFilter;
    return matchQ && matchFilter;
  });

  const stockStats = {
    total: products.length,
    totalUnits: products.reduce((s, p) => s + p.stock, 0),
    value: products.reduce((s, p) => s + p.stock * (p.cost || 0), 0),
    needsReorder: products.filter(p => p.stock <= p.lowStockThreshold).length,
  };

  const summary = insights ? {
    totalRevenue:   insights.fastMoving.reduce((s, p) => s + p.revenue, 0),
    deadStockValue: insights.deadStock.reduce((s, p) => s + p.value, 0),
    criticalItems:  insights.predictions.filter(p => p.urgency === 'critical' || p.urgency === 'high').length,
    restockCost:    insights.restockSuggestions.reduce((s, r) => s + r.estimatedCost, 0),
  } : null;

  const maxRevenue = insights?.fastMoving.reduce((m, p) => Math.max(m, p.revenue), 1) ?? 1;

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-52 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface-2)' }} />
            <div className="h-4 w-72 rounded-lg animate-pulse" style={{ background: 'var(--bg-surface-3)' }} />
          </div>
          <div className="h-9 w-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-surface-2)' }} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="h-3 w-20 rounded mb-3" style={{ background: 'var(--bg-surface-2)' }} />
              <div className="h-8 w-16 rounded-lg" style={{ background: 'var(--bg-surface-2)' }} />
            </div>
          ))}
        </div>
        {[4, 3, 3].map((rows, ci) => (
          <div key={ci} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="px-5 py-4 flex items-center gap-3 animate-pulse" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="w-8 h-8 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
              <div className="space-y-1.5">
                <div className="h-4 w-32 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                <div className="h-3 w-48 rounded" style={{ background: 'var(--bg-surface-3)' }} />
              </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ))}
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Inventory Intelligence
          </h1>
          <p className="text-sm mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            AI-powered insights to optimise your stock and maximise revenue
            {selectedBranchName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: 'var(--brand-100)', color: 'var(--primary-color)' }}>
                · {selectedBranchName}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 self-start sm:self-auto"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-surface-2)' }}>
        {([
          { key: 'stock',    label: 'Stock Levels'  },
          { key: 'insights', label: 'AI Insights'   },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === tab.key
              ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
              : { color: 'var(--text-secondary)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Stock Levels Tab ── */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total SKUs"        value={stockStats.total}                                         sub="unique products"      icon={Package}         color="#10b981" />
            <KpiCard label="Total Units"       value={stockStats.totalUnits.toLocaleString()}                   sub="across all products"  icon={Boxes}           color="#3b82f6" />
            <KpiCard label="Inventory Value"   value={`GH₵${(stockStats.value/1000).toFixed(1)}k`}             sub="at cost price"        icon={CircleDollarSign} color="#8b5cf6" />
            <KpiCard label="Needs Reorder"     value={stockStats.needsReorder}                                  sub="below threshold"      icon={AlertTriangleIcon} color="#ef4444" />
          </div>

          {/* Search + filter */}
          <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input value={stockSearch} onChange={e => setStockSearch(e.target.value)} placeholder="Search by product name or SKU…"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border outline-none transition-all"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
              {stockSearch && <button onClick={() => setStockSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}><X className="w-3.5 h-3.5" /></button>}
            </div>
            <div className="flex items-center gap-2">
              {([
                { key: 'all', label: 'All'       },
                { key: 'out', label: 'Out of Stock' },
                { key: 'low', label: 'Low Stock'   },
                { key: 'ok',  label: 'In Stock'    },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setStockFilter(f.key)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={stockFilter === f.key ? { background: 'var(--primary-color)', color: '#fff' } : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="hidden md:grid px-5 py-3" style={{ gridTemplateColumns: '1fr auto auto auto auto', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
              {['Product', 'SKU', 'Stock', 'Threshold', 'Actions'].map(h => (
                <p key={h} className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</p>
              ))}
            </div>
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No products found</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {stockSearch || stockFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Add products to track inventory.'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredProducts.map(p => {
                  const stockStatus = p.stock <= 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'ok';
                  const stockColor = { out: '#b91c1c', low: '#b45309', ok: '#15803d' }[stockStatus];
                  const stockBg = { out: '#fef2f2', low: '#fffbeb', ok: '#f0fdf4' }[stockStatus];
                  return (
                    <div key={p._id} className="hidden md:grid items-center px-5 py-4 hover:bg-[var(--bg-surface-2)] transition-colors" style={{ gridTemplateColumns: '1fr auto auto auto auto', gap: '1rem' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: p.category?.color || '#10b981' }}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                          {p.category && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{p.category.name}</p>}
                        </div>
                      </div>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.sku}</p>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: stockBg, color: stockColor }}>
                        {p.stock} units
                      </span>
                      <p className="text-xs text-right" style={{ color: 'var(--text-tertiary)' }}>min {p.lowStockThreshold}</p>
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setAdjustingProduct(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                          <Edit className="w-3 h-3" /> Adjust
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Mobile cards */}
                {filteredProducts.map(p => {
                  const stockStatus = p.stock <= 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'ok';
                  const stockColor = { out: '#b91c1c', low: '#b45309', ok: '#15803d' }[stockStatus];
                  const stockBg = { out: '#fef2f2', low: '#fffbeb', ok: '#f0fdf4' }[stockStatus];
                  return (
                    <div key={p._id + '-m'} className="md:hidden flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: p.category?.color || '#10b981' }}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: stockBg, color: stockColor }}>{p.stock} units</span>
                      </div>
                      <button onClick={() => setAdjustingProduct(p)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                        Adjust
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Insights Tab ── */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Top-Seller Revenue" value={`GH₵${fmt(summary.totalRevenue)}`}   sub="fast-moving products"  icon={TrendingUp}      color="#10b981" />
          <KpiCard label="Critical Stock"      value={summary.criticalItems}               sub="items need attention"  icon={Zap}             color="#ef4444" />
          <KpiCard label="Dead Stock Value"    value={`GH₵${fmt(summary.deadStockValue)}`} sub="capital tied up"       icon={Ban}             color="#f59e0b" />
          <KpiCard label="Restock Est. Cost"   value={`GH₵${fmt(summary.restockCost)}`}   sub="to replenish stock"    icon={CircleDollarSign} color="#3b82f6" />
        </div>
      )}

      {/* ── Fast-Moving Products ── */}
      <SectionCard
        icon={Flame} iconColor="#f97316"
        title="Fast-Moving Products"
        subtitle="Top sellers by revenue in the last 30 days"
        count={insights.fastMoving.length}
      >
        {insights.fastMoving.length === 0 ? (
          <EmptySection icon={BarChart3} message="No sales data available yet" />
        ) : (
          <div>
            {insights.fastMoving.map((product, index) => {
              const barWidth = Math.round((product.revenue / maxRevenue) * 100);
              const color    = avatarColor(product.id);
              const rankColors = ['#f59e0b', '#94a3b8', '#ea580c'];
              return (
                <div
                  key={product.id}
                  className="px-5 py-4 transition-colors"
                  style={{ borderBottom: index < insights.fastMoving.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: color }}
                      >
                        {getInitials(product.name)}
                      </div>
                      <span
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                        style={{ background: index < 3 ? rankColors[index] : 'var(--bg-surface-3)', color: index < 3 ? '#fff' : 'var(--text-tertiary)' }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold truncate pr-4" style={{ color: 'var(--text-primary)' }}>
                          {product.name}
                        </p>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{product.quantity}</span> units
                          </span>
                          <span className="text-sm font-bold tabular-nums" style={{ color: '#10b981' }}>
                            GH₵{product.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, background: '#10b981' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Stock Predictions ── */}
      <SectionCard
        icon={BrainCircuit} iconColor="#8b5cf6"
        title="Stock Predictions"
        subtitle="Forecasted stockout dates based on sales velocity"
        count={insights.predictions.length}
        countColor={insights.predictions.some(p => p.urgency === 'critical' || p.urgency === 'high') ? '#ef4444' : undefined}
      >
        {insights.predictions.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
              <CheckCircle2 className="w-7 h-7" style={{ color: '#22c55e' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All products have healthy stock levels</p>
          </div>
        ) : (
          <div>
            {insights.predictions.map((pred, index) => {
              const u       = urgency(pred.urgency);
              const daysPct = Math.min((pred.daysUntilStockout / 30) * 100, 100);
              return (
                <div
                  key={pred.id}
                  className="px-5 py-4 transition-colors"
                  style={{ borderBottom: index < insights.predictions.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: avatarColor(pred.id) }}
                    >
                      {getInitials(pred.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{pred.name}</p>
                        <UrgencyBadge level={pred.urgency} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs mb-2.5">
                        <div>
                          <p className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Current Stock</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pred.currentStock} units</p>
                        </div>
                        <div>
                          <p className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Daily Avg</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pred.dailyAverage} units</p>
                        </div>
                        <div>
                          <p className="mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Reorder Qty</p>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pred.reorderSuggestion} units</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${daysPct}%`, background: u.barColor }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums flex-shrink-0" style={{ color: u.text }}>
                          {pred.daysUntilStockout}d left
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Bottom grid ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Dead Stock */}
        <SectionCard
          icon={Ban} iconColor="#f59e0b"
          title="Dead Stock"
          subtitle="No sales in the last 30 days"
          count={insights.deadStock.length}
          countColor={insights.deadStock.length > 0 ? '#f59e0b' : undefined}
          footer={
            insights.deadStock.length > 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Consider discounting or returning these items
              </p>
            ) : undefined
          }
        >
          {insights.deadStock.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: '#22c55e' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No dead stock detected</p>
            </div>
          ) : (
            <div>
              {insights.deadStock.map((product, index) => (
                <div
                  key={product.id}
                  className="px-5 py-3.5 flex items-center gap-3 transition-colors"
                  style={{ borderBottom: index < insights.deadStock.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: avatarColor(product.id) }}
                  >
                    {getInitials(product.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{product.stock} units in stock</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>GH₵{product.value.toFixed(2)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>tied up</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Restock Suggestions */}
        <SectionCard
          icon={Boxes} iconColor="#3b82f6"
          title="Restock Suggestions"
          subtitle="Products that need replenishment"
          count={insights.restockSuggestions.length}
          countColor={insights.restockSuggestions.length > 0 ? '#3b82f6' : undefined}
          footer={
            insights.restockSuggestions.length > 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Total est. restock cost:{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    GH₵{summary?.restockCost.toFixed(2)}
                  </span>
                </p>
                <a
                  href="/dashboard/suppliers"
                  className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ color: 'var(--primary-color)' }}
                >
                  View suppliers <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : undefined
          }
        >
          {insights.restockSuggestions.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: '#22c55e' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All products are well stocked</p>
            </div>
          ) : (
            <div>
              {insights.restockSuggestions.map((sug, index) => (
                <div
                  key={sug.id}
                  className="px-5 py-3.5 transition-colors"
                  style={{ borderBottom: index < insights.restockSuggestions.length - 1 ? '1px solid var(--border-subtle)' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: avatarColor(sug.id) }}
                    >
                      {getInitials(sug.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{sug.name}</p>
                        <UrgencyBadge level={sug.priority} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          Stock: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{sug.currentStock}</span>
                          {' → '}
                          <span className="font-semibold" style={{ color: 'var(--primary-color)' }}>+{sug.suggestedQuantity}</span> units
                        </span>
                        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                          GH₵{sug.estimatedCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      </div>
      )}

      {/* ── Adjust Modal ── */}
      {adjustingProduct && (
        <AdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSave={handleStockAdjust}
        />
      )}
    </div>
  );
}
