// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomeScreen from "./screens/HomeScreen";
import LiveDriversScreen from "./screens/LiveDriversScreen";
import DriverTripScreen from "./screens/DriverTripScreen";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/live-drivers" element={<LiveDriversScreen />} />
        <Route path="/driver-trip" element={<DriverTripScreen />} />
      </Routes>
    </Router>
  );
}
