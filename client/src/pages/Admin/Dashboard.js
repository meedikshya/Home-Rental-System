import React, { useState, useEffect } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FiUsers,
  FiHome,
  FiDollarSign,
  FiUserCheck,
  FiUserPlus,
  FiRefreshCw,
  FiBarChart2,
} from "react-icons/fi";

const Dashboard = () => {
  console.log("Dashboard component is rendering");

  const [stats, setStats] = useState({
    completedPayments: 0,
    totalProperties: 0,
    totalUsers: 0,
    totalLandlords: 0,
    totalRenters: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch all stats
  const fetchStats = async () => {
    try {
      console.log("Fetching dashboard stats...");
      setRefreshing(true);
      setError(null);

      // Fetch all stats in parallel
      const [
        paymentsResponse,
        propertiesResponse,
        usersResponse,
        landlordsResponse,
        rentersResponse,
      ] = await Promise.all([
        ApiHandler.get("/Payments/completed-payment-count"),
        ApiHandler.get("/Properties/total-count"),
        ApiHandler.get("/Users/total-count"),
        ApiHandler.get("/Users/total-landlords"),
        ApiHandler.get("/Users/total-renters"),
      ]);

      console.log("API responses:", {
        paymentsResponse,
        propertiesResponse,
        usersResponse,
        landlordsResponse,
        rentersResponse,
      });

      setStats({
        completedPayments: paymentsResponse || 0,
        totalProperties: propertiesResponse || 0,
        totalUsers: usersResponse || 0,
        totalLandlords: landlordsResponse || 0,
        totalRenters: rentersResponse || 0,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    console.log("Dashboard component mounted");
    fetchStats();
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStats();
  };

  // Stat card component for reusability
  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white shadow-md rounded-lg p-6 flex items-center">
      <div className={`p-3 rounded-full ${color} text-white mr-4`}>{icon}</div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{loading ? "-" : value}</p>
      </div>
    </div>
  );

  console.log("Dashboard render with stats:", stats);

  return (
    <div className="w-full p-6 bg-gray-100 min-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<FiUsers size={24} />}
              color="bg-blue-500"
            />

            <StatCard
              title="Total Landlords"
              value={stats.totalLandlords}
              icon={<FiUserCheck size={24} />}
              color="bg-green-500"
            />

            <StatCard
              title="Total Renters"
              value={stats.totalRenters}
              icon={<FiUserPlus size={24} />}
              color="bg-purple-500"
            />

            <StatCard
              title="Total Properties"
              value={stats.totalProperties}
              icon={<FiHome size={24} />}
              color="bg-yellow-500"
            />

            <StatCard
              title="Completed Payments"
              value={stats.completedPayments}
              icon={<FiDollarSign size={24} />}
              color="bg-indigo-500"
            />

            <div className="bg-white shadow-md rounded-lg p-6 flex items-center">
              <div className="p-3 rounded-full bg-gray-500 text-white mr-4">
                <FiBarChart2 size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">
                  Occupancy Rate
                </p>
                <p className="text-2xl font-bold">
                  {`${Math.round(
                    (stats.totalProperties > 0
                      ? stats.completedPayments / stats.totalProperties
                      : 0) * 100
                  )}%`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">System Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">User-Property Ratio:</span>
                <span className="font-medium">
                  {stats.totalProperties > 0
                    ? (stats.totalUsers / stats.totalProperties).toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Landlord-Renter Ratio:</span>
                <span className="font-medium">
                  {stats.totalRenters > 0
                    ? (stats.totalLandlords / stats.totalRenters).toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Properties per Landlord:</span>
                <span className="font-medium">
                  {stats.totalLandlords > 0
                    ? (stats.totalProperties / stats.totalLandlords).toFixed(2)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Payment Rate:</span>
                <span className="font-medium">
                  {stats.totalRenters > 0
                    ? `${Math.round(
                        (stats.completedPayments / stats.totalRenters) * 100
                      )}%`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
