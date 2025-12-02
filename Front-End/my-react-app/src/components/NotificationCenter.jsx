import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import './NotificationCenter.css';

export default function NotificationCenter() {
  const {
    notifications,
    removeNotification,
    markAsRead,
    markAllAsRead,
    handleNotificationAction,
    deleteNotification,
    isLoading
  } = useNotification();
  const [showDropdown, setShowDropdown] = useState(false);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read && !n.isSystemMessage).length;

  // Handle action on delivery confirmation notifications
  const handleDeliveryAction = async (notificationId, action) => {
    try {
      await handleNotificationAction(notificationId, action);
      // Notification will be auto-removed after action is processed
    } catch (error) {
      console.error('Error handling delivery action:', error);
    }
  };

  // Handle closing a notification
  const handleCloseNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Error closing notification:', error);
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Handle clear all
  const handleClearAll = async () => {
    try {
      await markAllAsRead();
      setShowDropdown(false);
    } catch (error) {
      console.error('Error clearing all:', error);
    }
  };

  // Map notification types to icons and colors
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_confirmed':
        return '✅';
      case 'order_assigned':
        return '📦';
      case 'order_accepted':
        return '🚚';
      case 'order_rejected':
        return '❌';
      case 'order_in_transit':
        return '🚛';
      case 'order_delivered':
        return '📍';
      case 'delivery_confirmed':
        return '✅';
      case 'delivery_rejected':
        return '❌';
      case 'order_cancelled':
        return '🚫';
      default:
        return '🔔';
    }
  };

  // Filter to show backend notifications, sort by date
  const displayNotifications = notifications
    .filter(n => !n.isSystemMessage)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="notification-center">
      {/* Notification Bell Icon */}
      <div
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
        title={unreadCount > 0 ? `${unreadCount} nouvelle(s) notification(s)` : 'Notifications'}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="clear-all" onClick={handleClearAll}>
                {isLoading ? 'Chargement...' : 'Marquer tout comme lu'}
              </span>
            )}
          </div>

          <div className="notification-list">
            {displayNotifications.length === 0 ? (
              <div className="no-notifications">
                <p>Aucune notification</p>
              </div>
            ) : (
              displayNotifications.map(notification => (
                <div
                  key={notification.backend_id || notification.id}
                  className={`notification-item ${notification.type} ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.backend_id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="notification-content">
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <span className="notification-time">
                      {new Date(notification.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Action Buttons for order_delivered (customer confirmation) */}
                  {notification.type === 'order_delivered' && !notification.action_taken && (
                    <div className="notification-actions">
                      <button
                        className="btn-confirm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeliveryAction(notification.backend_id, 'confirmed');
                        }}
                        title="Confirmer la réception"
                      >
                        ✓
                      </button>
                      <button
                        className="btn-reject"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeliveryAction(notification.backend_id, 'rejected');
                        }}
                        title="Refuser la livraison"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Close button for other notifications */}
                  {(notification.type !== 'order_delivered' || notification.action_taken) && (
                    <button
                      className="close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseNotification(notification.backend_id);
                      }}
                      title="Fermer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div
          className="notification-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
