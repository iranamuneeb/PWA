const CACHE_NAME = "weather-app-v6";
const urlsToCache = [
  `index.html`,
  `offline.html`,
];

// install sw
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened!");
      return cache.addAll(urlsToCache);
    })
  );
});

// listen for requests
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => caches.match("offline.html"));
    })
  );
});

// activate sw
self.addEventListener("activate", (event) => {
  const cacheWhiteList = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhiteList.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle notification click events
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification);
  
  event.notification.close();

  if (event.action === 'view-weather' || !event.action) {
    // Open the app when notification is clicked
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // If the app is already open, focus it
          for (const client of clients) {
            if (client.url.includes('/pwa') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // If the app is not open, open it
          if (self.clients.openWindow) {
            return self.clients.openWindow('/pwa');
          }
        })
    );
  }
});
