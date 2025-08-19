import { useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom icons
const createIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

const icons = {
  green: createIcon("green"),
  red: createIcon("red"),
  blue: createIcon("blue"),
};

function FitBounds({ positions }) {
  const map = useMap();
  if (positions.length > 0) {
    map.fitBounds(positions);
  }
  return null;
}

export default function TripsMapView() {
  const [users] = useState([
    { userId: "1", name: "Akaash", status: "Active" },
    { userId: "2", name: "John", status: "Inactive" },
  ]);
  const [selectedUser, setSelectedUser] = useState("");
  const [date, setDate] = useState("");
  const [routePositions, setRoutePositions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hardcoded 5km path from Wah Cantt
  const hardcodedRoute = [
    [33.7361, 72.8331], // Start: Wah Cantt
    [33.7385, 72.8400],
    [33.7402, 72.8475],
    [33.7430, 72.8540],
    [33.7465, 72.8605], // End (~5 km total)
  ];

  const fetchTrips = () => {
    if (!selectedUser || !date) return;
    setLoading(true);
    setTimeout(() => {
      setRoutePositions(hardcodedRoute);
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h2>Trip Viewer (Akaash)</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          disabled={loading}
        >
          <option value="">Select User</option>
          {users.map((user) => (
            <option key={user.userId} value={user.userId}>
              {user.name} ({user.status})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
        />

        <button onClick={fetchTrips} disabled={!selectedUser || !date || loading}>
          {loading ? "Loading..." : "Show Trip"}
        </button>
      </div>

      <div style={{ height: 500, border: "1px solid #ddd", borderRadius: 8 }}>
        <MapContainer center={[33.7361, 72.8331]} zoom={14} style={{ height: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />

          <FitBounds positions={routePositions} />

          {routePositions.length > 0 && (
            <>
              <Polyline positions={routePositions} color="blue" />
              <Marker position={routePositions[0]} icon={icons.green}>
                <Popup>Start Point - Wah Cantt</Popup>
              </Marker>
              <Marker position={routePositions[routePositions.length - 1]} icon={icons.red}>
                <Popup>End Point</Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
