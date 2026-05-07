'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  Tag, Plus, Edit, Trash2, Calendar, Percent, DollarSign,
  Package, Layers, Users, CheckCircle2, XCircle, Search, X,
  BarChart2, Check, AlertCircle, Hash, Ticket,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Discount {
  _id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number | null;
  applicableTo: 'all' | 'specific_products' | 'specific_categories';
  products: any[];
  categories: any[];
  usageLimit: number | null;
  usageCount: number;
  usagePerCustomer: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: any;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  category?: { name: string; color?: string };
}

interface Category {
  _id: string;
  name: string;
  color?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyForm = {
  code: '',
  name: '',
  description: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: 0,
  minPurchaseAmount: 0,
  maxDiscountAmount: null as number | null,
  applicableTo: 'all' as 'all' | 'specific_products' | 'specific_categories',
  selectedProducts: [] as string[],
  selectedCategories: [] as string[],
  usageLimit: null as number | null,
  usagePerCustomer: null as number | null,
  startDate: '',
  endDate: '',
};

function getStatus(d: Discount): 'active' | 'expired' | 'scheduled' | 'inactive' {
  if (!d.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
}

const STATUS_CFG = {
  active:    { label: 'Active',    bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  expired:   { label: 'Expired',   bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  scheduled: { label: 'Scheduled', bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  inactive:  { label: 'Inactive',  bg: '#f9fafb', text: '#6b7280', dot: '#9ca3af' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [discounts, setDiscounts]         = useState<Discount[]>([]);
  const [allDiscounts, setAllDiscounts]   = useState<Discount[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [editingDiscount, setEditing]     = useState<Discount | null>(null);
  const [filterStatus, setFilterStatus]   = useState('active');
  const [searchQuery, setSearchQuery]     = useState('');
  const [isSaving, setIsSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({ ...emptyForm });

  // Options for product / category selectors
  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  // ── Data Fetching ────────────────────────────────────────────────────────────

  useEffect(() => { fetchDiscounts(); }, [filterStatus]);

  // Keep stats updated with all discounts
  useEffect(() => {
    fetch('/api/discounts?status=all')
      .then(r => r.json())
      .then(d => setAllDiscounts(d.discounts || []))
      .catch(() => {});
  }, [discounts]);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const { data } = await fetchWithOfflineFallback(`/api/discounts?status=${filterStatus}`);
      setDiscounts(data.discounts || []);
    } catch {
      toast.error('Failed to load discounts');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products & categories when we need them
  useEffect(() => {
    if (!showModal || formData.applicableTo === 'all') return;
    if (
      (formData.applicableTo === 'specific_products' && products.length > 0) ||
      (formData.applicableTo === 'specific_categories' && categories.length > 0)
    ) return;
    fetchOptions();
  }, [showModal, formData.applicableTo]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [pRes, cRes] = await Promise.all([fetch('/api/products'), fetch('/api/categories')]);
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
      setProducts(pData.products || []);
      setCategories(cData.categories || []);
    } catch {
      toast.error('Failed to load options');
    } finally {
      setLoadingOptions(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       allDiscounts.length,
    active:      allDiscounts.filter(d => getStatus(d) === 'active').length,
    expired:     allDiscounts.filter(d => getStatus(d) === 'expired').length,
    totalUsages: allDiscounts.reduce((sum, d) => sum + (d.usageCount || 0), 0),
  }), [allDiscounts]);

  // ── Filtered List ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return discounts;
    const q = searchQuery.toLowerCase();
    return discounts.filter(d =>
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q),
    );
  }, [discounts, searchQuery]);

  // ── Form Handlers ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditing(null);
    setProductSearch('');
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (d: Discount) => {
    setEditing(d);
    setFormData({
      code:                d.code,
      name:                d.name,
      description:         d.description || '',
      type:                d.type,
      value:               d.value,
      minPurchaseAmount:   d.minPurchaseAmount,
      maxDiscountAmount:   d.maxDiscountAmount,
      applicableTo:        d.applicableTo,
      selectedProducts:    d.products.map((p: any) => p._id ?? p),
      selectedCategories:  d.categories.map((c: any) => c._id ?? c),
      usageLimit:          d.usageLimit,
      usagePerCustomer:    d.usagePerCustomer,
      startDate:           format(new Date(d.startDate), 'yyyy-MM-dd'),
      endDate:             format(new Date(d.endDate), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        code:               formData.code,
        name:               formData.name,
        description:        formData.description,
        type:               formData.type,
        value:              formData.value,
        minPurchaseAmount:  formData.minPurchaseAmount,
        maxDiscountAmount:  formData.maxDiscountAmount,
        applicableTo:       formData.applicableTo,
        products:           formData.applicableTo === 'specific_products'   ? formData.selectedProducts   : [],
        categories:         formData.applicableTo === 'specific_categories' ? formData.selectedCategories : [],
        usageLimit:         formData.usageLimit,
        usagePerCustomer:   formData.usagePerCustomer,
        startDate:          formData.startDate,
        endDate:            formData.endDate,
      };

      const url    = editingDiscount ? `/api/discounts/${editingDiscount._id}` : '/api/discounts';
      const method = editingDiscount ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingDiscount ? 'Discount updated' : 'Discount created');
        closeModal();
        fetchDiscounts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save discount');
      }
    } catch {
      toast.error('Failed to save discount');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Discount deleted');
        setDeleteTarget(null);
        fetchDiscounts();
      } else {
        toast.error('Failed to delete discount');
      }
    } catch {
      toast.error('Failed to delete discount');
    }
  };

  const toggleProduct = (id: string) =>
    setFormData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(id)
        ? prev.selectedProducts.filter(p => p !== id)
        : [...prev.selectedProducts, id],
    }));

  const toggleCategory = (id: string) =>
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(id)
        ? prev.selectedCategories.filter(c => c !== id)
        : [...prev.selectedCategories, id],
    }));

  const filteredProducts = useMemo(
    () => products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()),
    ),
    [products, productSearch],
  );

  // ── Loading Skeleton ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-52 bg-[var(--bg-surface-2)] rounded-xl" />
          <div className="h-10 w-36 bg-[var(--bg-surface-2)] rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-surface-2)] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-[var(--bg-surface-2)] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-white" />
            </span>
            Discount Codes
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 pl-[46px]">
            Create and manage promotional discount codes
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          New Discount
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Discounts"
          value={stats.total}
          icon={<Tag className="w-5 h-5" />}
          iconColor="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="Active"
          value={stats.active}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          icon={<XCircle className="w-5 h-5" />}
          iconColor="bg-red-100 text-red-500"
        />
        <StatCard
          title="Total Usages"
          value={stats.totalUsages}
          icon={<BarChart2 className="w-5 h-5" />}
          iconColor="bg-blue-100 text-blue-600"
        />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 p-1 bg-[var(--bg-surface-2)] rounded-xl">
          {[
            { key: 'active',  label: 'Active'  },
            { key: 'expired', label: 'Expired' },
            { key: 'all',     label: 'All'     },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                filterStatus === key
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search discounts…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
          />
        </div>

        {searchQuery && (
          <span className="text-sm text-[var(--text-secondary)]">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Discounts Grid */}
      {filtered.length === 0 ? (
        <Card variant="flat">
          <CardBody>
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface-2)] flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="font-semibold text-[var(--text-primary)]">No discounts found</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first discount code to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={openCreate} size="sm" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}>
                  Create Discount
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(discount => {
            const status  = getStatus(discount);
            const cfg     = STATUS_CFG[status];
            const usagePct = discount.usageLimit
              ? Math.min(100, (discount.usageCount / discount.usageLimit) * 100)
              : null;

            return (
              <Card key={discount._id} hover>
                <CardBody className="p-5 flex flex-col gap-4">

                  {/* Code + status + name */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-lg font-mono font-bold text-sm text-[var(--text-primary)]">
                        <Hash className="w-3 h-3 text-[var(--text-tertiary)]" />
                        {discount.code}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{discount.name}</h3>
                    {discount.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{discount.description}</p>
                    )}
                  </div>

                  {/* Value pill */}
                  <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      {discount.type === 'percentage' ? (
                        <Percent className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="text-xl font-bold text-emerald-600">
                        {discount.type === 'percentage'
                          ? `${discount.value}% OFF`
                          : `GH₵${discount.value} OFF`}
                      </span>
                    </div>
                    {discount.minPurchaseAmount > 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        Min. purchase: GH₵{discount.minPurchaseAmount}
                      </p>
                    )}
                  </div>

                  {/* Meta details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      {discount.applicableTo === 'all' ? (
                        <><Layers className="w-3.5 h-3.5 flex-shrink-0" /><span>All products</span></>
                      ) : discount.applicableTo === 'specific_products' ? (
                        <><Package className="w-3.5 h-3.5 flex-shrink-0" /><span>{discount.products.length} specific product{discount.products.length !== 1 ? 's' : ''}</span></>
                      ) : (
                        <><Tag className="w-3.5 h-3.5 flex-shrink-0" /><span>{discount.categories.length} categor{discount.categories.length !== 1 ? 'ies' : 'y'}</span></>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {format(new Date(discount.startDate), 'MMM d')} – {format(new Date(discount.endDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Usage progress */}
                  {discount.usageLimit && (
                    <div>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1.5">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Usage</span>
                        <span className="font-medium">{discount.usageCount} / {discount.usageLimit}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-surface-2)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePct! >= 90 ? 'bg-red-500' : usagePct! >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(discount)} className="flex-1" leftIcon={<Edit className="w-3.5 h-3.5" />}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(discount._id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardBody>
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Delete Discount?</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="ghost" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                  <Button variant="danger" className="flex-1" onClick={() => handleDelete(deleteTarget)}>Delete</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 m-0 p-0 w-full"
        >

          {/* Modal panel */}
          <div className="relative w-full max-w-xl flex flex-col bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] max-h-[calc(100vh-3rem)] overflow-scroll">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)] leading-tight">
                    {editingDiscount ? 'Edit Discount' : 'New Discount'}
                  </h2>
                  <p className="text-xs text-[var(--text-tertiary)] leading-tight">
                    {editingDiscount ? 'Update discount details' : 'Fill in the details below'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-surface-2)] text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                {/* ── Basic Info ── */}
                <FormSection title="Basic Information">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Discount Code *">
                      <Input
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER2024"
                        required
                        className="uppercase font-mono"
                      />
                    </FormField>
                    <FormField label="Discount Name *">
                      <Input
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Summer Sale"
                        required
                      />
                    </FormField>
                  </div>
                  <FormField label="Description">
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description…"
                      rows={2}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                    />
                  </FormField>
                </FormSection>

                {/* ── Discount Value ── */}
                <FormSection title="Discount Value">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Type *">
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (GH₵)</option>
                      </select>
                    </FormField>
                    <FormField label={`Value * ${formData.type === 'percentage' ? '(%)' : '(GH₵)'}`}>
                      <Input
                        type="number"
                        value={formData.value}
                        onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max={formData.type === 'percentage' ? '100' : undefined}
                        step="0.01"
                        required
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Min Purchase (GH₵)">
                      <Input
                        type="number"
                        value={formData.minPurchaseAmount}
                        onChange={e => setFormData({ ...formData, minPurchaseAmount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </FormField>
                    <FormField label="Max Discount (GH₵)">
                      <Input
                        type="number"
                        value={formData.maxDiscountAmount ?? ''}
                        onChange={e => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null })}
                        min="0"
                        step="0.01"
                        placeholder="Unlimited"
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* ── Applicability ── */}
                <FormSection title="Applies To">

                  {/* Toggle cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'all',                 label: 'All Products',      desc: 'Applies to everything',      Icon: Layers  },
                      { value: 'specific_products',   label: 'Specific Products', desc: 'Choose individual products', Icon: Package },
                      { value: 'specific_categories', label: 'By Category',       desc: 'Choose product categories',  Icon: Tag     },
                    ].map(({ value, label, desc, Icon }) => {
                      const active = formData.applicableTo === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData({ ...formData, applicableTo: value as typeof formData.applicableTo })}
                          className={[
                            'relative flex flex-col items-center text-center gap-2 p-3 rounded-xl border-2 transition-all',
                            active
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)]',
                          ].join(' ')}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)]'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={`text-xs font-semibold leading-snug ${active ? 'text-emerald-700' : 'text-[var(--text-primary)]'}`}>
                              {label}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5">{desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Product Selector */}
                  {formData.applicableTo === 'specific_products' && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Select Products</p>
                        {formData.selectedProducts.length > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            {formData.selectedProducts.length} selected
                          </span>
                        )}
                      </div>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                        <input
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Search by name or SKU…"
                          className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                        />
                      </div>
                      {loadingOptions ? (
                        <div className="h-32 flex items-center justify-center text-sm text-[var(--text-secondary)]">Loading…</div>
                      ) : (
                        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <p className="p-4 text-center text-sm text-[var(--text-secondary)]">No products found</p>
                          ) : filteredProducts.map(product => {
                            const sel = formData.selectedProducts.includes(product._id);
                            return (
                              <label
                                key={product._id}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--bg-surface-2)] transition-colors border-b border-[var(--border-subtle)] last:border-0 ${sel ? 'bg-emerald-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => toggleProduct(product._id)}
                                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{product.name}</p>
                                  <p className="text-xs text-[var(--text-tertiary)]">SKU: {product.sku} · GH₵{product.price}</p>
                                </div>
                                {product.category && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-surface-2)] text-[var(--text-secondary)] flex-shrink-0">
                                    {product.category.name}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {formData.selectedProducts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {formData.selectedProducts.map(id => {
                            const p = products.find(x => x._id === id);
                            return p ? (
                              <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                {p.name}
                                <button type="button" onClick={() => toggleProduct(id)} className="hover:text-red-500 transition-colors ml-0.5">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category Selector */}
                  {formData.applicableTo === 'specific_categories' && (
                    <div className="mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Select Categories</p>
                        {formData.selectedCategories.length > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            {formData.selectedCategories.length} selected
                          </span>
                        )}
                      </div>
                      {loadingOptions ? (
                        <div className="h-32 flex items-center justify-center text-sm text-[var(--text-secondary)]">Loading…</div>
                      ) : (
                        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                          {categories.length === 0 ? (
                            <p className="p-4 text-center text-sm text-[var(--text-secondary)]">No categories found</p>
                          ) : (
                            <div className="grid grid-cols-2">
                              {categories.map(cat => {
                                const sel = formData.selectedCategories.includes(cat._id);
                                return (
                                  <label
                                    key={cat._id}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--bg-surface-2)] transition-colors border-b border-r border-[var(--border-subtle)] ${sel ? 'bg-emerald-50' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sel}
                                      onChange={() => toggleCategory(cat._id)}
                                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer flex-shrink-0"
                                    />
                                    <div className="flex items-center gap-2 min-w-0">
                                      {cat.color && (
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                      )}
                                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{cat.name}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {formData.selectedCategories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {formData.selectedCategories.map(id => {
                            const c = categories.find(x => x._id === id);
                            return c ? (
                              <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                {c.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />}
                                {c.name}
                                <button type="button" onClick={() => toggleCategory(id)} className="hover:text-red-500 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </FormSection>

                {/* ── Limits & Schedule ── */}
                <FormSection title="Limits & Schedule">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Usage Limit">
                      <Input
                        type="number"
                        value={formData.usageLimit ?? ''}
                        onChange={e => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
                        min="1"
                        placeholder="Unlimited"
                      />
                    </FormField>
                    <FormField label="Per Customer Limit">
                      <Input
                        type="number"
                        value={formData.usagePerCustomer ?? ''}
                        onChange={e => setFormData({ ...formData, usagePerCustomer: e.target.value ? parseInt(e.target.value) : null })}
                        min="1"
                        placeholder="Unlimited"
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Date *">
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </FormField>
                    <FormField label="End Date *">
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </FormField>
                  </div>
                </FormSection>

              </div>

              {/* Modal Footer */}
              <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-2)]">
                <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving} className="flex-1">
                  {editingDiscount ? 'Save Changes' : 'Create Discount'}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}
