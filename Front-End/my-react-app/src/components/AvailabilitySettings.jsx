import React, { useState, useEffect } from 'react';
import '../styles/AvailabilitySettings.css';

export default function AvailabilitySettings({ onClose }) {
  const [availability, setAvailability] = useState({
    monday: { available: true, start_time: '08:00', end_time: '18:00' },
    tuesday: { available: true, start_time: '08:00', end_time: '18:00' },
    wednesday: { available: true, start_time: '08:00', end_time: '18:00' },
    thursday: { available: true, start_time: '08:00', end_time: '18:00' },
    friday: { available: true, start_time: '08:00', end_time: '18:00' },
    saturday: { available: false, start_time: '08:00', end_time: '18:00' },
    sunday: { available: false, start_time: '08:00', end_time: '18:00' }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/auth';
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (token) {
      fetchAvailability();
    }
  }, [token]);

  const fetchAvailability = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/driver/availability/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Convertir les données du backend au format frontend
        const formattedData = {};
        const daysNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const daysMap = {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday'
        };

        daysNames.forEach(day => {
          const backendDayName = daysMap[day];
          const dayData = data.working_days?.[backendDayName] || {};
          formattedData[day] = {
            available: dayData.available !== false,
            start_time: dayData.start_time || '08:00',
            end_time: dayData.end_time || '18:00'
          };
        });

        setAvailability(formattedData);
      } else if (response.status === 404) {
        console.log('Pas de données d\'availability existantes');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la disponibilité:', error);
      setError('Impossible de charger les données');
    }
  };

  const handleToggle = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day].available
      }
    }));
  };

  const handleTimeChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Validation simple
    for (const day of Object.keys(availability)) {
      const dayData = availability[day];
      if (dayData.available && dayData.start_time >= dayData.end_time) {
        setError('L\'heure de début doit être antérieure à l\'heure de fin');
        return;
      }
    }

    setLoading(true);
    try {
      setError(null);

      // Convertir les données du format frontend au format backend (per-day structure)
      const daysMap = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
      };

      const workingDays = {};

      Object.keys(availability).forEach(day => {
        const dayData = availability[day];
        const backendDayName = daysMap[day];
        workingDays[backendDayName] = {
          available: dayData.available,
          start_time: dayData.start_time || '08:00',
          end_time: dayData.end_time || '18:00'
        };
      });

      const backendData = {
        working_days: workingDays,
        is_available: true
      };

      console.log('Envoi des données:', backendData);

      const response = await fetch(`${API_BASE_URL}/driver/availability/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendData)
      });

      if (response.ok) {
        setError(null);
        alert('Disponibilité mise à jour avec succès');
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Erreur serveur:', errorData);
        setError(errorData.detail || JSON.stringify(errorData) || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setError('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const daysMap = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  return (
    <div className="availability-settings">
      <h2>Paramètres de Disponibilité</h2>
      <p className="settings-description">Définissez vos jours et heures de travail</p>

      {error && <div className="error-message">{error}</div>}

      <div className="availability-list">
        {Object.keys(daysMap).map(day => {
          const dayData = availability[day] || { available: false, start_time: '08:00', end_time: '18:00' };

          return (
            <div key={day} className="availability-day-item">
              <div className="day-header">
                <label className="day-checkbox">
                  <input
                    type="checkbox"
                    checked={dayData.available || false}
                    onChange={() => handleToggle(day)}
                  />
                  <span className="day-name">{daysMap[day]}</span>
                </label>
              </div>

              {dayData.available && (
                <div className="time-inputs">
                  <div className="time-group">
                    <label htmlFor={`${day}-start`}>Début</label>
                    <input
                      id={`${day}-start`}
                      type="time"
                      value={dayData.start_time || '08:00'}
                      onChange={(e) => handleTimeChange(day, 'start_time', e.target.value)}
                      className="time-input"
                    />
                  </div>
                  <div className="time-group">
                    <label htmlFor={`${day}-end`}>Fin</label>
                    <input
                      id={`${day}-end`}
                      type="time"
                      value={dayData.end_time || '18:00'}
                      onChange={(e) => handleTimeChange(day, 'end_time', e.target.value)}
                      className="time-input"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="availability-actions">
        <button className="btn-save" onClick={handleSave} disabled={loading}>
          {loading ? 'Sauvegarde...' : 'Enregistrer'}
        </button>
        <button className="btn-cancel" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
