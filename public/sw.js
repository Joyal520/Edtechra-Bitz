const CACHE_NAME = 'edtechra-bitz-v10';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.png',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/assets/hero-papercraft.jpg'
];

// 1. Install event: Cache essential app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching fresh offline app shell');
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Pre-cache partial warning:', err);
      });
    })
  );
});

// 2. Activate event: Purge ALL obsolete version caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Cache updated to v9 and clients claimed');
      return self.clients.claim();
    })
  );
});

// 3. Fetch event: Strategic caching with Network-First default for navigation & assets
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never process non-HTTP(S) requests.
  // Browser extensions such as Adobe/Chrome extensions use
  // chrome-extension:// URLs and cannot be stored in Cache Storage.
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // Bypass non-GET requests (e.g. POST, PUT, DELETE, presigned uploads)
  if (event.request.method !== 'GET') {
    return;
  }

  const parsedUrl = new URL(url);

  // Bypass API requests, Supabase auth/data, Cloudflare R2 uploads/media, OAuth redirects, and video media
  if (
    parsedUrl.pathname.startsWith('/api/') ||
    parsedUrl.hostname.includes('supabase.co') ||
    parsedUrl.hostname.includes('r2.cloudflarestorage.com') ||
    parsedUrl.hostname.includes('cloudflarestorage.com') ||
    parsedUrl.hostname.includes('r2.dev') ||
    parsedUrl.searchParams.has('X-Amz-Signature') ||
    parsedUrl.searchParams.has('X-Amz-Credential') ||
    parsedUrl.searchParams.has('X-Amz-Algorithm') ||
    parsedUrl.hostname.includes('youtube') ||
    parsedUrl.hostname.includes('googlevideo') ||
    parsedUrl.hostname.includes('googleapis') ||
    parsedUrl.hostname.includes('ytimg') ||
    parsedUrl.searchParams.has('code') ||
    parsedUrl.searchParams.has('error') ||
    parsedUrl.searchParams.has('error_code') ||
    parsedUrl.pathname.endsWith('.mp4') ||
    parsedUrl.pathname.endsWith('.webm')
  ) {
    return;
  }

  const isHttpUrl = url.startsWith('http://') || url.startsWith('https://');

  // Handle Navigation requests: Network-First to guarantee fresh application state
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200 && (response.type === 'basic' || response.type === 'default') && isHttpUrl) {
            const clone = response.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, clone).catch(() => {});
          }
          return response;
        } catch (err) {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // Network-first with cache fallback for HTML, JS and CSS
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'document'
  ) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'default') && isHttpUrl) {
            const clone = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, clone).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        }
      })()
    );
    return;
  }

  // Cache-first with network revalidation for images/icons
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) {
        fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && isHttpUrl) {
              const clone = networkResponse.clone();
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, clone).catch(() => {});
            }
          })
          .catch(() => {});
        return cached;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && isHttpUrl) {
          const clone = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, clone).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        return new Response('', { status: 404, statusText: 'Not Found' });
      }
    })()
  );
});
