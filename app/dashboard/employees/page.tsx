'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Search, X, Mail, Phone, Shield, Briefcase,
  UserCheck, UserX, Loader2, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  business_owner: { label: 'Owner',           bg: '#fef9c3', text: '#854d0e', icon: Shield    },
  manager:        { label: 'Manager',         bg: '#ede9fe', text: '#6d28d9', icon: Briefcase },
  cashier:        { label: 'Cashier',         bg: '#dcfce7', text: '#166534', icon: UserCheck },
  inventory_staff:{ label: 'Inventory Staff', bg: '#dbeafe', text: '#1e40af', icon: Briefcase },
};

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#cffafe', text: '#0e7490' },
  { bg: '#fef9c3', text: '#a16207' },
  { bg: '#f1f5f9', text: '#475569' },
];

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

const emptyForm = { name: '', email: '', password: '', role: 'cashier', phone: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role.replace('_', ' '), bg: 'var(--bg-surface-2)', text: 'var(--text-secondary)', icon: UserCheck };
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number; sub?: string; icon: React.ElementType; color: string;
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
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 rounded w-32" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-3 rounded w-44" style={{ background: 'var(--bg-surface-3)' }} />
          <div className="h-5 rounded-full w-20 mt-1" style={{ background: 'var(--bg-surface-2)' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formData, setFormData] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success('Employee added successfully');
      setIsModalOpen(false);
      setFormData(emptyForm);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     employees.length,
    active:    employees.filter(e => e.isActive !== false).length,
    managers:  employees.filter(e => e.role === 'manager').length,
    cashiers:  employees.filter(e => e.role === 'cashier').length,
  }), [employees]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      const matchSearch = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      const matchRole   = roleFilter === 'all' || e.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [employees, search, roleFilter]);

  const roles = useMemo(() => {
    const seen = new Set<string>();
    employees.forEach(e => seen.add(e.role));
    return Array.from(seen);
  }, [employees]);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Team Members
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {employees.length} {employees.length === 1 ? 'person' : 'people'} on your team
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary-color)', boxShadow: '0 2px 8px var(--primary-color)44' }}
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Team"   value={stats.total}    sub="all roles"            icon={Users}     color="#10b981" />
        <KpiCard label="Active"       value={stats.active}   sub="currently active"     icon={UserCheck} color="#3b82f6" />
        <KpiCard label="Managers"     value={stats.managers} sub="supervisory roles"    icon={Briefcase} color="#8b5cf6" />
        <KpiCard label="Cashiers"     value={stats.cashiers} sub="front desk"           icon={Shield}    color="#f59e0b" />
      </div>

      {/* ── Search & Filter ── */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none transition-all"
            style={{
              background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>

        {/* Role filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {['all', ...roles].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
              style={
                roleFilter === r
                  ? { background: 'var(--primary-color)', color: '#fff' }
                  : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }
              }
            >
              {r === 'all' ? 'All Roles' : (ROLE_CONFIG[r]?.label ?? r.replace('_', ' '))}
            </button>
          ))}
        </div>

        {/* Result count */}
        {(search || roleFilter !== 'all') && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Employee Grid ── */}
      {isFetching ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl py-16 text-center"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-surface-2)' }}
          >
            <Users className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
            {search || roleFilter !== 'all' ? 'No results found' : 'No team members yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {search || roleFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Add your first employee to get started'}
          </p>
          {!search && roleFilter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary-color)' }}
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(employee => {
            const av = avatarColor(employee.name);
            const isActive = employee.isActive !== false;
            return (
              <div
                key={employee._id}
                className="rounded-2xl p-5 transition-all hover:shadow-md group"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Top row: avatar + status */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: av.bg, color: av.text }}
                  >
                    {initials(employee.name)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={
                      isActive
                        ? { background: '#dcfce7', color: '#15803d' }
                        : { background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#22c55e' : 'var(--text-tertiary)' }} />
                    {isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Name + role */}
                <div className="mb-3">
                  <p className="font-bold text-base leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                    {employee.name}
                  </p>
                  <RoleBadge role={employee.role} />
                </div>

                {/* Contact info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-xs truncate hover:underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {employee.email}
                    </a>
                  </div>
                  {employee.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <a
                        href={`tel:${employee.phone}`}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {employee.phone}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No phone on file</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Employee Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-color)22' }}>
                  <UserPlus className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Add New Employee</h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create a team member account</p>
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setFormData(emptyForm); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="employee-form" onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">

                {/* Section: Personal */}
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                  Personal Details
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Ama Owusu"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+233 XX XXX XXXX"
                    className={inputCls}
                  />
                </div>

                {/* Section: Account */}
                <p className="text-xs font-semibold uppercase tracking-wide pt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Account Credentials
                </p>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    placeholder="employee@company.com"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className={inputCls + ' pr-20'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                      style={{ color: 'var(--primary-color)' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}
                      className={inputCls + ' appearance-none pr-9'}
                      required
                    >
                      <option value="cashier">Cashier</option>
                      <option value="inventory_staff">Inventory Staff</option>
                      <option value="manager">Manager</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  {/* Role description */}
                  {formData.role && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                      {formData.role === 'cashier'         && 'Can process sales, view products, and manage the POS.'}
                      {formData.role === 'inventory_staff' && 'Can manage products, stock levels, and view inventory reports.'}
                      {formData.role === 'manager'         && 'Full access except business settings and billing.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div
                className="flex gap-3 px-6 py-4"
                style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
              >
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormData(emptyForm); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="employee-form"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--primary-color)' }}
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    : <><UserPlus className="w-4 h-4" /> Add Employee</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
