'use client';

import { useEffect, useRef, useState } from 'react';

export function useServiceWorker() {
  const [isReady, setIsReady] = useState(false);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    registered.current = true;

    try {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[App] Service worker registered');
          setIsReady(true);

          // Listen for prefetch completion
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'PREFETCH_COMPLETE') {
              setIsPrefetched(true);
              console.log('[App] Offline prefetch complete');
            }
          });
        })
        .catch((err) => {
          console.warn('[App] SW registration failed:', err);
        });
    } catch (err) {
      console.warn('[App] SW not available:', err);
    }
  }, []);

  const prefetchForOffline = () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
      navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_PAGES' });
      navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_API' });
    } catch {}
  };

  const clearCache = () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    } catch {}
  };

  return { isReady, isPrefetched, prefetchForOffline, clearCache };
}
