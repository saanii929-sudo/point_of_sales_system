'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  Factory, Phone, Mail, Globe, MapPin, Edit, Trash2,
  Plus, Search, X, User, FileText, Building2,
  ExternalLink, Loader2, RefreshCw, Package2, AtSign,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATAR_COLORS: { from: string; to: string }[] = [
  { from: '#8b5cf6', to: '#6d28d9' },
  { from: '#3b82f6', to: '#0891b2' },
  { from: '#10b981', to: '#0d9488' },
  { from: '#f97316', to: '#d97706' },
  { from: '#ec4899', to: '#e11d48' },
  { from: '#6366f1', to: '#3b82f6' },
  { from: '#14b8a6', to: '#10b981' },
  { from: '#d946ef', to: '#ec4899' },
];

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

const emptyForm = {
  name: '', contactPerson: '', email: '',
  phone: '', address: '', website: '', notes: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number; sub: string; icon: React.ElementType; color: string;
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

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded-lg" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map(j => (
          <div key={j} className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded" style={{ background: 'var(--bg-surface-3)' }} />
            <div className="h-3 flex-1 rounded" style={{ background: 'var(--bg-surface-3)' }} />
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex-1 h-8 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex-1 h-8 rounded-xl" style={{ background: 'var(--bg-surface-2)' }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuppliersPage() {
  const [suppliers, setSuppliers]           = useState<Supplier[]>([]);
  const [isFetching, setIsFetching]         = useState(true);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [formData, setFormData]             = useState(emptyForm);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setIsFetching(true);
    try {
      const { data } = await fetchWithOfflineFallback('/api/suppliers');
      setSuppliers(data.suppliers || []);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setIsFetching(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url    = editingSupplier ? `/api/suppliers/${editingSupplier._id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(editingSupplier ? 'Failed to update supplier' : 'Failed to create supplier');
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier created');
      closeModal();
      fetchSuppliers();
    } catch (error: any) { toast.error(error.message); }
    finally { setIsLoading(false); }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name:          supplier.name,
      contactPerson: supplier.contactPerson || '',
      email:         supplier.email         || '',
      phone:         supplier.phone         || '',
      address:       supplier.address       || '',
      website:       supplier.website       || '',
      notes:         supplier.notes         || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier');
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (error: any) { toast.error(error.message); }
  };

  const field = (key: keyof typeof emptyForm, value: string) =>
    setFormData(f => ({ ...f, [key]: value }));

  // ── Derived ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      suppliers.length,
    withPhone:  suppliers.filter(s => s.phone).length,
    withEmail:  suppliers.filter(s => s.email).length,
    withWeb:    suppliers.filter(s => s.website).length,
  }), [suppliers]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Suppliers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage your vendor relationships and contact details
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchSuppliers}
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
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Suppliers"  value={stats.total}     sub="in your network"   icon={Factory}   color="#10b981" />
        <KpiCard label="Have Phone"       value={stats.withPhone} sub="reachable by call"  icon={Phone}     color="#3b82f6" />
        <KpiCard label="Have Email"       value={stats.withEmail} sub="reachable by email" icon={AtSign}    color="#8b5cf6" />
        <KpiCard label="Have Website"     value={stats.withWeb}   sub="online presence"    icon={Globe}     color="#f59e0b" />
      </div>

      {/* ── Search bar ── */}
      <div
        className="flex items-center gap-3 rounded-2xl p-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search by name, contact, or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-all"
            style={{
              background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
        {(searchQuery || suppliers.length > 0) && (
          <span className="text-xs flex-shrink-0 font-medium" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length}{searchQuery ? ` of ${suppliers.length}` : ''} supplier{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      {isFetching ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl py-20 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-surface-2)' }}
          >
            <Factory className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
            {searchQuery ? 'No suppliers match your search' : 'No suppliers yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {searchQuery
              ? 'Try a different name, contact, or email address.'
              : 'Add your first supplier to start tracking vendor relationships.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary-color)' }}
            >
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(supplier => {
            const av = avatarColor(supplier.name);
            const hasContact = supplier.phone || supplier.email || supplier.website || supplier.address;

            return (
              <div
                key={supplier._id}
                className="rounded-2xl flex flex-col group transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Card body */}
                <div className="p-5 flex-1">
                  {/* Avatar + name + hover actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${av.from}, ${av.to})` }}
                      >
                        {getInitials(supplier.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {supplier.name}
                        </h3>
                        {supplier.contactPerson ? (
                          <p className="text-xs flex items-center gap-1 mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            <User className="w-3 h-3 flex-shrink-0" />
                            {supplier.contactPerson}
                          </p>
                        ) : (
                          <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>No contact person</p>
                        )}
                      </div>
                    </div>

                    {/* Hover icon buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleEdit(supplier)}
                        title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: '#eff6ff', color: '#3b82f6' }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier._id)}
                        title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: '#fef2f2', color: '#ef4444' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5">
                    {supplier.phone && (
                      <a
                        href={`tel:${supplier.phone}`}
                        className="flex items-center gap-2.5 text-sm transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                        <span className="truncate">{supplier.phone}</span>
                      </a>
                    )}
                    {supplier.email && (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="flex items-center gap-2.5 text-sm transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                        <span className="truncate">{supplier.email}</span>
                      </a>
                    )}
                    {supplier.website && (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-sm transition-colors hover:opacity-80"
                        style={{ color: 'var(--primary-color)' }}
                      >
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{supplier.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                      </a>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }} />
                        <span className="line-clamp-2 leading-relaxed">{supplier.address}</span>
                      </div>
                    )}
                    {!hasContact && (
                      <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>No contact details added</p>
                    )}
                  </div>

                  {/* Notes preview */}
                  {supplier.notes && (
                    <div
                      className="mt-4 pt-3 text-xs leading-relaxed line-clamp-2"
                      style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                    >
                      {supplier.notes}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div
                  className="flex flex-shrink-0"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all hover:opacity-80 rounded-bl-2xl"
                    style={{ color: '#3b82f6', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
                  <button
                    onClick={() => handleDelete(supplier._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all hover:opacity-80 rounded-br-2xl"
                    style={{ color: '#ef4444', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-color)22' }}
                >
                  <Factory className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {editingSupplier ? 'Update supplier details' : 'Add a vendor to your network'}
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
            <form id="supplier-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1">

              {/* Section 1: Company */}
              <div className="px-6 pt-5 pb-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Company</p>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Supplier Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => field('name', e.target.value)}
                      required
                      placeholder="e.g. Acme Distributors Ltd."
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Contact Person
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={e => field('contactPerson', e.target.value)}
                      placeholder="Full name"
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 2: Contact Details */}
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Contact Details</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => field('phone', e.target.value)}
                        placeholder="+233 …"
                        className={inputCls + ' pl-9'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => field('email', e.target.value)}
                        placeholder="email@example.com"
                        className={inputCls + ' pl-9'}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Website</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={e => field('website', e.target.value)}
                      placeholder="https://example.com"
                      className={inputCls + ' pl-9'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                    <textarea
                      value={formData.address}
                      onChange={e => field('address', e.target.value)}
                      rows={2}
                      placeholder="Street, City, Region"
                      className={inputCls + ' pl-9 resize-none'}
                    />
                  </div>
                </div>
              </div>

              <div className="mx-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Section 3: Notes */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>Additional Notes</p>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-3 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  <textarea
                    value={formData.notes}
                    onChange={e => field('notes', e.target.value)}
                    rows={3}
                    placeholder="Payment terms, lead times, product specialties…"
                    className={inputCls + ' pl-9 resize-none'}
                  />
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
                form="supplier-form"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--primary-color)' }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : editingSupplier ? 'Save Changes' : 'Create Supplier'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
