const CACHE_NAME = "weather-app-v7";
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
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
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
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Handle background sync for weather requests
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'weather-sync') {
    event.waitUntil(processBackgroundSync());
  }
});

// Process queued weather requests during background sync
async function processBackgroundSync() {
  try {
    console.log('Processing background sync for weather requests');
    
    // Get queued requests from storage
    const queueData = await getQueueFromStorage();
    
    if (!queueData || queueData.length === 0) {
      console.log('No queued requests to process');
      return;
    }

    const pendingRequests = queueData.filter(req => req.status === 'pending');
    
    for (const request of pendingRequests) {
      try {
        await processWeatherRequest(request);
        await updateRequestStatus(request.id, 'completed');
      } catch (error) {
        console.error('Error processing request:', error);
        await updateRequestStatus(request.id, 'failed');
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// Process individual weather request
async function processWeatherRequest(request) {
  const API_URL = "https://api.weatherapi.com/v1/current.json";
  const API_KEY = "b0a7bad410d5400c8c3145734251107";
  
  try {
    const response = await fetch(`${API_URL}?q=${encodeURIComponent(request.cityName)}&key=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const weatherData = await response.json();
    
    // Store the result
    await storeWeatherResult(request.id, weatherData);
    
    // Show success notification
    await showWeatherNotification(request.cityName, weatherData);
    
    console.log(`Successfully processed weather request for ${request.cityName}`);
  } catch (error) {
    console.error(`Failed to process weather request for ${request.cityName}:`, error);
    
    // Show error notification
    await showErrorNotification(request.cityName);
    
    throw error;
  }
}

// Helper functions for storage operations
async function getQueueFromStorage() {
  try {
    const result = await getFromIndexedDB('weatherSearchQueue');
    return result || [];
  } catch (error) {
    console.error('Error reading queue from storage:', error);
    return [];
  }
}

async function updateRequestStatus(requestId, status) {
  try {
    const queue = await getQueueFromStorage();
    const requestIndex = queue.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      queue[requestIndex].status = status;
      queue[requestIndex].processedAt = Date.now();
      await saveToIndexedDB('weatherSearchQueue', queue);
    }
  } catch (error) {
    console.error('Error updating request status:', error);
  }
}

async function storeWeatherResult(requestId, weatherData) {
  try {
    const result = {
      requestId,
      weatherData,
      retrievedAt: Date.now()
    };
    await saveToIndexedDB(`weatherResults_${requestId}`, result);
  } catch (error) {
    console.error('Error storing weather result:', error);
  }
}

// IndexedDB helper functions
async function saveToIndexedDB(key, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WeatherAppDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      
      const putRequest = store.put({ key, data });
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('storage')) {
        db.createObjectStore('storage', { keyPath: 'key' });
      }
    };
  });
}

async function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WeatherAppDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        resolve(result ? result.data : null);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('storage')) {
        db.createObjectStore('storage', { keyPath: 'key' });
      }
    };
  });
}

// Notification functions
async function showWeatherNotification(cityName, weatherData) {
  const temp = weatherData.current.temp_c;
  const condition = weatherData.current.condition.text;
  
  return self.registration.showNotification(`Weather for ${cityName}`, {
    body: `${temp}°C, ${condition}. Tap to view details.`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'weather-result',
    actions: [
      {
        action: 'view-weather',
        title: 'View Details',
        icon: '/logo.png'
      }
    ],
    data: {
      cityName,
      weatherData
    }
  });
}

async function showErrorNotification(cityName) {
  return self.registration.showNotification('Weather Search Failed', {
    body: `Unable to get weather for "${cityName}". Please try again.`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'search-error',
    data: {
      cityName,
      error: true
    }
  });
}

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

// Handle push notifications (for future Firebase integration)
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Weather Update', {
        body: data.body || 'Check the latest weather conditions',
        icon: data.icon || '/logo.png',
        badge: '/logo.png',
        tag: data.tag || 'push-notification',
        actions: data.actions || [
          {
            action: 'view-weather',
            title: 'View Weather'
          }
        ],
        data: data.data || {}
      })
    );
  }
});

// Handle message events from the main app
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SYNC_WEATHER_REQUESTS') {
    // Trigger background sync
    event.waitUntil(processBackgroundSync());
  }
});
