'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@/store/useThemeStore';
import { prefetchOfflineData } from '@/lib/offlineDataCache';
import { isLocalhost } from '@/lib/env';

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (isLocalhost()) return; // disable offline support in local development

    // Guard: only run prefetch once per page lifecycle, regardless of how many
    // SW events fire (statechange + controllerchange both fire on first activation).
    let prefetchTriggered = false;

    const triggerPrefetch = () => {
      if (prefetchTriggered) return;
      prefetchTriggered = true;
      try {
        const ctrl = navigator.serviceWorker.controller;
        if (ctrl) {
          ctrl.postMessage({ type: 'PREFETCH_API' });
        }
      } catch {}
      // Also populate IndexedDB cache regardless of SW availability
      prefetchOfflineData().catch(() => {});
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[App] Service worker registered');

        // If already controlling, prefetch now
        if (navigator.serviceWorker.controller) {
          triggerPrefetch();
          return;
        }

        // Wait for the new SW to activate and claim this page
        const sw = reg.installing || reg.waiting;
        if (sw) {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
              triggerPrefetch();
            }
          });
        }
      })
      .catch((err) => {
        console.warn('[App] SW registration failed:', err);
        // Still prefetch into IndexedDB even without SW
        prefetchOfflineData().catch(() => {});
      });

    // controllerchange fires when clients.claim() takes effect after skipWaiting —
    // the prefetchTriggered guard prevents a duplicate run alongside statechange.
    navigator.serviceWorker.addEventListener('controllerchange', triggerPrefetch);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore(state => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Rehydrate after mount so the server and client initial renders both use
    // the default theme ('light'), preventing a Zustand/useSyncExternalStore
    // hydration mismatch that would cascade into other components on the page.
    useThemeStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      {mounted && <ServiceWorkerRegistrar />}
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            color: theme === 'dark' ? '#F3F4F6' : '#111827',
          },
        }}
      />
    </>
  );
}
