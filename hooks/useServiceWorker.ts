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
  }, []);

  const prefetchForOffline = () => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
    // Cache all pages
    navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_PAGES' });
    // Cache API data
    navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_API' });
  };

  const clearCache = () => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  };

  return { isReady, isPrefetched, prefetchForOffline, clearCache };
}
