import React, { useState, useEffect } from 'react';
import { getWeatherBatch } from '../utils/weatherApi';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setError(false);
        const today = new Date();
        const weatherData = await getWeatherBatch(36.8065, 10.1686, [today]);

        if (weatherData && weatherData.length > 0) {
          setWeather(weatherData[0]);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching weather:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);

    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const getDayName = () => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[currentTime.getDay()];
  };

  const getFormattedTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    return `A ${hours}:${minutes} CET`;
  };

  if (loading) {
    return (
      <div className="weather-widget weather-loading-state">
        <div className="weather-compact">
          <span className="weather-emoji">☁️</span>
          <div className="weather-info">
            <p className="weather-location">Tunis, Gouvernorat Tunis, Tunisie</p>
            <p className="weather-time">...</p>
            <p className="weather-temp">--°C</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="weather-widget weather-error-state">
        <div className="weather-compact">
          <span className="weather-emoji">⚠️</span>
          <div className="weather-info">
            <p className="weather-location">Tunis, Gouvernorat Tunis, Tunisie</p>
            <p className="weather-time">{getFormattedTime()}</p>
            <p className="weather-temp">--°C</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-widget">
      <div className="weather-header">
        <p className="weather-location">Tunis, Gouvernorat Tunis, Tunisie</p>
        <p className="weather-time">{getFormattedTime()}</p>
      </div>

      <div className="weather-main">
        <span className="weather-emoji">{weather.emoji}</span>
        <div className="weather-main-info">
          <p className="weather-temp">{weather.maxTemp || weather.temp || '--'}°C</p>
          <p className="weather-description">{weather.description || 'Données indisponibles'}</p>
        </div>
      </div>

      <div className="weather-footer">
        <p className="weather-footer-text">ℹ️ Pas d'alerte relative à la qualité de l'air</p>
        <p className="weather-footer-text">📊 Les prévisions complètes</p>
      </div>
    </div>
  );
}
