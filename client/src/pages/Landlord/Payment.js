import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import { toast } from "react-toastify";
import {
  FaCheck,
  FaCalendarAlt,
  FaUser,
  FaMoneyBillWave,
} from "react-icons/fa";

const Payment = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renterDetails, setRenterDetails] = useState({});

  // Get the landlord ID from Firebase
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
            setError("Authentication error. Please try logging in again.");
          }
        } else {
          setLandlordId(null);
          setError("You need to be logged in to view payments.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch completed payments when landlordId is available
  useEffect(() => {
    const fetchCompletedPayments = async () => {
      if (!landlordId) return;

      try {
        setLoading(true);
        setError(null);

        const token = await FIREBASE_AUTH.currentUser.getIdToken(true);
        const response = await ApiHandler.get(
          `/Payments/completed-by-landlord/${landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response) {
          setPayments(response);

          // Fetch additional details for renters and agreements
          if (response.length > 0) {
            await fetchRelatedData(response, token);
          }
        } else {
          setPayments([]);
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payments. Please try again later.");
        toast.error("Could not load payment information.");
      } finally {
        setLoading(false);
      }
    };

    if (landlordId) {
      fetchCompletedPayments();
    }
  }, [landlordId]);

  // Fetch renter details
  const fetchRelatedData = async (paymentsList, token) => {
    try {
      // Extract unique renter IDs
      const renterIds = [...new Set(paymentsList.map((p) => p.renterId))];

      // Fetch renter details
      const renterDetailsMap = {};
      for (const renterId of renterIds) {
        try {
          const renterData = await ApiHandler.get(
            `/UserDetails/userId/${renterId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (renterData) {
            // Create a full name from first and last name
            const fullName = `${renterData.firstName || ""} ${
              renterData.lastName || ""
            }`.trim();
            renterDetailsMap[renterId] = {
              name: fullName || "Unnamed Tenant",
              email: renterData.email || "",
              phone: renterData.phoneNumber || "",
            };
          }
        } catch (err) {
          console.error(`Error fetching details for renter ${renterId}:`, err);
          renterDetailsMap[renterId] = { name: "Unnamed Tenant" };
        }
      }

      setRenterDetails(renterDetailsMap);
    } catch (err) {
      console.error("Error fetching related data:", err);
      toast.warning("Some payment details could not be loaded.");
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Loading state
  if (loading && !payments.length) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
          <p>{error}</p>
          <button
            className="mt-2 text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && !payments.length) {
    return (
      <div className="p-8">
        <div className="bg-blue-50 p-8 rounded-lg border border-blue-200 text-center">
          <FaMoneyBillWave className="text-blue-400 text-5xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-blue-700 mb-2">
            No Completed Payments
          </h3>
          <p className="text-blue-600 mb-4">
            You don't have any completed payments yet.
          </p>
          <p className="text-gray-500">
            Payments will appear here once your tenants make successful
            payments.
          </p>
        </div>
      </div>
    );
  }

  // Success state with payments
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Completed Payments
        </h2>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Received</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(
                  payments.reduce((sum, payment) => sum + payment.amount, 0)
                )}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <FaMoneyBillWave className="text-green-500 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">Payments Count</p>
              <p className="text-2xl font-bold text-gray-800">
                {payments.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FaCheck className="text-blue-500 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                SN
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Renter
              </th>
              {/* Property/Agreement column removed */}
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Amount
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Payment Method
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment, index) => {
              const renter = renterDetails[payment.renterId] || {};

              return (
                <tr key={payment.paymentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* Serial Number instead of icon */}
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {payment.paymentDate
                          ? formatDate(payment.paymentDate)
                          : "Date not available"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaUser className="text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {renter.name || "Unnamed Tenant"}
                        </div>
                        {renter.email && (
                          <div className="text-xs text-gray-500">
                            {renter.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Property/Agreement column removed */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {payment.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {payment.paymentGateway || "Online Payment"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payment;
