const CACHE_NAME = "wazir-tracker-cache-v2.1";
const ASSETS = [
  "./index.html",
  "./css/styles.css",
  "./js/mockData.js",
  "./js/store.js",
  "./js/emailService.js",
  "./js/app.js",
  "./manifest.json",
  "./wazir-logo.png"
];

// Install Event
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First Fetch Interceptor (Always load latest deployed JS/CSS when online)
self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("supabase")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200 && e.request.method === "GET") {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
