import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/DeliveryMap.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function DeliveryMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [deliveryData, setDeliveryData] = useState([]);

  useEffect(() => {
    // Fetch delivery orders from API
    const fetchDeliveries = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/auth/driver/dashboard/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setDeliveryData(data.assignments || []);
        }
      } catch (error) {
        console.error('Error fetching delivery data:', error);
      }
    };

    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([36.8065, 10.1676], 13); // Tunis coordinates

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapInstance.current.removeLayer(layer);
      }
    });

    if (deliveryData.length === 0) return;

    // Extract coordinates from delivery data
    const coordinates = [];
    const markers = [];

    deliveryData.forEach((order, index) => {
      // Simulate coordinates for demo (in real app, these would come from API)
      const lat = 36.8065 + (Math.random() - 0.5) * 0.1;
      const lng = 10.1676 + (Math.random() - 0.5) * 0.1;

      coordinates.push([lat, lng]);

      // Determine color based on status
      let color = '#FF9800'; // assigned
      if (order.status === 'accepted') color = '#4CAF50';
      if (order.status === 'completed') color = '#2196F3';

      // Create custom icon
      const icon = L.divIcon({
        html: `
          <div style="
            width: 35px;
            height: 35px;
            background: white;
            border: 3px solid ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: ${color};
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-size: 16px;
          ">
            📍
          </div>
        `,
        className: 'delivery-marker',
        iconSize: [35, 35],
        iconAnchor: [17.5, 17.5],
      });

      // Add marker
      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div style="font-size: 12px;">
            <strong>#${order.order_number}</strong><br/>
            ${order.order_details?.shipping_city || 'N/A'}<br/>
            <span style="color: ${color}; font-weight: bold;">${order.status}</span>
          </div>
        `)
        .addTo(mapInstance.current);

      markers.push(marker);
    });

    // Draw route line connecting all delivery points
    if (coordinates.length > 0) {
      const polyline = L.polyline(coordinates, {
        color: '#FF9800',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 5',
      }).addTo(mapInstance.current);

      // Fit bounds to show all markers
      if (coordinates.length > 1) {
        mapInstance.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }

  }, [deliveryData]);

  return (
    <div className="delivery-map-container">
      <div className="map-header">
        <h3> Carte de Livraison</h3>
        <div className="map-controls">
          <button className="map-btn" title="Zoom in" onClick={() => mapInstance.current?.zoomIn()}>+</button>
          <button className="map-btn" title="Zoom out" onClick={() => mapInstance.current?.zoomOut()}>−</button>
          <button className="map-btn" title="Center map" onClick={() => mapInstance.current?.setView([36.8065, 10.1676], 13)}>📍</button>
        </div>
      </div>

      <div className="map-content" ref={mapRef}></div>

      <div className="map-legend">
        <h4>Légende</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#FF9800' }}></span>
            <span>Assignée</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4CAF50' }}></span>
            <span>Acceptée</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2196F3' }}></span>
            <span>Livrée</span>
          </div>
        </div>
      </div>
    </div>
  );
}
