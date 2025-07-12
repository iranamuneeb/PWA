import React, { useState, useEffect } from 'react';
import backgroundSyncManager from '../api/backgroundSync';
import './BackgroundSync.css';

const BackgroundSync = () => {
  const [queueStatus, setQueueStatus] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    isOnline: navigator.onLine
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initial status
    updateQueueStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      updateQueueStatus();
    };

    const handleOffline = () => {
      updateQueueStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update status every 5 seconds
    const interval = setInterval(updateQueueStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateQueueStatus = () => {
    const status = backgroundSyncManager.getQueueStatus();
    setQueueStatus(status);
  };

  const handleRetryRequests = async () => {
    if (!queueStatus.isOnline) {
      alert('Cannot retry requests while offline. Please check your internet connection.');
      return;
    }

    setIsProcessing(true);
    try {
      await backgroundSyncManager.retryPendingRequests();
      updateQueueStatus();
    } catch (error) {
      console.error('Error retrying requests:', error);
      alert('Error retrying requests. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearQueue = () => {
    if (window.confirm('Are you sure you want to clear all queued requests?')) {
      backgroundSyncManager.clearQueue();
      updateQueueStatus();
    }
  };

  const getConnectionStatus = () => {
    return queueStatus.isOnline ? 'Online' : 'Offline';
  };

  const getConnectionClass = () => {
    return queueStatus.isOnline ? 'online' : 'offline';
  };

  return (
    <div className="background-sync">
      <h3>Background Sync Status</h3>
      
      <div className="sync-status">
        <div className="connection-status">
          <span className="label">Connection:</span>
          <span className={`status ${getConnectionClass()}`}>
            {getConnectionStatus()}
          </span>
        </div>

        <div className="queue-stats">
          <div className="stat-item">
            <span className="stat-label">Total Requests:</span>
            <span className="stat-value">{queueStatus.total}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Pending:</span>
            <span className="stat-value pending">{queueStatus.pending}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Completed:</span>
            <span className="stat-value completed">{queueStatus.completed}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Failed:</span>
            <span className="stat-value failed">{queueStatus.failed}</span>
          </div>
        </div>
      </div>

      {queueStatus.pending > 0 && (
        <div className="pending-notice">
          <p>
            You have {queueStatus.pending} pending weather {queueStatus.pending === 1 ? 'request' : 'requests'}.
            {queueStatus.isOnline 
              ? ' They will be processed automatically.' 
              : ' They will be processed when you come back online.'}
          </p>
        </div>
      )}

      <div className="sync-controls">
        <button 
          onClick={handleRetryRequests}
          disabled={!queueStatus.isOnline || queueStatus.pending === 0 || isProcessing}
          className="retry-btn"
        >
          {isProcessing ? 'Processing...' : 'Retry Pending Requests'}
        </button>
        
        <button 
          onClick={handleClearQueue}
          disabled={queueStatus.total === 0}
          className="clear-btn"
        >
          Clear Queue
        </button>
      </div>

      <div className="sync-info">
        <h4>How Background Sync Works:</h4>
        <ul>
          <li>When you search for weather while offline, the request is queued</li>
          <li>Queued requests are automatically processed when you come back online</li>
          <li>You'll receive notifications when queued searches complete</li>
          <li>Old requests are automatically cleaned up after 24 hours</li>
        </ul>
      </div>
    </div>
  );
};

export default BackgroundSync;
