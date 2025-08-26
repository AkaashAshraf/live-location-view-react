import { useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { io } from "socket.io-client";
import styles from "../css/LiveDrivers.module.css";
import { BASE_URL, SOCKET_URL, GOOGLE_MAPS_API_KEY, DEFAULT_DRIVER_IMAGE } from "../config";

// Socket.io connection
const socket = io(SOCKET_URL);

const containerStyle = { width: "100%", height: "100%" };

export default function LiveDrivers() {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const mapRef = useRef<any>(null);

  // Fetch users + listen for updates
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${BASE_URL}/trips/get-users`);
        const data = await res.json();
        if (data.success && data.users) {
          setUsers(data.users);

          // Center map on last updated user
          const lastUpdated = data.users.reduce((a, b) =>
            new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
          );
          if (mapRef.current && lastUpdated) {
            mapRef.current.panTo({ lat: lastUpdated.lat, lng: lastUpdated.lng });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();

    socket.on("driverUpdated", (driver) => {
      setUsers((prev) => {
        const exists = prev.find((u) => u.driver_id === driver.driver_id);
        if (exists) {
          return prev.map((u) => (u.driver_id === driver.driver_id ? driver : u));
        } else {
          return [...prev, driver];
        }
      });

      // Recenter map on updated driver
      if (mapRef.current) {
        mapRef.current.panTo({ lat: driver.lat, lng: driver.lng });
      }
    });

    return () => socket.off("driverUpdated");
  }, []);

  const filteredUsers = users.filter((user) =>
    user.driver_id.toLowerCase().includes(search.toLowerCase())
  );

  // Recenter map when search changes
  useEffect(() => {
    if (filteredUsers.length > 0 && mapRef.current) {
      mapRef.current.panTo({ lat: filteredUsers[0].lat, lng: filteredUsers[0].lng });
      mapRef.current.setZoom(15);
    }
  }, [search]);

  if (!isLoaded) return <p>Loading Map...</p>;

  // SVG marker with round image and border
  const getMarkerIcon = (user: any) => {
    const borderColor = user.status === "online" ? "#10b981" : "#ef4444";

    return {
      url: `data:image/svg+xml;utf-8,
      <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">
        <circle cx="25" cy="25" r="25" fill="${borderColor}" />
        <clipPath id="clip"><circle cx="25" cy="25" r="22"/></clipPath>
        <image href="${DEFAULT_DRIVER_IMAGE}" width="44" height="44" x="3" y="3" clip-path="url(#clip)"/>
      </svg>`,
      scaledSize: new google.maps.Size(50, 50),
      anchor: new google.maps.Point(25, 25),
    };
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>🚖 Live Drivers</h2>

      {/* Search Field */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search driver by ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Map */}
      <div className={styles.mapContainer}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={
            { lat: filteredUsers[0].lat, lng: filteredUsers[0].lng }
               
          }
          zoom={14}
          onLoad={(map) => (mapRef.current = map)}
        >
          {filteredUsers.map((user) => (
            <Marker
              key={user.driver_id}
              position={{ lat: user.lat, lng: user.lng }}
              icon={getMarkerIcon(user)}
              onClick={() => setSelectedUser(user)}
            />
          ))}

          {selectedUser && (
            <InfoWindow
              position={{ lat: selectedUser.lat, lng: selectedUser.lng }}
              onCloseClick={() => setSelectedUser(null)}
            >
              <div style={{ minWidth: "180px" }}>
                <h3 style={{ fontWeight: 600 }}>{selectedUser.driver_id}</h3>
                <p style={{ fontSize: "0.875rem" }}>Status: {selectedUser.status}</p>
                <p style={{ fontSize: "0.875rem" }}>
                  Last Updated: {new Date(selectedUser.updatedAt).toLocaleString()}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
