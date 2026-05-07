'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  GitBranch, Plus, Edit2, Trash2, Package, ArrowLeftRight,
  MapPin, Phone, Mail, User, Building2, Search, X,
  ChevronDown, ChevronUp, Check, AlertTriangle, Loader2,
  BarChart3, TrendingUp, ShoppingBag, History, Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';
import { useBranchStore } from '@/store/useBranchStore';

// ── Types ─────────────────────────────────────────────────
interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  isActive: boolean;
  manager?: { _id: string; name: string; email: string } | null;
  settings: {
    allowNegativeStock: boolean;
    autoReorder: boolean;
    reorderThreshold: number;
  };
  createdAt: string;
}

interface InventoryItem {
  product: {
    _id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    category?: { name: string; color?: string };
    lowStockThreshold?: number;
  };
  stock: number;
  reorderPoint: number;
  maxStock: number;
  lastRestocked: string | null;
  isLow: boolean;
  branchInventoryId: string | null;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const emptyForm = {
  name: '', address: '', phone: '', email: '', managerId: '',
  code: '',
  settings: { allowNegativeStock: false, autoReorder: false, reorderThreshold: 10 },
};

// ── Helpers ───────────────────────────────────────────────
function roleBadge(role: string) {
  const map: Record<string, string> = {
    business_owner:  'bg-purple-100 text-purple-700',
    manager:         'bg-blue-100 text-blue-700',
    cashier:         'bg-emerald-100 text-emerald-700',
    inventory_staff: 'bg-amber-100 text-amber-700',
  };
  return map[role] ?? 'bg-gray-100 text-gray-600';
}

// ── Main page ─────────────────────────────────────────────
export default function BranchesPage() {
  const { user }         = useAuthStore();
  const { setBranches }  = useBranchStore();

  const [branches,    setBranchesLocal] = useState<Branch[]>([]);
  const [loading,     setLoading]       = useState(true);
  const [employees,   setEmployees]     = useState<Employee[]>([]);

  // Modals
  const [showAddEdit,      setShowAddEdit]      = useState(false);
  const [editBranch,       setEditBranch]       = useState<Branch | null>(null);
  const [showInventory,    setShowInventory]    = useState(false);
  const [inventoryBranch,  setInventoryBranch]  = useState<Branch | null>(null);
  const [showTransfer,     setShowTransfer]     = useState(false);
  const [transferBranch,   setTransferBranch]   = useState<Branch | null>(null);
  const [showDeactivate,   setShowDeactivate]   = useState(false);
  const [deactivateBranch, setDeactivateBranch] = useState<Branch | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'branches' | 'history'>('branches');

  const canEdit = user?.role === 'business_owner' || user?.role === 'manager';

  // ── Fetch branches ───────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/branches');
      const data = res.ok ? await res.json() : {};
      const list: Branch[] = data.branches ?? [];
      setBranchesLocal(list);
      setBranches(list.map(b => ({ _id: b._id, name: b.name, code: b.code, address: b.address, isActive: b.isActive })));
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [setBranches]);

  // ── Fetch employees (for manager picker) ────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const res  = await fetch('/api/employees');
      const data = res.ok ? await res.json() : {};
      setEmployees(data.employees ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchBranches(); fetchEmployees(); }, [fetchBranches, fetchEmployees]);

  // ── KPI stats ────────────────────────────────────────────
  const totalActive   = branches.filter(b => b.isActive).length;
  const totalInactive = branches.filter(b => !b.isActive).length;

  // ── Open add modal ───────────────────────────────────────
  function openAdd() {
    setEditBranch(null);
    setShowAddEdit(true);
  }

  // ── Open edit modal ──────────────────────────────────────
  function openEdit(branch: Branch) {
    setEditBranch(branch);
    setShowAddEdit(true);
  }

  // ── Open deactivate confirm ──────────────────────────────
  function openDeactivate(branch: Branch) {
    setDeactivateBranch(branch);
    setShowDeactivate(true);
  }

  // ── Deactivate ───────────────────────────────────────────
  async function handleDeactivate() {
    if (!deactivateBranch) return;
    try {
      const res = await fetch(`/api/branches/${deactivateBranch._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Branch deactivated');
      setShowDeactivate(false);
      fetchBranches();
    } catch {
      toast.error('Failed to deactivate branch');
    }
  }

  // ── Inventory slide-over ─────────────────────────────────
  function openInventory(branch: Branch) {
    setInventoryBranch(branch);
    setShowInventory(true);
  }

  // ── Transfer modal ───────────────────────────────────────
  function openTransfer(branch: Branch) {
    setTransferBranch(branch);
    setShowTransfer(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Branch Management</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Manage your business locations and their inventory
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-surface-2)' }}>
        {([
          { key: 'branches', label: 'Branches',         icon: Building2 },
          { key: 'history',  label: 'Transfer History', icon: History   },
        ] as { key: 'branches' | 'history'; label: string; icon: React.ElementType }[]).map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={activeTab === tab.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                : { color: 'var(--text-secondary)' }}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── KPI row ── */}
      {activeTab === 'branches' && (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalActive}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Active Branches</p>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalInactive}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Inactive</p>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{branches.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Total Branches</p>
          </div>
        </div>
      </div>
      )}

      {/* ── Branch cards ── */}
      {activeTab === 'branches' && (
      <>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-2/3 rounded" />
                  <div className="skeleton h-2.5 w-1/3 rounded" />
                </div>
              </div>
              <div className="skeleton h-2.5 w-full rounded" />
              <div className="skeleton h-2.5 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-50" />
          <p className="text-base font-semibold text-[var(--text-secondary)]">No branches yet</p>
          {canEdit && (
            <button onClick={openAdd} className="btn-primary mt-4 px-5 py-2 text-sm flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Add your first branch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(branch => (
            <BranchCard
              key={branch._id}
              branch={branch}
              canEdit={canEdit}
              onEdit={() => openEdit(branch)}
              onDeactivate={() => openDeactivate(branch)}
              onInventory={() => openInventory(branch)}
              onTransfer={() => openTransfer(branch)}
            />
          ))}
        </div>
      )}
      </>
      )}

      {/* ── Transfer History tab ── */}
      {activeTab === 'history' && (
        <TransferHistoryPanel branches={branches} />
      )}

      {/* ── Add / Edit modal ── */}
      {showAddEdit && (
        <BranchFormModal
          branch={editBranch}
          employees={employees}
          onClose={() => setShowAddEdit(false)}
          onSaved={() => { setShowAddEdit(false); fetchBranches(); }}
        />
      )}

      {/* ── Inventory slide-over ── */}
      {showInventory && inventoryBranch && (
        <InventorySlideOver
          branch={inventoryBranch}
          canEdit={canEdit}
          branches={branches.filter(b => b.isActive && b._id !== inventoryBranch._id)}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* ── Transfer modal ── */}
      {showTransfer && transferBranch && (
        <TransferModal
          fromBranch={transferBranch}
          branches={branches.filter(b => b.isActive && b._id !== transferBranch._id)}
          onClose={() => setShowTransfer(false)}
          onDone={() => { setShowTransfer(false); toast.success('Transfer completed'); }}
        />
      )}

      {/* ── Deactivate confirm ── */}
      {showDeactivate && deactivateBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl  w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Deactivate Branch</h3>
                <p className="text-sm text-[var(--text-tertiary)]">This action can be reversed later.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to deactivate <span className="font-semibold">{deactivateBranch.name}</span>?
              Sales and inventory at this branch will be preserved.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeactivate(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Branch Card ───────────────────────────────────────────
function BranchCard({
  branch, canEdit, onEdit, onDeactivate, onInventory, onTransfer,
}: {
  branch: Branch;
  canEdit: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onInventory: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className={`bg-[var(--bg-surface)] rounded-2xl border ${branch.isActive ? 'border-[var(--border-subtle)]' : 'border-dashed border-[var(--border-subtle)] opacity-70'} p-5 flex flex-col gap-4 transition-shadow`}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${branch.isActive ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          <Building2 className={`w-5 h-5 ${branch.isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[var(--text-primary)] truncate">{branch.name}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
              branch.isActive
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {branch.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">{branch.code}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
          <span className="truncate">{branch.address}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
          <span>{branch.phone}</span>
        </div>
        {branch.email && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Mail className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <span className="truncate">{branch.email}</span>
          </div>
        )}
        {branch.manager && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
            <span className="truncate">{branch.manager.name}</span>
          </div>
        )}
      </div>

      {/* Settings chips */}
      <div className="flex flex-wrap gap-1.5">
        {branch.settings.allowNegativeStock && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Negative stock
          </span>
        )}
        {branch.settings.autoReorder && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Auto-reorder ≤{branch.settings.reorderThreshold}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
        <button
          onClick={onInventory}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors"
        >
          <Package className="w-3.5 h-3.5" /> Inventory
        </button>
        <button
          onClick={onTransfer}
          disabled={!branch.isActive}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
        </button>
        {canEdit && (
          <>
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            {branch.isActive && (
              <button
                onClick={onDeactivate}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Deactivate
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Branch Form Modal ─────────────────────────────────────
function BranchFormModal({
  branch, employees, onClose, onSaved,
}: {
  branch: Branch | null;
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!branch;
  const [form, setForm] = useState(() =>
    branch
      ? {
          name:     branch.name,
          address:  branch.address,
          phone:    branch.phone,
          email:    branch.email ?? '',
          managerId: branch.manager?._id ?? '',
          code:     branch.code,
          settings: { ...branch.settings },
        }
      : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url    = isEdit ? `/api/branches/${branch!._id}` : '/api/branches';
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(isEdit ? 'Branch updated' : 'Branch created');
      if (!isEdit) window.dispatchEvent(new Event('branch-created'));
      onSaved();
    } catch {
      toast.error('Failed to save branch');
    } finally {
      setSaving(false);
    }
  }

  const managerOptions = employees.filter(e =>
    ['business_owner', 'manager'].includes(e.role)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <h2 className="font-bold text-lg text-[var(--text-primary)]">
            {isEdit ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Branch Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Downtown Branch"
                className="input-base w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Address *</label>
              <input
                required
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street, City"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Phone *</label>
              <input
                required
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="055 000 0000"
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="branch@example.com"
                className="input-base w-full"
              />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Branch Code <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
                </label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="AUTO-001"
                  className="input-base w-full font-mono"
                  maxLength={20}
                />
              </div>
            )}
            <div className={isEdit ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Manager</label>
              <select
                value={form.managerId}
                onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                className="input-base w-full"
              >
                <option value="">— No manager —</option>
                {managerOptions.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name} ({emp.role.replace(/_/g, ' ')})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings */}
          <div className="border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Branch Settings</p>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Allow Negative Stock</p>
                <p className="text-xs text-[var(--text-tertiary)]">Sell even when stock reaches zero</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, allowNegativeStock: !f.settings.allowNegativeStock } }))}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.settings.allowNegativeStock ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.settings.allowNegativeStock ? 'translate-x-4' : ''}`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Auto Reorder</p>
                <p className="text-xs text-[var(--text-tertiary)]">Alert when stock falls below threshold</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, settings: { ...f.settings, autoReorder: !f.settings.autoReorder } }))}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.settings.autoReorder ? 'bg-emerald-500' : 'bg-[var(--border-default)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.settings.autoReorder ? 'translate-x-4' : ''}`} />
              </div>
            </label>
            {form.settings.autoReorder && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Reorder Threshold</label>
                <input
                  type="number"
                  min={1}
                  value={form.settings.reorderThreshold}
                  onChange={e => setForm(f => ({ ...f, settings: { ...f.settings, reorderThreshold: Number(e.target.value) } }))}
                  className="input-base w-28"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inventory Slide-Over ──────────────────────────────────
function InventorySlideOver({
  branch, canEdit, branches, onClose,
}: {
  branch: Branch;
  canEdit: boolean;
  branches: Branch[];
  onClose: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<'all' | 'low' | 'zero'>('all');

  // Adjust stock
  const [adjusting,   setAdjusting]   = useState<string | null>(null); // productId
  const [adjustQty,   setAdjustQty]   = useState('');
  const [adjustType,  setAdjustType]  = useState<'add' | 'set' | 'subtract'>('add');
  const [adjusting2,  setAdjusting2]  = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/branches/${branch._id}/inventory`);
        const data = res.ok ? await res.json() : {};
        setInventory(data.inventory ?? []);
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branch._id]);

  const displayed = inventory.filter(item => {
    const matchSearch = item.product.name.toLowerCase().includes(search.toLowerCase()) ||
                        item.product.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'low')  return item.isLow && item.stock > 0;
    if (filter === 'zero') return item.stock === 0;
    return true;
  });

  async function handleAdjust(productId: string) {
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty < 0) { toast.error('Invalid quantity'); return; }
    setAdjusting2(true);
    try {
      const res = await fetch(`/api/branches/${branch._id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty, type: adjustType }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Stock updated');
      setInventory(inv => inv.map(item =>
        item.product._id === productId
          ? { ...item, stock: data.newStock, isLow: data.newStock <= item.reorderPoint }
          : item
      ));
      setAdjusting(null);
      setAdjustQty('');
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setAdjusting2(false);
    }
  }

  const lowCount  = inventory.filter(i => i.isLow && i.stock > 0).length;
  const zeroCount = inventory.filter(i => i.stock === 0).length;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-[var(--bg-surface)] h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-5 pt-5 pb-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-lg text-[var(--text-primary)]">{branch.name}</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Inventory — {inventory.length} products</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick stats */}
          {!loading && (
            <div className="flex gap-2 mb-3">
              <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[var(--primary-color)] text-white' : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-3)]'}`}>
                All ({inventory.length})
              </button>
              <button onClick={() => setFilter('low')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === 'low' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                Low ({lowCount})
              </button>
              <button onClick={() => setFilter('zero')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filter === 'zero' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                Out ({zeroCount})
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input-base w-full pl-8 text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 p-4 space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl animate-pulse" />
            ))
          ) : displayed.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-tertiary)]">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            displayed.map(item => (
              <div key={item.product._id} className={`bg-[var(--bg-surface-2)] rounded-xl p-3 border ${item.stock === 0 ? 'border-red-200' : item.isLow ? 'border-amber-200' : 'border-transparent'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.product.name}</p>
                      {item.stock === 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 flex-shrink-0">Out</span>}
                      {item.isLow && item.stock > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 flex-shrink-0">Low</span>}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] font-mono">{item.product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-[var(--text-primary)]">{item.stock}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">/ {item.reorderPoint} min</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setAdjusting(adjusting === item.product._id ? null : item.product._id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] transition-colors flex-shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline adjust form */}
                {adjusting === item.product._id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
                    <select
                      value={adjustType}
                      onChange={e => setAdjustType(e.target.value as 'add' | 'set' | 'subtract')}
                      className="input-base text-xs py-1.5 w-28"
                    >
                      <option value="add">Add</option>
                      <option value="set">Set to</option>
                      <option value="subtract">Remove</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={adjustQty}
                      onChange={e => setAdjustQty(e.target.value)}
                      placeholder="Qty"
                      className="input-base text-xs py-1.5 w-20"
                    />
                    <button
                      onClick={() => handleAdjust(item.product._id)}
                      disabled={adjusting2}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {adjusting2 ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Apply
                    </button>
                    <button
                      onClick={() => { setAdjusting(null); setAdjustQty(''); }}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-3)] text-[var(--text-tertiary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Transfer History Panel ────────────────────────────────
interface TransferLog {
  _id: string;
  user: { name: string; role: string };
  action: string;
  details: {
    fromBranchName: string;
    toBranchName: string;
    productName: string;
    quantity: number;
    notes?: string;
  };
  createdAt: string;
}

function TransferHistoryPanel({ branches }: { branches: Branch[] }) {
  const [logs,    setLogs]    = useState<TransferLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/activity?type=stock_transfer&limit=100');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch {
        // no activity API yet — show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const d = log.details;
    const matchSearch = !q ||
      d.productName?.toLowerCase().includes(q) ||
      d.fromBranchName?.toLowerCase().includes(q) ||
      d.toBranchName?.toLowerCase().includes(q) ||
      log.user?.name?.toLowerCase().includes(q);
    const matchBranch = !branchFilter ||
      d.fromBranchName === branchFilter || d.toBranchName === branchFilter;
    return matchSearch && matchBranch;
  });

  const branchNames = [...new Set(
    logs.flatMap(l => [l.details.fromBranchName, l.details.toBranchName]).filter(Boolean)
  )].sort();

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, branch, or user…"
            className="w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-all"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
        {branchNames.length > 0 && (
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border outline-none appearance-none min-w-[160px]"
            style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            <option value="">All Branches</option>
            {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
      </div>

      {/* Table header */}
      <div className="hidden md:grid px-5 py-3 text-xs font-semibold uppercase tracking-wider"
        style={{ gridTemplateColumns: '1fr 1fr auto auto auto', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }}>
        <span>Product</span>
        <span>Route</span>
        <span className="text-center">Qty</span>
        <span>By</span>
        <span className="text-right">When</span>
      </div>

      {loading ? (
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded" style={{ background: 'var(--bg-surface-2)' }} />
                <div className="h-3 w-56 rounded" style={{ background: 'var(--bg-surface-3)' }} />
              </div>
              <div className="h-6 w-12 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <History className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {logs.length === 0 ? 'No transfers yet' : 'No transfers match your filters'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {logs.length === 0
              ? 'Stock transfers between branches will appear here.'
              : 'Try adjusting your search or branch filter.'}
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {filtered.map(log => {
            const d = log.details;
            return (
              <div key={log._id}
                className="hidden md:grid items-center px-5 py-4 hover:bg-[var(--bg-surface-2)] transition-colors"
                style={{ gridTemplateColumns: '1fr 1fr auto auto auto', gap: '1rem' }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: '#dbeafe' }}>
                    <Package className="w-3.5 h-3.5" style={{ color: '#1d4ed8' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.productName}</p>
                    {d.notes && <p className="text-xs truncate italic" style={{ color: 'var(--text-tertiary)' }}>{d.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-lg truncate max-w-[90px]"
                    style={{ background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>
                    {d.fromBranchName}
                  </span>
                  <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-xs font-medium px-2 py-0.5 rounded-lg truncate max-w-[90px]"
                    style={{ background: '#d1fae5', color: '#065f46' }}>
                    {d.toBranchName}
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-sm font-bold px-3 py-1 rounded-full"
                    style={{ background: 'var(--primary-color)22', color: 'var(--primary-color)' }}>
                    {d.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'var(--primary-color)' }}>
                    {log.user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--text-secondary)' }}>
                    {log.user?.name ?? 'Unknown'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
          {/* Mobile */}
          {filtered.map(log => {
            const d = log.details;
            return (
              <div key={log._id + '-m'} className="md:hidden px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.productName}</p>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--primary-color)22', color: 'var(--primary-color)' }}>
                    ×{d.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{d.fromBranchName}</span>
                  <ArrowLeftRight className="w-3 h-3 flex-shrink-0" />
                  <span style={{ color: '#059669' }}>{d.toBranchName}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} transfer{filtered.length !== 1 ? 's' : ''}
            {(search || branchFilter) ? ' matching filters' : ' total'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────
function TransferModal({
  fromBranch, branches, onClose, onDone,
}: {
  fromBranch: Branch;
  branches: Branch[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [search,     setSearch]     = useState('');
  const [toBranchId, setToBranchId] = useState(branches[0]?._id ?? '');
  const [productId,  setProductId]  = useState('');
  const [quantity,   setQuantity]   = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/branches/${fromBranch._id}/inventory`);
        const data = res.ok ? await res.json() : {};
        setInventory((data.inventory ?? []).filter((i: InventoryItem) => i.stock > 0));
      } catch {
        toast.error('Failed to load inventory');
      } finally {
        setLoadingInv(false);
      }
    }
    load();
  }, [fromBranch._id]);

  const filtered = inventory.filter(item =>
    item.product.name.toLowerCase().includes(search.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = inventory.find(i => i.product._id === productId);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) { toast.error('Select a product'); return; }
    if (!toBranchId) { toast.error('Select destination branch'); return; }
    const qty = Number(quantity);
    if (!qty || qty <= 0) { toast.error('Enter valid quantity'); return; }
    if (selectedItem && qty > selectedItem.stock) {
      toast.error(`Only ${selectedItem.stock} units available`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/branches/${fromBranch._id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: qty, toBranchId, notes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      onDone();
    } catch {
      toast.error('Transfer failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--bg-surface)] rounded-2xl  w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="font-bold text-lg text-[var(--text-primary)]">Stock Transfer</h2>
            <p className="text-xs text-[var(--text-tertiary)]">From: {fromBranch.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="px-6 py-5 space-y-4">
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Destination Branch *</label>
            {branches.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No other active branches available.</p>
            ) : (
              <select
                required
                value={toBranchId}
                onChange={e => setToBranchId(e.target.value)}
                className="input-base w-full"
              >
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Product search */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Product *</label>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="input-base w-full pl-8 text-sm"
              />
            </div>
            {loadingInv ? (
              <div className="skeleton h-24 rounded-xl" />
            ) : (
              <div className="max-h-40 overflow-y-auto border border-[var(--border-subtle)] rounded-xl divide-y divide-[var(--border-subtle)]">
                {filtered.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] p-3 text-center">No products with stock</p>
                ) : (
                  filtered.map(item => (
                    <button
                      type="button"
                      key={item.product._id}
                      onClick={() => setProductId(item.product._id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface-2)] ${productId === item.product._id ? 'bg-[var(--brand-100)]' : ''}`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-[var(--text-primary)]">{item.product.name}</p>
                        <p className="text-[11px] text-[var(--text-tertiary)] font-mono">{item.product.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-[var(--text-primary)]">{item.stock}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">available</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Quantity *
              {selectedItem && (
                <span className="ml-2 font-normal text-[var(--text-tertiary)]">
                  (max: {selectedItem.stock})
                </span>
              )}
            </label>
            <input
              required
              type="number"
              min={1}
              max={selectedItem?.stock}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              className="input-base w-full"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional reason for transfer"
              className="input-base w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !productId || !toBranchId || branches.length === 0}
              className="flex-1 btn-primary py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <ArrowLeftRight className="w-4 h-4" />
              Transfer Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
