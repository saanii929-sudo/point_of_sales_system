'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, CheckCircle2, X } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isLocalhost } from '@/lib/env';

interface SyncState {
  pending:  number;
  syncing:  boolean;
  lastSync: Date | null;
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [sync, setSync] = useState<SyncState>({
    pending:  0,
    syncing:  false,
    lastSync: null,
  });

  // Load actual pending count from IndexedDB whenever we go offline
  const refreshPendingCount = useCallback(async () => {
    try {
      const { getPendingOfflineSalesCount } = await import('@/lib/indexedDB');
      const count = await getPendingOfflineSalesCount();
      setSync(s => ({ ...s, pending: count }));
    } catch {
      // non-critical — leave count as-is
    }
  }, []);

  const handleSync = useCallback(async () => {
    try {
      const { syncOfflineSales } = await import('@/lib/indexedDB');
      setSync(s => ({ ...s, syncing: true }));
      const results = await syncOfflineSales();
      const synced = results.filter((r: any) => r.success).length;
      setSync({ pending: 0, syncing: false, lastSync: new Date() });
      // toast is handled at the page level — just update banner state here
      void synced;
    } catch {
      setSync(s => ({ ...s, syncing: false }));
    }
  }, []);

  // Track online ↔ offline transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
      // Show how many sales are queued
      refreshPendingCount();
    } else if (wasOffline) {
      // Just came back online — sync then flash the reconnected bar
      setShowReconnected(true);
      setWasOffline(false);
      handleSync();
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    }
  // wasOffline must be in deps so the "came back online" branch reads
  // the latest value and doesn't close over the initial false.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, wasOffline]);

  // No offline UI when running locally
  if (isLocalhost()) return null;

  if (isOnline && !showReconnected) return null;
  if (dismissed) return null;

  // Reconnected flash
  if (showReconnected) {
    return (
      <div className="animate-fade-in-down bg-emerald-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            Back online{sync.lastSync ? ' — data synced' : ''}
          </span>
        </div>
      </div>
    );
  }

  // Offline banner
  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>
            You&apos;re offline — transactions are saved locally and will sync when you reconnect.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {sync.pending > 0 && (
            <span className="text-xs bg-amber-700/50 rounded-full px-2 py-0.5">
              {sync.pending} pending
            </span>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 hover:bg-amber-700/30 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact status indicator (for sidebar/header) ──────────
export function OnlineStatusIndicator({ compact = false }: { compact?: boolean }) {
  const isOnline = useOnlineStatus();

  // Always show as online on localhost — offline indicator is not useful locally
  if (isLocalhost()) {
    return compact
      ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online" />
      : <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Online</div>;
  }

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
          isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
        }`}
        title={isOnline ? 'Online' : 'Offline'}
      />
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-semibold ${
        isOnline
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
        }`}
      />
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );
}
