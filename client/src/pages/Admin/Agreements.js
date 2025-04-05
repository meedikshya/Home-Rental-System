import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import {
  FaFileContract,
  FaSearch,
  FaFilter,
  FaSpinner,
  FaInfoCircle,
  FaUserTie,
} from "react-icons/fa";
import AgreementList from "../../components/admin/AgreementList.js";
import ApiHandler from "../../api/ApiHandler.js";

const Agreements = () => {
  const [token, setToken] = useState(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusOptions, setStatusOptions] = useState([]);
  const [selectedLandlordId, setSelectedLandlordId] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [landlords, setLandlords] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  // Authentication effect to get token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
          setIsPageLoaded(true);

          // Fetch landlords for filter dropdown
          fetchLandlords(idToken);
          // Fetch agreement statuses
          fetchAgreementStatuses(idToken);
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

  // Fetch agreement statuses from API
  const fetchAgreementStatuses = async (authToken) => {
    try {
      setStatusLoading(true);

      // Fetch a sample of agreements to extract statuses
      const agreementsData = await ApiHandler.get("/Agreements", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (Array.isArray(agreementsData)) {
        // Extract unique status values
        const uniqueStatuses = [
          ...new Set(agreementsData.map((a) => a.status)),
        ].filter(Boolean);
        setStatusOptions(uniqueStatuses.sort());
      }
    } catch (err) {
      console.error("Error fetching agreement statuses:", err);
      // Fallback to common status values if API fetch fails
      setStatusOptions(["Active", "Pending", "Expired", "Terminated"]);
    } finally {
      setStatusLoading(false);
    }
  };

  // Fetch landlords for filter
  const fetchLandlords = async (authToken) => {
    try {
      const [userDetailsResponse, usersResponse] = await Promise.all([
        ApiHandler.get("/UserDetails", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        ApiHandler.get("/Users", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (userDetailsResponse && usersResponse) {
        const userRolesMap = {};
        usersResponse.forEach((user) => {
          userRolesMap[user.userId] = user.userRole;
        });

        const landlordUsers = userDetailsResponse.filter(
          (user) => userRolesMap[user.userId] === "Landlord"
        );

        setLandlords(landlordUsers);
      }
    } catch (err) {
      console.error("Error fetching landlords:", err);
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
    setSelectedLandlordId("");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <FaFileContract className="mr-2" /> Rental Agreements
            </h1>
            {/* <p className="text-blue-100">
              Manage all property rental agreements in the system
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

              {/* Landlord filter */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Landlord
                </label>
                <select
                  value={selectedLandlordId}
                  onChange={(e) => setSelectedLandlordId(e.target.value)}
                  className="px-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                >
                  <option value="">All Landlords</option>
                  {landlords.map((landlord) => (
                    <option key={landlord.userId} value={landlord.userId}>
                      {landlord.firstName} {landlord.lastName}
                    </option>
                  ))}
                </select>
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
                  disabled={statusLoading}
                >
                  <option value="All">All Statuses</option>
                  {statusLoading ? (
                    <option value="" disabled>
                      Loading statuses...
                    </option>
                  ) : (
                    statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
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
                  disabled={loading || statusLoading}
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
                  disabled={loading || statusLoading}
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
          <AgreementList
            token={token}
            selectedLandlordId={selectedLandlordId}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
          />
        ) : (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-700 my-4 shadow-sm">
            <p className="flex items-center text-lg font-medium mb-2">
              <FaInfoCircle className="mr-2" /> Authentication Required
            </p>
            <p>Please sign in to access agreement management features.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agreements;
