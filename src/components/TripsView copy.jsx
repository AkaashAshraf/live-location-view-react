import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "http://10.34.165.130:3000";

// Custom icons
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const icons = {
  green: createIcon('green'),
  red: createIcon('red'),
  blue: createIcon('blue')
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions);
    }
  }, [positions]);
  return null;
}

export default function TripsMapView() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [date, setDate] = useState("");
  const [routePositions, setRoutePositions] = useState([]);
  const [liveLocations, setLiveLocations] = useState({});
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  // Socket.IO setup
  useEffect(() => {
    socketRef.current = io(API_BASE);
    
    socketRef.current.on('user:update', (user) => {
      setLiveLocations(prev => ({
        ...prev,
        [user.userId]: [user.lat, user.long]
      }));
    });

    return () => socketRef.current?.disconnect();
  }, []);

  // Fetch users
  useEffect(() => {
    axios.get(`${API_BASE}/api/users`)
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, []);

  // Fetch trips
  const fetchTrips = async () => {
    if (!selectedUser || !date) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/trips/${selectedUser}/${date}`);
      const positions = res.data.trips?.flatMap(t => t.locations.map(l => [l.lat, l.long])) || [];
      setRoutePositions(positions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h2>Trip Viewer</h2>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select 
          value={selectedUser} 
          onChange={e => setSelectedUser(e.target.value)}
          disabled={loading}
        >
          <option value="">Select User</option>
          {users.map(user => (
            <option key={user.userId} value={user.userId}>
              {user.name} ({user.status})
            </option>
          ))}
        </select>
        
        <input 
          type="date" 
          value={date}
          onChange={e => setDate(e.target.value)}
          disabled={loading}
        />
        
        <button 
          onClick={fetchTrips}
          disabled={!selectedUser || !date || loading}
        >
          {loading ? 'Loading...' : 'Show Trip'}
        </button>
      </div>

      <div style={{ height: 500, border: '1px solid #ddd', borderRadius: 8 }}>
        <MapContainer center={[20, 78]} zoom={5} style={{ height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          
          <FitBounds positions={routePositions} />
          
          {routePositions.length > 0 && (
            <>
              <Polyline positions={routePositions} color="blue" />
              <Marker position={routePositions[0]} icon={icons.green}>
                <Popup>Start</Popup>
              </Marker>
              <Marker position={routePositions[routePositions.length - 1]} icon={icons.red}>
                <Popup>End</Popup>
              </Marker>
            </>
          )}
          
          {Object.entries(liveLocations).map(([userId, pos]) => (
            <Marker key={userId} position={pos} icon={icons.blue}>
              <Popup>
                {users.find(u => u.userId === userId)?.name || userId}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}