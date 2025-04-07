import React from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

const NoMatchingProperties = ({ handleResetFilters }) => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md text-center mt-6 border border-yellow-100">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FaSearch className="text-yellow-500 text-2xl" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No matching properties
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        We couldn't find any properties matching your current filters. Try
        adjusting your search criteria or clear filters to see all your
        properties.
      </p>
      <button
        onClick={handleResetFilters}
        className="px-5 py-2.5 bg-[#20319D] text-white rounded-lg hover:bg-[#162881] transition-colors shadow-md flex items-center mx-auto"
      >
        <FaTimes className="mr-2" /> Clear All Filters
      </button>
    </div>
  );
};

export default NoMatchingProperties;
