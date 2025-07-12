// Firebase Cloud Messaging (FCM) Configuration
// This file sets up Firebase Cloud Messaging for push notifications

// Firebase configuration (replace with your own Firebase config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

class FirebaseMessagingManager {
  constructor() {
    this.messaging = null;
    this.vapidKey = 'your-vapid-key'; // Get this from Firebase Console
    this.isSupported = false;
    this.token = null;
    this.firebase = null;
  }

  // Initialize Firebase and check if messaging is supported
  async initialize() {
    try {
      // Try to dynamically import Firebase (for when it's available)
      try {
        // Check if Firebase is available globally
        if (typeof window !== 'undefined' && window.firebase) {
          this.firebase = window.firebase;
        } else {
          console.log('Firebase not loaded. To enable Firebase messaging:');
          console.log('1. Add Firebase SDK to your HTML: <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>');
          console.log('2. Add Firebase messaging: <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js"></script>');
          console.log('3. Configure your Firebase project in this file');
          console.log('4. Using fallback notification system instead');
          return false;
        }
      } catch (importError) {
        console.log('Firebase not available, using fallback notification system');
        return false;
      }

      // Initialize Firebase if not already initialized
      if (!this.firebase.apps.length) {
        this.firebase.initializeApp(firebaseConfig);
      }

      // Check if messaging is supported
      if (this.firebase.messaging && this.firebase.messaging.isSupported()) {
        this.messaging = this.firebase.messaging();
        this.isSupported = true;
        
        // Request permission for notifications
        await this.requestPermission();
        
        // Set up message handlers
        this.setupMessageHandlers();
        
        return true;
      } else {
        console.log('Firebase messaging is not supported in this browser');
        return false;
      }
    } catch (error) {
      console.error('Error initializing Firebase messaging:', error);
      return false;
    }
  }

  // Request notification permission and get FCM token
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        
        // Get FCM token
        const token = await this.messaging.getToken({ vapidKey: this.vapidKey });
        
        if (token) {
          this.token = token;
          console.log('FCM token:', token);
          
          // Store token for server communication
          localStorage.setItem('fcm-token', token);
          
          // Send token to your server if needed
          this.sendTokenToServer(token);
          
          return token;
        } else {
          console.log('No registration token available');
        }
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('An error occurred while retrieving token:', error);
    }
    
    return null;
  }

  // Set up message handlers for foreground and background messages
  setupMessageHandlers() {
    if (!this.messaging) return;

    // Handle foreground messages
    this.messaging.onMessage((payload) => {
      console.log('Message received in foreground:', payload);
      
      // Show notification manually for foreground messages
      this.showForegroundNotification(payload);
    });

    // Handle token refresh
    this.messaging.onTokenRefresh(() => {
      this.messaging.getToken({ vapidKey: this.vapidKey }).then((refreshedToken) => {
        console.log('Token refreshed:', refreshedToken);
        this.token = refreshedToken;
        localStorage.setItem('fcm-token', refreshedToken);
        this.sendTokenToServer(refreshedToken);
      }).catch((error) => {
        console.error('Unable to retrieve refreshed token:', error);
      });
    });
  }

  // Show notification for foreground messages
  showForegroundNotification(payload) {
    const { title, body, icon } = payload.notification || {};
    const data = payload.data || {};

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title || 'Weather Update', {
        body: body || 'Check the latest weather conditions',
        icon: icon || '/logo.png',
        badge: '/logo.png',
        tag: 'fcm-weather',
        data: data,
        actions: [
          {
            action: 'view-weather',
            title: 'View Weather'
          }
        ]
      });
    }
  }

  // Send token to your server for targeted messaging
  sendTokenToServer(token) {
    // Replace this with your actual server endpoint
    const serverEndpoint = '/api/fcm-token';
    
    fetch(serverEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        timestamp: Date.now()
      })
    }).then(response => {
      if (response.ok) {
        console.log('Token sent to server successfully');
      } else {
        console.log('Failed to send token to server');
      }
    }).catch(error => {
      console.log('Error sending token to server:', error);
    });
  }

  // Schedule a daily weather notification (to be called from your server)
  async scheduleDailyNotification(cityName, time) {
    if (!this.isSupported || !this.token) {
      console.log('FCM not available, using local scheduling instead');
      return this.scheduleLocalNotification(cityName, time);
    }

    // This would typically be done from your server
    // Here's an example of the server-side logic you'd need:
    
    /*
    Server-side example (Node.js with Firebase Admin SDK):
    
    const admin = require('firebase-admin');
    const cron = require('node-cron');
    
    // Schedule daily notification
    cron.schedule('0 8 * * *', async () => {
      const message = {
        notification: {
          title: 'Weather Reminder',
          body: 'Good morning! Check today\'s weather forecast.',
          icon: '/logo.png'
        },
        data: {
          action: 'daily-weather',
          cityName: cityName
        },
        token: userToken
      };
      
      try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
      } catch (error) {
        console.log('Error sending message:', error);
      }
    });
    */

    console.log(`Daily notification scheduled for ${cityName} at ${time}`);
    console.log('Note: Server-side implementation required for FCM scheduling');
  }

  // Fallback to local notification scheduling
  scheduleLocalNotification(cityName, time) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Weather Reminder', {
          body: `Good morning! Check today's weather for ${cityName}.`,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'daily-weather',
          actions: [
            {
              action: 'view-weather',
              title: 'View Weather'
            }
          ]
        });
      }
      
      // Schedule next day
      this.scheduleLocalNotification(cityName, time);
    }, timeUntilNotification);
  }

  // Send weather alert notification
  async sendWeatherAlert(alertData) {
    if (!this.isSupported || !this.token) {
      console.log('FCM not available for weather alerts');
      return;
    }

    // This would be called from your server when weather conditions change
    console.log('Weather alert would be sent via FCM:', alertData);
    console.log('Server-side implementation required');
  }

  // Get current FCM token
  getToken() {
    return this.token || localStorage.getItem('fcm-token');
  }

  // Check if FCM is supported and initialized
  isReady() {
    return this.isSupported && this.messaging !== null;
  }
}

// Create singleton instance
const firebaseMessagingManager = new FirebaseMessagingManager();

export default firebaseMessagingManager;
