import React, { useEffect } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { useNotification } from "../context/NotificationContext";

export default function Layout({ children }) {
  const { addNotification } = useNotification();

  // Notification polling - check for order status changes every 10 seconds
  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return; // Only poll if user is authenticated

        // Try to fetch user's orders from backend
        const response = await fetch('http://localhost:8000/api/auth/orders/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('Order API not available, status:', response.status);
          return;
        }

        let orders = await response.json();

        // Handle both array and paginated response
        if (orders.results && Array.isArray(orders.results)) {
          orders = orders.results;
        } else if (!Array.isArray(orders)) {
          console.warn('Unexpected order response format:', orders);
          return;
        }

        // Check each order for status changes and send notifications
        orders.forEach(order => {
          if (!order.id) return; // Skip if no ID

          const acceptedNotified = localStorage.getItem(`notified_${order.id}_accepted`) === 'true';
          const completedNotified = localStorage.getItem(`notified_${order.id}_completed`) === 'true';

          // Check if order is accepted by driver
          if ((order.status === 'accepted' || order.status === 'in_transit') && !acceptedNotified) {
            console.log('Adding delivery_accepted notification for order:', order.id);
            addNotification({
              type: 'delivery_accepted',
              orderNumber: order.order_number || order.id,
              message: `Commande ${order.order_number || order.id} en cours de livraison`,
              autoClose: false
            });
            localStorage.setItem(`notified_${order.id}_accepted`, 'true');
          }

          // Check if order is completed/delivered
          if ((order.status === 'completed' || order.status === 'delivered' || order.status === 'ready_for_pickup') && !completedNotified) {
            console.log('Adding delivery_confirmed notification for order:', order.id);
            addNotification({
              type: 'delivery_confirmed',
              orderNumber: order.order_number || order.id,
              message: `Commande ${order.order_number || order.id} marquée comme livrée`,
              onAction: (action) => handleDeliveryConfirmation(order.id, action),
              autoClose: false
            });
            localStorage.setItem(`notified_${order.id}_completed`, 'true');
          }
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    // Poll every 15 seconds (increased from 10 to reduce server load)
    const interval = setInterval(pollNotifications, 15000);

    // Initial poll on mount (delayed by 2 seconds to avoid race conditions)
    const timeoutId = setTimeout(pollNotifications, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [addNotification]);

  const handleDeliveryConfirmation = async (orderId, action) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`http://localhost:8000/api/auth/orders/${orderId}/confirm-delivery/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmed: action === 'confirm',
          status: action === 'confirm' ? 'received' : 'disputed'
        })
      });

      if (response.ok) {
        console.log(`Order ${orderId} delivery confirmation: ${action}`);
        // Clear the notification flag for this order
        localStorage.removeItem(`notified_${orderId}_completed`);
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      margin: 0,
      padding: 0,
      width: '100%'
    }}>
      <Header />
      <main style={{
        flex: '1',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0
      }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
