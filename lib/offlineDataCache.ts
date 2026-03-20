import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'smartvendr-offline';
const DB_VERSION = 2; // Bump version to trigger upgrade
const DATA_STORE = 'api-cache';
const META_STORE = 'cache-meta';

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

function getOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Clean up old v1 stores
        for (const name of Array.from(db.objectStoreNames)) {
          if (name !== DATA_STORE && name !== META_STORE) {
            db.deleteObjectStore(name);
          }
        }
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheData(key: string, data: any) {
  const db = await getOfflineDB();
  await db.put(DATA_STORE, data, key);
  await db.put(META_STORE, Date.now(), key);
}

export async function getCachedData(key: string) {
  const db = await getOfflineDB();
  return (await db.get(DATA_STORE, key)) ?? null;
}

export async function getCacheMeta(key: string): Promise<number | null> {
  const db = await getOfflineDB();
  return (await db.get(META_STORE, key)) ?? null;
}

// Prefetch all critical data for offline use
export async function prefetchOfflineData() {
  const endpoints = [
    '/api/products',
    '/api/categories',
    '/api/customers',
    '/api/business/branding',
    '/api/analytics/dashboard?period=today',
    '/api/analytics/health',
    '/api/employees',
    '/api/suppliers',
    '/api/discounts?status=active',
    '/api/returns',
    '/api/payroll',
    '/api/reports?range=month',
    '/api/inventory/insights',
    '/api/products/expiring',
  ];

  const results: { url: string; success: boolean }[] = [];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        await cacheData(url, data);
        results.push({ url, success: true });
      } else {
        results.push({ url, success: false });
      }
    } catch {
      results.push({ url, success: false });
    }
  }

  return results;
}

// Get data with offline fallback — uses URL as cache key
export async function fetchWithOfflineFallback(url: string, cacheKey?: string) {
  const key = cacheKey || url;

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Update cache in background
        cacheData(key, data).catch(() => {});
        return { data, fromCache: false };
      }
    } catch {
      // Fall through to cache
    }
  }

  // Offline or fetch failed — use cache
  const cached = await getCachedData(key);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  throw new Error('No data available offline');
}
