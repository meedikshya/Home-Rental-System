import React, { useState, useEffect } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaInfoCircle,
  FaUser,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglass,
  FaCreditCard,
  FaFilter,
  FaUserTie,
} from "react-icons/fa";
import PaginationControls from "../UI/PaginationControls.js";

const PaymentList = ({
  token,
  searchTerm: externalSearchTerm = "",
  statusFilter: externalStatusFilter = "All",
}) => {
  // Main data states
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Related data
  const [renters, setRenters] = useState({});
  const [agreements, setAgreements] = useState({});
  const [landlords, setLandlords] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Status options
  const [statusOptions, setStatusOptions] = useState(["All"]);

  // Use external filters
  const searchTerm = externalSearchTerm;
  const statusFilter = externalStatusFilter;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Fetch payments when component mounts
  useEffect(() => {
    if (token) {
      fetchPayments();
    }
  }, [token]);

  // Fetch all payments
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const paymentsData = await ApiHandler.get("/Payments", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(paymentsData)) {
        setAllPayments(paymentsData);

        // Extract unique status values for filtering
        const uniqueStatuses = [
          ...new Set(paymentsData.map((payment) => payment.paymentStatus)),
        ];
        setStatusOptions(["All", ...uniqueStatuses.sort()]);

        // Extract IDs to fetch related data
        const renterIds = [...new Set(paymentsData.map((p) => p.renterId))];
        const agreementIds = [
          ...new Set(paymentsData.map((p) => p.agreementId)),
        ];

        // Fetch related data in parallel
        await Promise.all([
          fetchRenterDetails(renterIds),
          fetchAgreementDetails(agreementIds),
        ]);

        // Apply initial pagination and filtering
        filterAndPaginatePayments(paymentsData, statusFilter, searchTerm);
      } else {
        setPayments([]);
        setAllPayments([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
      setError("Failed to load payments. Please try again.");
      toast.error("Could not load payments.");
      setPayments([]);
      setAllPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
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

  // Fetch agreement details
  const fetchAgreementDetails = async (agreementIds) => {
    try {
      const agreementDetails = {};
      const landlordIds = new Set();

      for (const id of agreementIds) {
        if (id) {
          const agreement = await ApiHandler.get(`/Agreements/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (agreement) {
            agreementDetails[id] = agreement;

            // Collect landlord ID for later lookup
            if (agreement.landlordId) {
              landlordIds.add(agreement.landlordId);
            }
          }
        }
      }

      setAgreements(agreementDetails);

      // After getting agreements, fetch landlord details
      if (landlordIds.size > 0) {
        await fetchLandlordDetails([...landlordIds]);
      }
    } catch (err) {
      console.error("Error fetching agreement details:", err);
    }
  };

  // Fetch landlord details
  const fetchLandlordDetails = async (landlordIds) => {
    try {
      const landlordDetails = {};

      for (const id of landlordIds) {
        if (id) {
          const landlord = await ApiHandler.get(`/UserDetails/userId/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (landlord) {
            landlordDetails[id] = landlord;
          }
        }
      }

      setLandlords(landlordDetails);
    } catch (err) {
      console.error("Error fetching landlord details:", err);
    }
  };

  // Apply filters and pagination
  const filterAndPaginatePayments = (payments, status, search) => {
    let filtered = [...payments];

    // Apply status filter
    if (status && status !== "All") {
      filtered = filtered.filter((payment) => payment.paymentStatus === status);
    }

    // Apply search term (search in renter name or landlord name)
    if (search) {
      filtered = filtered.filter((payment) => {
        const renter = renters[payment.renterId];
        const renterName = renter
          ? `${renter.firstName} ${renter.lastName}`.toLowerCase()
          : "";

        // Get landlord name from agreement
        const agreement = agreements[payment.agreementId];
        const landlordId = agreement?.landlordId;
        const landlord = landlordId ? landlords[landlordId] : null;
        const landlordName = landlord
          ? `${landlord.firstName} ${landlord.lastName}`.toLowerCase()
          : "";

        // Search in renter or landlord name
        return (
          renterName.includes(search.toLowerCase()) ||
          landlordName.includes(search.toLowerCase())
        );
      });
    }

    // Apply pagination
    const totalFilteredPayments = filtered.length;
    const calculatedTotalPages = Math.ceil(totalFilteredPayments / pageSize);

    setTotalPages(calculatedTotalPages || 1);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPayments = filtered.slice(startIndex, endIndex);

    setPayments(paginatedPayments);
  };

  // Re-filter when filters change
  useEffect(() => {
    if (allPayments.length) {
      filterAndPaginatePayments(allPayments, statusFilter, searchTerm);
    }
  }, [allPayments, statusFilter, searchTerm, currentPage, renters, landlords]);

  // Get status badge style
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

  // Format currency to Rs (Indian Rupees)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get renter name
  const getRenterName = (renterId) => {
    const renter = renters[renterId];
    return renter ? `${renter.firstName} ${renter.lastName}` : "Unknown";
  };

  // Get landlord name from agreement
  const getLandlordName = (agreementId) => {
    const agreement = agreements[agreementId];
    if (!agreement || !agreement.landlordId) return "Unknown";

    const landlord = landlords[agreement.landlordId];
    return landlord ? `${landlord.firstName} ${landlord.lastName}` : "Unknown";
  };

  // Show loading state
  if (loading && !payments.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
        <FaSpinner className="animate-spin text-[#20319D] text-4xl mb-4" />
        <p className="text-gray-600">Loading payments...</p>
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
          onClick={fetchPayments}
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Active filters display */}
      {(statusFilter !== "All" || searchTerm) && (
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

            {/* <span className="ml-auto text-sm text-gray-500">
              <strong>{allPayments.length}</strong> total payments
            </span> */}
          </div>
        </div>
      )}

      {/* No payments state */}
      {payments.length === 0 && (
        <div className="text-center py-16">
          <FaFileInvoiceDollar className="mx-auto text-gray-400 text-5xl mb-3" />
          <h3 className="text-xl font-medium text-gray-600 mb-1">
            No Payments Found
          </h3>
          <p className="text-gray-500">
            {statusFilter !== "All"
              ? `There are no ${statusFilter.toLowerCase()} payments.`
              : searchTerm
              ? "There are no payments matching your search criteria."
              : "There are no payment records in the system."}
          </p>
        </div>
      )}

      {/* Payments list for desktop */}
      {payments.length > 0 && (
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sender
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Receiver
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Gateway
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => {
                const { className, icon } = getStatusBadge(
                  payment.paymentStatus
                );

                return (
                  <tr key={payment.paymentId} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-[#20319D]">
                      {payment.paymentId}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaCalendarAlt className="text-gray-400 mr-2" />
                        {formatDate(payment.paymentDate)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2" />
                        {getRenterName(payment.renterId)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaUserTie className="text-gray-400 mr-2" />
                        {getLandlordName(payment.agreementId)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                      >
                        {icon} {payment.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaCreditCard className="text-gray-400 mr-2" />
                        {payment.paymentGateway || "N/A"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card view for payments */}
      {payments.length > 0 && (
        <div className="sm:hidden">
          <div className="grid grid-cols-1 gap-4 p-4">
            {payments.map((payment) => {
              const { className, icon } = getStatusBadge(payment.paymentStatus);

              return (
                <div
                  key={payment.paymentId}
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <FaFileInvoiceDollar className="text-[#20319D] mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Payment #{payment.paymentId}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${className}`}
                    >
                      {icon} {payment.paymentStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Amount:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Date:</span>
                      <span className="text-sm text-gray-700">
                        {formatDate(payment.paymentDate)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Renter:</span>
                      <span className="text-sm text-gray-700">
                        {getRenterName(payment.renterId)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Landlord:</span>
                      <span className="text-sm text-gray-700">
                        {getLandlordName(payment.agreementId)}
                      </span>
                    </div>

                    {payment.paymentGateway && (
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Gateway:</span>
                        <span className="text-sm text-gray-700">
                          {payment.paymentGateway}
                        </span>
                      </div>
                    )}
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
    </div>
  );
};

export default PaymentList;
