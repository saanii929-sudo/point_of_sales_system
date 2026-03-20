'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import {
  AlertTriangle, Calendar, Package, RefreshCw,
  Clock, ShieldAlert, TrendingDown, CircleDollarSign,
  CheckCircle2, ChevronRight, Tag, Hash, Layers
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

// ── Page ─────────────────────────────────────────────────────
export default function ExpiringProductsPage() {
  const [data, setData] = useState<ExpiringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('expired');

  useEffect(() => {
    fetchData();
  }, []);

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
    red:    { active: 'border-red-500 text-red-600 dark:text-red-400',    badge: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',    dot: 'bg-red-500' },
    orange: { active: 'border-orange-500 text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
    amber:  { active: 'border-amber-500 text-amber-600 dark:text-amber-400',  badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500' },
  };

  const urgencyConfig: Record<Tab, { bg: string; border: string; label: string; icon: typeof AlertTriangle }> = {
    expired: { bg: 'bg-red-50 dark:bg-red-950/20',    border: 'border-red-200 dark:border-red-900/50',    label: 'Expired',        icon: ShieldAlert },
    soon:    { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900/50', label: 'Expiring Soon',   icon: AlertTriangle },
    month:   { bg: 'bg-amber-50 dark:bg-amber-950/20',  border: 'border-amber-200 dark:border-amber-900/50',  label: 'Expiring Soon',   icon: Clock },
  };

  const dayBadgeStyle = (days: number) => {
    if (days < 0)  return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50';
    if (days <= 7) return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50';
    return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
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
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Value at Risk</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 leading-none">
                <span className="text-lg font-semibold">GH₵</span>
                {valueAtRisk >= 1000 ? `${(valueAtRisk / 1000).toFixed(1)}k` : valueAtRisk.toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Expired</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 leading-none">{data.expired.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 leading-none">{data.expiringSoon.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
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

        {/* Tab subtitle */}
        {(() => {
          const tab = tabs.find((t) => t.key === activeTab)!;
          const UrgIcon = urgencyConfig[activeTab].icon;
          return (
            <div className={`px-5 py-2.5 flex items-center gap-2 ${urgencyConfig[activeTab].bg} border-b ${urgencyConfig[activeTab].border}`}>
              <UrgIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="font-semibold">{tab.urgency}</span>
                {activeTab === 'expired' && ' — Remove from shelves immediately to avoid customer harm'}
                {activeTab === 'soon' && ' — Prioritize selling or discounting these items'}
                {activeTab === 'month' && ' — Plan promotions or stock adjustments ahead of expiry'}
              </p>
            </div>
          );
        })()}

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
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          Action required — remove {product.stock} unit{product.stock > 1 ? 's' : ''} from inventory
                        </div>
                      )}
                    </div>

                    {/* Right side: stock value + days badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
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
    </div>
  );
}
