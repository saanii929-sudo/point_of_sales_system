const CACHE_NAME = 'smartvendr-v2';
const STATIC_CACHE = 'smartvendr-static-v2';
const DATA_CACHE = 'smartvendr-data-v2';

// App shell — pages and assets to cache for offline navigation
const APP_SHELL = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/pos',
  '/dashboard/products',
  '/dashboard/sales',
  '/dashboard/customers',
  '/dashboard/inventory',
  '/dashboard/reports',
  '/dashboard/returns',
  '/dashboard/discounts',
  '/dashboard/employees',
  '/dashboard/payroll',
  '/dashboard/suppliers',
  '/dashboard/expiring',
  '/dashboard/settings',
  '/manifest.json',
  '/favicon.ico',
];

// API routes to cache for offline data access
const CACHEABLE_API = [
  '/api/products',
  '/api/categories',
  '/api/customers',
  '/api/suppliers',
  '/api/employees',
  '/api/discounts',
  '/api/sales',
  '/api/business/branding',
  '/api/analytics/dashboard',
  '/api/inventory/insights',
];

// Install — cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching app shell');
      // Don't fail install if some pages aren't available yet
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache ${url}:`, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip _next/webpack HMR and dev tools
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // API requests — network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url.pathname)) {
      event.respondWith(networkFirstWithCache(request, DATA_CACHE));
    }
    return;
  }

  // Static assets (_next/static) — cache first
  if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page navigations — network first, fall back to cache
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
    return;
  }

  // Other assets (images, fonts, etc.) — cache first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

function isCacheableApi(pathname) {
  return CACHEABLE_API.some((api) => pathname.startsWith(api));
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Network failed — try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // For navigation requests, try the base path
    if (request.mode === 'navigate') {
      const url = new URL(request.url);
      // Try cached version of the dashboard root for sub-routes
      if (url.pathname.startsWith('/dashboard')) {
        const dashCached = await caches.match('/dashboard');
        if (dashCached) return dashCached;
      }
    }
    // Return offline fallback
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline and this data is not cached yet.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PREFETCH_PAGES') {
    prefetchPages(event.data.pages || APP_SHELL);
  }
  if (event.data?.type === 'PREFETCH_API') {
    prefetchApiData(event.data.urls || CACHEABLE_API);
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(STATIC_CACHE);
    caches.delete(DATA_CACHE);
  }
});

async function prefetchPages(pages) {
  const cache = await caches.open(STATIC_CACHE);
  for (const page of pages) {
    try {
      const response = await fetch(page, { credentials: 'include' });
      if (response.ok) {
        await cache.put(page, response);
      }
    } catch (err) {
      console.warn(`[SW] Prefetch failed for ${page}`);
    }
  }
  // Notify clients that prefetch is done
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'PREFETCH_COMPLETE' });
  });
}

async function prefetchApiData(urls) {
  const cache = await caches.open(DATA_CACHE);
  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch (err) {
      console.warn(`[SW] API prefetch failed for ${url}`);
    }
  }
}
