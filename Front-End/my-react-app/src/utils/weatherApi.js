// Weather API utility for fetching weather data
// Uses Open-Meteo API (free, no API key required)

const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';

// Map weather codes to descriptions and emojis
const getWeatherInfo = (code, isDay = true) => {
  const weatherCodes = {
    0: { desc: 'Ciel dégagé', emoji: isDay ? '☀️' : '🌙' },
    1: { desc: 'Peu nuageux', emoji: '🌤️' },
    2: { desc: 'Partiellement nuageux', emoji: '⛅' },
    3: { desc: 'Nuageux', emoji: '☁️' },
    45: { desc: 'Brouillard', emoji: '🌫️' },
    48: { desc: 'Brouillard givrant', emoji: '❄️🌫️' },
    51: { desc: 'Bruine légère', emoji: '🌧️' },
    53: { desc: 'Bruine modérée', emoji: '🌧️' },
    55: { desc: 'Bruine dense', emoji: '🌧️' },
    61: { desc: 'Pluie légère', emoji: '🌧️' },
    63: { desc: 'Pluie modérée', emoji: '🌧️' },
    65: { desc: 'Pluie forte', emoji: '⛈️' },
    71: { desc: 'Neige légère', emoji: '❄️' },
    73: { desc: 'Neige modérée', emoji: '❄️' },
    75: { desc: 'Neige forte', emoji: '❄️' },
    77: { desc: 'Grains de neige', emoji: '❄️' },
    80: { desc: 'Averses légères', emoji: '🌧️' },
    81: { desc: 'Averses modérées', emoji: '🌧️' },
    82: { desc: 'Averses violentes', emoji: '⛈️' },
    85: { desc: 'Averses de neige légères', emoji: '❄️' },
    86: { desc: 'Averses de neige fortes', emoji: '❄️' },
    95: { desc: 'Orage léger', emoji: '⛈️' },
    96: { desc: 'Orage avec grêle légère', emoji: '⛈️' },
    99: { desc: 'Orage avec grêle forte', emoji: '⛈️' },
  };

  return weatherCodes[code] || { desc: 'Données indisponibles', emoji: '❓' };
};

// Default weather for error states
export const getDefaultWeather = () => {
  return {
    temp: 25,
    maxTemp: 28,
    minTemp: 18,
    description: 'Tunis',
    emoji: '☀️',
  };
};

// Fetch weather for a single date
export const getWeather = async (latitude, longitude, date) => {
  try {
    const dateStr = date.toISOString().split('T')[0];

    const params = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
      start_date: dateStr,
      end_date: dateStr,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,is_day',
      timezone: 'Africa/Tunis',
      temperature_unit: 'celsius'
    });

    const response = await fetch(`${WEATHER_API_BASE}?${params}`);

    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return getDefaultWeather();
    }

    const data = await response.json();

    if (data.daily && data.daily.weather_code && data.daily.weather_code.length > 0) {
      const code = data.daily.weather_code[0];
      const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
      const minTemp = Math.round(data.daily.temperature_2m_min[0]);
      const isDay = data.daily.is_day[0];

      const weatherInfo = getWeatherInfo(code, isDay);

      return {
        temp: Math.round((maxTemp + minTemp) / 2),
        maxTemp: maxTemp,
        minTemp: minTemp,
        description: weatherInfo.desc,
        emoji: weatherInfo.emoji,
        code: code,
        date: dateStr,
      };
    }

    return getDefaultWeather();
  } catch (error) {
    console.error('Error fetching weather:', error);
    return getDefaultWeather();
  }
};

// Fetch weather for multiple dates (batch)
export const getWeatherBatch = async (latitude, longitude, dates) => {
  try {
    if (!dates || dates.length === 0) {
      return [getDefaultWeather()];
    }

    const sortedDates = [...dates].sort((a, b) => a - b);
    const startDate = sortedDates[0].toISOString().split('T')[0];
    const endDate = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];

    const params = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
      start_date: startDate,
      end_date: endDate,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,is_day',
      timezone: 'Africa/Tunis',
      temperature_unit: 'celsius'
    });

    const response = await fetch(`${WEATHER_API_BASE}?${params}`);

    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return dates.map(() => getDefaultWeather());
    }

    const data = await response.json();

    if (!data.daily) {
      return dates.map(() => getDefaultWeather());
    }

    // Create a map of date strings to weather data
    const weatherMap = {};
    if (data.daily.weather_code) {
      for (let i = 0; i < data.daily.weather_code.length; i++) {
        const dateStr = data.daily.time[i];
        const code = data.daily.weather_code[i];
        const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
        const minTemp = Math.round(data.daily.temperature_2m_min[i]);
        const isDay = data.daily.is_day[i];

        const weatherInfo = getWeatherInfo(code, isDay);

        weatherMap[dateStr] = {
          temp: Math.round((maxTemp + minTemp) / 2),
          maxTemp: maxTemp,
          minTemp: minTemp,
          description: weatherInfo.desc,
          emoji: weatherInfo.emoji,
          code: code,
          date: dateStr,
        };
      }
    }

    // Return weather in the same order as requested dates
    return dates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      return weatherMap[dateStr] || getDefaultWeather();
    });
  } catch (error) {
    console.error('Error fetching weather batch:', error);
    return dates.map(() => getDefaultWeather());
  }
};
