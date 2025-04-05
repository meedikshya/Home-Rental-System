import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaBuilding,
  FaUser,
  FaCalendarAlt,
  FaSearch,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaBed,
  FaBath,
  FaUtensils,
  FaMapMarkerAlt,
  FaFilter,
  FaEye,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUndoAlt,
} from "react-icons/fa";
import ApiHandler from "../../api/ApiHandler.js";
import PaginationControls from "../../components/UI/PaginationControls.js";

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState({});
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");

  // Fetch all bookings with optimized property loading
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching bookings data...");
      const response = await ApiHandler.get("/Bookings");

      console.log("Bookings response:", response);

      if (Array.isArray(response)) {
        setBookings(response);

        // Extract all property IDs and user IDs from bookings
        const propertyIds = [
          ...new Set(response.map((booking) => booking.propertyId)),
        ];
        const userIds = [...new Set(response.map((booking) => booking.userId))];

        console.log(
          `Found ${propertyIds.length} unique properties in bookings`
        );

        // Fetch only the properties needed for these bookings
        await fetchPropertiesForBookings(propertyIds);

        // Fetch user details
        await fetchUsers(userIds);
      } else {
        setError("Unexpected response format");
        toast.error("Failed to load bookings data");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(`Failed to load bookings: ${err.message}`);
      toast.error("Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  // Fetch only properties related to bookings
  const fetchPropertiesForBookings = async (propertyIds) => {
    try {
      if (propertyIds.length === 0) {
        console.log("No property IDs to fetch");
        return;
      }

      console.log(`Fetching ${propertyIds.length} properties for bookings...`);

      // Option 1: Fetch all properties and filter client-side
      const propertiesResponse = await ApiHandler.get("/Properties");

      if (Array.isArray(propertiesResponse)) {
        // Filter only properties related to bookings
        const filteredProperties = propertiesResponse.filter((property) =>
          propertyIds.includes(property.propertyId)
        );

        console.log(
          `Filtered ${filteredProperties.length} properties from ${propertiesResponse.length} total`
        );

        // Convert to a map for easier lookup
        const propertyMap = {};
        filteredProperties.forEach((property) => {
          propertyMap[property.propertyId] = property;
        });

        setProperties(propertyMap);

        // Fetch images for these specific properties
        fetchPropertyImages(propertyIds);
      } else {
        console.error(
          "Unexpected properties response format:",
          propertiesResponse
        );
      }
    } catch (err) {
      console.error("Error fetching properties for bookings:", err);
      toast.error("Could not load property details");
    }
  };

  // Fetch property images
  const fetchPropertyImages = async (propertyIds) => {
    try {
      if (propertyIds.length === 0) return;

      console.log(`Fetching images for ${propertyIds.length} properties...`);

      // Option 1: Fetch all images and filter client-side
      const imagesResponse = await ApiHandler.get("/PropertyImages");

      if (Array.isArray(imagesResponse)) {
        // Filter images for only our properties
        const relevantImages = imagesResponse.filter((img) =>
          propertyIds.includes(img.propertyId)
        );

        console.log(
          `Found ${relevantImages.length} images for the bookings properties`
        );

        const propertyMap = { ...properties };

        // Group images by property ID
        relevantImages.forEach((image) => {
          const property = propertyMap[image.propertyId];
          if (property) {
            if (!property.images) property.images = [];
            property.images.push(image.imageUrl);
          }
        });

        setProperties(propertyMap);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
      toast.info("Some property images could not be loaded");
    }
  };

  // Fetch users for all bookings
  const fetchUsers = async (userIds) => {
    try {
      if (userIds.length === 0) return;

      console.log(`Fetching details for ${userIds.length} users...`);

      // Use Promise.all to fetch all user data in parallel
      const userPromises = userIds.map((userId) =>
        ApiHandler.get(`/UserDetails/userId/${userId}`)
      );

      const usersData = await Promise.all(userPromises);

      const userMap = {};
      usersData.forEach((user, index) => {
        if (user) {
          userMap[userIds[index]] = user;
        }
      });

      console.log(
        `Successfully loaded details for ${Object.keys(userMap).length} users`
      );
      setUsers(userMap);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Could not load all user details");
    }
  };

  // Update booking status
  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      setLoading(true);

      // API call to update booking status
      await ApiHandler.put(
        `/Bookings/${bookingId}/status`,
        { status: newStatus },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      setBookings(
        bookings.map((booking) =>
          booking.bookingId === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      toast.success(`Booking ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      console.error(`Error updating booking status:`, err);
      toast.error(`Failed to ${newStatus.toLowerCase()} booking`);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const getFilteredBookings = () => {
    let filtered = [...bookings];

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter(
        (booking) => booking.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((booking) => {
        const property = properties[booking.propertyId];
        const user = users[booking.userId];

        if (!property || !user) return false;

        const searchString = `
          ${property.title || ""} 
          ${property.city || ""} 
          ${property.municipality || ""} 
          ${user.firstName || ""} 
          ${user.lastName || ""}
        `.toLowerCase();

        return searchString.includes(searchTerm.toLowerCase());
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.bookingDate || 0);
      const dateB = new Date(b.bookingDate || 0);

      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Get paginated bookings
  const getPaginatedBookings = () => {
    const filtered = getFilteredBookings();
    const totalFilteredBookings = filtered.length;

    // Calculate total pages
    const calculatedTotalPages = Math.max(
      1,
      Math.ceil(totalFilteredBookings / pageSize)
    );

    // Update total pages state
    if (calculatedTotalPages !== totalPages) {
      setTotalPages(calculatedTotalPages);
    }

    // If current page is out of bounds, reset to page 1
    if (currentPage > calculatedTotalPages) {
      setCurrentPage(1);
      return filtered.slice(0, pageSize);
    }

    // Return the paginated subset
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Get the bookings to display based on filters and pagination
  const bookingsToDisplay = getPaginatedBookings();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <FaCalendarAlt className="mr-2" /> Booking Management
            </h1>
            <p className="text-blue-100">
              Manage all property bookings in the system
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 w-full bg-white/10 backdrop-blur-sm rounded-lg border border-blue-700 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder-blue-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className="flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white hover:bg-white/20"
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
            >
              {sortOrder === "desc" ? (
                <>
                  <FaSortAmountDown className="mr-2" /> Newest
                </>
              ) : (
                <>
                  <FaSortAmountUp className="mr-2" /> Oldest
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center text-gray-700">
            <FaFilter className="mr-2" /> Filter by status:
          </span>

          {["All", "Pending", "Approved", "Rejected", "Cancelled"].map(
            (status) => (
              <button
                key={status}
                className={`px-4 py-2 rounded-md ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            )
          )}

          {(searchTerm || statusFilter !== "All" || sortOrder !== "desc") && (
            <button
              onClick={handleResetFilters}
              className="ml-auto flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <FaUndoAlt className="mr-2" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FaSpinner className="animate-spin text-blue-600 text-4xl mb-4" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      ) : bookingsToDisplay.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="text-gray-300 mb-4">
              <FaCalendarAlt size={64} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Bookings Found
            </h3>
            <p className="text-gray-500 mb-6">
              There are no bookings matching your current filter criteria.
            </p>
            {(searchTerm || statusFilter !== "All") && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center"
              >
                <FaUndoAlt className="mr-2" /> Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {bookingsToDisplay.map((booking) => {
            const property = properties[booking.propertyId];
            const user = users[booking.userId];

            if (!property || !user) return null;

            return (
              <div
                key={booking.bookingId}
                className="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-blue-50 p-2 rounded-md mr-3">
                      <FaCalendarAlt className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Booking #{booking.bookingId}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {booking.bookingDate
                          ? new Date(booking.bookingDate).toLocaleDateString()
                          : "No date"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeStyle(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </div>
                </div>

                <div className="p-4 flex">
                  <div className="w-24 h-24 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={
                        property.images?.[0] ||
                        "https://via.placeholder.com/300.png"
                      }
                      alt={property.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300.png";
                      }}
                    />
                  </div>

                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <FaMapMarkerAlt className="mr-1 text-gray-400" />
                      <span>
                        {property.city}, {property.municipality}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-2">
                      {property.totalBedrooms > 0 && (
                        <div className="flex items-center text-sm text-gray-700">
                          <FaBed className="mr-1 text-gray-500" />
                          <span>{property.totalBedrooms} Bed</span>
                        </div>
                      )}
                      {property.totalWashrooms > 0 && (
                        <div className="flex items-center text-sm text-gray-700">
                          <FaBath className="mr-1 text-gray-500" />
                          <span>{property.totalWashrooms} Bath</span>
                        </div>
                      )}
                      {property.totalKitchens > 0 && (
                        <div className="flex items-center text-sm text-gray-700">
                          <FaUtensils className="mr-1 text-gray-500" />
                          <span>{property.totalKitchens} Kitchen</span>
                        </div>
                      )}
                    </div>

                    <div className="font-bold text-blue-600">
                      Rs. {property.price}/month
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center mb-3">
                    <div className="bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                      <FaUser className="text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {booking.status.toLowerCase() === "pending" && (
                      <>
                        <button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                          onClick={() =>
                            updateBookingStatus(booking.bookingId, "Approved")
                          }
                        >
                          <FaCheck className="mr-2" /> Approve
                        </button>
                        <button
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                          onClick={() =>
                            updateBookingStatus(booking.bookingId, "Rejected")
                          }
                        >
                          <FaTimes className="mr-2" /> Reject
                        </button>
                      </>
                    )}
                    <button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center justify-center"
                      onClick={() => {
                        // View details functionality
                        // This could navigate to a detail page or open a modal
                        toast.info(
                          `Viewing details for booking #${booking.bookingId}`
                        );
                      }}
                    >
                      <FaEye className="mr-2" /> View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {bookings.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Bookings summary */}
      <div className="mt-6 text-center text-sm text-gray-500">
        {bookingsToDisplay.length > 0 ? (
          <p>
            Showing {bookingsToDisplay.length} of {getFilteredBookings().length}{" "}
            bookings (Page {currentPage} of {totalPages})
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default Bookings;
