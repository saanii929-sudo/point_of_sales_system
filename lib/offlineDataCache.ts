import { openDB, IDBPDatabase } from 'idb';

interface OfflineDataDB {
  'cached-products': { key: string; value: any };
  'cached-categories': { key: string; value: any };
  'cached-customers': { key: string; value: any };
  'cached-branding': { key: string; value: any };
  'cache-meta': { key: string; value: { key: string; timestamp: number } };
}

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB('smartvendr-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cached-products')) {
          db.createObjectStore('cached-products', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-categories')) {
          db.createObjectStore('cached-categories', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-customers')) {
          db.createObjectStore('cached-customers', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cached-branding')) {
          db.createObjectStore('cached-branding', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('cache-meta')) {
          db.createObjectStore('cache-meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheData(store: string, data: any) {
  const db = await getOfflineDB();
  await db.put(store as any, { key: store, data });
  await db.put('cache-meta' as any, { key: store, timestamp: Date.now() });
}

export async function getCachedData(store: string) {
  const db = await getOfflineDB();
  const result = await db.get(store as any, store);
  return result?.data ?? null;
}

export async function getCacheMeta(store: string) {
  const db = await getOfflineDB();
  return db.get('cache-meta' as any, store);
}

// Prefetch all critical data for offline use
export async function prefetchOfflineData() {
  const endpoints: { url: string; store: string }[] = [
    { url: '/api/products', store: 'cached-products' },
    { url: '/api/categories', store: 'cached-categories' },
    { url: '/api/customers', store: 'cached-customers' },
    { url: '/api/business/branding', store: 'cached-branding' },
  ];

  const results: { store: string; success: boolean }[] = [];

  for (const { url, store } of endpoints) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        await cacheData(store, data);
        results.push({ store, success: true });
      } else {
        results.push({ store, success: false });
      }
    } catch {
      results.push({ store, success: false });
    }
  }

  return results;
}

// Get data with offline fallback
export async function fetchWithOfflineFallback(url: string, store: string) {
  if (navigator.onLine) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Update cache in background
        cacheData(store, data).catch(() => {});
        return { data, fromCache: false };
      }
    } catch {
      // Fall through to cache
    }
  }

  // Offline or fetch failed — use cache
  const cached = await getCachedData(store);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  throw new Error('No data available offline');
}
