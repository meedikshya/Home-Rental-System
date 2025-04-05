import React, { useState, useEffect, useCallback } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaInfoCircle,
  FaFilter,
  FaUserTie,
  FaUser,
  FaCalendarAlt,
  FaFileContract,
  FaCheck,
  FaHourglass,
  FaTimesCircle,
  FaBuilding,
  FaEye,
} from "react-icons/fa";
import PaginationControls from "../UI/PaginationControls.js";
import Agreement from "../bookings/Agreement.js";

const AgreementList = ({
  token,
  selectedLandlordId = "",
  searchTerm: externalSearchTerm = "",
  statusFilter: externalStatusFilter = "All",
}) => {
  // Main data states
  const [agreements, setAgreements] = useState([]);
  const [allAgreements, setAllAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Related data
  const [landlords, setLandlords] = useState([]);
  const [renters, setRenters] = useState({});
  const [properties, setProperties] = useState({});
  const [bookings, setBookings] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state for viewing agreement
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({});

  // Use external filters
  const searchTerm = externalSearchTerm;
  const statusFilter = externalStatusFilter;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, selectedLandlordId]);

  // Fetch agreements when component mounts or landlord changes
  useEffect(() => {
    if (token) {
      fetchAgreements();
      fetchLandlords();
    }
  }, [token, selectedLandlordId]);

  // Fetch all agreements or by landlord ID
  const fetchAgreements = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = selectedLandlordId
        ? `/Agreements/Landlord/${selectedLandlordId}`
        : "/Agreements";

      const agreementsData = await ApiHandler.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(agreementsData)) {
        setAllAgreements(agreementsData);

        // Extract IDs to fetch related data
        const bookingIds = [...new Set(agreementsData.map((a) => a.bookingId))];
        const landlordIds = [
          ...new Set(agreementsData.map((a) => a.landlordId)),
        ];
        const renterIds = [...new Set(agreementsData.map((a) => a.renterId))];

        // Fetch related data
        await Promise.all([
          fetchRenterDetails(renterIds),
          fetchBookings(bookingIds),
        ]);

        // Apply initial pagination
        filterAndPaginateAgreements(agreementsData, statusFilter, searchTerm);
      } else {
        setAgreements([]);
        setAllAgreements([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching agreements:", err);
      setError("Failed to load agreements. Please try again.");
      toast.error("Could not load agreements.");
      setAgreements([]);
      setAllAgreements([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Fetch landlords for dropdown
  const fetchLandlords = async () => {
    try {
      const [userDetailsResponse, usersResponse] = await Promise.all([
        ApiHandler.get("/UserDetails", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        ApiHandler.get("/Users", {
          headers: { Authorization: `Bearer ${token}` },
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

  // Fetch renter details
  const fetchRenterDetails = async (renterIds) => {
    try {
      const renterDetails = {};

      for (const id of renterIds) {
        if (id) {
          const renter = await ApiHandler.get(`/UserDetails/userId/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (renter) {
            renterDetails[id] = renter;
          }
        }
      }

      setRenters(renterDetails);
    } catch (err) {
      console.error("Error fetching renter details:", err);
    }
  };

  // Fetch bookings and their related properties
  const fetchBookings = async (bookingIds) => {
    try {
      const bookingDetails = {};
      const propertyDetails = {};
      const propertyDetailsForModal = {};

      for (const id of bookingIds) {
        if (id) {
          const booking = await ApiHandler.get(`/Bookings/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (booking) {
            bookingDetails[id] = booking;

            // Also fetch related property
            if (booking.propertyId) {
              const property = await ApiHandler.get(
                `/Properties/${booking.propertyId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              if (property) {
                propertyDetails[booking.propertyId] = property;

                // Add to property details for modal
                propertyDetailsForModal[id] = {
                  propertyId: property.propertyId,
                  title: property.title,
                  address: `${property.district || property.municipality}, ${
                    property.city
                  }`,
                  bedrooms: property.totalBedrooms,
                  bathrooms: property.totalWashrooms,
                  price: property.price,
                  kitchen: property.kitchen,
                };
              }
            }
          }
        }
      }

      setBookings(bookingDetails);
      setProperties(propertyDetails);
      setPropertyDetails(propertyDetailsForModal);
    } catch (err) {
      console.error("Error fetching bookings and properties:", err);
    }
  };

  // Apply filters and pagination
  const filterAndPaginateAgreements = useCallback(
    (agreements, status, search) => {
      let filtered = [...agreements];

      // Apply status filter
      if (status !== "All") {
        filtered = filtered.filter((agreement) => agreement.status === status);
      }

      // Apply search term filter (search in property title or renter name)
      if (search) {
        filtered = filtered.filter((agreement) => {
          const booking = bookings[agreement.bookingId];
          const property = booking ? properties[booking.propertyId] : null;
          const renter = renters[agreement.renterId];

          const propertyTitle = property?.title || "";
          const renterName = renter
            ? `${renter.firstName} ${renter.lastName}`
            : "";

          return (
            propertyTitle.toLowerCase().includes(search.toLowerCase()) ||
            renterName.toLowerCase().includes(search.toLowerCase())
          );
        });
      }

      // Apply pagination
      const totalFilteredAgreements = filtered.length;
      const calculatedTotalPages = Math.ceil(
        totalFilteredAgreements / pageSize
      );

      setTotalPages(calculatedTotalPages || 1);

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedAgreements = filtered.slice(startIndex, endIndex);

      setAgreements(paginatedAgreements);
    },
    [bookings, properties, renters, currentPage, pageSize]
  );

  // Re-filter when filters change
  useEffect(() => {
    if (allAgreements.length) {
      filterAndPaginateAgreements(allAgreements, statusFilter, searchTerm);
    }
  }, [
    allAgreements,
    statusFilter,
    searchTerm,
    filterAndPaginateAgreements,
    currentPage,
  ]);

  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return {
          className: "bg-green-100 text-green-800",
          icon: <FaCheck className="mr-1" />,
        };
      case "Pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <FaHourglass className="mr-1" />,
        };
      case "Expired":
        return {
          className: "bg-red-100 text-red-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      case "Terminated":
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

  // Get landlord name from id
  const getLandlordName = (landlordId) => {
    const landlord = landlords.find((l) => l.userId === landlordId);
    return landlord
      ? `${landlord.firstName} ${landlord.lastName}`
      : "Unknown Landlord";
  };

  // Get renter name from id
  const getRenterName = (renterId) => {
    const renter = renters[renterId];
    return renter ? `${renter.firstName} ${renter.lastName}` : "Unknown Renter";
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Handle viewing agreement
  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setIsModalOpen(true);
  };

  // Show loading state
  if (loading && !agreements.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
        <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
        <p className="text-gray-600">Loading agreements...</p>
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
          onClick={fetchAgreements}
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Active filters display */}
      {(statusFilter !== "All" || searchTerm || selectedLandlordId) && (
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

            {statusFilter !== "All" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                Status: {statusFilter}
              </span>
            )}

            {selectedLandlordId && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                Landlord:{" "}
                {landlords.find((l) => l.userId === selectedLandlordId)
                  ?.firstName || "Selected"}
              </span>
            )}

            <span className="ml-auto text-sm text-gray-500">
              <strong>
                {agreements.length > 0 ? allAgreements.length : 0}
              </strong>{" "}
              total agreements
            </span>
          </div>
        </div>
      )}

      {/* No agreements state */}
      {agreements.length === 0 && (
        <div className="text-center py-16">
          <FaFileContract className="mx-auto text-gray-400 text-5xl mb-3" />
          <h3 className="text-xl font-medium text-gray-600 mb-1">
            No Agreements Found
          </h3>
          <p className="text-gray-500">
            {statusFilter !== "All"
              ? `There are no ${statusFilter.toLowerCase()} agreements.`
              : searchTerm
              ? "There are no agreements matching your search criteria."
              : selectedLandlordId
              ? "This landlord has no agreements."
              : "There are no agreements in the system."}
          </p>
        </div>
      )}

      {/* Agreements list for desktop */}
      {agreements.length > 0 && (
        <div className="hidden sm:block w-full">
          <div className="w-full">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="w-[5%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Property
                  </th>
                  <th
                    scope="col"
                    className="w-[14%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Landlord
                  </th>
                  <th
                    scope="col"
                    className="w-[15%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Renter
                  </th>
                  <th
                    scope="col"
                    className="w-[22%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Term
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="w-[14%] px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {agreements.map((agreement, index) => {
                  const booking = bookings[agreement.bookingId];
                  const property = booking
                    ? properties[booking.propertyId]
                    : null;
                  const renter = renters[agreement.renterId];
                  const { className, icon } = getStatusBadge(agreement.status);
                  const landlordName = getLandlordName(agreement.landlordId);

                  return (
                    <tr
                      key={agreement.agreementId}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-2 py-4 text-sm font-medium text-[#20319D]">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-2 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {property?.title || "Unknown Property"}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {property
                              ? `${property.municipality}, ${property.city}`
                              : "Unknown Location"}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {landlordName}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {renter
                              ? `${renter.firstName} ${renter.lastName}`
                              : "Unknown Renter"}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="text-sm text-gray-900 truncate">
                          {formatDate(agreement.startDate)} -{" "}
                          {formatDate(agreement.endDate)}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                        >
                          {icon} {agreement.status}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <button
                          onClick={() => handleViewAgreement(agreement)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <FaEye className="mr-1" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile card view for agreements */}
      {agreements.length > 0 && (
        <div className="sm:hidden">
          <div className="grid grid-cols-1 gap-4 p-4">
            {agreements.map((agreement, index) => {
              const booking = bookings[agreement.bookingId];
              const property = booking ? properties[booking.propertyId] : null;
              const renter = renters[agreement.renterId];
              const { className, icon } = getStatusBadge(agreement.status);
              const landlordName = getLandlordName(agreement.landlordId);

              return (
                <div
                  key={agreement.agreementId}
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-[#20319D] bg-blue-50 px-2 py-1 rounded-md">
                      {(currentPage - 1) * pageSize + index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                    >
                      {icon} {agreement.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Property:
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {property?.title || "Unknown Property"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {property
                          ? `${property.municipality}, ${property.city}`
                          : "Unknown Location"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Landlord:
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {landlordName}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Renter:</div>
                      <div className="text-sm font-medium text-gray-900">
                        {renter
                          ? `${renter.firstName} ${renter.lastName}`
                          : "Unknown Renter"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Term:</div>
                      <div className="text-sm text-gray-900">
                        {formatDate(agreement.startDate)} -{" "}
                        {formatDate(agreement.endDate)}
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        onClick={() => handleViewAgreement(agreement)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FaEye className="mr-2" /> View Agreement
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* Agreement modal */}
      <Agreement
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agreement={selectedAgreement}
        propertyDetails={propertyDetails}
        getRenterName={getRenterName}
        formatDate={formatDate}
      />
    </div>
  );
};

export default AgreementList;
