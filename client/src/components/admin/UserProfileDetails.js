import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ApiHandler from "../../api/ApiHandler.js";
import { FaInfoCircle, FaSpinner, FaArrowLeft } from "react-icons/fa";
import Agreement from "../bookings/Agreement.js";

// Import new components
import UserProfileHeader from "./UserProfile/UserProfileHeader.js";
import UserProfileSidebar from "./UserProfile/UserProfileSidebar.js";
import TabNavigation from "./UserProfile/TabNavigation.js";
import OverviewTab from "./UserProfile/OverviewTab.js";
import BookingsTab from "./UserProfile/BookingsTab.js";
import AgreementsTab from "./UserProfile/AgreementsTab.js";
import PaymentsTab from "./UserProfile/PaymentsTab.js";

const UserProfileDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [agreementStatusFilter, setAgreementStatusFilter] = useState("All");
  const [bookingStatusOptions, setBookingStatusOptions] = useState(["All"]);
  const [agreementStatusOptions, setAgreementStatusOptions] = useState(["All"]);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({});
  const [landlordDetails, setLandlordDetails] = useState({});
  const [renterDetails, setRenterDetails] = useState({});

  // Pagination for bookings
  const [currentBookingPage, setCurrentBookingPage] = useState(1);
  const bookingsPerPage = 2;

  // Pagination for agreements
  const [currentAgreementPage, setCurrentAgreementPage] = useState(1);
  const agreementsPerPage = 2;

  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const paymentsPerPage = 3;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user and user details
        const [userResponse, userDetailsResponse] = await Promise.all([
          ApiHandler.get(`/Users/${userId}`),
          ApiHandler.get(`/UserDetails/userId/${userId}`),
        ]);

        if (userResponse) {
          setUser(userResponse);
        }
        if (userDetailsResponse) {
          setUserDetails(userDetailsResponse);
        }

        if (userResponse) {
          // Fetch bookings
          try {
            const bookingsResponse = await ApiHandler.get(
              `/Bookings/User/${userId}`
            );
            if (bookingsResponse && Array.isArray(bookingsResponse)) {
              const sortedBookings = bookingsResponse.sort((a, b) => {
                return new Date(b.bookingDate) - new Date(a.bookingDate);
              });

              setBookings(sortedBookings);

              // Extract unique booking statuses
              const statuses = [
                "All",
                ...new Set(sortedBookings.map((booking) => booking.status)),
              ];
              setBookingStatusOptions(statuses);

              // Fetch property details for each booking
              const propertyData = {};
              for (const booking of sortedBookings) {
                if (booking.propertyId) {
                  try {
                    const property = await ApiHandler.get(
                      `/Properties/${booking.propertyId}`
                    );
                    if (property) {
                      propertyData[booking.propertyId] = property;

                      // Store property details for agreement modal
                      if (property) {
                        setPropertyDetails((prevDetails) => ({
                          ...prevDetails,
                          [booking.bookingId]: {
                            propertyId: property.propertyId,
                            title: property.title,
                            address: `${
                              property.district || property.municipality
                            }, ${property.city}`,
                            bedrooms: property.totalBedrooms,
                            bathrooms: property.totalWashrooms,
                            price: property.price,
                            kitchen: property.kitchen,
                          },
                        }));
                      }
                    }
                  } catch (err) {
                    console.log(
                      `Failed to fetch property ${booking.propertyId}`
                    );
                  }
                }
              }
              setProperties(propertyData);
            }
          } catch (err) {
            console.error("Error fetching bookings:", err);
          }

          // Fetch agreements
          try {
            const agreementsResponse = await ApiHandler.get(`/Agreements`);
            if (agreementsResponse && Array.isArray(agreementsResponse)) {
              // Filter agreements related to the user (either landlord or renter)
              const filteredAgreements = agreementsResponse.filter(
                (agreement) =>
                  agreement.landlordId === parseInt(userId) ||
                  agreement.renterId === parseInt(userId)
              );

              // Sort agreements by start date (newest first)
              const sortedAgreements = filteredAgreements.sort((a, b) => {
                return new Date(b.startDate) - new Date(a.startDate);
              });

              setAgreements(sortedAgreements);

              // Extract unique agreement statuses
              const statuses = [
                "All",
                ...new Set(
                  sortedAgreements.map((agreement) => agreement.status)
                ),
              ];
              setAgreementStatusOptions(statuses);

              // Fetch landlord and renter details for each agreement
              const landlords = {};
              const renters = {};

              for (const agreement of sortedAgreements) {
                // Fetch landlord details
                if (agreement.landlordId && !landlords[agreement.landlordId]) {
                  try {
                    const landlord = await ApiHandler.get(
                      `/UserDetails/userId/${agreement.landlordId}`
                    );
                    if (landlord) {
                      landlords[agreement.landlordId] = landlord;
                    }
                  } catch (err) {
                    console.log(
                      `Failed to fetch landlord ${agreement.landlordId}`
                    );
                  }
                }

                // Fetch renter details
                if (agreement.renterId && !renters[agreement.renterId]) {
                  try {
                    const renter = await ApiHandler.get(
                      `/UserDetails/userId/${agreement.renterId}`
                    );
                    if (renter) {
                      renters[agreement.renterId] = renter;
                    }
                  } catch (err) {
                    console.log(`Failed to fetch renter ${agreement.renterId}`);
                  }
                }
              }

              setLandlordDetails(landlords);
              setRenterDetails(renters);
            }
          } catch (err) {
            console.error("Error fetching agreements:", err);
          }

          // Fetch payments based on user role
          try {
            let paymentsResponse = [];

            if (userResponse?.userRole === "Landlord") {
              paymentsResponse = await ApiHandler.get(
                `/Payments/completed-by-landlord/${userId}`
              );
              if (paymentsResponse) {
                setPayments(paymentsResponse);
              }
            } else if (userResponse?.userRole === "Renter") {
              paymentsResponse = await ApiHandler.get(
                `/Payments/completed-by-renter/${userId}`
              );
              if (paymentsResponse) {
                setPayments(paymentsResponse);
              }
            }

            // Fetch property-landlord data for all payments
            const propertiesWithPayments = await ApiHandler.get(
              `/Payments/properties-with-completed-payments`
            );

            // Create a map of landlordIds to property details
            const landlordPropertyMap = {};
            if (
              propertiesWithPayments &&
              Array.isArray(propertiesWithPayments)
            ) {
              propertiesWithPayments.forEach((property) => {
                if (property.landlordId) {
                  landlordPropertyMap[property.landlordId] = property;
                }
              });
            }

            // Fetch user details for all parties in payments
            if (
              paymentsResponse &&
              Array.isArray(paymentsResponse) &&
              paymentsResponse.length > 0
            ) {
              // Extract unique landlord and renter IDs from payments
              const paymentLandlordIds = [
                ...new Set(
                  paymentsResponse
                    .filter((payment) => payment.landlordId)
                    .map((payment) => payment.landlordId)
                ),
              ];

              const paymentRenterIds = [
                ...new Set(
                  paymentsResponse
                    .filter((payment) => payment.renterId)
                    .map((payment) => payment.renterId)
                ),
              ];

              // Fetch landlord details
              for (const landlordId of paymentLandlordIds) {
                // Skip if we already have this landlord's details or it's the current user
                if (
                  landlordDetails[landlordId] ||
                  landlordId === parseInt(userId)
                )
                  continue;

                try {
                  const landlordDetailsResponse = await ApiHandler.get(
                    `/UserDetails/userId/${landlordId}`
                  );
                  if (landlordDetailsResponse) {
                    setLandlordDetails((prev) => ({
                      ...prev,
                      [landlordId]: landlordDetailsResponse,
                    }));
                  }
                  // If API call fails but we have property info, use that for basic landlord info
                  else if (landlordPropertyMap[landlordId]) {
                    setLandlordDetails((prev) => ({
                      ...prev,
                      [landlordId]: {
                        firstName: `Property Owner (${landlordPropertyMap[landlordId].title})`,
                        userRole: "Landlord",
                      },
                    }));
                  }
                } catch (err) {
                  console.log(
                    `Failed to fetch landlord details for ID: ${landlordId}`
                  );

                  // Use property info as fallback
                  if (landlordPropertyMap[landlordId]) {
                    setLandlordDetails((prev) => ({
                      ...prev,
                      [landlordId]: {
                        firstName: `Property Owner (${landlordPropertyMap[landlordId].title})`,
                        userRole: "Landlord",
                      },
                    }));
                  }
                }
              }

              // Fetch renter details
              for (const renterId of paymentRenterIds) {
                // Skip if we already have this renter's details or it's the current user
                if (renterDetails[renterId] || renterId === parseInt(userId))
                  continue;

                try {
                  const renterDetailsResponse = await ApiHandler.get(
                    `/UserDetails/userId/${renterId}`
                  );
                  if (renterDetailsResponse) {
                    setRenterDetails((prev) => ({
                      ...prev,
                      [renterId]: renterDetailsResponse,
                    }));
                  }
                } catch (err) {
                  console.log(
                    `Failed to fetch renter details for ID: ${renterId}`
                  );
                }
              }

              // Add current user to appropriate details object based on role
              if (userResponse?.userRole === "Landlord") {
                setLandlordDetails((prev) => ({
                  ...prev,
                  [userId]: userDetailsResponse,
                }));
              } else if (userResponse?.userRole === "Renter") {
                setRenterDetails((prev) => ({
                  ...prev,
                  [userId]: userDetailsResponse,
                }));
              }
            }
          } catch (err) {
            console.error("Error fetching payments:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching user profile data:", err);
        setError("Failed to load user profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Filter bookings based on status
  const filteredBookings = bookings.filter(
    (booking) =>
      bookingStatusFilter === "All" || booking.status === bookingStatusFilter
  );

  // Calculate total pages for bookings pagination
  const totalBookingPages = Math.ceil(
    filteredBookings.length / bookingsPerPage
  );

  // Get current page bookings
  const indexOfLastBooking = currentBookingPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(
    indexOfFirstBooking,
    indexOfLastBooking
  );

  // Filter agreements based on status
  const filteredAgreements = agreements.filter(
    (agreement) =>
      agreementStatusFilter === "All" ||
      agreement.status === agreementStatusFilter
  );

  // Calculate total pages for agreements pagination
  const totalAgreementPages = Math.ceil(
    filteredAgreements.length / agreementsPerPage
  );

  // Get current page agreements
  const indexOfLastAgreement = currentAgreementPage * agreementsPerPage;
  const indexOfFirstAgreement = indexOfLastAgreement - agreementsPerPage;
  const currentAgreements = filteredAgreements.slice(
    indexOfFirstAgreement,
    indexOfLastAgreement
  );

  const totalPaymentPages = Math.ceil(payments.length / paymentsPerPage);
  const indexOfLastPayment = currentPaymentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = payments.slice(
    indexOfFirstPayment,
    indexOfLastPayment
  );

  // Handle viewing agreement
  const handleViewAgreement = (agreement) => {
    setSelectedAgreement(agreement);
    setIsAgreementModalOpen(true);
  };

  // Get renter name for agreement
  const getRenterName = (renterId) => {
    const renter = renterDetails[renterId];
    return renter ? `${renter.firstName} ${renter.lastName}` : "Unknown Renter";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
        <p className="text-gray-600">Loading user profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700">
        <p className="flex items-center text-lg font-medium mb-2">
          <FaInfoCircle className="mr-2" /> Error
        </p>
        <p>{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Back to Users
        </button>
      </div>
    );
  }

  if (!user || !userDetails) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <FaInfoCircle className="mx-auto text-gray-400 text-5xl mb-3" />
          <h3 className="text-xl font-medium text-gray-600 mb-1">
            User Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The requested user profile could not be found.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#20319D] text-white rounded-md hover:bg-blue-800 transition-colors flex items-center mx-auto"
          >
            <FaArrowLeft className="mr-2" /> Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with back button */}
      <UserProfileHeader
        user={user}
        userDetails={userDetails}
        navigate={navigate}
      />

      {/* User Profile Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row">
          {/* User Info Sidebar */}
          <UserProfileSidebar user={user} userDetails={userDetails} />

          <div className="md:w-2/3 md:pl-6">
            {/* Tab Navigation */}
            <TabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              bookings={bookings}
              agreements={agreements}
              payments={payments}
            />

            {/* Tab Content */}
            {activeTab === "overview" && (
              <OverviewTab
                user={user}
                bookings={bookings}
                agreements={agreements}
                payments={payments}
                formatCurrency={formatCurrency}
              />
            )}

            {activeTab === "bookings" && (
              <BookingsTab
                bookings={bookings}
                properties={properties}
                bookingStatusFilter={bookingStatusFilter}
                setBookingStatusFilter={setBookingStatusFilter}
                bookingStatusOptions={bookingStatusOptions}
                currentBookingPage={currentBookingPage}
                setCurrentBookingPage={setCurrentBookingPage}
                totalBookingPages={totalBookingPages}
                currentBookings={currentBookings}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            )}

            {activeTab === "agreements" && (
              <AgreementsTab
                userId={parseInt(userId)}
                agreements={agreements}
                agreementStatusFilter={agreementStatusFilter}
                setAgreementStatusFilter={setAgreementStatusFilter}
                agreementStatusOptions={agreementStatusOptions}
                currentAgreementPage={currentAgreementPage}
                setCurrentAgreementPage={setCurrentAgreementPage}
                totalAgreementPages={totalAgreementPages}
                currentAgreements={currentAgreements}
                landlordDetails={landlordDetails}
                renterDetails={renterDetails}
                handleViewAgreement={handleViewAgreement}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            )}

            {activeTab === "payments" && (
              <PaymentsTab
                userId={userId}
                user={user}
                payments={payments}
                currentPayments={currentPayments}
                currentPaymentPage={currentPaymentPage}
                setCurrentPaymentPage={setCurrentPaymentPage}
                totalPaymentPages={totalPaymentPages}
                landlordDetails={landlordDetails}
                renterDetails={renterDetails}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            )}
          </div>
        </div>
      </div>

      {/* Agreement modal */}
      {selectedAgreement && (
        <Agreement
          isOpen={isAgreementModalOpen}
          onClose={() => setIsAgreementModalOpen(false)}
          agreement={selectedAgreement}
          propertyDetails={propertyDetails}
          getRenterName={getRenterName}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default UserProfileDetails;
