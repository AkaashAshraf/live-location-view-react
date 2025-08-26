import React from "react";
import { Link } from "react-router-dom";

export default function LiveDriversScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50">
      <h1 className="text-2xl font-bold mb-4">Live Drivers</h1>
      <p>Here we will show the live drivers data.</p>

      <Link to="/">
        <button className="mt-6 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
          Back
        </button>
      </Link>
    </div>
  );
}
