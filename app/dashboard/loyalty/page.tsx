'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Star, Users, Gift, TrendingUp, Search, X,
  Plus, Edit, Trash2, Crown, Award, ChevronDown, Loader2,
  Coins, Sparkles, Settings,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LoyaltyMember {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  visitCount: number;
  lastActivity?: string;
}

interface LoyaltyReward {
  _id: string;
  name: string;
  description: string;
  pointsCost: number;
  value: number;
  isActive: boolean;
}

interface LoyaltySettings {
  pointsPerCedi: number;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTier(points: number, settings: LoyaltySettings) {
  if (points >= settings.platinumThreshold) return { label: 'Platinum', color: '#94a3b8', bg: '#f1f5f9', text: '#334155', icon: Crown };
  if (points >= settings.goldThreshold)     return { label: 'Gold',     color: '#f59e0b', bg: '#fffbeb', text: '#92400e', icon: Crown };
  if (points >= settings.silverThreshold)   return { label: 'Silver',   color: '#64748b', bg: '#f8fafc', text: '#475569', icon: Star  };
  return                                           { label: 'Bronze',   color: '#b45309', bg: '#fff7ed', text: '#92400e', icon: Award };
}

const AVATAR_COLORS = [
  ['#10b981','#059669'],['#3b82f6','#2563eb'],['#8b5cf6','#7c3aed'],
  ['#f59e0b','#d97706'],['#ec4899','#db2777'],['#06b6d4','#0891b2'],
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const DEFAULT_SETTINGS: LoyaltySettings = {
  pointsPerCedi: 1,
  bronzeThreshold: 0,
  silverThreshold: 500,
  goldThreshold: 2000,
  platinumThreshold: 5000,
};

// ── Input style ───────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 rounded-xl border text-sm transition-all outline-none ' +
  'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] ' +
  'focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 ' +
  'placeholder:text-[var(--text-tertiary)]';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b animate-pulse" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded" style={{ background: 'var(--bg-surface-2)' }} />
        <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-surface-3)' }} />
      </div>
      <div className="h-6 w-16 rounded-full" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="h-5 w-14 rounded" style={{ background: 'var(--bg-surface-2)' }} />
      <div className="h-5 w-14 rounded" style={{ background: 'var(--bg-surface-2)' }} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
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

// ── Reward Modal ──────────────────────────────────────────────────────────────
function RewardModal({ reward, onClose, onSave }: {
  reward?: LoyaltyReward;
  onClose: () => void;
  onSave: (data: Partial<LoyaltyReward>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: reward?.name ?? '',
    description: reward?.description ?? '',
    pointsCost: reward?.pointsCost ?? 500,
    value: reward?.value ?? 5,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-color)22' }}>
              <Gift className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{reward ? 'Edit Reward' : 'Add Reward'}</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Define what customers can redeem</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reward Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. GH₵5 Discount Voucher" className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What the customer receives" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Points Cost <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="number" min={1} value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: +e.target.value }))} className={inputCls} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Value (GH₵) <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="number" min={0} step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: +e.target.value }))} className={inputCls} required />
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
              Customers need <strong style={{ color: 'var(--text-primary)' }}>{form.pointsCost} points</strong> to redeem <strong style={{ color: 'var(--primary-color)' }}>GH₵{form.value.toFixed(2)}</strong> in value.
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--primary-color)' }}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Gift className="w-4 h-4" /> {reward ? 'Save Changes' : 'Add Reward'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ settings, onClose, onSave }: {
  settings: LoyaltySettings;
  onClose: () => void;
  onSave: (s: LoyaltySettings) => void;
}) {
  const [form, setForm] = useState(settings);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b22' }}>
              <Settings className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Program Settings</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Configure tiers and earning rates</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Points earned per GH₵1 spent</label>
            <input type="number" min={0.1} step={0.1} value={form.pointsPerCedi} onChange={e => setForm(f => ({ ...f, pointsPerCedi: +e.target.value }))} className={inputCls} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Tier Thresholds (points)</p>
          {(['silver', 'gold', 'platinum'] as const).map(tier => (
            <div key={tier}>
              <label className="block text-sm font-medium mb-1.5 capitalize" style={{ color: 'var(--text-secondary)' }}>{tier}</label>
              <input type="number" min={0} value={form[`${tier}Threshold` as keyof LoyaltySettings] as number}
                onChange={e => setForm(f => ({ ...f, [`${tier}Threshold`]: +e.target.value }))} className={inputCls} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary-color)' }}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LoyaltyPage() {
  const [members, setMembers]     = useState<LoyaltyMember[]>([]);
  const [rewards, setRewards]     = useState<LoyaltyReward[]>([]);
  const [settings, setSettings]   = useState<LoyaltySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'rewards'>('members');
  const [search, setSearch]       = useState('');
  const [rewardModal, setRewardModal] = useState<LoyaltyReward | null | 'new'>(null);
  const [settingsModal, setSettingsModal] = useState(false);

  useEffect(() => { document.title = 'Loyalty Program | SmartVendr'; }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch customers as proxy for loyalty members
        const res = await fetch('/api/customers');
        if (res.ok) {
          const data = await res.json();
          // Map customers to loyalty members (points = visitCount * 10 as approximation)
          const mapped: LoyaltyMember[] = (data.customers || []).map((c: LoyaltyMember & { visitCount: number; lifetimeValue: number }) => ({
            ...c,
            points: Math.round(c.lifetimeValue * settings.pointsPerCedi),
            totalEarned: Math.round(c.lifetimeValue * settings.pointsPerCedi),
            totalRedeemed: 0,
          }));
          setMembers(mapped);
        }
      } catch {
        toast.error('Something went wrong loading loyalty data — please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mock rewards
  useEffect(() => {
    setRewards([
      { _id: '1', name: 'GH₵5 Discount',  description: 'GH₵5 off your next purchase', pointsCost: 500,  value: 5,  isActive: true },
      { _id: '2', name: 'GH₵10 Voucher',  description: 'GH₵10 off any purchase',       pointsCost: 1000, value: 10, isActive: true },
      { _id: '3', name: 'Free Delivery',  description: 'Free delivery on next order',   pointsCost: 750,  value: 8,  isActive: true },
    ]);
  }, []);

  const stats = useMemo(() => {
    const totalPoints = members.reduce((s, m) => s + m.points, 0);
    const totalRedeemed = members.reduce((s, m) => s + m.totalRedeemed, 0);
    const active = members.filter(m => m.points > 0).length;
    return { total: members.length, totalPoints, totalRedeemed, active };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m =>
      !q || m.name.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q)
    ).sort((a, b) => b.points - a.points);
  }, [members, search]);

  const handleSaveReward = async (data: Partial<LoyaltyReward>) => {
    if (rewardModal === 'new') {
      const newReward: LoyaltyReward = { _id: Date.now().toString(), isActive: true, name: data.name || '', description: data.description || '', pointsCost: data.pointsCost || 500, value: data.value || 5 };
      setRewards(r => [...r, newReward]);
      toast.success('Reward added successfully!');
    } else if (rewardModal) {
      setRewards(r => r.map(rw => rw._id === rewardModal._id ? { ...rw, ...data } : rw));
      toast.success('Reward updated!');
    }
    setRewardModal(null);
  };

  const deleteReward = (id: string) => {
    setRewards(r => r.filter(rw => rw._id !== id));
    toast.success('Reward removed.');
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Loyalty Program</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Reward your best customers and drive repeat purchases</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <Settings className="w-4 h-4" />
            Program Settings
          </button>
          {activeTab === 'rewards' && (
            <button
              onClick={() => setRewardModal('new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--primary-color)' }}
            >
              <Plus className="w-4 h-4" />
              Add Reward
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members"    value={stats.total}       icon={Users}    color="#10b981" sub="enrolled customers" />
        <StatCard label="Active Members"   value={stats.active}      icon={Sparkles} color="#3b82f6" sub="with points balance" />
        <StatCard label="Points Issued"    value={stats.totalPoints.toLocaleString()} icon={Coins} color="#8b5cf6" sub="across all members" />
        <StatCard label="Points Redeemed"  value={stats.totalRedeemed.toLocaleString()} icon={Gift} color="#f59e0b" sub="total redemptions" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-surface-2)' }}>
        {(['members', 'rewards'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={activeTab === tab
              ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
              : { color: 'var(--text-secondary)' }}
          >
            {tab === 'members' ? `Members (${stats.total})` : `Rewards (${rewards.length})`}
          </button>
        ))}
      </div>

      {/* ── Members Tab ── */}
      {activeTab === 'members' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          {/* Search */}
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
                className="w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-all"
                style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>

          {/* Table header */}
          <div className="hidden md:grid px-5 py-3" style={{ gridTemplateColumns: '1fr auto auto auto auto', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
            {['Member', 'Tier', 'Points Balance', 'Total Earned', 'Last Activity'].map(h => (
              <p key={h} className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div>{[0,1,2,3,4].map(i => <SkeletonRow key={i} />)}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No members yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Customers automatically join when they make their first purchase.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredMembers.map(member => {
                const tier = getTier(member.points, settings);
                const TierIcon = tier.icon;
                const [g1, g2] = avatarGrad(member.name);
                return (
                  <div key={member._id} className="hidden md:grid items-center px-5 py-4 hover:bg-[var(--bg-surface-2)] transition-colors"
                    style={{ gridTemplateColumns: '1fr auto auto auto auto', gap: '1rem' }}>
                    {/* Member */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                        {initials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{member.phone || member.email || '—'}</p>
                      </div>
                    </div>
                    {/* Tier */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                      style={{ background: tier.bg, color: tier.text }}>
                      <TierIcon className="w-3 h-3" />
                      {tier.label}
                    </span>
                    {/* Points */}
                    <p className="text-sm font-bold tabular-nums text-right" style={{ color: 'var(--primary-color)' }}>{member.points.toLocaleString()} pts</p>
                    {/* Earned */}
                    <p className="text-sm font-medium tabular-nums text-right" style={{ color: 'var(--text-secondary)' }}>{member.totalEarned.toLocaleString()}</p>
                    {/* Last activity */}
                    <p className="text-xs text-right" style={{ color: 'var(--text-tertiary)' }}>
                      {member.lastActivity ? formatDistanceToNow(new Date(member.lastActivity), { addSuffix: true }) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile cards */}
          {!loading && (
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredMembers.map(member => {
                const tier = getTier(member.points, settings);
                const TierIcon = tier.icon;
                const [g1, g2] = avatarGrad(member.name);
                return (
                  <div key={member._id + '-m'} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      {initials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: tier.text }}><TierIcon className="w-3 h-3" />{tier.label}</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>{member.points.toLocaleString()} pts</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Rewards Tab ── */}
      {activeTab === 'rewards' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => (
            <div key={reward._id} className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary-color)22' }}>
                  <Gift className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={reward.isActive ? { background: '#dcfce7', color: '#15803d' } : { background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)' }}>
                  {reward.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{reward.name}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{reward.description}</p>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>{reward.pointsCost.toLocaleString()} pts</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>≈ {fmt(reward.value)} value</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRewardModal(reward)} className="p-2 rounded-lg hover:opacity-80 transition-all" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteReward(reward._id)} className="p-2 rounded-lg hover:opacity-80 transition-all" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add reward card */}
          <button
            onClick={() => setRewardModal('new')}
            className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 border-2 border-dashed transition-all hover:opacity-80 min-h-[180px]"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-surface-2)' }}>
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">Add a new reward</p>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {(rewardModal === 'new' || (rewardModal && rewardModal !== 'new')) && (
        <RewardModal
          reward={rewardModal !== 'new' ? rewardModal as LoyaltyReward : undefined}
          onClose={() => setRewardModal(null)}
          onSave={handleSaveReward}
        />
      )}
      {settingsModal && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModal(false)}
          onSave={(s) => { setSettings(s); toast.success('Loyalty settings updated!'); }}
        />
      )}
    </div>
  );
}
