import React from "react";
import {
  FaCalendarCheck,
  FaArrowRight,
  FaHome,
  FaCalendarAlt,
  FaHandshake,
  FaMoneyBillWave,
  FaChartLine,
  FaFilter,
  FaChartPie,
  FaLongArrowAltRight,
  FaRegLightbulb,
} from "react-icons/fa";

const PropertyBookingJourney = ({ stats, derivedStats }) => {
  if (!stats || !derivedStats) {
    return <p>Loading Property Booking Journey...</p>;
  }

  const conversionRate =
    Math.round(
      (stats.completedPayments / Math.max(stats.totalProperties, 1)) * 100
    ) || 0;

  const agreementConversionRate =
    stats.totalBookings > 0
      ? Math.round((stats.totalAgreements / stats.totalBookings) * 100)
      : 0;

  const bookingToAgreementRate =
    stats.totalBookings > 0
      ? Math.round((stats.approvedAgreements / stats.totalBookings) * 100)
      : 0;

  const agreementToPaymentRate =
    stats.approvedAgreements > 0
      ? Math.round((stats.completedPayments / stats.approvedAgreements) * 100)
      : 0;

  return (
    <div className="">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FaCalendarCheck className="mr-2 text-[#20319D]" />
          Booking Journey Visualization
        </h3>
        <div className="flex items-center gap-2">
          <button className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full flex items-center hover:bg-gray-50">
            <FaFilter className="mr-1 text-gray-500" /> Filter
          </button>
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <FaChartLine className="mr-1" /> {conversionRate}% Conversion
          </div>
        </div>
      </div>

      {/* Elegant Journey Visualization */}
      <div className="mb-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-green-50 rounded-xl p-6 border border-gray-100">
        <div className="relative mb-12">
          {/* Journey Path */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-green-200 transform -translate-y-1/2"></div>

          {/* Progress Path */}
          <div
            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-green-500 transform -translate-y-1/2 rounded-r-full"
            style={{
              width: `${
                (stats.completedPayments / Math.max(stats.totalProperties, 1)) *
                100
              }%`,
            }}
          >
            <div className="absolute right-0 top-1/2 w-3 h-3 bg-green-500 rounded-full transform -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
          </div>

          {/* Journey Stations */}
          <div className="flex justify-between relative">
            <JourneyStation
              icon={FaHome}
              label="Properties"
              value={stats.totalProperties}
              color="indigo"
            />

            <JourneyStation
              icon={FaCalendarAlt}
              label="Booking Requests"
              value={stats.totalBookings}
              color="blue"
              conversionRate={`${derivedStats.bookingRequestsPerProperty}×`}
            />

            <JourneyStation
              icon={FaHandshake}
              label="Approved Agreements"
              value={stats.approvedAgreements}
              color="purple"
              conversionRate={`${bookingToAgreementRate}%`}
            />

            <JourneyStation
              icon={FaMoneyBillWave}
              label="Completed Payments"
              value={stats.completedPayments}
              color="green"
              conversionRate={`${agreementToPaymentRate}%`}
              isLast={true}
            />
          </div>
        </div>

        {/* Insights Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="flex items-start">
            <div className="bg-indigo-100 rounded-full p-2 mr-3">
              <FaRegLightbulb className="text-indigo-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-1">
                Journey Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InsightMetric
                  label="Booking Rate"
                  value={`${derivedStats.bookingRequestsPerProperty}×`}
                  description="Booking requests per property"
                  trend={
                    derivedStats.bookingRequestsPerProperty > 1
                      ? "positive"
                      : "neutral"
                  }
                />

                <InsightMetric
                  label="Agreement Rate"
                  value={`${bookingToAgreementRate}%`}
                  description="Of booking requests convert to agreements"
                  trend={bookingToAgreementRate > 50 ? "positive" : "negative"}
                />

                <InsightMetric
                  label="Payment Completion"
                  value={`${conversionRate}%`}
                  description="Overall property to payment rate"
                  trend={conversionRate > 30 ? "positive" : "negative"}
                  highlight={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Radial Progress Charts */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
          <FaChartPie className="mr-2 text-indigo-500" /> Conversion Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <RadialProgressCard
            title="Properties to Bookings"
            percent={Math.min(
              derivedStats.bookingRequestsPerProperty * 25,
              100
            )}
            value={`${derivedStats.bookingRequestsPerProperty}×`}
            color="indigo"
            icon={<FaHome />}
          />

          <RadialProgressCard
            title="Bookings to Agreements"
            percent={bookingToAgreementRate}
            value={`${bookingToAgreementRate}%`}
            color="blue"
            icon={<FaCalendarAlt />}
          />

          <RadialProgressCard
            title="Agreements to Payments"
            percent={agreementToPaymentRate}
            value={`${agreementToPaymentRate}%`}
            color="purple"
            icon={<FaHandshake />}
          />

          <RadialProgressCard
            title="Overall Conversion"
            percent={conversionRate}
            value={`${conversionRate}%`}
            color="green"
            icon={<FaMoneyBillWave />}
            highlight={true}
          />
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailCard
          number={1}
          color="indigo"
          title="Properties"
          value={stats.totalProperties}
          subtitle="Available listings on platform"
          badge={`${derivedStats.propertiesPerLandlord} per landlord`}
          icon={<FaHome />}
        />
        <DetailCard
          number={2}
          color="blue"
          title="Booking Requests"
          value={stats.totalBookings}
          subtitle="Initial rental inquiries from renters"
          badge={`${derivedStats.bookingRequestsPerProperty}× per property`}
          icon={<FaCalendarAlt />}
          bottomDetail={`${agreementConversionRate}% include agreements`}
        />
        <DetailCard
          number={3}
          color="purple"
          title="Approved Agreements"
          value={stats.approvedAgreements}
          subtitle="Agreements approved by landlords"
          badge={`${derivedStats.agreementApprovalRate}% approval rate`}
          icon={<FaHandshake />}
        />
        <DetailCard
          number={4}
          color="green"
          title="Completed Payments"
          value={stats.completedPayments}
          subtitle="Finalized bookings with payments"
          badge={`${derivedStats.paymentsPerAgreement}× per agreement`}
          icon={<FaMoneyBillWave />}
          isHighlighted={true}
        />
      </div>
    </div>
  );
};

const JourneyStation = ({
  icon: Icon,
  label,
  value,
  color,
  conversionRate,
  isLast,
}) => {
  const colorMap = {
    indigo: "from-indigo-500 to-indigo-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
  };

  return (
    <div className="flex flex-col items-center relative z-10">
      <div
        className={`w-12 h-12 rounded-full bg-gradient-to-br ${
          colorMap[color]
        } shadow-lg flex items-center justify-center ${
          isLast ? "animate-pulse" : ""
        }`}
      >
        <Icon className="text-white text-lg" />
      </div>
      <div className="mt-3 bg-white rounded-lg shadow-sm p-2 border border-gray-100 w-28 text-center">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-lg font-bold text-gray-800">{value}</div>
        {conversionRate && (
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
            <FaLongArrowAltRight className="mr-1" size={10} /> {conversionRate}
          </div>
        )}
      </div>
    </div>
  );
};

const InsightMetric = ({ label, value, description, trend, highlight }) => {
  const getTrendColor = (trend) => {
    if (trend === "positive") return "text-green-500";
    if (trend === "negative") return "text-red-500";
    return "text-gray-500";
  };

  const getTrendIcon = (trend) => {
    if (trend === "positive") return "↑";
    if (trend === "negative") return "↓";
    return "→";
  };

  return (
    <div
      className={`p-2 rounded ${
        highlight ? "bg-green-50 border-l-2 border-green-400" : ""
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="flex items-baseline">
        <div
          className={`text-lg font-bold ${
            highlight ? "text-green-700" : "text-gray-800"
          }`}
        >
          {value}
        </div>
        <div className={`ml-2 text-sm ${getTrendColor(trend)}`}>
          {getTrendIcon(trend)}
        </div>
      </div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
};

const RadialProgressCard = ({
  title,
  percent,
  value,
  color,
  icon,
  highlight,
}) => {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const colorMap = {
    indigo: {
      ring: "#6366F1",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
    },
    blue: {
      ring: "#3B82F6",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    purple: {
      ring: "#A855F7",
      bg: "bg-purple-50",
      text: "text-purple-700",
    },
    green: {
      ring: "#10B981",
      bg: "bg-green-50",
      text: "text-green-700",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? "border-green-200 bg-green-50/50"
          : "border-gray-200 bg-white"
      } shadow-sm flex flex-col items-center`}
    >
      <div className="text-sm text-gray-600 mb-3 text-center">{title}</div>

      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={c.ring}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          {icon && <div className={c.text}>{icon}</div>}
          <div className={`text-xl font-bold ${c.text}`}>{value}</div>
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({
  number,
  color,
  title,
  value,
  subtitle,
  badge,
  icon,
  bottomDetail,
  isHighlighted,
}) => {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-700",
      icon: "text-indigo-500",
      border: "border-indigo-100",
      gradientFrom: "from-indigo-50",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
      icon: "text-blue-500",
      border: "border-blue-100",
      gradientFrom: "from-blue-50",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      badgeBg: "bg-purple-50",
      badgeText: "text-purple-700",
      icon: "text-purple-500",
      border: "border-purple-100",
      gradientFrom: "from-purple-50",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      badgeBg: "bg-green-50",
      badgeText: "text-green-700",
      icon: "text-green-500",
      border: "border-green-100",
      gradientFrom: "from-green-50",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`bg-gradient-to-b ${
        c.gradientFrom
      } to-white rounded-xl p-4 border ${
        isHighlighted ? "border-green-300 shadow-lg shadow-green-100" : c.border
      } shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="flex items-start mb-3">
        <div
          className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center ${c.text} mr-3 flex-shrink-0`}
        >
          <span className="text-lg font-bold">{number}</span>
        </div>
        <div>
          <h4 className="font-medium text-gray-800">{title}</h4>
          <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
        </div>
      </div>

      <div className="pl-12">
        <div className="text-xs text-gray-500 mb-2">{subtitle}</div>

        <div className="flex items-center justify-between">
          <div
            className={`text-xs ${c.badgeBg} ${c.badgeText} px-2 py-1 rounded-full`}
          >
            {badge}
          </div>
          <div className={`${c.icon}`}>{icon}</div>
        </div>

        {bottomDetail && (
          <div className="mt-2 flex items-center">
            <FaArrowRight className="text-gray-400 mr-1 text-xs" />
            <div className="text-xs text-gray-500">{bottomDetail}</div>
          </div>
        )}

        {isHighlighted && (
          <div className="mt-2 text-xs text-green-600 flex items-center justify-center bg-green-50 py-1 rounded">
            <span className="animate-pulse mr-1">●</span> Final Conversion Goal
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyBookingJourney;
