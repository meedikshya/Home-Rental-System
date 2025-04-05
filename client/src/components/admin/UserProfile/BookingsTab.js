import React from "react";
import {
  FaCalendarCheck,
  FaCalendarAlt,
  FaBuilding,
  FaMoneyBillWave,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
  FaInfoCircle,
} from "react-icons/fa";

const BookingsTab = ({
  bookings,
  properties,
  bookingStatusFilter,
  setBookingStatusFilter,
  bookingStatusOptions,
  currentBookingPage,
  setCurrentBookingPage,
  totalBookingPages,
  currentBookings,
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

  const filteredBookings = bookings.filter(
    (booking) =>
      bookingStatusFilter === "All" || booking.status === bookingStatusFilter
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FaCalendarCheck className="mr-2 text-[#20319D]" />
          Booking History
        </h3>

        {/* Status filter dropdown */}
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Filter:</span>
          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md p-1"
          >
            {bookingStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter badge */}
      {bookingStatusFilter !== "All" && (
        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex items-center">
          <FaFilter className="text-gray-400 mr-2" />
          <span className="text-sm text-gray-600">
            Showing <span className="font-medium">{bookingStatusFilter}</span>{" "}
            bookings
          </span>
          <button
            onClick={() => setBookingStatusFilter("All")}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800"
          >
            Clear filter
          </button>
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <FaCalendarAlt className="mx-auto text-gray-400 text-5xl mb-3" />
          <h4 className="text-lg font-medium text-gray-600 mb-1">
            No Bookings Found
          </h4>
          <p className="text-gray-500">
            {bookingStatusFilter !== "All"
              ? `This user has no ${bookingStatusFilter.toLowerCase()} bookings.`
              : "This user has not made any bookings yet."}
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-4">
            {currentBookings.map((booking) => {
              const property = properties[booking.propertyId];
              const { className, icon } = getStatusBadge(booking.status);

              return (
                <div
                  key={booking.bookingId}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-md bg-[#20319D]/10 flex items-center justify-center mr-3">
                        <FaBuilding className="text-[#20319D]" />
                      </div>
                      <span className="font-medium">
                        Booking #{booking.bookingId}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                    >
                      {icon} {booking.status}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="mb-3">
                      <h4 className="font-medium mb-1">
                        {property?.title || "Unknown Property"}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {property
                          ? `${property.municipality || ""}, ${
                              property.city || ""
                            }`
                          : "Location unavailable"}
                      </p>
                    </div>

                    {booking.bookingDate && (
                      <div className="text-sm flex items-center text-gray-700 mb-2">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        Booking Date: {formatDate(booking.bookingDate)}
                      </div>
                    )}

                    <div className="text-sm flex items-center text-gray-700">
                      <FaMoneyBillWave className="mr-2 text-gray-400" />
                      Price: {property ? formatCurrency(property.price) : "N/A"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination for bookings */}
          {totalBookingPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setCurrentBookingPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentBookingPage === 1}
                  className={`p-2 rounded-md ${
                    currentBookingPage === 1
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-[#20319D] hover:bg-blue-50"
                  }`}
                >
                  <FaChevronLeft size={14} />
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentBookingPage} of {totalBookingPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentBookingPage((prev) =>
                      Math.min(prev + 1, totalBookingPages)
                    )
                  }
                  disabled={currentBookingPage === totalBookingPages}
                  className={`p-2 rounded-md ${
                    currentBookingPage === totalBookingPages
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

export default BookingsTab;
