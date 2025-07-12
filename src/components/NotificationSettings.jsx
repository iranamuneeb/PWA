import React, { useState, useEffect } from 'react';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [dailyNotifications, setDailyNotifications] = useState(false);
  const [notificationTime, setNotificationTime] = useState('08:00');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = JSON.parse(localStorage.getItem('notificationSettings')) || {};
    setDailyNotifications(savedSettings.dailyNotifications || false);
    setNotificationTime(savedSettings.notificationTime || '08:00');

    // Set up daily notification if enabled
    if (savedSettings.dailyNotifications && notificationPermission === 'granted') {
      scheduleDailyNotification(savedSettings.notificationTime);
    }
  }, [notificationPermission]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('Weather App', {
          body: 'Notifications enabled! You\'ll receive daily weather reminders.',
          icon: '/logo.png',
          badge: '/logo.png'
        });
      }
    } else {
      alert('This browser does not support notifications');
    }
  };

  const handleDailyNotificationToggle = (enabled) => {
    setDailyNotifications(enabled);
    
    const settings = {
      dailyNotifications: enabled,
      notificationTime: notificationTime
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    if (enabled && notificationPermission === 'granted') {
      scheduleDailyNotification(notificationTime);
    } else {
      clearDailyNotification();
    }
  };

  const handleTimeChange = (time) => {
    setNotificationTime(time);
    
    const settings = {
      dailyNotifications: dailyNotifications,
      notificationTime: time
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    if (dailyNotifications && notificationPermission === 'granted') {
      scheduleDailyNotification(time);
    }
  };

  const scheduleDailyNotification = (time) => {
    // Clear any existing scheduled notifications
    clearDailyNotification();
    
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      sendDailyWeatherNotification();
      // Schedule the next day's notification
      scheduleDailyNotification(time);
    }, timeUntilNotification);
    
    localStorage.setItem('notificationTimeoutId', timeoutId);
  };

  const clearDailyNotification = () => {
    const timeoutId = localStorage.getItem('notificationTimeoutId');
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      localStorage.removeItem('notificationTimeoutId');
    }
  };

  const sendDailyWeatherNotification = async () => {
    if (notificationPermission === 'granted') {
      // Try to use Service Worker notification with actions if available
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification('Weather Reminder', {
            body: 'Good morning! Check today\'s weather forecast.',
            icon: '/logo.png',
            badge: '/logo.png',
            actions: [
              {
                action: 'view-weather',
                title: 'View Weather'
              }
            ],
            tag: 'daily-weather',
            renotify: true
          });
        } catch (error) {
          console.warn('Service Worker notification failed, using regular notification:', error);
          // Fallback to regular notification without actions
          new Notification('Weather Reminder', {
            body: 'Good morning! Check today\'s weather forecast.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'daily-weather',
            renotify: true
          });
        }
      } else {
        // Fallback to regular notification without actions
        new Notification('Weather Reminder', {
          body: 'Good morning! Check today\'s weather forecast.',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'daily-weather',
          renotify: true
        });
      }
    }
  };

  const sendTestNotification = () => {
    if (notificationPermission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from your Weather App!',
        icon: '/logo.png',
        badge: '/logo.png'
      });
    } else {
      alert('Please enable notifications first');
    }
  };

  return (
    <div className="notification-settings">
      <h3>Notification Settings</h3>
      
      <div className="permission-section">
        <p>Notification Permission: <span className={`status ${notificationPermission}`}>
          {notificationPermission}
        </span></p>
        
        {notificationPermission === 'default' && (
          <button onClick={requestNotificationPermission} className="enable-btn">
            Enable Notifications
          </button>
        )}
        
        {notificationPermission === 'denied' && (
          <p className="denied-text">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </div>

      {notificationPermission === 'granted' && (
        <div className="settings-section">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={dailyNotifications}
                onChange={(e) => handleDailyNotificationToggle(e.target.checked)}
              />
              Daily weather reminders
            </label>
          </div>

          {dailyNotifications && (
            <div className="setting-item">
              <label>
                Notification time:
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
              </label>
            </div>
          )}

          <button onClick={sendTestNotification} className="test-btn">
            Send Test Notification
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
