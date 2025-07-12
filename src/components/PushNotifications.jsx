import React, { useState, useEffect } from 'react';
import firebaseMessagingManager from '../api/firebaseMessaging';
import './PushNotifications.css';

const PushNotifications = () => {
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [fcmSupported, setFcmSupported] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    // Check Web Push support
    const webPushSupport = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(webPushSupport);

    if (webPushSupport) {
      // Check for existing push subscription
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!existingSubscription);
        setSubscription(existingSubscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    }

    // Initialize Firebase Messaging
    try {
      const fcmInitialized = await firebaseMessagingManager.initialize();
      setFcmSupported(fcmInitialized);
      if (fcmInitialized) {
        setFcmToken(firebaseMessagingManager.getToken());
      }
    } catch (error) {
      console.error('Error initializing FCM:', error);
      setFcmSupported(false);
    }
  };

  const handleWebPushSubscribe = async () => {
    setLoading(true);
    try {
      if (!pushSupported) {
        throw new Error('Push notifications are not supported');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      // Note: Replace 'your-vapid-public-key' with your actual VAPID public key
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YlOu_mEjPV1mWgNcjp8HzRH2Qpk1Fqt6sZhNSqFhj1HqJdOXMIhsP'; // Example key
      
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setIsSubscribed(true);
      setSubscription(newSubscription);
      
      // Send subscription to server (placeholder)
      console.log('Push subscription:', newSubscription);
      
      // Show success notification
      setTimeout(() => {
        sendTestNotification();
      }, 1000);
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      alert('Failed to subscribe to push notifications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWebPushUnsubscribe = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        setSubscription(null);
        alert('Successfully unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      alert('Failed to unsubscribe from push notifications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification('Test Push Notification', {
          body: 'This is a test push notification from your Weather App!',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'test-push',
          actions: [
            {
              action: 'view-weather',
              title: 'View Weather'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
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
  };

  const handleFcmTokenRequest = async () => {
    setLoading(true);
    try {
      const token = await firebaseMessagingManager.requestPermission();
      setFcmToken(token);
    } catch (error) {
      console.error('Error getting FCM token:', error);
      alert('Failed to get FCM token: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestWebPush = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification');
    }
  };

  const sendTestWeatherAlert = async () => {
    const alerts = [
      {
        title: 'Weather Alert: Rain Expected',
        body: 'Heavy rain is expected in your area. Don\'t forget your umbrella!',
        data: { type: 'rain-alert' }
      },
      {
        title: 'Weather Alert: Sunny Day',
        body: 'Perfect weather today! Great time for outdoor activities.',
        data: { type: 'sunny-alert' }
      },
      {
        title: 'Weather Alert: Storm Warning',
        body: 'Storm approaching your area. Stay indoors and be safe!',
        data: { type: 'storm-alert' }
      }
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(randomAlert.title, {
          body: randomAlert.body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'weather-alert',
          actions: [
            {
              action: 'view-weather',
              title: 'View Weather'
            }
          ],
          data: randomAlert.data
        });
      }
    } catch (error) {
      console.error('Error sending weather alert:', error);
      alert('Failed to send weather alert');
    }
  };

  const scheduleDailyNotification = async () => {
    const time = '08:00'; // 8 AM
    const cityName = 'Your Location';
    
    try {
      if (isSubscribed) {
        // Schedule local notification
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const timeUntilNotification = scheduledTime.getTime() - now.getTime();
        
        setTimeout(async () => {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            
            await registration.showNotification('Good Morning! ☀️', {
              body: `Check today's weather forecast for ${cityName}!`,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: 'daily-weather',
              actions: [
                {
                  action: 'view-weather',
                  title: 'Check Weather'
                }
              ]
            });
          }
        }, timeUntilNotification);
        
        alert(`Daily weather notification scheduled for ${time} (in ${Math.round(timeUntilNotification / 1000 / 60 / 60)} hours)`);
      } else if (fcmToken) {
        await firebaseMessagingManager.scheduleDailyNotification(cityName, time);
        alert(`Daily FCM notification scheduled for ${time}`);
      } else {
        alert('Please subscribe to push notifications first');
      }
    } catch (error) {
      console.error('Error scheduling daily notification:', error);
      alert('Failed to schedule daily notification');
    }
  };

  return (
    <div className="push-notifications">
      <h3>Push Notifications</h3>
      
      <div className="notification-systems">
        
        {/* Web Push Section */}
        <div className="notification-system">
          <h4>🌐 Web Push Protocol</h4>
          
          <div className="system-status">
            <div className="status-item">
              <span className="label">Supported:</span>
              <span className={`status ${pushSupported ? 'yes' : 'no'}`}>
                {pushSupported ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Subscribed:</span>
              <span className={`status ${isSubscribed ? 'yes' : 'no'}`}>
                {isSubscribed ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {pushSupported && (
            <div className="system-controls">
              {!isSubscribed ? (
                <button 
                  onClick={handleWebPushSubscribe}
                  disabled={loading}
                  className="subscribe-btn"
                >
                  {loading ? 'Subscribing...' : 'Subscribe to Push Notifications'}
                </button>
              ) : (
                <div className="subscribed-controls">
                  <button 
                    onClick={handleWebPushUnsubscribe}
                    disabled={loading}
                    className="unsubscribe-btn"
                  >
                    {loading ? 'Unsubscribing...' : 'Unsubscribe'}
                  </button>
                  
                  <button 
                    onClick={sendTestWebPush}
                    className="test-btn"
                  >
                    Send Test Push
                  </button>
                </div>
              )}
            </div>
          )}

          {!pushSupported && (
            <p className="not-supported">
              Push notifications are not supported in this browser.
            </p>
          )}
        </div>

        {/* Firebase Cloud Messaging Section */}
        <div className="notification-system">
          <h4>🔥 Firebase Cloud Messaging</h4>
          
          <div className="system-status">
            <div className="status-item">
              <span className="label">Supported:</span>
              <span className={`status ${fcmSupported ? 'yes' : 'no'}`}>
                {fcmSupported ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">Token:</span>
              <span className={`status ${fcmToken ? 'yes' : 'no'}`}>
                {fcmToken ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>

          {!fcmSupported ? (
            <div className="fcm-setup">
              <p>To enable Firebase Cloud Messaging:</p>
              <ol>
                <li>Create a Firebase project</li>
                <li>Add Firebase SDK to your app</li>
                <li>Configure Firebase in firebaseMessaging.js</li>
                <li>Add your VAPID key</li>
              </ol>
              <p className="note">
                FCM provides more reliable push notifications and works across all platforms.
              </p>
            </div>
          ) : (
            <div className="system-controls">
              {!fcmToken ? (
                <button 
                  onClick={handleFcmTokenRequest}
                  disabled={loading}
                  className="subscribe-btn"
                >
                  {loading ? 'Getting Token...' : 'Get FCM Token'}
                </button>
              ) : (
                <div className="subscribed-controls">
                  <p className="token-info">FCM token available for server-side messaging</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Demo Controls */}
      {(isSubscribed || fcmToken) && (
        <div className="demo-controls">
          <h4>Notification Demos</h4>
          
          <div className="demo-buttons">
            <button 
              onClick={sendTestWeatherAlert}
              className="demo-btn alert"
            >
              Send Weather Alert
            </button>
            
            <button 
              onClick={scheduleDailyNotification}
              className="demo-btn schedule"
            >
              Schedule Daily Reminder (8 AM)
            </button>
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="push-info">
        <h4>Push Notification Features:</h4>
        <ul>
          <li><strong>Daily Weather Reminders:</strong> Morning notifications to check weather</li>
          <li><strong>Weather Alerts:</strong> Urgent notifications for severe weather</li>
          <li><strong>Background Sync:</strong> Notifications when offline searches complete</li>
          <li><strong>Cross-Platform:</strong> Works on desktop and mobile devices</li>
        </ul>

        <h4>Technical Implementation:</h4>
        <ul>
          <li><strong>Web Push Protocol:</strong> Native browser push notifications</li>
          <li><strong>Firebase Cloud Messaging:</strong> Google's reliable push service</li>
          <li><strong>Service Worker:</strong> Background processing and notification handling</li>
          <li><strong>VAPID:</strong> Voluntary Application Server Identification for security</li>
        </ul>
      </div>
    </div>
  );
};

export default PushNotifications;
