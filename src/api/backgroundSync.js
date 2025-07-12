// Background Sync Manager
class BackgroundSyncManager {
  constructor() {
    this.queueKey = 'weatherSearchQueue';
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Process queue on page load if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  // Add search request to queue
  queueSearch(cityName, timestamp = Date.now()) {
    const queue = this.getQueue();
    const searchRequest = {
      id: `search_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      cityName,
      timestamp,
      status: 'pending'
    };

    queue.push(searchRequest);
    this.saveQueue(queue);

    console.log(`Search for "${cityName}" queued for background sync`);
    
    // Show notification that request was queued
    this.showQueuedNotification(cityName);

    return searchRequest.id;
  }

  // Get current queue
  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.queueKey)) || [];
    } catch (error) {
      console.error('Error reading queue:', error);
      return [];
    }
  }

  // Save queue to localStorage
  saveQueue(queue) {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  // Process all pending requests in queue
  async processQueue() {
    if (!this.isOnline) {
      console.log('Offline - cannot process queue');
      return;
    }

    const queue = this.getQueue();
    const pendingRequests = queue.filter(req => req.status === 'pending');

    if (pendingRequests.length === 0) {
      console.log('No pending requests to process');
      return;
    }

    console.log(`Processing ${pendingRequests.length} queued requests`);

    for (const request of pendingRequests) {
      try {
        await this.processSearchRequest(request);
        this.updateRequestStatus(request.id, 'completed');
      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        this.updateRequestStatus(request.id, 'failed');
      }
    }

    // Clean up completed requests older than 24 hours
    this.cleanupOldRequests();
  }

  // Process individual search request
  async processSearchRequest(request) {
    const { fetchWeather } = await import('./fetchWeather');
    
    try {
      const weatherData = await fetchWeather(request.cityName);
      
      // Store the result
      this.storeWeatherResult(request.id, weatherData);
      
      // Show success notification
      this.showSuccessNotification(request.cityName, weatherData);
      
      console.log(`Successfully processed search for "${request.cityName}"`);
      return weatherData;
    } catch (error) {
      console.error(`Failed to fetch weather for "${request.cityName}":`, error);
      this.showErrorNotification(request.cityName);
      throw error;
    }
  }

  // Update request status
  updateRequestStatus(requestId, status) {
    const queue = this.getQueue();
    const requestIndex = queue.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      queue[requestIndex].status = status;
      queue[requestIndex].processedAt = Date.now();
      this.saveQueue(queue);
    }
  }

  // Store weather result
  storeWeatherResult(requestId, weatherData) {
    try {
      const resultsKey = `weatherResults_${requestId}`;
      localStorage.setItem(resultsKey, JSON.stringify({
        requestId,
        weatherData,
        retrievedAt: Date.now()
      }));
    } catch (error) {
      console.error('Error storing weather result:', error);
    }
  }

  // Get stored weather result
  getWeatherResult(requestId) {
    try {
      const resultsKey = `weatherResults_${requestId}`;
      const result = localStorage.getItem(resultsKey);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Error retrieving weather result:', error);
      return null;
    }
  }

  // Clean up old requests and results
  cleanupOldRequests() {
    const queue = this.getQueue();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentQueue = queue.filter(req => {
      const requestTime = req.processedAt || req.timestamp;
      const isRecent = requestTime > oneDayAgo;
      
      // Clean up stored results for old requests
      if (!isRecent) {
        const resultsKey = `weatherResults_${req.id}`;
        localStorage.removeItem(resultsKey);
      }
      
      return isRecent;
    });

    this.saveQueue(recentQueue);
    console.log(`Cleaned up ${queue.length - recentQueue.length} old requests`);
  }

  // Show notification when request is queued
  showQueuedNotification(cityName) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Search Queued', {
        body: `Weather search for "${cityName}" has been queued. You'll be notified when the results are available.`,
        icon: '/logo.png',
        tag: 'queued-search'
      });
    }
  }

  // Show notification when search completes successfully
  showSuccessNotification(cityName, weatherData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const temp = weatherData.current.temp_c;
      const condition = weatherData.current.condition.text;
      
      new Notification(`Weather for ${cityName}`, {
        body: `${temp}°C, ${condition}. Tap to view details.`,
        icon: '/logo.png',
        tag: 'weather-result'
      });
    }
  }

  // Show notification when search fails
  showErrorNotification(cityName) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Search Failed', {
        body: `Unable to get weather for "${cityName}". Please try again.`,
        icon: '/logo.png',
        tag: 'search-error'
      });
    }
  }

  // Get queue status for UI
  getQueueStatus() {
    const queue = this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter(req => req.status === 'pending').length,
      completed: queue.filter(req => req.status === 'completed').length,
      failed: queue.filter(req => req.status === 'failed').length,
      isOnline: this.isOnline
    };
  }

  // Manual trigger for queue processing (for UI button)
  async retryPendingRequests() {
    if (!this.isOnline) {
      throw new Error('Cannot retry requests while offline');
    }
    
    await this.processQueue();
    return this.getQueueStatus();
  }

  // Clear all requests from queue
  clearQueue() {
    const queue = this.getQueue();
    
    // Clean up stored results
    queue.forEach(req => {
      const resultsKey = `weatherResults_${req.id}`;
      localStorage.removeItem(resultsKey);
    });
    
    localStorage.removeItem(this.queueKey);
    console.log('Queue cleared');
  }
}

// Create singleton instance
const backgroundSyncManager = new BackgroundSyncManager();

export default backgroundSyncManager;
