import React, { useState, useEffect } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FaSpinner,
  FaInfoCircle,
  FaBuilding,
  FaUser,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
} from "react-icons/fa";
import { toast } from "react-toastify";
import PaginationControls from "../UI/PaginationControls.js";

const BookingList = ({
  token,
  onStatsUpdate,
  searchTerm: externalSearchTerm = "",
  statusFilter: externalStatusFilter = "",
}) => {
  // State for bookings data
  const [bookings, setBookings] = useState([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for properties and users
  const [properties, setProperties] = useState({});
  const [users, setUsers] = useState({});

  // State for status options from API
  const [statusOptions, setStatusOptions] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Internal filter state (used if external filters are not provided)
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState("");

  // Derive actual filter values (prefer external)
  const searchTerm = externalSearchTerm || internalSearchTerm;
  const statusFilter = externalStatusFilter || internalStatusFilter;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch all required data when component mounts
  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchAcceptedCount();
      fetchStatusOptions();
    }
  }, [token]);

  // Update parent component with stats when they change
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate({
        total: bookings.length,
        accepted: acceptedCount,
      });
    }
  }, [bookings.length, acceptedCount, onStatsUpdate]);

  // Fetch bookings from API
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const bookingsData = await ApiHandler.get("/Bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData);

        // Extract unique property IDs and user IDs to fetch their details
        const propertyIds = [
          ...new Set(bookingsData.map((booking) => booking.propertyId)),
        ];
        const userIds = [
          ...new Set(bookingsData.map((booking) => booking.userId)),
        ];

        // Fetch property and user details
        await Promise.all([
          fetchPropertiesData(propertyIds),
          fetchUsersData(userIds),
        ]);
      } else {
        setBookings([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again.");
      toast.error("Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch status options from API
  const fetchStatusOptions = async () => {
    try {
      setLoadingStatuses(true);
      const statusData = await ApiHandler.get("/Bookings/statuses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(statusData)) {
        setStatusOptions(statusData);

        // If there are options and no status filter is set, use the first one as default
        if (statusData.length > 0 && !statusFilter) {
          // Add "All" as first option
          const allOptions = ["All", ...statusData];
          setStatusOptions(allOptions);
          setInternalStatusFilter("All");
        }
      } else {
        // Fallback to default statuses if API doesn't return valid data
        setStatusOptions([
          "All",
          "Pending",
          "Accepted",
          "Rejected",
          "Cancelled",
        ]);
        setInternalStatusFilter("All");
      }
    } catch (err) {
      console.error("Error fetching status options:", err);
      // Fallback to default statuses if API call fails
      setStatusOptions(["All", "Pending", "Accepted", "Rejected", "Cancelled"]);
      setInternalStatusFilter("All");
    } finally {
      setLoadingStatuses(false);
    }
  };

  // Rest of the existing functions remain the same...
  // Fetch accepted booking count
  const fetchAcceptedCount = async () => {
    try {
      const count = await ApiHandler.get("/Bookings/accepted-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAcceptedCount(count);
    } catch (err) {
      console.error("Error fetching accepted count:", err);
    }
  };

  // Fetch property details for all bookings
  const fetchPropertiesData = async (propertyIds) => {
    try {
      const propertyData = {};

      for (const id of propertyIds) {
        if (id) {
          const property = await ApiHandler.get(`/Properties/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (property) {
            propertyData[id] = property;
          }
        }
      }

      setProperties(propertyData);
    } catch (err) {
      console.error("Error fetching property data:", err);
    }
  };

  // Fetch user details for all bookings
  const fetchUsersData = async (userIds) => {
    try {
      const userData = {};

      for (const id of userIds) {
        if (id) {
          const user = await ApiHandler.get(`/UserDetails/userId/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (user) {
            userData[id] = user;
          }
        }
      }

      setUsers(userData);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <FaHourglass className="mr-1" />,
        };
      case "Accepted":
        return {
          className: "bg-green-100 text-green-800",
          icon: <FaCheckCircle className="mr-1" />,
        };
      case "Rejected":
        return {
          className: "bg-red-100 text-red-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      case "Cancelled":
        return {
          className: "bg-gray-100 text-gray-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      default:
        return {
          className: "bg-blue-100 text-blue-800",
          icon: <FaInfoCircle className="mr-1" />,
        };
    }
  };

  // Filter bookings based on search term and status filter
  const filteredBookings = bookings.filter((booking) => {
    // Filter by status
    if (
      statusFilter &&
      statusFilter !== "All" &&
      booking.status !== statusFilter
    ) {
      return false;
    }

    // Filter by search term (property title or user name)
    if (searchTerm) {
      const property = properties[booking.propertyId];
      const user = users[booking.userId];
      const propertyTitle = property?.title || "";
      const userName = user ? `${user.firstName} ${user.lastName}` : "";

      return (
        propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return true;
  });

  // Calculate pagination values
  const totalFilteredBookings = filteredBookings.length;
  const calculatedTotalPages = Math.ceil(totalFilteredBookings / pageSize);

  useEffect(() => {
    setTotalPages(calculatedTotalPages);
  }, [calculatedTotalPages]);

  // Get current page bookings
  const indexOfLastBooking = currentPage * pageSize;
  const indexOfFirstBooking = indexOfLastBooking - pageSize;
  const currentBookings = filteredBookings.slice(
    indexOfFirstBooking,
    indexOfLastBooking
  );

  // Show loading state
  if ((loading && !bookings.length) || loadingStatuses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
        <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
        <p className="text-gray-600">Loading bookings...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
        <p className="flex items-center text-lg font-medium mb-2">
          <FaInfoCircle className="mr-2" /> Error
        </p>
        <p className="mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
          onClick={fetchBookings}
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Status badge summary */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 font-medium mr-2">
            <FaFilter className="inline mr-1" /> Active Filters:
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

          {!searchTerm && (!statusFilter || statusFilter === "All") && (
            <span className="text-sm text-gray-400">None</span>
          )}

          {/* Status filter dropdown for internal use if no external filter */}
          {!externalStatusFilter && statusOptions.length > 0 && (
            <div className="ml-auto">
              <select
                className="text-sm border border-gray-300 rounded-md p-1"
                value={internalStatusFilter}
                onChange={(e) => setInternalStatusFilter(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* No bookings state */}
      {filteredBookings.length === 0 && (
        <div className="text-center py-16">
          <FaInfoCircle className="mx-auto text-gray-400 text-5xl mb-3" />
          <h3 className="text-xl font-medium text-gray-600 mb-1">
            No Bookings Found
          </h3>
          <p className="text-gray-500">
            {statusFilter && statusFilter !== "All"
              ? `There are no ${statusFilter.toLowerCase()} bookings.`
              : "There are no bookings matching your search criteria."}
          </p>
        </div>
      )}

      {/* Bookings list */}
      {currentBookings.length > 0 && (
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
                  Property
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Renter
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentBookings.map((booking, index) => {
                const property = properties[booking.propertyId];
                const user = users[booking.userId];
                const { className, icon } = getStatusBadge(booking.status);

                return (
                  <tr key={booking.bookingId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#20319D]">
                      {indexOfFirstBooking + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-[#20319D]/10 flex items-center justify-center">
                          <FaBuilding className="text-[#20319D]" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {property?.title || "Unknown Property"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {property
                              ? `${property.municipality}, ${property.city}`
                              : "Unknown Location"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md bg-[#20319D]/10 flex items-center justify-center">
                          <FaUser className="text-[#20319D]" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user
                              ? `${user.firstName} ${user.lastName}`
                              : "Unknown User"}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Card view for mobile */}
      <div className="sm:hidden">
        <div className="grid grid-cols-1 gap-4 p-4">
          {currentBookings.map((booking, index) => {
            const property = properties[booking.propertyId];
            const user = users[booking.userId];
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
                      <FaBuilding className="text-[#20319D]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {property?.title || "Unknown Property"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {property
                          ? `${property.municipality}, ${property.city}`
                          : "Unknown Location"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-md bg-[#20319D]/10 flex items-center justify-center mr-2">
                      <FaUser className="text-[#20319D]" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {user
                        ? `${user.firstName} ${user.lastName}`
                        : "Unknown User"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
  );
};

export default BookingList;
