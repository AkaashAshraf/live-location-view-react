import { useState } from "react";
import TripsView from "./components/TripsView";
// import UsersMapView from "./components/LiveUsersMapView";
import RealtimeUsersMap from "./components/LiveUsersMapView";

function App() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Trips Dashboard</h1>
      <TripsView />
    </div>
  );
}

export default App;
