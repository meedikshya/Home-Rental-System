import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import {
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";
import BookingList from "../../components/admin/BookingList.js";
import ApiHandler from "../../api/ApiHandler.js";

const Bookings = () => {
  const [token, setToken] = useState(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Status options from API
  const [statusOptions, setStatusOptions] = useState(["All"]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  // Loading states
  const [loading, setLoading] = useState(false);

  // Authentication effect to get token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
          setIsPageLoaded(true);
        } catch (err) {
          console.error("Error getting token:", err);
          setIsPageLoaded(true);
        }
      } else {
        setToken(null);
        setIsPageLoaded(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch status options when token is available
  useEffect(() => {
    if (token) {
      fetchStatusOptions();
    }
  }, [token]);

  // Function to fetch status options from API
  const fetchStatusOptions = async () => {
    try {
      setLoadingStatuses(true);
      // Fetch all bookings to extract unique status values
      const bookings = await ApiHandler.get("/Bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(bookings) && bookings.length > 0) {
        // Extract unique status values
        const uniqueStatuses = [
          ...new Set(bookings.map((booking) => booking.status)),
        ];

        // Sort statuses alphabetically
        uniqueStatuses.sort();

        // Add "All" option at the beginning
        setStatusOptions(["All", ...uniqueStatuses]);
      } else {
        console.log("No bookings found or invalid response format");
        setStatusOptions(["All"]);
      }
    } catch (err) {
      console.error("Error fetching booking statuses:", err);
      // Fallback in case of error
      setStatusOptions(["All"]);
    } finally {
      setLoadingStatuses(false);
    }
  };

  // Function to handle filter application
  const applyFilters = () => {
    if (token) {
      // Set loading state
      setLoading(true);

      // After a brief delay to show loading state, hide the filter panel
      setTimeout(() => {
        setIsFilterVisible(false);
        setLoading(false);
      }, 300);
    }
  };

  // Function to reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <FaCalendarAlt className="mr-2" /> Booking Management
            </h1>
            {/* <p className="text-blue-100">
              Manage all property bookings in the system
            </p> */}
          </div>

          <div>
            {/* Filter toggle button */}
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center justify-center px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors"
            >
              <FaFilter className="mr-2" />
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <div
          className={`mt-4 overflow-hidden transition-all duration-300 ${
            isFilterVisible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {/* Search input */}
              <div className="flex-grow">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Search Property or Renter
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter property name or renter name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              {/* Status filter */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  disabled={loadingStatuses}
                >
                  {loadingStatuses ? (
                    <option value="">Loading statuses...</option>
                  ) : (
                    statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status === "All" ? "All Statuses" : status}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Filter actions */}
              <div className="flex space-x-2">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors flex items-center"
                  disabled={loading || loadingStatuses}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" /> Applying...
                    </>
                  ) : (
                    "Apply Filters"
                  )}
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-white/50 text-white rounded-md hover:bg-white/10 transition-colors"
                  disabled={loading || loadingStatuses}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transition effect while page loads */}
      <div
        className={`transition-opacity duration-500 ${
          isPageLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {token ? (
          <BookingList
            token={token}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
          />
        ) : (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-700 my-4 shadow-sm">
            <p className="flex items-center text-lg font-medium mb-2">
              <FaInfoCircle className="mr-2" /> Authentication Required
            </p>
            <p>Please sign in to access booking management features.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
