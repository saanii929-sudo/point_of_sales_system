'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  Wallet, Check, CreditCard, Search, Plus, X, ChevronDown, ChevronUp,
  Users, Clock, BadgeCheck, Banknote, TrendingUp, Calendar, User,
  Trash2, AlertCircle, Building2, Loader2, RefreshCw, Gift, Timer
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Payroll {
  _id: string;
  employeeId: { _id: string; name: string; email: string };
  period: { month: number; year: number };
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  bonus: number;
  overtime: { hours: number; rate: number };
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'pending' | 'approved' | 'paid';
  paidDate?: string;
  paidBy?: { name: string };
}

interface Employee {
  _id: string;
  name: string;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:  { label: 'Pending',  bg: 'var(--amber-50,#fffbeb)',  text: '#b45309', dot: '#f59e0b' },
  approved: { label: 'Approved', bg: 'var(--blue-50,#eff6ff)',   text: '#1d4ed8', dot: '#3b82f6' },
  paid:     { label: 'Paid',     bg: 'var(--green-50,#f0fdf4)',  text: '#15803d', dot: '#22c55e' },
};

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

const emptyForm = {
  employeeId: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  basicSalary: '',
  allowances: [{ name: '', amount: 0 }],
  deductions: [{ name: '', amount: 0 }],
  bonus: 0,
  overtimeHours: 0,
  overtimeRate: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmt(n: number) {
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function KpiCard({
  label, value, prefix = '', sub, icon: Icon, color,
}: {
  label: string; value: string | number; prefix?: string; sub?: string;
  icon: React.ElementType; color: string;
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
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {prefix}{typeof value === 'number' ? fmt(value) : value}
        </p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded w-40" style={{ background: 'var(--bg-surface-2)' }} />
          <div className="h-3 rounded w-24" style={{ background: 'var(--bg-surface-3)' }} />
        </div>
        <div className="hidden md:flex gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-24 space-y-1.5">
              <div className="h-3 rounded" style={{ background: 'var(--bg-surface-3)' }} />
              <div className="h-4 rounded" style={{ background: 'var(--bg-surface-2)' }} />
            </div>
          ))}
        </div>
        <div className="w-16 h-7 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => { fetchPayrolls(); fetchEmployees(); }, [filterStatus, filterMonth, filterYear]);

  const fetchPayrolls = async () => {
    setIsFetching(true);
    try {
      let url = '/api/payroll?';
      if (filterStatus !== 'all') url += `status=${filterStatus}&`;
      url += `month=${filterMonth}&year=${filterYear}`;
      const { data } = await fetchWithOfflineFallback(url);
      setPayrolls(data.payrolls || []);
    } catch {
      toast.error('Failed to load payrolls');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/employees');
      setEmployees(data.employees || []);
    } catch {
      console.error('Failed to load employees');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          period: { month: formData.month, year: formData.year },
          basicSalary: parseFloat(formData.basicSalary),
          allowances: formData.allowances.filter(a => a.name && a.amount > 0),
          deductions: formData.deductions.filter(d => d.name && d.amount > 0),
          bonus: formData.bonus,
          overtime: { hours: formData.overtimeHours, rate: formData.overtimeRate }
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      toast.success('Payroll generated successfully');
      setIsModalOpen(false);
      setFormData(emptyForm);
      fetchPayrolls();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (payrollId: string, action: string) => {
    try {
      const res = await fetch(`/api/payroll/${payrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error('Action failed');
      toast.success(`Payroll ${action === 'pay' ? 'marked as paid' : action + 'd'} successfully`);
      fetchPayrolls();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending  = payrolls.filter(p => p.status === 'pending');
    const approved = payrolls.filter(p => p.status === 'approved');
    const paid     = payrolls.filter(p => p.status === 'paid');
    const totalCost = payrolls.reduce((s, p) => s + p.netSalary, 0);
    return {
      total: payrolls.length,
      totalCost,
      pendingCount: pending.length,
      pendingCost: pending.reduce((s, p) => s + p.netSalary, 0),
      approvedCount: approved.length,
      approvedCost: approved.reduce((s, p) => s + p.netSalary, 0),
      paidCount: paid.length,
      paidCost: paid.reduce((s, p) => s + p.netSalary, 0),
    };
  }, [payrolls]);

  // ── Live salary preview ────────────────────────────────────────────────────
  const liveNet = useMemo(() => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const allowTotal = formData.allowances.reduce((s, a) => s + (a.amount || 0), 0);
    const dedTotal   = formData.deductions.reduce((s, d) => s + (d.amount || 0), 0);
    const overtime   = (formData.overtimeHours || 0) * (formData.overtimeRate || 0);
    const gross = basic + allowTotal + (formData.bonus || 0) + overtime;
    return { gross, net: gross - dedTotal, allowTotal, dedTotal };
  }, [formData]);

  const periodLabel = `${MONTHS[filterMonth - 1]} ${filterYear}`;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Payroll Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {periodLabel} · {payrolls.length} records
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary-color)', boxShadow: '0 2px 8px var(--primary-color)44' }}
        >
          <Plus className="w-4 h-4" />
          Generate Payroll
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Payroll"   value={stats.totalCost}    prefix="GH₵" sub={`${stats.total} records`}           icon={Wallet}    color="#10b981" />
        <KpiCard label="Pending Review"  value={stats.pendingCost}  prefix="GH₵" sub={`${stats.pendingCount} employees`}   icon={Clock}     color="#f59e0b" />
        <KpiCard label="Awaiting Payment" value={stats.approvedCost} prefix="GH₵" sub={`${stats.approvedCount} approved`}   icon={BadgeCheck} color="#3b82f6" />
        <KpiCard label="Disbursed"       value={stats.paidCost}     prefix="GH₵" sub={`${stats.paidCount} paid`}           icon={Banknote}  color="#8b5cf6" />
      </div>

      {/* ── Filters ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex flex-wrap items-end gap-3">
          {/* Status pills */}
          <div className="flex items-center gap-2">
            {['all', 'pending', 'approved', 'paid'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize"
                style={
                  filterStatus === s
                    ? { background: 'var(--primary-color)', color: '#fff' }
                    : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }
                }
              >
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-xl text-sm border outline-none transition-all"
              style={{
                background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-xl text-sm border outline-none transition-all"
              style={{
                background: 'var(--bg-surface-2)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={fetchPayrolls}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Payroll List ── */}
      <div className="space-y-3">
        {isFetching ? (
          [1, 2, 3].map(i => <SkeletonRow key={i} />)
        ) : payrolls.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--bg-surface-2)' }}
            >
              <Wallet className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No payroll records</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {filterStatus !== 'all' ? `No ${filterStatus} payrolls for ${periodLabel}` : `Generate payroll for ${periodLabel}`}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary-color)' }}
            >
              <Plus className="w-4 h-4" /> Generate Payroll
            </button>
          </div>
        ) : (
          payrolls.map(payroll => {
            const av = avatarColor(payroll.employeeId.name);
            const isExpanded = expandedId === payroll._id;
            const overtimePay = (payroll.overtime?.hours || 0) * (payroll.overtime?.rate || 0);
            return (
              <div
                key={payroll._id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
              >
                {/* Row header */}
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold"
                    style={{ background: av.bg, color: av.text }}
                  >
                    {payroll.employeeId.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + period */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {payroll.employeeId.name}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {payroll.employeeId.email}
                    </p>
                  </div>

                  {/* Period badge */}
                  <span
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                  >
                    <Calendar className="w-3 h-3" />
                    {MONTHS[payroll.period.month - 1].slice(0, 3)} {payroll.period.year}
                  </span>

                  {/* Salary columns */}
                  <div className="hidden md:flex gap-6 text-right">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Basic</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GH₵{fmt(payroll.basicSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gross</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>GH₵{fmt(payroll.grossSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Net Pay</p>
                      <p className="text-sm font-bold" style={{ color: '#10b981' }}>GH₵{fmt(payroll.netSalary)}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <StatusBadge status={payroll.status} />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {payroll.status === 'pending' && (
                      <button
                        onClick={() => handleAction(payroll._id, 'approve')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: '#eff6ff', color: '#1d4ed8' }}
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {payroll.status === 'approved' && (
                      <button
                        onClick={() => handleAction(payroll._id, 'pay')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: '#f0fdf4', color: '#15803d' }}
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}
                    {payroll.status === 'paid' && payroll.paidDate && (
                      <span className="text-xs hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
                        Paid {new Date(payroll.paidDate).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : payroll._id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                      style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable breakdown */}
                {isExpanded && (
                  <div
                    className="border-t px-5 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface-2)' }}
                  >
                    {/* Earnings */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>Earnings</p>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Basic Salary</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>GH₵{fmt(payroll.basicSalary)}</span>
                      </div>
                      {payroll.allowances.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                          <span className="font-medium" style={{ color: '#10b981' }}>+GH₵{fmt(a.amount)}</span>
                        </div>
                      ))}
                      {payroll.bonus > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Bonus</span>
                          <span className="font-medium" style={{ color: '#10b981' }}>+GH₵{fmt(payroll.bonus)}</span>
                        </div>
                      )}
                      {overtimePay > 0 && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Overtime ({payroll.overtime.hours}h)</span>
                          <span className="font-medium" style={{ color: '#10b981' }}>+GH₵{fmt(overtimePay)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t pt-2 font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Gross Salary</span>
                        <span style={{ color: 'var(--text-primary)' }}>GH₵{fmt(payroll.grossSalary)}</span>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>Deductions</p>
                      {payroll.deductions.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No deductions</p>
                      ) : (
                        payroll.deductions.map((d, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                            <span className="font-medium" style={{ color: '#ef4444' }}>-GH₵{fmt(d.amount)}</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between text-sm border-t pt-2 font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>Total Deducted</span>
                        <span style={{ color: '#ef4444' }}>-GH₵{fmt(payroll.totalDeductions)}</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="sm:col-span-2 lg:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>Summary</p>
                      <div
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                      >
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Gross Salary</span>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>GH₵{fmt(payroll.grossSalary)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Total Deductions</span>
                          <span className="font-medium" style={{ color: '#ef4444' }}>-GH₵{fmt(payroll.totalDeductions)}</span>
                        </div>
                        <div
                          className="flex justify-between text-base font-bold border-t pt-3"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <span style={{ color: 'var(--text-primary)' }}>Net Pay</span>
                          <span style={{ color: '#10b981' }}>GH₵{fmt(payroll.netSalary)}</span>
                        </div>
                        {payroll.status === 'paid' && payroll.paidBy && (
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Processed by {payroll.paidBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Generate Payroll Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div
            className="w-full max-w-2xl my-8 rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-floating)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-color)22' }}>
                  <Wallet className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Generate Payroll</h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create a new payroll record</p>
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

            <form id="payroll-form" onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

                {/* Section 1: Employee & Period */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Employee & Period
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Employee <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={formData.employeeId}
                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                        className={inputCls}
                        required
                      >
                        <option value="">Select employee…</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.name} — {emp.email}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Month <span style={{ color: '#ef4444' }}>*</span></label>
                        <select value={formData.month} onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })} className={inputCls} required>
                          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Year <span style={{ color: '#ef4444' }}>*</span></label>
                        <select value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className={inputCls} required>
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Compensation */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Compensation
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Basic Salary (GH₵) <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        value={formData.basicSalary}
                        onChange={e => setFormData({ ...formData, basicSalary: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </div>

                    {/* Allowances */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Allowances</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, allowances: [...formData.allowances, { name: '', amount: 0 }] })}
                          className="text-xs font-semibold flex items-center gap-1"
                          style={{ color: 'var(--primary-color)' }}
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.allowances.map((al, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text" placeholder="Name (e.g. Transport)"
                              value={al.name}
                              onChange={e => {
                                const a = [...formData.allowances];
                                a[i] = { ...a[i], name: e.target.value };
                                setFormData({ ...formData, allowances: a });
                              }}
                              className={inputCls + ' flex-1'}
                            />
                            <input
                              type="number" step="0.01" placeholder="Amount"
                              value={al.amount || ''}
                              onChange={e => {
                                const a = [...formData.allowances];
                                a[i] = { ...a[i], amount: parseFloat(e.target.value) || 0 };
                                setFormData({ ...formData, allowances: a });
                              }}
                              className={inputCls + ' w-28'}
                            />
                            {formData.allowances.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, allowances: formData.allowances.filter((_, idx) => idx !== i) })}
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: '#fef2f2', color: '#ef4444' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Deductions</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, deductions: [...formData.deductions, { name: '', amount: 0 }] })}
                          className="text-xs font-semibold flex items-center gap-1"
                          style={{ color: '#ef4444' }}
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.deductions.map((d, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="text" placeholder="Name (e.g. Tax, SSNIT)"
                              value={d.name}
                              onChange={e => {
                                const arr = [...formData.deductions];
                                arr[i] = { ...arr[i], name: e.target.value };
                                setFormData({ ...formData, deductions: arr });
                              }}
                              className={inputCls + ' flex-1'}
                            />
                            <input
                              type="number" step="0.01" placeholder="Amount"
                              value={d.amount || ''}
                              onChange={e => {
                                const arr = [...formData.deductions];
                                arr[i] = { ...arr[i], amount: parseFloat(e.target.value) || 0 };
                                setFormData({ ...formData, deductions: arr });
                              }}
                              className={inputCls + ' w-28'}
                            />
                            {formData.deductions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, deductions: formData.deductions.filter((_, idx) => idx !== i) })}
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: '#fef2f2', color: '#ef4444' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bonus & Overtime */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bonus (GH₵)</label>
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={formData.bonus || ''}
                          onChange={e => setFormData({ ...formData, bonus: parseFloat(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Overtime Hrs</label>
                        <input
                          type="number" step="0.5" placeholder="0"
                          value={formData.overtimeHours || ''}
                          onChange={e => setFormData({ ...formData, overtimeHours: parseFloat(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Rate / Hr</label>
                        <input
                          type="number" step="0.01" placeholder="0.00"
                          value={formData.overtimeRate || ''}
                          onChange={e => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Summary */}
                {(parseFloat(formData.basicSalary) > 0) && (
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Pay Preview</p>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Basic + Extras</span>
                      <span style={{ color: 'var(--text-primary)' }}>GH₵{fmt(liveNet.gross)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>Deductions</span>
                      <span style={{ color: '#ef4444' }}>-GH₵{fmt(liveNet.dedTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Net Pay</span>
                      <span style={{ color: '#10b981' }}>GH₵{fmt(liveNet.net)}</span>
                    </div>
                  </div>
                )}
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
                  form="payroll-form"
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--primary-color)' }}
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : 'Generate Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
