import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import { toast } from "react-toastify";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FaCheck,
  FaTimes,
  FaFileContract,
  FaCalendarAlt,
  FaUserAlt,
  FaEye,
  FaFilter,
  FaSpinner,
  FaInfoCircle,
  FaClock,
  FaBuilding,
  FaSearch,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaFileDownload,
  FaChevronRight,
} from "react-icons/fa";
import Agreement from "./Agreement.js";
import { sendNotificationToUser } from "../../services/Firebase-notification.js";
import { downloadAgreement } from "./DownloadAgreement.js";

const BookingList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  const [downloadingIds, setDownloadingIds] = useState([]);
  const [renterNames, setRenterNames] = useState({});
  const navigate = useNavigate();

  // Modal state
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({});

  // Filter state
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Get user's landlord ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          const userId = await getUserDataFromFirebase();
          if (userId) {
            setLandlordId(userId);
          } else {
            toast.error("Failed to fetch landlord ID.");
          }
        } else {
          setLandlordId(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch agreements when landlord ID is available
  useEffect(() => {
    const fetchAgreements = async () => {
      if (!landlordId) return;

      try {
        setLoading(true);

        const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
        const response = await ApiHandler.get(
          `/Agreements/Landlord/${landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Agreements fetched:", response);
        setAgreements(response || []);

        // Collect unique renter IDs for name fetching
        const renterIds = [
          ...new Set(response.map((agreement) => agreement.renterId)),
        ];
        fetchRenterNames(renterIds);

        // Collect booking IDs to fetch property details
        const bookingIds = [
          ...new Set(response.map((agreement) => agreement.bookingId)),
        ];
        fetchPropertyDetails(bookingIds);
      } catch (err) {
        console.error("Error fetching agreements:", err);
        setError("Failed to load your lease agreements");
        toast.error("Could not load agreements.");
      } finally {
        setLoading(false);
      }
    };

    if (landlordId) {
      fetchAgreements();
    }
  }, [landlordId]);

  // Fetch property details for agreements
  const fetchPropertyDetails = async (bookingIds) => {
    try {
      const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
      const detailsMap = {};

      // Fetch property details for each booking
      const fetchPromises = bookingIds.map(async (bookingId) => {
        try {
          const bookingResponse = await ApiHandler.get(
            `/Bookings/${bookingId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (bookingResponse && bookingResponse.propertyId) {
            // Now fetch the property details
            const propertyResponse = await ApiHandler.get(
              `/Properties/${bookingResponse.propertyId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (propertyResponse) {
              detailsMap[bookingId] = {
                propertyId: propertyResponse.propertyId,
                title: propertyResponse.title,
                address: `${propertyResponse.district}, ${propertyResponse.city}`,
                bedrooms: propertyResponse.totalBedrooms,
                bathrooms: propertyResponse.totalWashrooms,
                price: propertyResponse.price,
                kitchen: propertyResponse.kitchen,
              };
            }
          }
        } catch (error) {
          console.error(
            `Error fetching details for booking ${bookingId}:`,
            error
          );
        }
      });

      // Wait for all fetches to complete
      await Promise.all(fetchPromises);
      setPropertyDetails(detailsMap);
    } catch (error) {
      console.error("Error fetching property details:", error);
    }
  };

  // Fetch renter names for all agreements
  const fetchRenterNames = async (renterIds) => {
    try {
      const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
      const namesMap = {};

      // Fetch names for all renters in parallel
      const fetchPromises = renterIds.map(async (renterId) => {
        try {
          const response = await ApiHandler.get(
            `/UserDetails/userId/${renterId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response && response.firstName) {
            namesMap[renterId] = `${response.firstName} ${
              response.lastName || ""
            }`.trim();
            console.log(
              `Fetched name for renter ${renterId}:`,
              namesMap[renterId]
            );
          } else {
            namesMap[renterId] = "Unknown User";
          }
        } catch (error) {
          console.error(`Error fetching name for renter ${renterId}:`, error);
          namesMap[renterId] = "Unknown User";
        }
      });

      // Wait for all name fetches to complete
      await Promise.all(fetchPromises);
      setRenterNames(namesMap);
    } catch (error) {
      console.error("Error fetching renter names:", error);
    }
  };

  // Open agreement modal
  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setIsModalOpen(true);
  };

  // Handle PDF download - updated to use the utility function
  const handlePdfDownload = async (agreement) => {
    try {
      // Set downloading state
      setDownloadingIds((prev) => [...prev, agreement.agreementId]);

      // Call the download utility function
      await downloadAgreement(
        agreement,
        propertyDetails,
        getRenterName(agreement.renterId),
        formatDate,
        (id) => setDownloadingIds((prev) => [...prev, id]),
        (id) => setDownloadingIds((prev) => prev.filter((item) => item !== id))
      );

      // No success toast needed
    } catch (error) {
      console.error("Error downloading agreement:", error);
      toast.error("Failed to download agreement. Please try again.");
    } finally {
      // Clear downloading state
      setDownloadingIds((prev) =>
        prev.filter((id) => id !== agreement.agreementId)
      );
    }
  };

  // Handle accept agreement
  const handleAcceptAgreement = async (agreementId) => {
    try {
      setProcessingIds((prev) => [...prev, agreementId]);
      console.log(`Accepting agreement ${agreementId}...`);

      // Find agreement to update
      const agreementToUpdate = agreements.find(
        (a) => a.agreementId === agreementId
      );

      if (!agreementToUpdate) {
        throw new Error("Agreement not found");
      }

      // Prepare update payload
      const updatePayload = {
        agreementId: agreementToUpdate.agreementId,
        bookingId: agreementToUpdate.bookingId,
        landlordId: agreementToUpdate.landlordId,
        renterId: agreementToUpdate.renterId,
        startDate: agreementToUpdate.startDate,
        endDate: agreementToUpdate.endDate,
        status: "Approved",
        signedAt: agreementToUpdate.signedAt,
      };

      // Update agreement status
      const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
      const response = await ApiHandler.put(
        `/Agreements/${agreementId}`,
        updatePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setAgreements((prev) =>
        prev.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Approved" }
            : agreement
        )
      );

      // SEND NOTIFICATION
      try {
        // Get property details
        const property = propertyDetails[agreementToUpdate.bookingId] || {};
        const propertyAddress = property.address || "your requested property";

        // Get Firebase ID
        const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
        const renterResponse = await ApiHandler.get(
          `/Users/firebaseByUserId/${agreementToUpdate.renterId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const renterFirebaseId = renterResponse;

        if (!renterFirebaseId) {
          console.log("Could not find renter's Firebase ID");
          return;
        }

        // Notification content
        const notificationTitle = "Agreement Approved";
        const notificationBody = `Your lease agreement for ${propertyAddress} has been approved.`;

        // Simple additionalData structure
        const additionalData = {
          propertyId: property.propertyId,
          bookingId: agreementToUpdate.bookingId,
          agreementId: agreementToUpdate.agreementId,
          screen: "Agreement",
          action: "view_agreement",
          timestamp: new Date().toISOString(),
        };

        // Direct notification call
        await sendNotificationToUser(
          renterFirebaseId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log(
          "Agreement approval notification sent to:",
          renterFirebaseId
        );
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      toast.success("Agreement accepted successfully");
    } catch (error) {
      console.error("Error accepting agreement:", error);
      toast.error(
        `Failed to accept agreement: ${error.message || "Unknown error"}`
      );
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== agreementId));
    }
  };

  // Handle reject agreement
  const handleRejectAgreement = async (agreementId) => {
    if (!window.confirm("Are you sure you want to reject this agreement?")) {
      return;
    }

    try {
      setProcessingIds((prev) => [...prev, agreementId]);
      console.log(`Rejecting agreement ${agreementId}...`);

      // Find agreement to update
      const agreementToUpdate = agreements.find(
        (a) => a.agreementId === agreementId
      );

      if (!agreementToUpdate) {
        throw new Error("Agreement not found");
      }

      // Prepare update payload
      const updatePayload = {
        agreementId: agreementToUpdate.agreementId,
        bookingId: agreementToUpdate.bookingId,
        landlordId: agreementToUpdate.landlordId,
        renterId: agreementToUpdate.renterId,
        startDate: agreementToUpdate.startDate,
        endDate: agreementToUpdate.endDate,
        status: "Rejected",
        signedAt: agreementToUpdate.signedAt,
      };

      // Update agreement status
      const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
      const response = await ApiHandler.put(
        `/Agreements/${agreementId}`,
        updatePayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setAgreements((prev) =>
        prev.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Rejected" }
            : agreement
        )
      );

      // SEND NOTIFICATION
      try {
        // Get property details
        const property = propertyDetails[agreementToUpdate.bookingId] || {};
        const propertyAddress = property.address || "your requested property";

        // Get Firebase ID
        const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
        const renterResponse = await ApiHandler.get(
          `/Users/firebaseByUserId/${agreementToUpdate.renterId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const renterFirebaseId = renterResponse;

        if (!renterFirebaseId) {
          console.log("Could not find renter's Firebase ID");
          return;
        }

        // Notification content
        const notificationTitle = "Agreement Rejected";
        const notificationBody = `Your lease agreement for ${propertyAddress} has been rejected by the landlord.`;

        // Simple additionalData structure
        const additionalData = {
          propertyId: property.propertyId,
          bookingId: agreementToUpdate.bookingId,
          agreementId: agreementToUpdate.agreementId,
          screen: "Agreement",
          action: "view_agreement",
          timestamp: new Date().toISOString(),
        };

        // Direct notification call
        await sendNotificationToUser(
          renterFirebaseId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log(
          "Agreement rejection notification sent to:",
          renterFirebaseId
        );
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      toast.success("Agreement rejected");
    } catch (error) {
      console.error("Error rejecting agreement:", error);
      toast.error(
        `Failed to reject agreement: ${error.message || "Unknown error"}`
      );
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== agreementId));
    }
  };

  // Format date to display nicely
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get renter name from ID
  const getRenterName = (renterId) => {
    return renterNames[renterId] || "Loading...";
  };

  // Get property name from booking ID
  const getPropertyName = (bookingId) => {
    const property = propertyDetails[bookingId] || {};
    return property.title || "Unknown Property";
  };

  // Get property address from booking ID
  const getPropertyAddress = (bookingId) => {
    const property = propertyDetails[bookingId] || {};
    return property.address || "Unknown Location";
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Reset filters
  const resetFilters = () => {
    setFilterStatus("All");
    setSearchTerm("");
  };

  // Filter agreements based on selected status and search term
  const filteredAgreements = agreements.filter((agreement) => {
    // Status filter
    const statusMatch =
      filterStatus === "All" || agreement.status === filterStatus;

    // Search filter - check property title, renter name, or agreement ID
    const propertyTitle = getPropertyName(agreement.bookingId).toLowerCase();
    const renterName = getRenterName(agreement.renterId).toLowerCase();
    const agreementId = agreement.agreementId.toString().toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    const searchMatch =
      !searchTerm ||
      propertyTitle.includes(searchLower) ||
      renterName.includes(searchLower) ||
      agreementId.includes(searchLower);

    return statusMatch && searchMatch;
  });

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: <FaCheck className="mr-1" />,
        };
      case "Pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          icon: <FaClock className="mr-1" />,
        };
      case "Rejected":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          icon: <FaTimes className="mr-1" />,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: <FaInfoCircle className="mr-1" />,
        };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
        <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
        <p className="text-gray-600">Loading agreements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
        <p className="flex items-center text-lg font-medium mb-2">
          <FaInfoCircle className="mr-2" /> Error
        </p>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
        <FaFileContract className="mx-auto text-4xl text-gray-400 mb-3" />
        <h3 className="text-xl font-medium text-gray-700 mb-2">
          No Lease Agreements
        </h3>
        <p className="text-gray-500">
          You don't have any lease agreement requests at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Enhanced with better visual styling */}
      <div className="mb-6 bg-gradient-to-r from-[#20319D] to-[#3448c5] text-white p-6 rounded-lg shadow-lg">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold mb-2 flex items-center">
              <FaFileContract className="mr-3 text-blue-200" /> Lease Agreement
              Requests
            </h1>
            <p className="text-sm text-blue-100 opacity-90">
              Manage and review lease agreements for your properties
            </p>
          </div>

          <div>
            {/* Filter toggle button - Enhanced */}
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center justify-center px-4 py-2 bg-white text-[#20319D] rounded-md hover:bg-blue-50 transition-colors font-medium shadow-sm"
            >
              <FaFilter className="mr-2" />
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Filter panel - Enhanced with frosted glass effect */}
        <div
          className={`mt-6 overflow-hidden transition-all duration-300 ${
            isFilterVisible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white/15 backdrop-blur-sm rounded-lg p-5 border border-white/20 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {/* Search input - Enhanced */}
              <div className="flex-grow">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Search Agreements
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by property, renter, or agreement ID"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-3 w-full border border-blue-300 bg-white/90 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm"
                  />
                  <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>

              {/* Status filter - Enhanced */}
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1 text-blue-100">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 w-full border border-blue-300 bg-white/90 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E")`,
                    backgroundPosition: "right 12px center",
                    backgroundSize: "20px 20px",
                    backgroundRepeat: "no-repeat",
                    paddingRight: "40px",
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Filter actions - Enhanced */}
              <div className="flex space-x-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-3 border border-white/50 text-white rounded-md hover:bg-white/10 transition-colors shadow-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active filters display - Enhanced */}
      {(filterStatus !== "All" || searchTerm) && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 font-medium mr-2">
              <FaFilter className="inline mr-1 text-blue-500" /> Active Filters:
            </span>

            {searchTerm && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs font-medium flex items-center">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            )}

            {filterStatus !== "All" && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-md text-xs font-medium flex items-center">
                Status: {filterStatus}
                <button
                  onClick={() => setFilterStatus("All")}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <FaTimes size={10} />
                </button>
              </span>
            )}

            <span className="ml-auto text-sm text-gray-500">
              <strong>{filteredAgreements.length}</strong> of{" "}
              <strong>{agreements.length}</strong> agreements
            </span>
          </div>
        </div>
      )}

      {/* Agreement List - Enhanced Cards */}
      {filteredAgreements.length > 0 ? (
        <div className="space-y-6">
          {filteredAgreements.map((agreement) => {
            const { bg, text, icon } = getStatusBadge(agreement.status);
            return (
              <div
                key={agreement.agreementId}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200 w-full border border-gray-200 transform hover:-translate-y-1 hover:border-blue-200 transition-all"
              >
                <div className="border-l-4 border-[#20319D]">
                  <div className="p-6">
                    {/* Header with title and status - Enhanced */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800 flex items-center">
                          <FaFileContract className="text-[#20319D] mr-2" />
                          Agreement #{agreement.agreementId}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          Booking ID: {agreement.bookingId}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${bg} ${text}`}
                      >
                        {icon} {agreement.status}
                      </span>
                    </div>

                    {/* Property details - Enhanced with better layout */}
                    <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <FaBuilding className="text-[#20319D]" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-800">
                            {getPropertyName(agreement.bookingId)}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <FaMapMarkerAlt className="mr-1 text-gray-400" />
                            {getPropertyAddress(agreement.bookingId)}
                          </p>
                          {propertyDetails[agreement.bookingId]?.price && (
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <FaMoneyBillWave className="mr-1 text-gray-400" />
                              <span className="font-medium text-[#20319D]">
                                Rs. {propertyDetails[agreement.bookingId].price}
                              </span>
                              /month
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Agreement details grid - Enhanced */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <FaCalendarAlt className="text-[#20319D]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Lease Period
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatDate(agreement.startDate)} -{" "}
                            {formatDate(agreement.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <FaUserAlt className="text-[#20319D]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            Renter
                          </p>
                          <p className="text-xs text-gray-600">
                            {getRenterName(agreement.renterId)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-5 italic border-t border-gray-100 pt-2">
                      Signed on {formatDate(agreement.signedAt)}
                    </div>

                    {/* Action buttons - Enhanced with better styling */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {agreement.status === "Pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleAcceptAgreement(agreement.agreementId)
                            }
                            disabled={processingIds.includes(
                              agreement.agreementId
                            )}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
                          >
                            {processingIds.includes(agreement.agreementId) ? (
                              <span className="flex items-center">
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                Processing...
                              </span>
                            ) : (
                              <>
                                <FaCheck className="mr-2" /> Accept
                              </>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleRejectAgreement(agreement.agreementId)
                            }
                            disabled={processingIds.includes(
                              agreement.agreementId
                            )}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                          >
                            {processingIds.includes(agreement.agreementId) ? (
                              <span className="flex items-center">
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                Processing...
                              </span>
                            ) : (
                              <>
                                <FaTimes className="mr-2" /> Reject
                              </>
                            )}
                          </button>
                        </>
                      )}

                      <div className="flex w-full gap-3 mt-3">
                        {/* View Button - Enhanced */}
                        <button
                          onClick={() => handleViewAgreement(agreement)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#20319D] hover:bg-blue-800 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <FaEye className="mr-2" /> View Agreement
                        </button>

                        {/* Download Button - Enhanced to match theme */}
                        <button
                          onClick={() => handlePdfDownload(agreement)}
                          disabled={downloadingIds.includes(
                            agreement.agreementId
                          )}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#20319D] bg-opacity-80 hover:bg-opacity-100 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                        >
                          {downloadingIds.includes(agreement.agreementId) ? (
                            <span className="flex items-center">
                              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                              Generating...
                            </span>
                          ) : (
                            <>
                              <FaFileDownload className="mr-2" /> Download
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-10 rounded-lg border border-gray-200 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 mx-auto rounded-full flex items-center justify-center mb-4">
            <FaInfoCircle className="text-3xl text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            No agreements match your filters
          </p>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Try adjusting your filter criteria or search term to find the
            agreements you're looking for
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-3 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors inline-flex items-center shadow-sm"
          >
            <FaFilter className="mr-2" /> Reset Filters
          </button>
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

export default BookingList;
