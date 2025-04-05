import React from "react";
import {
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
  FaInfoCircle,
  FaCalendarAlt,
  FaUser,
  FaUserTie,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const PaymentsTab = ({
  userId,
  payments,
  currentPayments,
  currentPaymentPage,
  setCurrentPaymentPage,
  totalPaymentPages,
  landlordDetails,
  renterDetails,
  formatDate,
  formatCurrency,
  user,
}) => {
  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
      case "Successful":
      case "Paid":
        return {
          className: "bg-green-100 text-green-800",
          icon: <FaCheckCircle className="mr-1" />,
        };
      case "Pending":
      case "Processing":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <FaHourglass className="mr-1" />,
        };
      case "Failed":
      case "Rejected":
      case "Cancelled":
        return {
          className: "bg-red-100 text-red-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      default:
        return {
          className: "bg-blue-100 text-blue-800",
          icon: <FaInfoCircle className="mr-1" />,
        };
    }
  };

  // Improved renter name function
  const getRenterName = (renterId) => {
    // If no renter ID or not a valid number
    if (!renterId && renterId !== 0) return "Unknown Renter";

    // If this is the currently viewed user
    if (renterId === parseInt(userId)) {
      return "This User";
    }

    // Try to get renter details
    const renter = renterDetails && renterDetails[renterId];

    // If we have both first and last name
    if (renter && renter.firstName && renter.lastName) {
      return `${renter.firstName} ${renter.lastName}`;
    }

    // If we only have first name
    if (renter && renter.firstName) {
      return renter.firstName;
    }

    // If we have no details
    return `Renter #${renterId}`;
  };

  // Improved landlord name function
  // Improved landlord name function
  const getLandlordName = (landlordId) => {
    // If no landlord ID or not a valid number
    if (!landlordId && landlordId !== 0) return "Unknown Landlord";

    // If this is the currently viewed user
    if (landlordId === parseInt(userId)) {
      return "This User";
    }

    // Try to get landlord details
    const landlord = landlordDetails && landlordDetails[landlordId];

    // If we have both first and last name
    if (landlord && landlord.firstName && landlord.lastName) {
      return `${landlord.firstName} ${landlord.lastName}`;
    }

    // If we only have first name (including our property-based fallback)
    if (landlord && landlord.firstName) {
      return landlord.firstName;
    }

    // For debugging - log what we actually have
    console.log("Landlord details for", landlordId, ":", landlord);

    // If we're here, check if we at least have userRole = "Landlord"
    if (landlord && landlord.userRole === "Landlord") {
      return "Property Owner";
    }

    // If we have no details
    return `Landlord #${landlordId}`;
  };
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
        <FaMoneyBillWave className="mr-2 text-[#20319D]" />
        Payment History
      </h3>

      {payments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FaMoneyBillWave className="mx-auto text-gray-400 text-5xl mb-3" />
          <h4 className="text-lg font-medium text-gray-600 mb-1">
            No Payments Found
          </h4>
          <p className="text-gray-500">
            No payment records found for this user.
          </p>
        </div>
      ) : (
        <>
          {/* Simple card layout for all screen sizes */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {currentPayments.map((payment) => {
              const { className, icon } = getStatusBadge(
                payment.paymentStatus || "Completed"
              );

              // Check if current user is sender or receiver
              const isRenter = payment.renterId === parseInt(userId);
              const isLandlord = payment.landlordId === parseInt(userId);

              return (
                <div
                  key={payment.paymentId}
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900 mr-2">
                        #{payment.paymentId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(payment.paymentDate)}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${className}`}
                    >
                      {icon} {payment.paymentStatus || "Completed"}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="text-lg font-medium text-gray-900 mb-1">
                      {formatCurrency(payment.amount)}
                    </div>
                    <div className="flex text-sm text-gray-500">
                      <FaCreditCard className="text-gray-400 mr-2 mt-0.5" />
                      {payment.paymentGateway || "N/A"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">From</div>
                      <div className="flex items-center">
                        <FaUser
                          className={`${
                            isRenter ? "text-blue-500" : "text-gray-400"
                          } mr-2`}
                        />
                        <span
                          className={`${
                            isRenter
                              ? "font-medium text-blue-600"
                              : "text-gray-700"
                          }`}
                        >
                          {getRenterName(payment.renterId)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">To</div>
                      <div className="flex items-center">
                        <FaUserTie
                          className={`${
                            isLandlord ? "text-blue-500" : "text-gray-400"
                          } mr-2`}
                        />
                        <span
                          className={`${
                            isLandlord
                              ? "font-medium text-blue-600"
                              : "text-gray-700"
                          }`}
                        >
                          {getLandlordName(payment.landlordId)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPaymentPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentPaymentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPaymentPage === 1}
                  className={`p-2 rounded-md ${
                    currentPaymentPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#20319D] hover:bg-blue-50"
                  }`}
                >
                  <FaChevronLeft size={14} />
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentPaymentPage} of {totalPaymentPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPaymentPage((prev) =>
                      Math.min(prev + 1, totalPaymentPages)
                    )
                  }
                  disabled={currentPaymentPage === totalPaymentPages}
                  className={`p-2 rounded-md ${
                    currentPaymentPage === totalPaymentPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#20319D] hover:bg-blue-50"
                  }`}
                >
                  <FaChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentsTab;
