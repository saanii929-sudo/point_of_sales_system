'use client';

import { useEffect, useRef, useState } from 'react';
import { GitBranch, ChevronDown, Check, Loader2, Building2, Lock } from 'lucide-react';
import { useBranchStore, BranchOption } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';

export function BranchSelector({ collapsed }: { collapsed?: boolean }) {
  const { user }                                                              = useAuthStore();
  const { selectedBranchId, selectedBranchName, branches, setBranch, setBranches } = useBranchStore();

  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef           = useRef<HTMLDivElement>(null);

  const isOwner    = user?.role === 'business_owner';
  // Employees are locked to their assigned branch
  const isEmployee = ['cashier', 'manager', 'inventory_staff'].includes(user?.role ?? '');

  // ── Fetch branches on mount ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const res  = await fetch('/api/branches');
        const data = res.ok ? await res.json() : {};
        const list: BranchOption[] = (data.branches ?? []).map((b: any) => ({
          _id:      b._id,
          name:     b.name,
          code:     b.code,
          address:  b.address,
          isActive: b.isActive,
        }));
        setBranches(list);

        if (isEmployee && user?.branchId) {
          // Lock employee to their assigned branch
          const assigned = list.find(b => b._id === user.branchId);
          if (assigned) {
            setBranch(assigned._id, assigned.name);
          }
        } else if (isOwner) {
          // Only auto-select if there's no valid selection already stored
          // (don't override if user deliberately cleared to "All Branches")
          const stillValid = list.find(b => b._id === selectedBranchId && b.isActive);
          if (!stillValid && selectedBranchId !== null) {
            // selectedBranchId is stale (branch deleted/deactivated) — reset to first active
            const first = list.find(b => b.isActive);
            if (first) setBranch(first._id, first.name);
          }
          // If selectedBranchId is null, user wants "All Branches" — leave it
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Close dropdown on outside click ─────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Don't render until branches are known
  if (!branches.length && !loading) return null;

  const activeBranches = branches.filter(b => b.isActive);

  // ── Collapsed sidebar: icon only ────────────────────────
  if (collapsed) {
    return (
      <div className="px-2 mb-2">
        <div
          title={selectedBranchName ?? 'Branch'}
          className="w-full flex items-center justify-center p-2 rounded-xl bg-[var(--bg-surface-2)]"
        >
          {loading
            ? <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin" />
            : <Building2 className="w-4 h-4 text-[var(--text-secondary)]" />}
        </div>
      </div>
    );
  }

  // ── Employee view: locked, no switching ──────────────────
  if (isEmployee) {
    return (
      <div className="px-2 mb-3">
        <p className="section-label mb-1">Branch</p>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
          {loading ? (
            <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin flex-shrink-0" />
          ) : (
            <Building2 className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
          )}
          <span className="flex-1 text-xs font-semibold text-[var(--text-primary)] truncate">
            {selectedBranchName ?? (loading ? 'Loading…' : 'No branch assigned')}
          </span>
          <Lock className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
        </div>
      </div>
    );
  }

  // ── Owner view: full dropdown ────────────────────────────
  return (
    <div className="px-2 mb-3 relative" ref={dropdownRef}>
      <p className="section-label mb-1">Branch</p>

      <button
        onClick={() => activeBranches.length > 0 && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left
          bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] transition-colors
          ${activeBranches.length > 0 ? 'hover:bg-[var(--bg-surface-3)] cursor-pointer' : 'cursor-default opacity-60'}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 text-[var(--text-tertiary)] animate-spin flex-shrink-0" />
        ) : (
          <Building2 className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
        )}
        <span className="flex-1 text-xs font-semibold text-[var(--text-primary)] truncate">
          {selectedBranchName ?? (loading ? 'Loading…' : 'All Branches')}
        </span>
        {activeBranches.length > 0 && (
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-elevated)] overflow-hidden">
          <div className="py-1 max-h-52 overflow-y-auto">
            {/* All Branches option */}
            <button
              onClick={() => { setBranch(null, null); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                ${selectedBranchId === null ? 'bg-[var(--brand-50)]' : 'hover:bg-[var(--bg-surface-2)]'}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                ${selectedBranchId === null ? 'bg-[var(--primary-color)]' : 'bg-[var(--bg-surface-3)]'}`}>
                <GitBranch className={`w-3.5 h-3.5 ${selectedBranchId === null ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${selectedBranchId === null ? 'text-[var(--primary-color)]' : 'text-[var(--text-primary)]'}`}>
                  All Branches
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] truncate">Combined view</p>
              </div>
              {selectedBranchId === null && <Check className="w-3.5 h-3.5 text-[var(--primary-color)] flex-shrink-0" />}
            </button>
            <div className="mx-3 my-1 border-t border-[var(--border-subtle)]" />
            {activeBranches.map(branch => {
              const isSelected = branch._id === selectedBranchId;
              return (
                <button
                  key={branch._id}
                  onClick={() => { setBranch(branch._id, branch.name); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                    ${isSelected ? 'bg-[var(--brand-50)]' : 'hover:bg-[var(--bg-surface-2)]'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-[var(--primary-color)]' : 'bg-[var(--bg-surface-3)]'}`}>
                    <GitBranch className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[var(--text-tertiary)]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--primary-color)]' : 'text-[var(--text-primary)]'}`}>
                      {branch.name}
                    </p>
                    {branch.address && (
                      <p className="text-[11px] text-[var(--text-tertiary)] truncate">{branch.address}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--primary-color)] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {activeBranches.length > 1 && (
            <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-tertiary)]">{activeBranches.length} active branches</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
