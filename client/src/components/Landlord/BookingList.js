import React, { useState, useEffect } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import {
  FiInfo,
  FiCalendar,
  FiHome,
  FiUser,
  FiClock,
  FiSearch,
  FiFilter,
  FiX,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";
import PaginationControls from "../UI/PaginationControls.js";

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userNames, setUserNames] = useState({});
  const [propertyDetails, setPropertyDetails] = useState({});

  // Filtering and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Status options from API
  const [statusOptions, setStatusOptions] = useState(["All"]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  // Get current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getUserDataFromFirebase();
        if (id) {
          setUserId(id);
        } else {
          setError("User not authenticated");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
        setError("Failed to authenticate user");
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  // Fetch bookings when userId is available
  useEffect(() => {
    if (userId) {
      fetchBookings();
    }
  }, [userId]);

  // Fetch bookings data and extract status options
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setLoadingStatuses(true);

      const response = await ApiHandler.get(`/Bookings/Landlord/${userId}`);

      // Make sure bookings is always an array
      if (Array.isArray(response)) {
        setBookings(response);
      } else {
        console.warn("API returned non-array response for bookings:", response);
        setBookings([]);
      }

      // Extract unique statuses from bookings
      if (Array.isArray(response) && response.length > 0) {
        const uniqueStatuses = [
          ...new Set(response.map((booking) => booking.status)),
        ];

        // Sort statuses alphabetically
        uniqueStatuses.sort();

        // Add "All" option at the beginning
        setStatusOptions(["All", ...uniqueStatuses]);

        // Only fetch details if we have bookings
        await fetchBookingDetails(response);
      } else {
        // Fallback in case of empty response
        setStatusOptions([
          "All",
          "Pending",
          "Approved",
          "Rejected",
          "Cancelled",
        ]);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to load bookings");
      // Fallback status options in case of error
      setStatusOptions(["All", "Pending", "Approved", "Rejected", "Cancelled"]);
      setBookings([]); // Ensure bookings is an empty array on error
    } finally {
      setLoading(false);
      setLoadingStatuses(false);
    }
  };

  // Filter bookings when search term or status filter changes
  useEffect(() => {
    // Make sure bookings is an array before filtering
    if (!Array.isArray(bookings) || bookings.length === 0) {
      setFilteredBookings([]);
      setTotalPages(1);
      return;
    }

    const filtered = bookings.filter((booking) => {
      // Status filter
      if (statusFilter !== "All" && booking.status !== statusFilter) {
        return false;
      }

      // Search term filter
      if (searchTerm) {
        const propertyTitle = propertyDetails[booking.propertyId]?.title || "";
        const tenantName = userNames[booking.userId] || "";

        return (
          propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenantName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return true;
    });

    setFilteredBookings(filtered);

    // Reset to first page when filters change
    setCurrentPage(1);

    // Calculate total pages
    const calculatedTotalPages = Math.ceil(filtered.length / pageSize);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
  }, [
    bookings,
    searchTerm,
    statusFilter,
    propertyDetails,
    userNames,
    pageSize,
  ]);

  // Fetch user names and property details for each booking
  const fetchBookingDetails = async (bookings) => {
    // Skip if bookings is not an array or empty
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return;
    }

    const userNamesObj = {};
    const propertyDetailsObj = {};

    // Create arrays of unique IDs to fetch
    const uniqueUserIds = [
      ...new Set(bookings.map((booking) => booking.userId)),
    ];
    const uniquePropertyIds = [
      ...new Set(bookings.map((booking) => booking.propertyId)),
    ];

    // Fetch user names
    await Promise.all(
      uniqueUserIds.map(async (id) => {
        try {
          const response = await ApiHandler.get(`/UserDetails/userId/${id}`);
          if (response) {
            const { firstName, lastName } = response;
            userNamesObj[id] = `${firstName} ${lastName}`;
          }
        } catch (error) {
          console.error(`Error fetching user details for ID ${id}:`, error);
          userNamesObj[id] = "Unknown User";
        }
      })
    );

    // Fetch property details
    await Promise.all(
      uniquePropertyIds.map(async (id) => {
        try {
          const response = await ApiHandler.get(`/Properties/${id}`);
          if (response) {
            propertyDetailsObj[id] = response;
          }
        } catch (error) {
          console.error(`Error fetching property details for ID ${id}:`, error);
          propertyDetailsObj[id] = { title: "Unknown Property" };
        }
      })
    );

    setUserNames(userNamesObj);
    setPropertyDetails(propertyDetailsObj);
  };

  // Clear filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  // Apply filters (mostly for UI consistency)
  const applyFilters = () => {
    setIsFilterVisible(false);
  };

  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <FiClock className="mr-1" />,
        };
      case "Approved":
        return {
          className: "bg-green-100 text-green-800",
          icon: <FiCheck className="mr-1" />,
        };
      case "Rejected":
        return {
          className: "bg-red-100 text-red-800",
          icon: <FiX className="mr-1" />,
        };
      case "Cancelled":
        return {
          className: "bg-gray-100 text-gray-800",
          icon: <FiX className="mr-1" />,
        };
      default:
        return {
          className: "bg-blue-100 text-blue-800",
          icon: <FiInfo className="mr-1" />,
        };
    }
  };

  // Get current page bookings - Add safety checks
  const indexOfLastBooking = currentPage * pageSize;
  const indexOfFirstBooking = indexOfLastBooking - pageSize;
  const currentBookings = Array.isArray(filteredBookings)
    ? filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking)
    : [];

  // No bookings state - added separately for clarity
  const hasNoBookings =
    !loading && Array.isArray(bookings) && bookings.length === 0;

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#20319D]"></div>
          <p className="text-gray-600 mt-4">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
          <p className="flex items-center text-lg font-medium mb-2">
            <FiInfo className="mr-2" /> Error
          </p>
          <p className="mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
            onClick={() => window.location.reload()}
          >
            <FiRefreshCw className="mr-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // Enhanced empty state for no bookings
  if (hasNoBookings) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCalendar className="text-[#20319D] text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            No Bookings Yet
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            You don't have any bookings for your properties yet. When tenants
            make booking requests, they will appear here.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center mx-auto"
          >
            <FiRefreshCw className="mr-2" /> Refresh Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-xl font-bold mb-2 flex items-center">
              <FiCalendar className="mr-2" /> Booking Management
            </h1>
          </div>

          <div>
            {/* Filter toggle button */}
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center justify-center px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors"
            >
              <FiFilter className="mr-2" />
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
                  Search Property or Tenant
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter property name or tenant name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-blue-400 bg-white text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                  />
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
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
                  disabled={loadingStatuses}
                >
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-white/50 text-white rounded-md hover:bg-white/10 transition-colors"
                  disabled={loadingStatuses}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {(searchTerm || statusFilter !== "All") && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 font-medium mr-2">
              <FiFilter className="inline mr-1" /> Active Filters:
            </span>

            {searchTerm && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                Search: {searchTerm}
              </span>
            )}

            {statusFilter && statusFilter !== "All" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                Status: {statusFilter}
              </span>
            )}

            <button
              onClick={resetFilters}
              className="ml-auto text-sm text-gray-500 hover:text-red-500 flex items-center"
            >
              <FiX className="mr-1" /> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bookings content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <FiInfo className="mx-auto text-gray-400 text-5xl mb-3" />
            <h3 className="text-xl font-medium text-gray-600 mb-1">
              No Bookings Found
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== "All"
                ? "Try adjusting your filters to see more results."
                : "When you receive booking requests, they will appear here."}
            </p>

            {/* Added refresh button for better UX */}
            {!searchTerm && statusFilter === "All" && (
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm inline-flex items-center"
              >
                <FiRefreshCw className="mr-2" /> Refresh Bookings
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    S.N.
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tenant
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Property
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentBookings.map((booking, index) => {
                  const { className, icon } = getStatusBadge(booking.status);

                  return (
                    <tr key={booking.bookingId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#20319D]">
                        {indexOfFirstBooking + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-md bg-[#20319D]/10 flex items-center justify-center">
                            <FiUser className="text-[#20319D]" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {userNames[booking.userId] || "Loading..."}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-md bg-[#20319D]/10 flex items-center justify-center">
                            <FiHome className="text-[#20319D]" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {propertyDetails[booking.propertyId]?.title ||
                                "Loading..."}
                            </div>
                            <div className="text-xs text-gray-500">
                              {
                                propertyDetails[booking.propertyId]
                                  ?.municipality
                              }
                              ,{propertyDetails[booking.propertyId]?.city}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                        >
                          {icon} {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="bg-[#20319D] hover:bg-blue-800 text-white py-1.5 px-4 rounded-md text-sm font-medium transition-colors flex items-center"
                          onClick={() =>
                            console.log(`View booking ${booking.bookingId}`)
                          }
                        >
                          <FiInfo className="mr-1" /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Mobile view for small screens */}
      <div className="sm:hidden mt-6">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <FiInfo className="mx-auto text-gray-400 text-4xl mb-3" />
            <h3 className="text-lg font-medium text-gray-600 mb-1">
              No Bookings Found
            </h3>
            <p className="text-gray-500 text-sm">
              {searchTerm || statusFilter !== "All"
                ? "Try adjusting your filters."
                : "When you receive booking requests, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentBookings.map((booking, index) => {
              const { className, icon } = getStatusBadge(booking.status);

              return (
                <div
                  key={booking.bookingId}
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-[#20319D] bg-blue-50 px-2 py-1 rounded-md">
                      {indexOfFirstBooking + index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                    >
                      {icon} {booking.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center mb-2">
                      <div className="h-8 w-8 rounded-md bg-[#20319D]/10 flex items-center justify-center mr-2">
                        <FiHome className="text-[#20319D]" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {propertyDetails[booking.propertyId]?.title ||
                            "Loading..."}
                        </div>
                        <div className="text-xs text-gray-500">
                          {propertyDetails[booking.propertyId]?.municipality},
                          {propertyDetails[booking.propertyId]?.city}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-md bg-[#20319D]/10 flex items-center justify-center mr-2">
                        <FiUser className="text-[#20319D]" />
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {userNames[booking.userId] || "Loading..."}
                      </div>
                    </div>
                  </div>

                  <button
                    className="w-full bg-[#20319D] hover:bg-blue-800 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    onClick={() =>
                      console.log(`View booking ${booking.bookingId}`)
                    }
                  >
                    <FiInfo className="mr-1" /> View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingList;
