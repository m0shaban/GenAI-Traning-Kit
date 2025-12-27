// Service Worker for GenAI Training Kit
// يوفر دعم الوضع غير المتصل (Offline) والتخزين المؤقت

const CACHE_NAME = 'genai-training-kit-v4';
const urlsToCache = [
  './',
  './index.html',
  './dashboard.html',
  './cases.html',
  './exercises.html',
  './tools.html',
  './prompts.html',
  './projects.html',
  './resources.html',
  './roadmap.html',
  './css/style.css',
  './js/protection.js',
  './js/markdown.js',
  './js/md-page.js',
  './content/cases.md',
  './content/exercises.md',
  './content/roadmap.md',
  './content/tools.md',
  './content/prompts.md',
  './content/projects.md',
  './content/resources.md',
  './config.json',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip POST requests and absolute URLs
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return from cache if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache failed requests
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('./index.html');
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: './assets/icon-192x192.png',
    badge: './assets/badge-72x72.png',
    tag: 'genai-notification',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification('GenAI Training Kit', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
