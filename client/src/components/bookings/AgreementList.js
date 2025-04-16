import React, { useState, useEffect, useCallback } from "react";
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
  FaSearch,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaFileDownload,
  FaHome,
} from "react-icons/fa";
import Agreement from "./Agreement.js";
import { sendNotificationToUser } from "../../services/Firebase-notification.js";
import { downloadAgreement } from "./DownloadAgreement.js";
import PaginationControls from "../UI/PaginationControls.js";

const AgreementList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [agreements, setAgreements] = useState([]); // Ensure this is initialized as an empty array
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
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
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Format date to display nicely
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get auth token - memoized to avoid recreation
  const getAuthToken = useCallback(async () => {
    return await FIREBASE_AUTH.currentUser?.getIdToken(true);
  }, []);

  // Get user's landlord ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          try {
            const userId = await getUserDataFromFirebase();
            if (userId) {
              setLandlordId(userId);
            } else {
              toast.error("Failed to fetch landlord ID.");
              setError("Could not verify your identity. Please try again.");
              setLoading(false);
            }
          } catch (err) {
            console.error("Error getting user data:", err);
            setError("Authentication error. Please try logging in again.");
            setLoading(false);
          }
        } else {
          setLandlordId(null);
          setError("You must be logged in to view agreements.");
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch agreements when landlord ID is available
  useEffect(() => {
    if (!landlordId) return;

    // Fixed fetchAgreements function with proper array handling
    const fetchAgreements = async () => {
      try {
        setLoading(true);

        const token = await getAuthToken();
        if (!token) {
          throw new Error("Authentication token not available");
        }

        // Always fetch fresh data
        const response = await ApiHandler.get(
          `/Agreements/Landlord/${landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Agreements fetched:", response);

        // Make sure we always set an array
        if (Array.isArray(response)) {
          setAgreements(response);
        } else {
          console.warn(
            "API returned non-array response for agreements:",
            response
          );
          setAgreements([]);
        }

        // After main data is loaded, show the UI
        setLoading(false);

        // Now fetch secondary data in the background
        // Only proceed with secondary fetches if we have valid agreement data
        if (Array.isArray(response) && response.length > 0) {
          // Extract IDs for parallel fetching
          const renterIds = [
            ...new Set(response.map((agreement) => agreement.renterId)),
          ];
          const bookingIds = [
            ...new Set(response.map((agreement) => agreement.bookingId)),
          ];

          // Start both fetch operations in parallel
          Promise.all([
            fetchRenterNames(renterIds, token),
            fetchPropertyDetails(bookingIds, token),
          ]).finally(() => {
            setInitialLoad(false);
          });
        } else {
          setInitialLoad(false);
        }
      } catch (err) {
        console.error("Error fetching agreements:", err);
        setError("Failed to load your lease agreements");
        toast.error("Could not load agreements.");
        setAgreements([]); // Make sure we set an empty array on error
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchAgreements();
  }, [landlordId, getAuthToken]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Fetch property details for agreements - optimized to run in parallel
  const fetchPropertyDetails = async (bookingIds, existingToken = null) => {
    try {
      const token = existingToken || (await getAuthToken());
      const detailsMap = { ...propertyDetails }; // Start with existing data

      // Create a promise for each booking
      const fetchPromises = bookingIds.map(async (bookingId) => {
        try {
          // Fetch booking and property in parallel when possible
          const bookingResponse = await ApiHandler.get(
            `/Bookings/${bookingId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (bookingResponse && bookingResponse.propertyId) {
            // Fetch property details
            const propertyResponse = await ApiHandler.get(
              `/Properties/${bookingResponse.propertyId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
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

              // Update state incrementally as properties load
              setPropertyDetails({ ...detailsMap });
            }
          }
        } catch (error) {
          console.error(
            `Error fetching details for booking ${bookingId}:`,
            error
          );
        }
      });

      // Execute all promises in parallel
      await Promise.all(fetchPromises);

      // Final update with all data
      setPropertyDetails({ ...detailsMap });
      return detailsMap;
    } catch (error) {
      console.error("Error fetching property details:", error);
      return propertyDetails;
    }
  };

  // Fetch renter names for all agreements - optimized to run in parallel
  const fetchRenterNames = async (renterIds, existingToken = null) => {
    try {
      const token = existingToken || (await getAuthToken());
      const namesMap = { ...renterNames }; // Start with existing data

      // Create a promise for each renter
      const fetchPromises = renterIds.map(async (renterId) => {
        try {
          const response = await ApiHandler.get(
            `/UserDetails/userId/${renterId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response && response.firstName) {
            namesMap[renterId] = `${response.firstName} ${
              response.lastName || ""
            }`.trim();

            // Update state incrementally as names load
            setRenterNames({ ...namesMap });
          } else {
            namesMap[renterId] = "Unknown User";
          }
        } catch (error) {
          console.error(`Error fetching name for renter ${renterId}:`, error);
          namesMap[renterId] = "Unknown User";
        }
      });

      // Execute all promises in parallel
      await Promise.all(fetchPromises);

      // Final update with all data
      setRenterNames({ ...namesMap });
      return namesMap;
    } catch (error) {
      console.error("Error fetching renter names:", error);
      return renterNames;
    }
  };

  // Open agreement modal
  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setIsModalOpen(true);
  };

  // Handle PDF download
  const handlePdfDownload = async (agreement) => {
    try {
      setDownloadingIds((prev) => [...prev, agreement.agreementId]);

      await downloadAgreement(
        agreement,
        propertyDetails,
        getRenterName(agreement.renterId),
        formatDate
      );
    } catch (error) {
      console.error("Error downloading agreement:", error);
      toast.error("Failed to download agreement. Please try again.");
    } finally {
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
      const token = await getAuthToken();
      await ApiHandler.put(`/Agreements/${agreementId}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state and cache
      if (Array.isArray(agreements)) {
        const updatedAgreements = agreements.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Approved" }
            : agreement
        );

        setAgreements(updatedAgreements);
      }

      // Send notification
      try {
        const property = propertyDetails[agreementToUpdate.bookingId] || {};
        const propertyAddress = property.address || "your requested property";

        const renterResponse = await ApiHandler.get(
          `/Users/firebaseByUserId/${agreementToUpdate.renterId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (renterResponse) {
          const notificationData = {
            propertyId: property.propertyId,
            bookingId: agreementToUpdate.bookingId,
            agreementId: agreementToUpdate.agreementId,
            screen: "Agreement",
            action: "view_agreement",
            timestamp: new Date().toISOString(),
          };

          await sendNotificationToUser(
            renterResponse,
            "Agreement Approved",
            `Your lease agreement for ${propertyAddress} has been approved.`,
            notificationData
          );
        }
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
      const token = await getAuthToken();
      await ApiHandler.put(`/Agreements/${agreementId}`, updatePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state and cache
      if (Array.isArray(agreements)) {
        const updatedAgreements = agreements.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Rejected" }
            : agreement
        );

        setAgreements(updatedAgreements);
      }

      // Send notification
      try {
        const property = propertyDetails[agreementToUpdate.bookingId] || {};
        const propertyAddress = property.address || "your requested property";

        const renterResponse = await ApiHandler.get(
          `/Users/firebaseByUserId/${agreementToUpdate.renterId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (renterResponse) {
          const notificationData = {
            propertyId: property.propertyId,
            bookingId: agreementToUpdate.bookingId,
            agreementId: agreementToUpdate.agreementId,
            screen: "Agreement",
            action: "view_agreement",
            timestamp: new Date().toISOString(),
          };

          await sendNotificationToUser(
            renterResponse,
            "Agreement Rejected",
            `Your lease agreement for ${propertyAddress} has been rejected by the landlord.`,
            notificationData
          );
        }
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

  // Helper functions
  const getRenterName = (renterId) => renterNames[renterId] || "Loading...";
  const getPropertyName = (bookingId) => {
    const property = propertyDetails[bookingId] || {};
    return property.title || "Loading...";
  };
  const getPropertyAddress = (bookingId) => {
    const property = propertyDetails[bookingId] || {};
    return property.address || "Loading...";
  };

  // Handle search and filters
  const handleSearch = (e) => setSearchTerm(e.target.value);
  const resetFilters = () => {
    setActiveTab("All");
    setSearchTerm("");
  };

  // Filter agreements based on active tab and search term
  // Added array check to prevent errors
  const filteredAgreements = Array.isArray(agreements)
    ? agreements.filter((agreement) => {
        // Status filter
        const statusMatch =
          activeTab === "All" || agreement.status === activeTab;

        // Search filter - check property title, renter name, or agreement ID
        const propertyTitle = getPropertyName(
          agreement.bookingId
        ).toLowerCase();
        const renterName = getRenterName(agreement.renterId).toLowerCase();
        const agreementId = agreement.agreementId.toString().toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        const searchMatch =
          !searchTerm ||
          propertyTitle.includes(searchLower) ||
          renterName.includes(searchLower) ||
          agreementId.includes(searchLower);

        return statusMatch && searchMatch;
      })
    : [];

  // Get counts by status - Added array checks to prevent errors
  const statusCounts = {
    All: agreements?.length || 0,
    Pending: Array.isArray(agreements)
      ? agreements.filter((a) => a.status === "Pending").length
      : 0,
    Approved: Array.isArray(agreements)
      ? agreements.filter((a) => a.status === "Approved").length
      : 0,
    Rejected: Array.isArray(agreements)
      ? agreements.filter((a) => a.status === "Rejected").length
      : 0,
  };

  // Pagination - Added checks to ensure filteredAgreements is an array
  const totalPages = Math.ceil(
    (filteredAgreements?.length || 0) / itemsPerPage
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(filteredAgreements)
    ? filteredAgreements.slice(indexOfFirstItem, indexOfLastItem)
    : [];

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

  // Get tab styles
  const getTabStyle = (tabName) => {
    const isActive = activeTab === tabName;
    let baseStyle =
      "px-4 py-2 font-medium text-sm rounded-md flex items-center justify-center";

    if (isActive) {
      switch (tabName) {
        case "Pending":
          return `${baseStyle} bg-yellow-100 text-yellow-800 border border-yellow-200`;
        case "Approved":
          return `${baseStyle} bg-green-100 text-green-800 border border-green-200`;
        case "Rejected":
          return `${baseStyle} bg-red-100 text-red-800 border border-red-200`;
        default:
          return `${baseStyle} bg-blue-100 text-blue-800 border border-blue-200`;
      }
    }

    return `${baseStyle} bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-lg shadow-sm">
        <FaSpinner className="animate-spin text-[#20319D] text-3xl mb-3" />
        <p className="text-gray-600">Loading agreements...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
        <p className="flex items-center text-base font-medium mb-2">
          <FaInfoCircle className="mr-2" /> Error
        </p>
        <p className="mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm flex items-center"
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  // Render empty state
  if (!Array.isArray(agreements) || agreements.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <FaFileContract className="mx-auto text-3xl text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-700 mb-1.5">
          No Lease Agreements
        </h3>
        <p className="text-gray-500 text-sm">
          You don't have any lease agreement requests at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Background loading indicator */}
      {initialLoad && (
        <div className="fixed bottom-4 right-4 bg-white py-2 px-4 rounded-md shadow-lg border border-gray-200 flex items-center z-50 animate-pulse">
          <FaSpinner className="animate-spin text-[#20319D] mr-2" />
          <span className="text-sm">Loading additional data...</span>
        </div>
      )}

      {/* Header with banner */}
      <div className="bg-gradient-to-r from-[#20319D] to-[#3448c5] text-white p-5 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="mb-3 md:mb-0">
            <h1 className="text-xl font-bold mb-1 flex items-center">
              <FaFileContract className="mr-2 text-blue-200" /> Lease Agreement
              Requests
            </h1>
            <p className="text-xs text-blue-100 opacity-90">
              Manage and review lease agreements for your properties
            </p>
          </div>

          <div className="flex space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search agreements..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-9 pr-4 py-2 w-full md:w-64 border border-blue-300 bg-white/90 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm text-sm"
              />
              <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
            </div>

            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-white/15 text-white rounded-md hover:bg-white/25 transition-colors shadow-sm text-sm flex items-center"
            >
              <FaFilter className="mr-1.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab("All")}
            className={getTabStyle("All")}
          >
            <FaFileContract className="mr-1.5" />
            All{" "}
            <span className="ml-1.5 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-xs">
              {statusCounts.All}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("Pending")}
            className={getTabStyle("Pending")}
          >
            <FaClock className="mr-1.5" />
            Pending{" "}
            <span className="ml-1.5 bg-yellow-200 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs">
              {statusCounts.Pending}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("Approved")}
            className={getTabStyle("Approved")}
          >
            <FaCheck className="mr-1.5" />
            Approved{" "}
            <span className="ml-1.5 bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full text-xs">
              {statusCounts.Approved}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("Rejected")}
            className={getTabStyle("Rejected")}
          >
            <FaTimes className="mr-1.5" />
            Rejected{" "}
            <span className="ml-1.5 bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full text-xs">
              {statusCounts.Rejected}
            </span>
          </button>
        </div>
      </div>

      {/* Agreement List */}
      {filteredAgreements.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {currentItems.map((agreement) => {
              const { bg, text, icon } = getStatusBadge(agreement.status);
              const property = propertyDetails[agreement.bookingId] || {};
              const isPropertyLoading = !property.title;
              const isRenterLoading = !renterNames[agreement.renterId];
              const isDownloading = downloadingIds.includes(
                agreement.agreementId
              );

              return (
                <div
                  key={agreement.agreementId}
                  className={`hover:bg-gray-50 transition-colors ${
                    agreement.status === "Pending"
                      ? "border-l-4 border-yellow-400"
                      : agreement.status === "Approved"
                      ? "border-l-4 border-green-400"
                      : "border-l-4 border-red-400"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      {/* Agreement Details */}
                      <div className="flex items-start mb-3 md:mb-0 flex-grow">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            {isPropertyLoading ? (
                              <FaSpinner className="animate-spin text-[#20319D] text-lg" />
                            ) : (
                              <FaHome className="text-[#20319D] text-lg" />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center mb-1">
                            <h3 className="font-medium text-base text-gray-800 mr-2">
                              {isPropertyLoading ? (
                                <span className="inline-flex items-center">
                                  <FaSpinner className="animate-spin mr-1 text-gray-400 text-sm" />
                                  Loading property...
                                </span>
                              ) : (
                                getPropertyName(agreement.bookingId)
                              )}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}
                            >
                              {icon} {agreement.status}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-1 flex items-center">
                            <FaMapMarkerAlt className="mr-1.5 text-gray-400" />
                            {isPropertyLoading ? (
                              <span className="text-gray-400">
                                Loading address...
                              </span>
                            ) : (
                              getPropertyAddress(agreement.bookingId)
                            )}
                          </p>

                          <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-gray-600">
                            <span className="flex items-center">
                              <FaUserAlt className="mr-1.5 text-blue-500" />
                              {isRenterLoading ? (
                                <span className="text-gray-400">
                                  Loading renter...
                                </span>
                              ) : (
                                getRenterName(agreement.renterId)
                              )}
                            </span>

                            <span className="flex items-center">
                              <FaCalendarAlt className="mr-1.5 text-blue-500" />
                              {formatDate(agreement.startDate)
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}{" "}
                              -{" "}
                              {formatDate(agreement.endDate)
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}
                            </span>

                            {property.price && (
                              <span className="flex items-center">
                                <FaMoneyBillWave className="mr-1.5 text-blue-500" />
                                <span className="font-medium text-[#20319D]">
                                  Rs. {property.price}
                                </span>
                                /month
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {agreement.status === "Pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleAcceptAgreement(agreement.agreementId)
                              }
                              disabled={processingIds.includes(
                                agreement.agreementId
                              )}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded shadow-sm disabled:opacity-50 transition-colors flex items-center"
                            >
                              {processingIds.includes(agreement.agreementId) ? (
                                <div className="animate-spin h-4 w-4 mr-1.5 border-2 border-white border-t-transparent rounded-full"></div>
                              ) : (
                                <FaCheck className="mr-1.5" />
                              )}
                              Accept
                            </button>

                            <button
                              onClick={() =>
                                handleRejectAgreement(agreement.agreementId)
                              }
                              disabled={processingIds.includes(
                                agreement.agreementId
                              )}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded shadow-sm disabled:opacity-50 transition-colors flex items-center"
                            >
                              {processingIds.includes(agreement.agreementId) ? (
                                <div className="animate-spin h-4 w-4 mr-1.5 border-2 border-white border-t-transparent rounded-full"></div>
                              ) : (
                                <FaTimes className="mr-1.5" />
                              )}
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleViewAgreement(agreement)}
                          className="px-3 py-1.5 bg-[#20319D] hover:bg-blue-800 text-white text-sm font-medium rounded shadow-sm transition-colors flex items-center"
                        >
                          <FaEye className="mr-1.5" /> View
                        </button>

                        <button
                          onClick={() => handlePdfDownload(agreement)}
                          disabled={
                            isDownloading ||
                            isPropertyLoading ||
                            isRenterLoading
                          }
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded shadow-sm disabled:opacity-50 transition-colors flex items-center"
                        >
                          {isDownloading ? (
                            <div className="animate-spin h-4 w-4 mr-1.5 border-2 border-white border-t-transparent rounded-full"></div>
                          ) : (
                            <FaFileDownload className="mr-1.5" />
                          )}
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No matches message */}
          {currentItems.length === 0 && (
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-100 mx-auto rounded-full flex items-center justify-center mb-3">
                <FaInfoCircle className="text-2xl text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-700 mb-2">
                No agreements found
              </p>
              <p className="text-gray-500 mb-4 max-w-md mx-auto text-sm">
                {activeTab !== "All"
                  ? `You don't have any ${activeTab.toLowerCase()} agreements`
                  : "No agreements match your search"}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors inline-flex items-center shadow-sm text-sm"
                >
                  <FaSearch className="mr-1.5" /> Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-100 mx-auto rounded-full flex items-center justify-center mb-3">
            <FaInfoCircle className="text-2xl text-gray-400" />
          </div>
          <p className="text-base font-medium text-gray-700 mb-2">
            No agreements match your filters
          </p>
          <p className="text-gray-500 mb-4 max-w-md mx-auto text-sm">
            Try adjusting your filter criteria or search term
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors inline-flex items-center shadow-sm text-sm"
          >
            <FaFilter className="mr-1.5" /> Reset Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {filteredAgreements.length > 0 && (
        <div className="mt-4">
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
