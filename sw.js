/**
 * MyDailyWin Service Worker
 * Provides offline support and caching for the PWA
 */

const CACHE_NAME = 'mydailywin-v5';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/app.html',
  '/login.html',
  '/get-started.html',
  '/admin.html',
  '/admin-guide.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/css/admin.css',
  '/css/app.css',
  '/css/home.css',
  '/css/login.css',
  '/css/get-started.css',
  '/css/offline.css',
  '/css/shared.css',
  '/js/firebase-config.js',
  '/js/sw-init.js',
  '/js/utils.js',
  '/js/dark-mode.js',
  '/js/app.js',
  '/js/admin.js',
  '/js/login.js',
  '/js/home.js',
  '/js/get-started.js',
  '/js/offline.js',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests (Firebase, fonts, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version, but also update cache in background
          event.waitUntil(
            fetch(event.request)
              .then(response => {
                if (response.ok) {
                  caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, response));
                }
              })
              .catch(() => {}) // Ignore network errors for background update
          );
          return cachedResponse;
        }
        
        // Not in cache - try network
        return fetch(event.request)
          .then(response => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Network failed - return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // Return empty response for other requests
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
