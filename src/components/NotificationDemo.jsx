import React, { useState, useEffect } from 'react';
import './NotificationDemo.css';

const NotificationDemo = () => {
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const sendSimpleNotification = async () => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      const notification = new Notification('Weather Update', {
        body: 'Check out the latest weather conditions!',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'weather-update'
      });

      notification.onclick = () => {
        console.log('Notification clicked');
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  };

  const sendServiceWorkerNotification = async () => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        // Send message to service worker to show notification
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('Weather Service Alert', {
            body: 'This notification is sent from the service worker!',
            icon: '/logo.png',
            badge: '/logo.png',
            actions: [
              {
                action: 'view-weather',
                title: 'View Weather',
                icon: '/logo.png'
              }
            ],
            tag: 'sw-weather-alert',
            vibrate: [200, 100, 200],
            data: {
              url: '/'
            }
          });
        });
      }
    }
  };

  const sendScheduledNotification = () => {
    const permission = notificationPermission;
    
    if (permission === 'granted') {
      setTimeout(() => {
        new Notification('Scheduled Weather Reminder', {
          body: 'This notification was scheduled 3 seconds ago!',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'scheduled-reminder'
        });
      }, 3000);
      
      alert('Notification scheduled for 3 seconds from now!');
    } else {
      requestNotificationPermission().then((newPermission) => {
        if (newPermission === 'granted') {
          sendScheduledNotification();
        }
      });
    }
  };

  const sendWeatherAlert = async () => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      // Simulate a weather alert
      const alerts = [
        {
          title: 'Weather Alert: Rain Expected',
          body: 'Heavy rain is expected in your area. Don\'t forget your umbrella!',
          icon: '🌧️'
        },
        {
          title: 'Weather Alert: Sunny Day',
          body: 'Perfect weather today! Great time for outdoor activities.',
          icon: '☀️'
        },
        {
          title: 'Weather Alert: Storm Warning',
          body: 'Storm approaching your area. Stay indoors and be safe!',
          icon: '⛈️'
        }
      ];
      
      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
      
      new Notification(randomAlert.title, {
        body: randomAlert.body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'weather-alert',
        requireInteraction: true // Keeps notification until user interacts
      });
    }
  };

  return (
    <div className="notification-demo">
      <h3>Notification Demo</h3>
      <p>Test different types of notifications for your weather app:</p>
      
      <div className="demo-section">
        <div className="permission-status">
          <strong>Permission Status:</strong> 
          <span className={`status ${notificationPermission}`}>
            {notificationPermission}
          </span>
        </div>
        
        <div className="support-status">
          <strong>Push Notifications:</strong> 
          <span className={pushSupported ? 'supported' : 'not-supported'}>
            {pushSupported ? 'Supported' : 'Not Supported'}
          </span>
        </div>
      </div>

      <div className="demo-buttons">
        <button onClick={sendSimpleNotification} className="demo-btn simple">
          Send Simple Notification
        </button>
        
        <button onClick={sendServiceWorkerNotification} className="demo-btn service-worker">
          Send Service Worker Notification
        </button>
        
        <button onClick={sendScheduledNotification} className="demo-btn scheduled">
          Send Scheduled Notification (3s)
        </button>
        
        <button onClick={sendWeatherAlert} className="demo-btn alert">
          Send Weather Alert
        </button>
      </div>

      <div className="demo-info">
        <h4>Notification Types:</h4>
        <ul>
          <li><strong>Simple:</strong> Basic browser notification</li>
          <li><strong>Service Worker:</strong> Notification through service worker (works offline)</li>
          <li><strong>Scheduled:</strong> Delayed notification</li>
          <li><strong>Weather Alert:</strong> Simulated weather warning with actions</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationDemo;
