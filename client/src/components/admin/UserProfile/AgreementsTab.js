import React from "react";
import {
  FaFileContract,
  FaUserTie,
  FaUser,
  FaCalendarAlt,
  FaDollarSign,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
  FaInfoCircle,
} from "react-icons/fa";

const AgreementsTab = ({
  userId,
  agreements,
  agreementStatusFilter,
  setAgreementStatusFilter,
  agreementStatusOptions,
  currentAgreementPage,
  setCurrentAgreementPage,
  totalAgreementPages,
  currentAgreements,
  landlordDetails,
  renterDetails,
  handleViewAgreement,
  formatDate,
  formatCurrency,
}) => {
  // Function to get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
      case "Accepted":
      case "Approved":
        return {
          className: "bg-green-100 text-green-800",
          icon: <FaCheckCircle className="mr-1" />,
        };
      case "Pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          icon: <FaHourglass className="mr-1" />,
        };
      case "Expired":
      case "Rejected":
      case "Cancelled":
        return {
          className: "bg-red-100 text-red-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      case "Terminated":
        return {
          className: "bg-gray-100 text-gray-800",
          icon: <FaTimesCircle className="mr-1" />,
        };
      case "Completed":
        return {
          className: "bg-blue-100 text-blue-800",
          icon: <FaCheckCircle className="mr-1" />,
        };
      default:
        return {
          className: "bg-blue-100 text-blue-800",
          icon: <FaInfoCircle className="mr-1" />,
        };
    }
  };

  const filteredAgreements = agreements.filter(
    (agreement) =>
      agreementStatusFilter === "All" ||
      agreement.status === agreementStatusFilter
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FaFileContract className="mr-2 text-[#20319D]" />
          Agreement History
        </h3>

        {/* Status filter dropdown */}
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Filter:</span>
          <select
            value={agreementStatusFilter}
            onChange={(e) => setAgreementStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md p-1"
          >
            {agreementStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter badge */}
      {agreementStatusFilter !== "All" && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex items-center">
          <FaFilter className="text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">
            Showing <span className="font-medium">{agreementStatusFilter}</span>{" "}
            agreements
          </span>
          <button
            onClick={() => setAgreementStatusFilter("All")}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800"
          >
            Clear filter
          </button>
        </div>
      )}

      {filteredAgreements.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FaFileContract className="mx-auto text-gray-400 text-5xl mb-3" />
          <h4 className="text-lg font-medium text-gray-600 mb-1">
            No Agreements Found
          </h4>
          <p className="text-gray-500">
            {agreementStatusFilter !== "All"
              ? `This user has no ${agreementStatusFilter.toLowerCase()} agreements.`
              : "This user has not entered into any agreements yet."}
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-4">
            {currentAgreements.map((agreement) => {
              const { className, icon } = getStatusBadge(agreement.status);
              const isLandlord = agreement.landlordId === parseInt(userId);

              // Get landlord and renter details
              const landlord = landlordDetails[agreement.landlordId];
              const renter = renterDetails[agreement.renterId];

              const landlordName = landlord
                ? `${landlord.firstName} ${landlord.lastName}`
                : "Unknown Landlord";

              const renterName = renter
                ? `${renter.firstName} ${renter.lastName}`
                : "Unknown Renter";

              return (
                <div
                  key={agreement.agreementId}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-md bg-[#20319D]/10 flex items-center justify-center mr-3">
                        <FaFileContract className="text-[#20319D]" />
                      </div>
                      <span className="font-medium">
                        {isLandlord ? "Rental Agreement" : "Tenant Agreement"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className} mr-2`}
                      >
                        {icon} {agreement.status}
                      </span>
                      <button
                        onClick={() => handleViewAgreement(agreement)}
                        className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md focus:outline-none"
                      >
                        <FaEye className="mr-1" /> View
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3">
                      <h4 className="font-medium mb-2">
                        {isLandlord
                          ? "Agreement as Landlord"
                          : "Agreement as Renter"}
                      </h4>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-sm">
                        <div className="flex items-center">
                          <div className="rounded-full bg-purple-100 w-6 h-6 flex items-center justify-center mr-2">
                            <FaUserTie className="text-purple-600 text-xs" />
                          </div>
                          <span className="text-gray-600">
                            Landlord:{" "}
                            <span className="font-medium">{landlordName}</span>
                          </span>
                        </div>

                        <div className="flex items-center">
                          <div className="rounded-full bg-pink-100 w-6 h-6 flex items-center justify-center mr-2">
                            <FaUser className="text-pink-600 text-xs" />
                          </div>
                          <span className="text-gray-600">
                            Renter:{" "}
                            <span className="font-medium">{renterName}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-700">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        Start: {formatDate(agreement.startDate)}
                      </div>

                      <div className="flex items-center text-gray-700">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        End: {formatDate(agreement.endDate)}
                      </div>

                      {agreement.monthlyCost && (
                        <div className="flex items-center text-gray-700">
                          <FaDollarSign className="mr-2 text-gray-400" />
                          Monthly Cost: {formatCurrency(agreement.monthlyCost)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for agreements */}
          {totalAgreementPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentAgreementPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentAgreementPage === 1}
                  className={`p-2 rounded-md ${
                    currentAgreementPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#20319D] hover:bg-blue-50"
                  }`}
                >
                  <FaChevronLeft size={14} />
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentAgreementPage} of {totalAgreementPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentAgreementPage((prev) =>
                      Math.min(prev + 1, totalAgreementPages)
                    )
                  }
                  disabled={currentAgreementPage === totalAgreementPages}
                  className={`p-2 rounded-md ${
                    currentAgreementPage === totalAgreementPages
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#20319D] hover:bg-blue-50"
                  }`}
                >
                  <FaChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgreementsTab;
