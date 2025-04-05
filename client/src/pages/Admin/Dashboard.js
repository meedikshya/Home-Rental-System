import React, { useState, useEffect, useMemo } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FaUsers,
  FaHome,
  FaMoneyBillWave,
  FaUserTie,
  FaUserFriends,
  FaChartBar,
  FaCalendarCheck,
  FaPercentage,
  FaExchangeAlt,
  FaBuilding,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown,
  FaExclamationCircle,
  FaEquals,
  FaChartLine,
  FaChartPie,
  FaInfoCircle,
  FaHandshake,
  FaFileContract,
  FaRightArrow,
  FaArrowRight,
  FaThumbsUp,
  FaCalendarAlt,
  FaShieldAlt,
  FaClock,
  FaDollarSign,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid, // Import CartesianGrid
} from "recharts";

// Import components
import CountCard from "../../components/Dashboard/CountCard.js";
import { DashboardProvider } from "../../components/Dashboard/DashboardProvider.js";
import PropertyBookingJourney from "../../components/Dashboard/PropertyBookingJourney.js";
import KeyPerformanceMetrics from "../../components/Dashboard/KeyPerformanceMetrics.js";
import UserDistributionChart from "../../components/Dashboard/UserDistributionChart.js";
import PlatformActivityMetricsChart from "../../components/Dashboard/PlatformActivityMetricsChart.js";

const Dashboard = () => {
  const [stats, setStats] = useState({
    completedPayments: 0,
    totalProperties: 0,
    totalUsers: 0,
    totalLandlords: 0,
    totalRenters: 0,
    acceptedBookings: 0,
    totalBookings: 0,
    totalAgreements: 0,
    approvedAgreements: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("all"); // all, month, week
  const [selectedStat, setSelectedStat] = useState(null);

  // Function to fetch all stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all stats in parallel
      const [
        paymentsResponse,
        propertiesResponse,
        usersResponse,
        landlordsResponse,
        rentersResponse,
        acceptedBookingsResponse,
        totalBookingsResponse,
        totalAgreementsResponse,
        approvedAgreementsResponse,
      ] = await Promise.all([
        ApiHandler.get("/Payments/completed-payment-count"),
        ApiHandler.get("/Properties/total-count"),
        ApiHandler.get("/Users/total-count"),
        ApiHandler.get("/Users/total-landlords"),
        ApiHandler.get("/Users/total-renters"),
        ApiHandler.get("/Bookings/accepted-count"),
        ApiHandler.get("/Bookings/total-count"),
        ApiHandler.get("/Agreements/total-count"),
        ApiHandler.get("/Agreements/approved-count"),
      ]);

      setStats({
        completedPayments: paymentsResponse || 0,
        totalProperties: propertiesResponse || 0,
        totalUsers: usersResponse || 0,
        totalLandlords: landlordsResponse || 0,
        totalRenters: rentersResponse || 0,
        acceptedBookings: acceptedBookingsResponse || 0,
        totalBookings: totalBookingsResponse || 0,
        totalAgreements: totalAgreementsResponse || 0,
        approvedAgreements: approvedAgreementsResponse || 0,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load dashboard statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Calculate derived statistics
  const derivedStats = useMemo(() => {
    const propertiesPerLandlord =
      stats.totalLandlords > 0
        ? (stats.totalProperties / stats.totalLandlords).toFixed(1)
        : 0;

    // Payment conversion should be based on approved agreements
    const paymentToAgreementRatio =
      stats.approvedAgreements > 0
        ? Math.round((stats.completedPayments / stats.approvedAgreements) * 100)
        : 0;

    const landlordRenterRatio =
      stats.totalRenters > 0
        ? (stats.totalLandlords / stats.totalRenters).toFixed(2)
        : 0;

    // Admin count
    const adminCount =
      stats.totalUsers - stats.totalLandlords - stats.totalRenters;

    const agreementApprovalRate =
      stats.totalAgreements > 0
        ? Math.round((stats.approvedAgreements / stats.totalAgreements) * 100)
        : 0;

    // Calculate booking requests per property ratio
    const bookingRequestsPerProperty =
      stats.totalProperties > 0
        ? (stats.totalBookings / stats.totalProperties).toFixed(2)
        : 0;

    return {
      propertiesPerLandlord,
      paymentToAgreementRatio,
      landlordRenterRatio,
      adminCount,
      agreementApprovalRate,
      bookingRequestsPerProperty,
    };
  }, [stats]);

  // Prepare chart data
  const chartData = useMemo(() => {
    // User distribution data for pie chart
    const userDistributionData = [
      {
        name: "Landlords",
        value: stats.totalLandlords,
        color: "#3949AB",
        description: "Property owners",
      },
      {
        name: "Renters",
        value: stats.totalRenters,
        color: "#1A237E",
        description: "Property renters",
      },
      {
        name: "Admins",
        value: derivedStats.adminCount,
        color: "#9FA8DA",
        description: "Administrative users",
      },
    ];

    // Platform metrics for bar chart
    const platformMetricsData = [
      {
        name: "Properties",
        value: stats.totalProperties,
        color: "#7E57C2",
        description: "Total listed properties",
      },
      {
        name: "Booking Requests",
        value: stats.totalBookings,
        color: "#5C6BC0",
        description: "Initial booking requests",
      },
      {
        name: "Approved Agreements",
        value: stats.approvedAgreements,
        color: "#3F51B5",
        description: "Agreements approved by landlords",
      },
      {
        name: "Completed Payments",
        value: stats.completedPayments,
        color: "#283593",
        description: "Finalized bookings with payment",
      },
    ];

    return {
      userDistributionData,
      platformMetricsData,
    };
  }, [stats, derivedStats]);

  // New interactive card click handler
  const handleCardClick = (stat) => {
    setSelectedStat(selectedStat === stat ? null : stat);
  };

  const simplifiedPlatformMetricsData = useMemo(() => {
    return chartData.platformMetricsData.map((item) => {
      let simplifiedName = item.name;
      if (item.name === "Properties") {
        simplifiedName = "Listings";
      } else if (item.name === "Booking Requests") {
        simplifiedName = "Inquiries";
      } else if (item.name === "Approved Agreements") {
        simplifiedName = "Deals Made";
      } else if (item.name === "Completed Payments") {
        simplifiedName = "Rent Paid";
      }
      return {
        ...item,
        name: simplifiedName,
      };
    });
  }, [chartData.platformMetricsData]);

  return (
    <DashboardProvider>
      <div className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
        {/* Subtle background pattern */}
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 opacity-70 -z-10"></div>
        <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzOTQ5QUIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2MWgtNHYtMXptMC0xaDR2LTFoLTR2MXptMC0yaDF2LTRoLTF2NHptLTItMWgxdi0yaC0xdjJ6bS0yNSAxa3ZoLTF2MWgxdi0xem0wLTFoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem0wLTJoLTF2MWgxdi0xem00IDBoLTF2MWgxdi0xeiIvPjwvZz48L2c+PC9zdmc+')] -z-10 opacity-30"></div>

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Modern header section */}
          <header className="bg-gradient-to-r from-[#20319D] to-[#4051B5] text-white p-5 md:p-6 rounded-2xl shadow-lg overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full translate-y-1/3 -translate-x-1/3"></div>

            <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center mb-2">
                  <FaChartBar className="mr-3" /> Admin Dashboard
                </h1>
              </div>
            </div>
          </header>

          {error && (
            <div
              className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 animate-fade-in shadow-sm"
              role="alert"
            >
              <p className="font-medium flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                    clipRule="evenodd"
                  />
                </svg>
                Error
              </p>
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center h-96 bg-white rounded-2xl shadow-md">
              <div className="w-16 h-16 border-4 border-[#20319D] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 text-lg">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Mobile time range selector */}
              <div className="flex md:hidden overflow-auto pb-2 no-scrollbar">
                <div className="flex rounded-full overflow-hidden border border-indigo-200 text-sm bg-white shadow-sm">
                  <button
                    className={`px-4 py-1.5 ${
                      timeRange === "all"
                        ? "bg-indigo-100 text-indigo-800"
                        : "text-gray-600"
                    }`}
                    onClick={() => setTimeRange("all")}
                  >
                    All Time
                  </button>
                  <button
                    className={`px-4 py-1.5 ${
                      timeRange === "month"
                        ? "bg-indigo-100 text-indigo-800"
                        : "text-gray-600"
                    }`}
                    onClick={() => setTimeRange("month")}
                  >
                    This Month
                  </button>
                  <button
                    className={`px-4 py-1.5 ${
                      timeRange === "week"
                        ? "bg-indigo-100 text-indigo-800"
                        : "text-gray-600"
                    }`}
                    onClick={() => setTimeRange("week")}
                  >
                    This Week
                  </button>
                </div>
              </div>

              {/* Key metrics grid - more responsive and modern */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedStat === "users" ? "ring-2 ring-blue-400" : ""
                  }`}
                  onClick={() => handleCardClick("users")}
                >
                  <div className="h-1 w-full bg-blue-600"></div>
                  <div className="p-4 flex items-center">
                    <div className="rounded-full p-2 bg-blue-100 text-blue-600 mr-3">
                      <FaUsers size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Users</p>
                      <p className="text-xl font-bold text-gray-800">
                        {stats.totalUsers}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedStat === "properties"
                      ? "ring-2 ring-purple-400"
                      : ""
                  }`}
                  onClick={() => handleCardClick("properties")}
                >
                  <div className="h-1 w-full bg-purple-600"></div>
                  <div className="p-4 flex items-center">
                    <div className="rounded-full p-2 bg-purple-100 text-purple-600 mr-3">
                      <FaHome size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Properties</p>
                      <p className="text-xl font-bold text-gray-800">
                        {stats.totalProperties}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedStat === "agreements"
                      ? "ring-2 ring-indigo-400"
                      : ""
                  }`}
                  onClick={() => handleCardClick("agreements")}
                >
                  <div className="h-1 w-full bg-indigo-600"></div>
                  <div className="p-4 flex items-center">
                    <div className="rounded-full p-2 bg-indigo-100 text-indigo-600 mr-3">
                      <FaHandshake size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Approved Agreements
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {stats.approvedAgreements}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    selectedStat === "payments" ? "ring-2 ring-green-400" : ""
                  }`}
                  onClick={() => handleCardClick("payments")}
                >
                  <div className="h-1 w-full bg-green-600"></div>
                  <div className="p-4 flex items-center">
                    <div className="rounded-full p-2 bg-green-100 text-green-600 mr-3">
                      <FaMoneyBillWave size={18} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        Completed Payments
                      </p>
                      <p className="text-xl font-bold text-gray-800">
                        {stats.completedPayments}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Cards - with detailed metrics */}
              <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <FaChartPie className="mr-2 text-[#20319D]" /> Booking
                    Platform Overview
                  </h2>
                  <div className="mt-2 md:mt-0"></div>
                </div>

                {/* User & Property Summary */}
                <div className="mb-8">
                  <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                    <FaUsers className="mr-2 text-blue-600" /> Users &
                    Properties
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <CountCard
                      title="Total Users"
                      value={stats.totalUsers}
                      icon={<FaUsers size={20} />}
                      color="#4051B5"
                      trend="up"
                      subtitle="Registered accounts"
                    />

                    <CountCard
                      title="Landlords"
                      value={stats.totalLandlords}
                      icon={<FaUserTie size={20} />}
                      color="#3949AB"
                      trend="up"
                      subtitle="Property owners"
                    />

                    <CountCard
                      title="Renters"
                      value={stats.totalRenters}
                      icon={<FaUserFriends size={20} />}
                      color="#1A237E"
                      trend="up"
                      subtitle="Property seekers"
                    />

                    <CountCard
                      title="Properties"
                      value={stats.totalProperties}
                      icon={<FaHome size={20} />}
                      color="#7E57C2"
                      trend="up"
                      subtitle={`${derivedStats.propertiesPerLandlord} per landlord`}
                    />
                  </div>
                </div>
              </section>

              {/* Rental Process & Performance Indicators */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment to Agreement Conversion - Featured */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50 lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FaDollarSign className="mr-2 text-[#1A237E]" /> Payment
                    Conversion
                  </h3>

                  <div className="flex flex-col items-center">
                    <div className="relative w-48 h-48 mb-4">
                      <div className="w-full h-full rounded-full bg-indigo-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-indigo-700">
                            {derivedStats.paymentToAgreementRatio}%
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            conversion rate
                          </div>
                        </div>
                      </div>

                      {/* Circular progress indicator */}
                      <svg
                        className="absolute inset-0 w-full h-full transform -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#E0E7FF"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#1A237E"
                          strokeWidth="8"
                          strokeDasharray="283"
                          strokeDashoffset={
                            283 -
                            (283 * derivedStats.paymentToAgreementRatio) / 100
                          }
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-medium text-gray-800">
                        {stats.completedPayments} of {stats.approvedAgreements}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        approved agreements resulted in payment
                      </div>

                      <div className="mt-4 flex justify-center">
                        <div
                          className={`text-sm px-3 py-1 rounded-full inline-flex items-center
                          ${
                            derivedStats.paymentToAgreementRatio > 75
                              ? "bg-green-50 text-green-700"
                              : derivedStats.paymentToAgreementRatio > 50
                              ? "bg-blue-50 text-blue-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {derivedStats.paymentToAgreementRatio > 75 ? (
                            <>
                              <FaArrowUp className="mr-1" /> High conversion
                            </>
                          ) : derivedStats.paymentToAgreementRatio > 50 ? (
                            <>
                              <FaEquals className="mr-1" /> Average conversion
                            </>
                          ) : (
                            <>
                              <FaArrowDown className="mr-1" /> Low conversion
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Distribution Chart */}
                <UserDistributionChart chartData={chartData} stats={stats} />
              </section>

              {/* Analytics Charts */}
              <section className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
                <PlatformActivityMetricsChart
                  chartData={chartData}
                  simplifiedPlatformMetricsData={simplifiedPlatformMetricsData}
                />
              </section>

              {/* Key Performance Metrics */}
              <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50 mb-6">
                <PropertyBookingJourney
                  stats={stats}
                  derivedStats={derivedStats}
                />
              </section>

              {/* Additional insights - simplified */}
              <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-6 border border-indigo-50">
                <h3 className="text-lg font-semibold text-gray-800 mb-5">
                  Additional Insights
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 mr-3">
                        <FaExchangeAlt size={18} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Landlord to Renter Ratio
                        </div>
                        <div className="text-xl font-bold text-gray-800">
                          {derivedStats.landlordRenterRatio}:1
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      For every renter, there are{" "}
                      {derivedStats.landlordRenterRatio} landlords on the
                      platform
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 mr-3">
                        <FaFileContract size={18} />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">
                          Completed to Approved Agreements
                        </div>
                        <div className="text-xl font-bold text-gray-800">
                          {derivedStats.paymentToAgreementRatio}%
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {derivedStats.paymentToAgreementRatio}% of approved
                      agreements result in successful payments
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </DashboardProvider>
  );
};

export default Dashboard;
