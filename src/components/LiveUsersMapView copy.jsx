import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LiveUsersMapView = () => {
  const [users, setUsers] = useState([]);
  const [center] = useState([20.5937, 78.9629]); // Default to India coordinates
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const mapRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setConnectionStatus('error');
    });

    // Data events
    socket.on('users:update', (data) => {
      console.log('Received user update:', data);
      setUsers(data);
    });

    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log('Initial user data:', data);
        setUsers(data.users || data); // Handle both {users: [...]} and array responses
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        // Fallback to mock data if API fails
        setUsers([{
          id: '1',
          name: 'Demo User',
          lat: 20.5937,
          long: 78.9629,
          status: 'online',
          updatedAt: new Date().toISOString()
        }]);
      }
    };

    fetchInitialData();

    // Cleanup function
    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusIcon = (status) => {
    return L.divIcon({
      html: `<div style="
        background: ${status === 'online' ? '#4CAF50' : '#F44336'};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      "></div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      position: 'relative',
      backgroundColor: '#f5f5f5' // Fallback background
    }}>
      {/* Connection status indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '8px 16px',
        background: 
          connectionStatus === 'connected' ? '#4CAF50' :
          connectionStatus === 'connecting' ? '#FFC107' : '#F44336',
        color: 'white',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        {connectionStatus === 'connected' ? 'Live' : 
         connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
      </div>

      {/* Map container with fallback */}
      {users.length > 0 ? (
        <MapContainer 
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          whenReady={() => console.log('Map fully initialized')}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {users.map((user) => (
            user.lat && user.long && (
              <Marker
                key={user.id}
                position={[user.lat, user.long]}
                icon={getStatusIcon(user.status)}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{user.name || `User ${user.id}`}</h3>
                    <p style={{ margin: '4px 0' }}>
                      Status: <span style={{
                        color: user.status === 'online' ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        {user.status.toUpperCase()}
                      </span>
                    </p>
                    <p style={{ margin: '4px 0' }}>
                      Coordinates: {user.lat?.toFixed(4)}, {user.long?.toFixed(4)}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.8em', color: '#666' }}>
                      Last updated: {new Date(user.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666'
        }}>
          {connectionStatus === 'error' ? (
            <div>
              <p>Failed to load map data</p>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p>Loading map data...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveUsersMapView;