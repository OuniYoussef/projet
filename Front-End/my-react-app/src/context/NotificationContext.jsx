import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const NotificationContext = createContext();

const API_BASE_URL = 'http://localhost:8000/api/accounts';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/notifications/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Transform backend notifications to frontend format
      const backendNotifications = response.data.results || response.data;
      const transformedNotifications = backendNotifications.map(notif => ({
        id: notif.id,
        type: notif.notification_type,
        message: notif.message,
        timestamp: new Date(notif.created_at),
        is_read: notif.is_read,
        notification_type_display: notif.notification_type_display,
        order_id: notif.order_id,
        driver_id: notif.driver_id,
        order_assignment_id: notif.order_assignment_id,
        // Preserve backend ID for API calls
        backend_id: notif.id,
      }));

      setNotifications(transformedNotifications);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const backendId = notificationId;

    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${backendId}/mark-as-read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.backend_id === backendId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      await axios.post(
        `${API_BASE_URL}/notifications/mark-all-as-read/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const backendId = notificationId;

    try {
      await axios.delete(
        `${API_BASE_URL}/notifications/${backendId}/delete/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev => prev.filter(n => n.backend_id !== backendId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Handle notification action (confirm/reject delivery)
  const handleNotificationAction = useCallback(async (notificationId, action) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const backendId = notificationId;

    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${backendId}/action/`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.backend_id === backendId ? { ...n, action_taken: action } : n)
      );

      // Refetch to get fresh data
      await fetchNotifications();
    } catch (err) {
      console.error('Error handling notification action:', err);
    }
  }, [fetchNotifications]);

  // Legacy addNotification for toast-style notifications (system messages)
  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const notif = {
      id,
      backend_id: id,
      type: notification.type || 'info',
      message: notification.message,
      timestamp: new Date(),
      is_read: false,
      isSystemMessage: true, // Flag to indicate this is a system message, not from backend
    };

    setNotifications(prev => [notif, ...prev]);

    // Auto remove toast after 5 seconds
    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.backend_id !== id && n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      // Delete all unread notifications
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const notif of unreadNotifications) {
        await deleteNotification(notif.backend_id);
      }
    } catch (err) {
      console.error('Error clearing all notifications:', err);
    }
  }, [notifications, deleteNotification]);

  // Setup polling for real-time notifications (10 seconds interval)
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up polling interval
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [fetchNotifications]);

  // Refetch when token changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        fetchNotifications();
      } else {
        setNotifications([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      isLoading,
      error,
      addNotification,
      removeNotification,
      clearAll,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      handleNotificationAction,
      fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
