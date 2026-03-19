'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Package, AlertTriangle, Download, Edit, Trash2, Plus, Search,
  X, Tag, Truck, Calendar, RefreshCw, ScanBarcode, ChevronDown,
  Boxes, CircleDollarSign, AlertCircle, CheckCircle2, Clock, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  expiryDate?: string;
  category: { _id: string; name: string; color: string };
  supplier?: { _id: string; name: string };
}
interface Category { _id: string; name: string; color: string }
interface Supplier  { _id: string; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getStockStatus(p: Product): 'out' | 'low' | 'ok' {
  if (p.stock <= 0) return 'out';
  if (p.stock <= p.lowStockThreshold) return 'low';
  return 'ok';
}

function getExpiryStatus(expiryDate: string) {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0)    return { label: 'Expired',      days, level: 'expired'  as const };
  if (days <= 7)   return { label: `${days}d left`, days, level: 'critical' as const };
  if (days <= 30)  return { label: `${days}d left`, days, level: 'warning'  as const };
  return { label: new Date(expiryDate).toLocaleDateString(), days, level: 'ok' as const };
}

const EXPIRY_STYLE = {
  expired:  { bg: '#fef2f2', text: '#b91c1c' },
  critical: { bg: '#fff7ed', text: '#c2410c' },
  warning:  { bg: '#fffbeb', text: '#b45309' },
  ok:       { bg: 'transparent', text: 'var(--text-secondary)' },
};

const STOCK_BAR_COLOR = { out: '#ef4444', low: '#f59e0b', ok: '#10b981' };

// ─── Shared input style ───────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
      </div>
    </div>
  );
}

function StockBadge({ status }: { status: 'out' | 'low' | 'ok' }) {
  const cfg = {
    out: { bg: '#fef2f2', text: '#b91c1c', label: 'Out of Stock', icon: AlertCircle },
    low: { bg: '#fffbeb', text: '#b45309', label: 'Low Stock',    icon: AlertTriangle },
    ok:  { bg: '#f0fdf4', text: '#15803d', label: 'In Stock',     icon: CheckCircle2 },
  }[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [isFetching,    setIsFetching]    = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showExpiryAlert, setShowExpiryAlert] = useState(true);
  const [expiringProducts, setExpiringProducts] = useState<{
    expired: Product[]; expiringSoon: Product[]; expiringThisMonth: Product[]; total: number;
  } | null>(null);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');

  const emptyForm = { name:'', category:'', supplier:'', price:'', cost:'', stock:'', lowStockThreshold:'10', barcode:'', expiryDate:'' };
  const [formData, setFormData] = useState(emptyForm);
  const fd = (key: keyof typeof emptyForm, v: string) => setFormData(f => ({ ...f, [key]: v }));

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories(), fetchSuppliers(), fetchExpiringProducts()])
      .finally(() => setIsFetching(false));
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch { toast.error('Failed to load products'); }
  };

  const fetchExpiringProducts = async () => {
    try {
      const res = await fetch('/api/products/expiring');
      const data = await res.json();
      setExpiringProducts(data);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { toast.error('Failed to load categories'); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch {}
  };

  const createCategory = async (name: string) => {
    try {
      const colors = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: randomColor }),
      });
      if (!res.ok) throw new Error('Failed to create category');
      const data = await res.json();
      toast.success('Category created');
      await fetchCategories();
      setFormData(f => ({ ...f, category: data.category._id }));
    } catch (error: any) { toast.error(error.message); }
  };

  const generateBarcode = () => {
    const barcode = Date.now().toString().slice(-12) + Math.floor(Math.random() * 10);
    setFormData(f => ({ ...f, barcode }));
  };

  const generateBarcodeSVG = (barcode: string) => {
    const p: Record<string, string> = {
      '0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011',
      '5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011',
    };
    let bin = '101';
    for (const d of barcode) bin += p[d] ?? '';
    bin += '101';
    let x = 0; const bw = 2; const h = 60; let bars = '';
    for (const bit of bin) { if (bit === '1') bars += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="black"/>`; x += bw; }
    return `<svg viewBox="0 0 ${x} ${h}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
  };

  const printBarcode = (product: Product) => {
    if (!product.barcode) { toast.error('No barcode on this product'); return; }
    const svg = generateBarcodeSVG(product.barcode);
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 600, 300);
    ctx.fillStyle = 'black'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText(product.name, 300, 40);
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 75, 60, 450, 150);
      ctx.font = 'bold 18px Courier New';
      ctx.fillText(product.barcode ?? '', 300, 230);
      canvas.toBlob(b => {
        if (!b) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `barcode-${product.name.replace(/[^a-z0-9]/gi, '_')}-${product.barcode}.png`;
        a.click(); URL.revokeObjectURL(url);
        toast.success('Barcode downloaded');
      }, 'image/png');
    };
    img.src = url;
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingProduct(null); setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const url    = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, category: formData.category,
          supplier: formData.supplier || undefined,
          price: parseFloat(formData.price) || 0, cost: parseFloat(formData.cost) || 0,
          stock: parseInt(formData.stock) || 0, lowStockThreshold: parseInt(formData.lowStockThreshold) || 0,
          barcode: formData.barcode || undefined, expiryDate: formData.expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(editingProduct ? 'Failed to update product' : 'Failed to create product');
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      closeModal(); fetchProducts(); fetchExpiringProducts();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, category: product.category._id,
      supplier: product.supplier?._id || '',
      price: product.price.toString(), cost: product.cost.toString(),
      stock: product.stock.toString(), lowStockThreshold: product.lowStockThreshold.toString(),
      barcode: product.barcode || '',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      toast.success('Product deleted'); fetchProducts();
    } catch (error: any) { toast.error(error.message); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const outOfStock = products.filter(p => p.stock <= 0).length;
    const lowStock   = products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
    return { total: products.length, outOfStock, lowStock, totalValue };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (categoryFilter && p.category._id !== categoryFilter) return false;
      if (statusFilter === 'in_stock'    && p.stock <= p.lowStockThreshold) return false;
      if (statusFilter === 'low_stock'   && (p.stock <= 0 || p.stock > p.lowStockThreshold)) return false;
      if (statusFilter === 'out_of_stock' && p.stock > 0) return false;
      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const hasActiveFilters = searchQuery || categoryFilter || statusFilter;

  const liveMargin = useMemo(() => {
    const price = parseFloat(formData.price);
    const cost  = parseFloat(formData.cost);
    if (!price || !cost || price <= 0) return null;
    return { pct: ((price - cost) / price) * 100, profit: price - cost };
  }, [formData.price, formData.cost]);

  const fmtValue = (n: number) => n >= 1000 ? `GH₵${(n/1000).toFixed(1)}k` : `GH₵${n.toFixed(0)}`;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Product Catalog</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage inventory, pricing, and product details
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setIsFetching(true); fetchProducts().finally(() => setIsFetching(false)); }}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--primary-color)', boxShadow: '0 2px 8px var(--primary-color)44' }}
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Products"  value={stats.total}           sub="in catalog"          icon={Boxes}          color="#3b82f6" />
        <KpiCard label="Inventory Value" value={fmtValue(stats.totalValue)} sub="at selling price" icon={CircleDollarSign} color="#10b981" />
        <KpiCard label="Low Stock"       value={stats.lowStock}        sub="need restocking"     icon={AlertTriangle}  color="#f59e0b" />
        <KpiCard label="Out of Stock"    value={stats.outOfStock}      sub="unavailable"         icon={Package}        color="#ef4444" />
      </div>

      {/* ── Filters bar ── */}
      <div
        className="rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row gap-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search by name or SKU…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-all"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>

        {/* Category */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm rounded-xl border outline-none appearance-none cursor-pointer min-w-[140px]"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm rounded-xl border outline-none appearance-none cursor-pointer min-w-[140px]"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter(''); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Products Table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Product','Category','Barcode','Price','Margin','Stock','Expiry','Status',''].map((h, i) => (
                  <th
                    key={i}
                    className={`py-3.5 text-xs font-semibold uppercase tracking-wide ${i === 0 ? 'pl-5 pr-4 text-left' : i === 8 ? 'px-5 text-right' : i >= 3 && i <= 5 ? 'px-4 text-right' : 'px-4 text-left'}`}
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="py-4 px-4">
                        <div
                          className="h-4 rounded-md animate-pulse"
                          style={{ background: 'var(--bg-surface-2)', width: j === 0 ? '140px' : '60px' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)' }}>
                        <Package className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {hasActiveFilters ? 'No products match your filters' : 'No products yet'}
                        </p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first product to get started.'}
                        </p>
                      </div>
                      {!hasActiveFilters && (
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white mt-1"
                          style={{ background: 'var(--primary-color)' }}
                        >
                          <Plus className="w-4 h-4" /> Add Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const status   = getStockStatus(product);
                  const margin   = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;
                  const stockPct = product.lowStockThreshold > 0 ? Math.min((product.stock / (product.lowStockThreshold * 3)) * 100, 100) : 100;
                  const marginColor = margin >= 30 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444';

                  return (
                    <tr
                      key={product._id}
                      className="group transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Product */}
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: product.category.color }}
                          >
                            {getInitials(product.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>
                              {product.name}
                            </p>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{product.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: product.category.color + '1a', color: product.category.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: product.category.color }} />
                          {product.category.name}
                        </span>
                      </td>

                      {/* Barcode */}
                      <td className="py-3.5 px-4">
                        {product.barcode ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg"
                            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                          >
                            <ScanBarcode className="w-3 h-3" />
                            {product.barcode}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>GH₵{product.price.toFixed(2)}</span>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Cost: GH₵{product.cost.toFixed(2)}</p>
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-sm font-semibold" style={{ color: marginColor }}>{margin.toFixed(1)}%</span>
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{product.stock}</span>
                          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-3)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${status === 'out' ? 0 : stockPct}%`, background: STOCK_BAR_COLOR[status] }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4">
                        {product.expiryDate ? (() => {
                          const exp = getExpiryStatus(product.expiryDate);
                          const s   = EXPIRY_STYLE[exp.level];
                          return (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg"
                              style={{ background: s.bg, color: s.text }}
                            >
                              <Clock className="w-3 h-3" />
                              {exp.label}
                            </span>
                          );
                        })() : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StockBadge status={status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {product.barcode && (
                            <button
                              onClick={() => printBarcode(product)}
                              title="Download Barcode"
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: '#f0fdf4', color: '#15803d' }}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(product)}
                            title="Edit"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: '#eff6ff', color: '#3b82f6' }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            title="Delete"
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: '#fef2f2', color: '#ef4444' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filteredProducts.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Showing{' '}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{filteredProducts.length}</span>
              {' '}of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{products.length}</span> products
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter(''); }}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-color)22' }}>
                  <Package className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {editingProduct ? 'Edit Product' : 'New Product'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {editingProduct ? 'Update product details' : 'Add a product to your catalog'}
                  </p>
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
            <form id="product-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1">

              {/* Section 1: Basic Info */}
              <div className="px-6 pt-5 pb-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Basic Info</p>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Product Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={formData.name} onChange={e => fd('name', e.target.value)}
                    placeholder="e.g. Coca-Cola 500ml" required className={inputCls}
                  />
                </div>

                {/* Barcode */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Barcode</label>
                    <button type="button" onClick={generateBarcode} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--primary-color)' }}>
                      <RefreshCw className="w-3 h-3" /> Generate
                    </button>
                  </div>
                  <div className="relative">
                    <ScanBarcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      value={formData.barcode} onChange={e => fd('barcode', e.target.value)}
                      placeholder="Scan or enter barcode" className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { const n = prompt('New category name:'); if (n) createCategory(n); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: 'var(--primary-color)' }}
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <select value={formData.category} onChange={e => fd('category', e.target.value)} required className={inputCls + ' pl-9 pr-9 appearance-none'}>
                      <option value="">Select a category</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Supplier <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <Truck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <select value={formData.supplier} onChange={e => fd('supplier', e.target.value)} className={inputCls + ' pl-9 pr-9 appearance-none'}>
                      <option value="">No supplier</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </div>
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 2: Pricing */}
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Pricing</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Selling Price (GH₵) *</label>
                    <input type="number" step="0.01" min="0" value={formData.price} onChange={e => fd('price', e.target.value)} placeholder="0.00" required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cost Price (GH₵) *</label>
                    <input type="number" step="0.01" min="0" value={formData.cost} onChange={e => fd('cost', e.target.value)} placeholder="0.00" required className={inputCls} />
                  </div>
                </div>

                {liveMargin && (
                  <div className="px-3 py-2.5 rounded-xl" style={{ background: 'var(--primary-color)0f', border: '1px solid var(--primary-color)33' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Margin:{' '}
                      <span className="font-bold" style={{ color: 'var(--primary-color)' }}>{liveMargin.pct.toFixed(1)}%</span>
                      {' '}· Profit per unit:{' '}
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>GH₵{liveMargin.profit.toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 3: Inventory */}
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Inventory</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Current Stock *</label>
                    <input type="number" min="0" value={formData.stock} onChange={e => fd('stock', e.target.value)} placeholder="0" required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Low Stock Alert *</label>
                    <input type="number" min="0" value={formData.lowStockThreshold} onChange={e => fd('lowStockThreshold', e.target.value)} placeholder="10" required className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Expiry Date <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <input type="date" value={formData.expiryDate} onChange={e => fd('expiryDate', e.target.value)} className={inputCls + ' pl-9'} />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal footer */}
            <div
              className="flex gap-3 px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <button
                type="button" onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit" form="product-form" disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--primary-color)' }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : editingProduct ? 'Save Changes' : 'Create Product'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expiry Alert (fixed bottom-right) ── */}
      {showExpiryAlert && expiringProducts &&
        (expiringProducts.expired.length > 0 || expiringProducts.expiringSoon.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid #fca5a5', boxShadow: 'var(--shadow-elevated)' }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
                <span className="text-sm font-semibold" style={{ color: '#dc2626' }}>Expiry Alert</span>
              </div>
              <button
                onClick={() => setShowExpiryAlert(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: '#fee2e2', color: '#dc2626' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {expiringProducts.expired.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#dc2626' }}>
                    {expiringProducts.expired.length} Expired Product{expiringProducts.expired.length > 1 ? 's' : ''}
                  </p>
                  {expiringProducts.expired.slice(0, 2).map(p => (
                    <div key={p._id} className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ef4444' }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                  {expiringProducts.expired.length > 2 && (
                    <p className="text-xs pl-3.5" style={{ color: 'var(--text-tertiary)' }}>+{expiringProducts.expired.length - 2} more</p>
                  )}
                </div>
              )}
              {expiringProducts.expiringSoon.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#ea580c' }}>
                    {expiringProducts.expiringSoon.length} Expiring Within 7 Days
                  </p>
                  {expiringProducts.expiringSoon.slice(0, 2).map(p => (
                    <div key={p._id} className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                  {expiringProducts.expiringSoon.length > 2 && (
                    <p className="text-xs pl-3.5" style={{ color: 'var(--text-tertiary)' }}>+{expiringProducts.expiringSoon.length - 2} more</p>
                  )}
                </div>
              )}
              <a href="/dashboard/expiring" className="flex items-center gap-1 text-xs font-semibold pt-1 transition-opacity hover:opacity-80" style={{ color: 'var(--primary-color)' }}>
                View all expiring products →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
