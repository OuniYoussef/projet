import React, { useState, useEffect } from 'react';
import './DriverDashboard.css';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from '../components/WeatherWidget';
import MiniCalendar from '../components/MiniCalendar';
import DeliveryMap from '../components/DeliveryMap';
import { useNotification } from '../context/NotificationContext';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { addNotification, fetchNotifications } = useNotification();
  const [driverProfile, setDriverProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned'); // assigned, accepted, completed
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deliveryType, setDeliveryType] = useState('Economy');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Fetch driver profile and orders
    fetchDriverData(token);
  }, [navigate]);

  const fetchDriverData = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/driver/dashboard/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch driver data');
      }

      const data = await response.json();
      setDriverProfile(data.driver);
      setOrders(data.assignments || []);
      if (data.assignments && data.assignments.length > 0) {
        setSelectedOrder(data.assignments[0]);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
      alert('Erreur lors du chargement des données du livreur');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (assignmentId) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`http://localhost:8000/api/auth/driver/orders/${assignmentId}/accept/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          message: 'Commande acceptée avec succès!',
          autoClose: true
        });
        fetchNotifications();
        fetchDriverData(token);
      } else {
        addNotification({
          type: 'error',
          message: 'Erreur lors de l\'acceptation de la commande',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      addNotification({
        type: 'error',
        message: `Erreur: ${error.message}`,
        autoClose: true
      });
    }
  };

  const handleRejectOrder = async (assignmentId) => {
    const token = localStorage.getItem('access_token');
    const reason = prompt('Raison du refus (optionnel):', '');

    try {
      const response = await fetch(`http://localhost:8000/api/auth/driver/orders/${assignmentId}/reject/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'Non spécifiée' })
      });

      if (response.ok) {
        addNotification({
          type: 'info',
          message: 'Commande refusée',
          autoClose: true
        });
        fetchNotifications();
        fetchDriverData(token);
      } else {
        addNotification({
          type: 'error',
          message: 'Erreur lors du refus de la commande',
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      addNotification({
        type: 'error',
        message: `Erreur: ${error.message}`,
        autoClose: true
      });
    }
  };

  const handleMarkDelivered = async (assignmentId) => {
    const token = localStorage.getItem('access_token');
    try {
      console.log('Marking order as delivered, assignmentId:', assignmentId);
      const response = await fetch(`http://localhost:8000/api/auth/driver/orders/${assignmentId}/complete/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json().catch(() => ({}));
      console.log('Response status:', response.status, 'Data:', responseData);

      if (response.ok) {
        addNotification({
          type: 'success',
          message: 'Commande marquée comme livrée!',
          autoClose: true
        });
        fetchNotifications();
        fetchDriverData(token);
      } else {
        const errorMsg = responseData.detail || responseData.message || 'Erreur lors du marquage de la commande comme livrée';
        addNotification({
          type: 'error',
          message: errorMsg,
          autoClose: true
        });
      }
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      addNotification({
        type: 'error',
        message: `Erreur: ${error.message}`,
        autoClose: true
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  if (loading) {
    return <div className="driver-dashboard loading">Chargement...</div>;
  }

  if (!driverProfile) {
    return <div className="driver-dashboard error">Erreur: Impossible de charger le profil du livreur</div>;
  }

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'assigned') return order.status === 'assigned';
    if (activeTab === 'accepted') return order.status === 'accepted';
    if (activeTab === 'completed') return order.status === 'completed';
    return true;
  });

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate.getDate();
      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${day > 15 ? 'highlight' : ''}`}
          onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="driver-dashboard">
      <div className="sidebar-left">
        <WeatherWidget />
        <MiniCalendar />

        
      </div>

      <div className="main-content">
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Tableau de Bord du Livreur</h1>
            <p>Bienvenue, {driverProfile.first_name} {driverProfile.last_name}</p>
          </div>
        </div>

        <div className="map-full-container">
          <DeliveryMap />
        </div>

        <div className="quick-orders-panel">
          <div className="quick-orders-header">
            <h3>Commandes ({orders.length})</h3>
            <div className="quick-filter-tabs">
              <button
                className={`quick-tab ${activeTab === 'assigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('assigned')}
              >
                Assignées ({orders.filter(o => o.status === 'assigned').length})
              </button>
              <button
                className={`quick-tab ${activeTab === 'accepted' ? 'active' : ''}`}
                onClick={() => setActiveTab('accepted')}
              >
                Acceptées ({orders.filter(o => o.status === 'accepted').length})
              </button>
              <button
                className={`quick-tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Livrées ({orders.filter(o => o.status === 'completed').length})
              </button>
            </div>
          </div>

          <div className="quick-orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`quick-order-item ${selectedOrder?.id === order.id ? 'active' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="quick-order-info">
                    <span className="quick-order-number">#{order.order_number}</span>
                    <span className="quick-order-address">{order.order_details?.shipping_city}</span>
                    <span className="quick-order-total">${order.order_details?.total || 0}</span>
                  </div>
                  <span className={`quick-status-badge ${order.status}`}>{order.status}</span>
                </div>
              ))
            ) : (
              <p className="no-orders-quick">Aucune commande dans cette catégorie</p>
            )}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="order-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Commande #{selectedOrder.order_number}</h3>
              <button
                className="modal-close"
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="package-info">
                <div className="info-item">
                  <span></span>
                  <div>
                    <p className="label">Colis</p>
                    <p className="value">{selectedOrder.order_details?.items?.length || 0} articles</p>
                  </div>
                </div>
                <div className="info-item">
                  <span></span>
                  
                </div>
                <div className="info-item">
                  <span></span>
                  <div>
                    <p className="label">Total</p>
                    <p className="value">${selectedOrder.order_details?.total || 0}</p>
                  </div>
                </div>
              </div>

              <div className="order-items">
                <h4>Articles:</h4>
                {selectedOrder.order_details?.items?.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.product_name}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="shipping-info">
                <h4>Adresse de Livraison:</h4>
                <p>{selectedOrder.order_details?.shipping_address}</p>
                <p>{selectedOrder.order_details?.shipping_city}, {selectedOrder.order_details?.shipping_postal_code}</p>
              </div>

              <div className="payment-method">
                <p><strong>Méthode de Paiement:</strong> {selectedOrder.order_details?.payment_method}</p>
              </div>
            </div>

            <div className="modal-footer">
              {selectedOrder.status === 'assigned' && (
                <>
                  <button
                    className="btn-accept"
                    onClick={() => {
                      handleAcceptOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                  >
                    ✓ Accepter
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => {
                      handleRejectOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                  >
                    ✗ Refuser
                  </button>
                </>
              )}

              {selectedOrder.status === 'accepted' && (
                <button
                  className="btn-mark-delivered"
                  onClick={() => {
                    handleMarkDelivered(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                >
                  ✓ Marquer comme Livrée
                </button>
              )}

              <button
                className="btn-close-modal"
                onClick={() => setSelectedOrder(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
