import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MiniCalendar() {
  const navigate = useNavigate();
  const today = new Date();

  const getFullDate = () => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const day = today.getDate();
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleOpenCalendar = () => {
    navigate('/driver-calendar');
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-date">
        <h4>📅 {getFullDate()}</h4>
      </div>

      <div className="mini-calendar-content">
        <button className="mini-calendar-button" onClick={handleOpenCalendar}>
          Ouvrir Calendrier →
        </button>
      </div>
    </div>
  );
}
