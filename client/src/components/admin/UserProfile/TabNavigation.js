import React from "react";

const TabNavigation = ({
  activeTab,
  setActiveTab,
  bookings,
  agreements,
  payments,
}) => {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-4 px-1 text-sm font-medium ${
            activeTab === "overview"
              ? "text-[#20319D] border-b-2 border-[#20319D]"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-4 px-1 text-sm font-medium flex items-center ${
            activeTab === "bookings"
              ? "text-[#20319D] border-b-2 border-[#20319D]"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Bookings
          {bookings.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              {bookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("agreements")}
          className={`pb-4 px-1 text-sm font-medium flex items-center ${
            activeTab === "agreements"
              ? "text-[#20319D] border-b-2 border-[#20319D]"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Agreements
          {agreements.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              {agreements.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-4 px-1 text-sm font-medium flex items-center ${
            activeTab === "payments"
              ? "text-[#20319D] border-b-2 border-[#20319D]"
              : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Payments
          {payments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              {payments.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};

export default TabNavigation;
