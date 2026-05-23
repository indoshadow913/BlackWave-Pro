// BlackWave Pro Service Worker
// Single, clean service worker with absolute paths only

const CACHE_NAME = "blackwave-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/favicon.ico",
];

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching assets");
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("[SW] Cache addAll failed (non-critical):", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[SW] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - simple caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache proxy requests
  if (
    url.pathname.startsWith("/bare/") ||
    url.pathname.startsWith("/epoxy/") ||
    url.pathname.startsWith("/baremux/") ||
    url.pathname.startsWith("/scram/")
  ) {
    return;
  }

  // Cache-first for static assets
  if (request.method === "GET") {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});
