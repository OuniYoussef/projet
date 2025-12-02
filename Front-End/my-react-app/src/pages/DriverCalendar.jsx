import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DriverCalendar.css';
import { getWeatherBatch, getDefaultWeather } from '../utils/weatherApi';
import AvailabilitySettings from '../components/AvailabilitySettings';

// Calendar component for delivery driver dashboard
export default function DriverCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [weatherData, setWeatherData] = useState({});
  const [monthlyStats, setMonthlyStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    noDaysWithoutDelay: 0,
    bonusProgress: 0
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/auth';
  const token = localStorage.getItem('access_token');

  // Fetch calendar data
  useEffect(() => {
    if (token) {
      fetchCalendarData();
      fetchAvailability();
    } else {
      // Demo mode - generate sample data
      generateSampleData();
    }
  }, [currentDate, token]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(
        `${API_BASE_URL}/driver/calendar/?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Use real API data (even if empty - no demo fallback)
          setDeliveryDays(data);
          calculateMonthlyStats(data);

          // Fetch weather data for all delivery days if any exist
          if (data.length > 0) {
            const dates = data.map(d => new Date(d.delivery_date));
            const weather = await getWeatherBatch(36.8065, 10.1686, dates);
            const weatherMap = {};
            dates.forEach((date, index) => {
              const dateStr = date.toISOString().split('T')[0];
              weatherMap[dateStr] = weather[index];
            });
            setWeatherData(weatherMap);
          }
        } else {
          // Invalid response format
          setDeliveryDays([]);
        }
      } else {
        // API error - show empty calendar, not demo data
        console.error('API Error:', response.status);
        setDeliveryDays([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du calendrier:', error);
      // Network error - show empty calendar
      setDeliveryDays([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/availability/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la disponibilité:', error);
    }
  };

  const fetchDeliveryHistory = async (dayId) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE_URL}/driver/delivery-day/${dayId}/history/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedDayDetails(data);
      } else {
        console.error('Erreur lors du chargement de l\'historique');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const calculateMonthlyStats = (days) => {
    const stats = {
      totalDeliveries: days.reduce((sum, day) => sum + day.num_deliveries, 0),
      totalEarnings: days.reduce((sum, day) => sum + day.total_earnings, 0),
      noDaysWithoutDelay: days.filter(day => day.performance_rating !== 'poor').length,
      bonusProgress: 0
    };

    // Calculate bonus progress (out of 120 deliveries)
    stats.bonusProgress = Math.min((stats.totalDeliveries / 120) * 100, 100);

    setMonthlyStats(stats);
  };

  const getDaysInMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  };

  const generateSampleData = async () => {
    // Generate demo data for current month
    const daysInMonth = getDaysInMonth();
    const sampleDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      if (Math.random() > 0.3) { // 70% of days have deliveries
        const deliveryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const numDeliveries = Math.floor(Math.random() * 6) + 2;
        const distance = Math.random() * 20 + 5;
        const earnings = numDeliveries * 10 + Math.random() * 5;

        let rating = 'good';
        if (numDeliveries >= 5 && distance < 15) rating = 'excellent';
        else if (numDeliveries <= 2) rating = 'average';

        // Generate sample assignments for demo mode
        const assignments = [];
        for (let i = 0; i < numDeliveries; i++) {
          const statuses = ['assigned', 'accepted', 'completed', 'confirmed'];
          assignments.push({
            id: `demo-${day}-${i}`,
            status: statuses[Math.floor(Math.random() * statuses.length)]
          });
        }

        sampleDays.push({
          id: day,
          delivery_date: deliveryDate.toISOString().split('T')[0],
          num_deliveries: numDeliveries,
          total_distance: distance,
          total_earnings: earnings,
          estimated_time: Math.round((distance / 30) * 60) + 15,
          performance_rating: rating,
          is_available: true,
          assignments: assignments,
          routes: []
        });
      }
    }

    setDeliveryDays(sampleDays);
    calculateMonthlyStats(sampleDays);

    // Fetch weather data
    if (sampleDays.length > 0) {
      const dates = sampleDays.map(d => new Date(d.delivery_date));
      const weather = await getWeatherBatch(36.8065, 10.1686, dates);
      const weatherMap = {};
      dates.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        weatherMap[dateStr] = weather[index];
      });
      setWeatherData(weatherMap);
    }
  };

  const getDayColor = (dayData) => {
    if (!dayData || dayData.num_deliveries === 0) {
      return 'grey'; 
    }

    const assignments = dayData.assignments || [];
    if (assignments.length === 0) return 'grey';

    const totalCount = assignments.length;

    // Compter les statuts réels
    const confirmedCount = assignments.filter(a => a.status === 'confirmed').length;
    const completedCount = assignments.filter(a => a.status === 'completed').length;
    const deliveredOrConfirmedCount = confirmedCount + completedCount;

    
    if (confirmedCount === totalCount) {
      return 'green';
    }

    if (deliveredOrConfirmedCount === totalCount) {
      return 'orange';
    }

    if (deliveredOrConfirmedCount > 0) {
      return 'yellow';
    }

    return 'red';
  };

  const getWeatherEmoji = (deliveryDate) => {
    const dateStr = new Date(deliveryDate).toISOString().split('T')[0];
    const weather = weatherData[dateStr];
    return weather ? weather.emoji : '☁️';
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDay(null);
  };

  const handleDayClick = (dayNumber) => {
    const dayData = deliveryDays.find(
      day => new Date(day.delivery_date).getDate() === dayNumber
    );
    setSelectedDay(dayData || { delivery_date: new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber) });
    setSelectedDayDetails(null);
    setShowDayDetailsModal(true);

    if (dayData && dayData.id && token) {
      fetchDeliveryHistory(dayData.id);
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayData = deliveryDays.find(
        d => new Date(d.delivery_date).getDate() === day
      );

      const color = getDayColor(dayData);

      const assignments = dayData?.assignments || [];
      const completedCount = assignments.filter(a => a.status === 'completed' || a.status === 'confirmed').length;
      const totalCount = dayData?.num_deliveries || 0;

      days.push(
        <div
          key={day}
          className={`calendar-day calendar-day-${color}`}
          onClick={() => handleDayClick(day)}
        >
          <div className="day-number">{day}</div>
          {dayData && totalCount > 0 ? (
            <>
              <div className="day-emoji">📦 {totalCount}</div>
              <div className="day-delivered">✓ {completedCount}/{totalCount}</div>
              <div className="day-earnings">💰 {dayData.total_earnings.toFixed(0)}TND</div>
            </>
          ) : null}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="driver-calendar-container">
      <div className="calendar-wrapper">
        {/* Header */}
        <div className="calendar-header">
          <h1>📅 Calendrier de Livraisons</h1>
          <p>Suivi mensuel de vos performances</p>
        </div>

        {/* Month Navigation */}
        <div className="month-navigation">
          <button onClick={handlePreviousMonth} className="nav-button prev">
            ← Mois Précédent
          </button>
          <h2 className="current-month">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={handleNextMonth} className="nav-button next">
            Mois Suivant →
          </button>
        </div>

        <div className="calendar-main">
          {/* Calendar Grid */}
          <div className="calendar-section full-width">
            {/* Weekday headers */}
            <div className="calendar-weekdays">
              <div className="weekday">Lun</div>
              <div className="weekday">Mar</div>
              <div className="weekday">Mer</div>
              <div className="weekday">Jeu</div>
              <div className="weekday">Ven</div>
              <div className="weekday">Sam</div>
              <div className="weekday">Dim</div>
            </div>

            <div className="calendar-grid">
              {renderCalendarDays()}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-color green"></span> Toutes confirmées (100%)
              </div>
              <div className="legend-item">
                <span className="legend-color orange"></span> Toutes livrées (100%)
              </div>
              <div className="legend-item">
                <span className="legend-color yellow"></span> Partiellement livrées
              </div>
              <div className="legend-item">
                <span className="legend-color red"></span> Aucune livrée (0%)
              </div>
              <div className="legend-item">
                <span className="legend-color grey"></span> Non assignée
              </div>
            </div>

            {/* Monthly Objectives Bar */}
            <div className="monthly-objectives-bar">
              <button
                className="objectives-btn"
                onClick={() => setShowAvailabilityModal(true)}
              >
                 | 💰 {monthlyStats.totalEarnings.toFixed(2)} TND | ⚙️ Disponibilité
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {showDayDetailsModal && selectedDay && (
        <div className="modal-overlay" onClick={() => setShowDayDetailsModal(false)}>
          <div className="day-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2> Détails du {new Date(selectedDay.delivery_date).getDate()}</h2>
              <button
                className="close-icon-btn"
                onClick={() => setShowDayDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {selectedDay.num_deliveries ? (
                <>
                  <div className="detail-card">
                    <div className="detail-label">Livraisons</div>
                    <div className="detail-value">{selectedDay.num_deliveries}</div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Distance Totale</div>
                    <div className="detail-value">{selectedDay.total_distance.toFixed(2)} km</div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Revenus</div>
                    <div className="detail-value earnings">{selectedDay.total_earnings.toFixed(2)} TND</div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Performance</div>
                    <div className="detail-value">{selectedDay.performance_rating}</div>
                  </div>

                  <div className="delivery-history-section">
                    <h4> Historique des Livraisons</h4>
                    {loadingDetails ? (
                      <div className="loading-message">Chargement...</div>
                    ) : selectedDayDetails && selectedDayDetails.deliveries && selectedDayDetails.deliveries.length > 0 ? (
                      <div className="deliveries-list">
                        {selectedDayDetails.deliveries.map((delivery) => (
                          <div key={delivery.id} className="delivery-item">
                            <div className="delivery-header">
                              <span className="delivery-order">#{delivery.route_order}</span>
                              <span className="delivery-number">{delivery.order_number}</span>
                              <span className={`delivery-status ${delivery.status}`}>
                                {delivery.status === 'completed' ? '✅' : '⏳'} {delivery.status}
                              </span>
                            </div>
                            <div className="delivery-info">
                              <div className="info-row">
                                <span className="label">Client:</span>
                                <span className="value">{delivery.customer_name}</span>
                              </div>
                              <div className="info-row">
                                <span className="label">Adresse:</span>
                                <span className="value">{delivery.shipping_address}, {delivery.shipping_city}</span>
                              </div>
                              <div className="info-row">
                                <span className="label">Articles:</span>
                                <span className="value">{delivery.items_count}</span>
                              </div>
                              <div className="info-row">
                                <span className="label">Total:</span>
                                <span className="value earning">{delivery.total.toFixed(2)} TND</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-deliveries">Aucune livraison pour ce jour</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-data">Aucune livraison prévue</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <AvailabilitySettings onClose={() => setShowAvailabilityModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
