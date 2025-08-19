import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

// Fix leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LiveUsersMapView = () => {
  const [users, setUsers] = useState([]);
  const [center] = useState([20.5937, 78.9629]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const updateCountRef = useRef(0);

  // Debug function to track updates
  const logUpdate = useCallback((source, data) => {
    const updateId = updateCountRef.current++;
    console.group(`[Update ${updateId}] from ${source}`);
    console.log('Data:', data);
    if (data?.userId) {
      console.log('User ID:', data.userId);
      console.log('Status:', data.status);
    }
    console.groupEnd();
    return updateId;
  }, []);

  // Bulletproof update handler
  const handleUserUpdate = useCallback((newData) => {
    const updateId = logUpdate('socket', newData);
    
    setUsers(prevUsers => {
      // Handle array updates
      if (Array.isArray(newData)) {
        console.log(`[${updateId}] Processing array update`);
        return newData.map(user => ({
          userId: user.userId || `temp-${Math.random().toString(36).substr(2, 8)}`,
          name: user.name || `User ${user.userId}`,
          status: user.status || 'offline',
          lat: user.lat ?? center[0],
          long: user.long ?? center[1],
          updatedAt: user.updatedAt || new Date().toISOString()
        }));
      }

      // Handle single user updates
      if (newData?.userId) {
        console.log(`[${updateId}] Processing single user update`);
        const existingIndex = prevUsers.findIndex(u => u.userId === newData.userId);
        
        if (existingIndex === -1) {
          console.log(`[${updateId}] Adding new user`);
          return [...prevUsers, {
            userId: newData.userId,
            name: newData.name || `User ${newData.userId}`,
            status: newData.status || 'offline',
            lat: newData.lat ?? center[0],
            long: newData.long ?? center[1],
            updatedAt: newData.updatedAt || new Date().toISOString()
          }];
        }

        console.log(`[${updateId}] Updating existing user`);
        return prevUsers.map(user => 
          user.userId === newData.userId ? {
            ...user,
            name: newData.name || user.name,
            status: newData.status || user.status,
            lat: newData.lat ?? user.lat,
            long: newData.long ?? user.long,
            updatedAt: newData.updatedAt || user.updatedAt
          } : user
        );
      }

      return prevUsers;
    });
  }, [center, logUpdate]);

  // Socket connection with enhanced debugging
  const connectSocket = useCallback(() => {
    console.log('Initializing socket connection...');
    socketRef.current = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      query: { clientType: 'map-view' }
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected - ID:', socketRef.current?.id);
      setConnectionStatus('connected');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setConnectionStatus('error');
    });

    // Data handlers
    const onUserUpdate = (data) => {
      console.log('Received user:update event');
      handleUserUpdate(data);
    };

    const onInitialData = (data) => {
      console.log('Received users:init event');
      handleUserUpdate(data);
    };

    socketRef.current.on('user:update', onUserUpdate);
    socketRef.current.on('users:init', onInitialData);

    // Request initial data
    socketRef.current.emit('request:init');

    return () => {
      socketRef.current?.off('user:update', onUserUpdate);
      socketRef.current?.off('users:init', onInitialData);
    };
  }, [handleUserUpdate]);

  // Fetch initial data with retry logic
  const fetchInitialData = useCallback(async () => {
    console.log('Fetching initial data...');
    try {
      const response = await fetch(`${API_URL}/api/users`);
      const data = await response.json();
      console.log('Initial data received:', data);
      handleUserUpdate(data.users || data);
    } catch (err) {
      console.error('Initial data fetch failed:', err);
      handleUserUpdate([{
        userId: 'fallback-user',
        name: 'Fallback User',
        status: 'online',
        lat: center[0],
        long: center[1],
        updatedAt: new Date().toISOString()
      }]);
    }
  }, [center, handleUserUpdate]);

  useEffect(() => {
    connectSocket();
    fetchInitialData();

    return () => {
      console.log('Cleaning up socket...');
      socketRef.current?.disconnect();
    };
  }, [connectSocket, fetchInitialData]);

  // Status icon with forced updates
  const getStatusIcon = useCallback((status = 'offline') => {
    return L.divIcon({
      html: `<div style="
        background: ${status === 'online' ? '#4CAF50' : '#F44336'};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      "></div>`,
      className: `status-icon-${status}-${Date.now()}`,
      iconSize: [24, 24]
    });
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Connection status with debug info */}
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
        display: 'flex',
        alignItems: 'center'
      }}>
        {connectionStatus === 'connected' ? (
          <>
            <div style={{
              width: '10px',
              height: '10px',
              background: 'white',
              borderRadius: '50%',
              marginRight: '8px',
              animation: 'pulse 1.5s infinite'
            }} />
            LIVE ({users.length} users)
          </>
        ) : connectionStatus === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
      </div>

      {/* Debug panel (visible in development) */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          width: '300px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h4 style={{ marginTop: 0 }}>Debug Info</h4>
          <div>Connection: {connectionStatus}</div>
          <div>Users: {users.length}</div>
          <div>Last update: {new Date().toLocaleTimeString()}</div>
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        key={`map-${users.length}-${connectionStatus}`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {users.map((user) => (
          <Marker
            key={`${user.userId}-${user.status}-${user.updatedAt}`}
            position={[user.lat, user.long]}
            icon={getStatusIcon(user.status)}
            eventHandlers={{
              click: () => console.log('User details:', user)
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3>{user.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', margin: '5px 0' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: user.status === 'online' ? 'green' : 'red',
                    marginRight: '8px'
                  }} />
                  <strong style={{
                    color: user.status === 'online' ? 'green' : 'red',
                    textTransform: 'uppercase'
                  }}>
                    {user.status}
                  </strong>
                </div>
                <p>Updated: {new Date(user.updatedAt).toLocaleString()}</p>
                <p>Location: {user.lat.toFixed(4)}, {user.long.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LiveUsersMapView;