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
  FaChevronDown,
  FaChevronUp,
  FaThumbsUp,
  FaThumbsDown,
} from "react-icons/fa";
import Agreement from "./Agreement.js";

const BookingList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  const [renterNames, setRenterNames] = useState({});
  const navigate = useNavigate();

  // Modal state
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({});

  // Section collapse state
  const [pendingSectionOpen, setPendingSectionOpen] = useState(true);
  const [approvedSectionOpen, setApprovedSectionOpen] = useState(true);
  const [rejectedSectionOpen, setRejectedSectionOpen] = useState(true);

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

              // Try to get property image
              try {
                const imagesResponse = await ApiHandler.get(
                  `/PropertyImages/property/${propertyResponse.propertyId}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                if (imagesResponse && imagesResponse.length > 0) {
                  const imageString = imagesResponse[0].imageUrl;
                  if (imageString) {
                    if (imageString.startsWith("data:image")) {
                      detailsMap[bookingId].image = imageString;
                    } else if (imageString.startsWith("/9j/")) {
                      detailsMap[
                        bookingId
                      ].image = `data:image/jpeg;base64,${imageString}`;
                    }
                  }
                }
              } catch (imageError) {
                console.error(
                  `Error fetching images for property ${propertyResponse.propertyId}:`,
                  imageError
                );
              }
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

  // Handle accept agreement - UPDATED to use PUT /api/Agreements/{id}
  const handleAcceptAgreement = async (agreementId) => {
    try {
      setProcessingIds((prev) => [...prev, agreementId]);
      console.log(`Attempting to accept agreement ${agreementId}...`);

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
        status: "Approved", // Use the correct status value from your database enum
        signedAt: agreementToUpdate.signedAt,
      };

      console.log("Sending update payload:", updatePayload);

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

      console.log("Update response:", response);

      // Update local state
      setAgreements((prev) =>
        prev.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Approved" }
            : agreement
        )
      );

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

  // Handle reject agreement - UPDATED to use PUT /api/Agreements/{id}
  const handleRejectAgreement = async (agreementId) => {
    if (!window.confirm("Are you sure you want to reject this agreement?")) {
      return;
    }

    try {
      setProcessingIds((prev) => [...prev, agreementId]);
      console.log(`Attempting to reject agreement ${agreementId}...`);

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
        status: "Rejected", // Use the correct status value from your database enum
        signedAt: agreementToUpdate.signedAt,
      };

      console.log("Sending update payload:", updatePayload);

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

      console.log("Update response:", response);

      // Update local state
      setAgreements((prev) =>
        prev.map((agreement) =>
          agreement.agreementId === agreementId
            ? { ...agreement, status: "Rejected" }
            : agreement
        )
      );

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

  // Render each agreement card
  const renderAgreementCard = (agreement) => (
    <div
      key={agreement.agreementId}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">
              Agreement #{agreement.agreementId}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Booking ID: {agreement.bookingId}
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              agreement.status === "Pending"
                ? "bg-yellow-100 text-yellow-800"
                : agreement.status === "Approved"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {agreement.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <FaCalendarAlt className="text-gray-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Lease Period</p>
              <p className="text-sm text-gray-600">
                {formatDate(agreement.startDate)} -{" "}
                {formatDate(agreement.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <FaUserAlt className="text-gray-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-700">Renter</p>
              <p className="text-sm text-gray-600">
                {getRenterName(agreement.renterId)}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Signed on {formatDate(agreement.signedAt)}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {agreement.status === "Pending" && (
            <>
              <button
                onClick={() => handleAcceptAgreement(agreement.agreementId)}
                disabled={processingIds.includes(agreement.agreementId)}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
                onClick={() => handleRejectAgreement(agreement.agreementId)}
                disabled={processingIds.includes(agreement.agreementId)}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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

          <button
            onClick={() => handleViewAgreement(agreement)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaEye className="mr-2" /> View Agreement
          </button>
        </div>
      </div>
    </div>
  );

  // Section header component
  const SectionHeader = ({ title, count, isOpen, setIsOpen, icon }) => (
    <div
      className="flex items-center justify-between bg-gray-100 p-4 rounded-lg cursor-pointer mb-2"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center">
        {icon}
        <h3 className="text-xl font-semibold text-gray-800 ml-2">
          {title}{" "}
          <span className="text-sm bg-gray-200 text-gray-700 py-1 px-2 rounded-full ml-2">
            {count}
          </span>
        </h3>
      </div>
      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
    </div>
  );

  // Filter agreements by status
  const pendingAgreements = agreements.filter((a) => a.status === "Pending");
  const approvedAgreements = agreements.filter((a) => a.status === "Approved");
  const rejectedAgreements = agreements.filter((a) => a.status === "Rejected");

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-5 rounded-lg border border-red-200">
        <h3 className="text-red-700 font-medium text-lg mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!agreements || agreements.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Lease Agreement Requests
        </h2>
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">
          {pendingAgreements.length} Pending
        </span>
      </div>

      {/* Pending agreements section */}
      <div className="mb-6">
        <SectionHeader
          title="Pending Requests"
          count={pendingAgreements.length}
          isOpen={pendingSectionOpen}
          setIsOpen={setPendingSectionOpen}
          icon={<FaFileContract className="text-yellow-500" />}
        />

        {pendingSectionOpen && (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {pendingAgreements.length > 0 ? (
              pendingAgreements.map(renderAgreementCard)
            ) : (
              <p className="text-center py-4 bg-gray-50 rounded-lg text-gray-600">
                No pending agreement requests.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Approved agreements section */}
      <div className="mb-6">
        <SectionHeader
          title="Approved Agreements"
          count={approvedAgreements.length}
          isOpen={approvedSectionOpen}
          setIsOpen={setApprovedSectionOpen}
          icon={<FaThumbsUp className="text-green-500" />}
        />

        {approvedSectionOpen && (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {approvedAgreements.length > 0 ? (
              approvedAgreements.map(renderAgreementCard)
            ) : (
              <p className="text-center py-4 bg-gray-50 rounded-lg text-gray-600">
                No approved agreements yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Rejected agreements section */}
      <div className="mb-6">
        <SectionHeader
          title="Rejected Agreements"
          count={rejectedAgreements.length}
          isOpen={rejectedSectionOpen}
          setIsOpen={setRejectedSectionOpen}
          icon={<FaThumbsDown className="text-red-500" />}
        />

        {rejectedSectionOpen && (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {rejectedAgreements.length > 0 ? (
              rejectedAgreements.map(renderAgreementCard)
            ) : (
              <p className="text-center py-4 bg-gray-50 rounded-lg text-gray-600">
                No rejected agreements.
              </p>
            )}
          </div>
        )}
      </div>

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
