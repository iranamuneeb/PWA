// Web Push Protocol Implementation
// Alternative to Firebase Cloud Messaging using native Web Push API

class WebPushManager {
  constructor() {
    this.swRegistration = null;
    this.subscription = null;
    this.vapidPublicKey = 'your-vapid-public-key'; // Generate at web-push-codelab.glitch.me
    this.isSupported = false;
    this.init();
  }

  async init() {
    try {
      // Check if service worker and push messaging are supported
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        this.isSupported = true;
        await this.registerServiceWorker();
      } else {
        console.log('Push messaging is not supported');
        this.isSupported = false;
      }
    } catch (error) {
      console.error('Error initializing Web Push:', error);
      this.isSupported = false;
    }
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/serviceWorker.js');
      console.log('Service Worker registered successfully');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Check if user is already subscribed
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('User is already subscribed to push notifications');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Subscribe user to push notifications
  async subscribeUser() {
    if (!this.isSupported) {
      throw new Error('Push messaging is not supported');
    }

    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      // Subscribe to push notifications
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      };

      this.subscription = await this.swRegistration.pushManager.subscribe(subscribeOptions);
      
      console.log('User subscribed to push notifications');
      
      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      return this.subscription;
    } catch (error) {
      console.error('Error subscribing user:', error);
      throw error;
    }
  }

  // Unsubscribe user from push notifications
  async unsubscribeUser() {
    if (!this.subscription) {
      console.log('User is not subscribed');
      return;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      // Remove subscription from server
      await this.removeSubscriptionFromServer();
      
      console.log('User unsubscribed from push notifications');
    } catch (error) {
      console.error('Error unsubscribing user:', error);
      throw error;
    }
  }

  // Send subscription to your server
  async sendSubscriptionToServer(subscription) {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth'))
      },
      timestamp: Date.now()
    };

    // Replace with your server endpoint
    const serverEndpoint = '/api/push-subscription';
    
    try {
      const response = await fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      if (response.ok) {
        console.log('Subscription sent to server successfully');
      } else {
        console.log('Failed to send subscription to server');
      }
    } catch (error) {
      console.log('Error sending subscription to server:', error);
      // Store locally as fallback
      localStorage.setItem('push-subscription', JSON.stringify(subscriptionData));
    }
  }

  // Remove subscription from server
  async removeSubscriptionFromServer() {
    const serverEndpoint = '/api/push-subscription';
    
    try {
      await fetch(serverEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Subscription removed from server');
    } catch (error) {
      console.log('Error removing subscription from server:', error);
    }
    
    // Remove from local storage
    localStorage.removeItem('push-subscription');
  }

  // Schedule daily weather notifications
  async scheduleDailyWeatherNotification(cityName, time) {
    if (!this.subscription) {
      throw new Error('User is not subscribed to push notifications');
    }

    const scheduleData = {
      type: 'daily-weather',
      cityName: cityName,
      time: time,
      subscription: this.subscription
    };

    // This would typically be handled by your server
    // For demo purposes, we'll simulate it locally
    this.scheduleLocalPushNotification(scheduleData);
    
    console.log(`Daily weather notification scheduled for ${cityName} at ${time}`);
  }

  // Local simulation of scheduled push notifications
  scheduleLocalPushNotification(scheduleData) {
    const [hours, minutes] = scheduleData.time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      await this.sendLocalPushNotification({
        title: 'Weather Reminder',
        body: `Good morning! Check today's weather for ${scheduleData.cityName}.`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'daily-weather',
        data: {
          cityName: scheduleData.cityName,
          type: 'daily-weather'
        }
      });
      
      // Schedule next day
      this.scheduleLocalPushNotification(scheduleData);
    }, timeUntilNotification);
  }

  // Send local push notification (simulates server push)
  async sendLocalPushNotification(notificationData) {
    if (!this.swRegistration) {
      console.error('Service Worker not available');
      return;
    }

    try {
      await this.swRegistration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        data: notificationData.data,
        actions: [
          {
            action: 'view-weather',
            title: 'View Weather',
            icon: '/logo.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        requireInteraction: false,
        silent: false
      });
      
      console.log('Push notification sent:', notificationData.title);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send weather alert
  async sendWeatherAlert(alertData) {
    await this.sendLocalPushNotification({
      title: alertData.title || 'Weather Alert',
      body: alertData.body || 'Check current weather conditions',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'weather-alert',
      data: {
        type: 'weather-alert',
        ...alertData
      }
    });
  }

  // Test push notification
  async sendTestNotification() {
    await this.sendLocalPushNotification({
      title: 'Test Push Notification',
      body: 'This is a test push notification from your Weather App!',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'test-notification',
      data: {
        type: 'test'
      }
    });
  }

  // Utility functions
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return window.btoa(binary);
  }

  // Get subscription status
  isSubscribed() {
    return this.subscription !== null;
  }

  // Get subscription object
  getSubscription() {
    return this.subscription;
  }

  // Check if push messaging is supported
  isPushSupported() {
    return this.isSupported;
  }
}

// Server-side example for handling push notifications
const serverExampleCode = `
// Node.js server example using web-push library
const webpush = require('web-push');

// VAPID keys (generate at web-push-codelab.glitch.me)
const vapidKeys = {
  publicKey: 'your-public-vapid-key',
  privateKey: 'your-private-vapid-key'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store subscriptions (use a database in production)
const subscriptions = [];

// Endpoint to save subscription
app.post('/api/push-subscription', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Subscription saved' });
});

// Send push notification to all subscribers
function sendPushNotification(title, body, data = {}) {
  const payload = JSON.stringify({
    title,
    body,
    icon: '/logo.png',
    data
  });

  subscriptions.forEach(subscription => {
    webpush.sendNotification(subscription, payload)
      .then(result => console.log('Push sent successfully'))
      .catch(error => console.error('Error sending push:', error));
  });
}

// Schedule daily weather notifications
const cron = require('node-cron');

cron.schedule('0 8 * * *', () => {
  sendPushNotification(
    'Weather Reminder',
    'Good morning! Check today\\'s weather forecast.'
  );
});
`;

console.log('Server implementation example:', serverExampleCode);

// Create singleton instance
const webPushManager = new WebPushManager();

export default webPushManager;
