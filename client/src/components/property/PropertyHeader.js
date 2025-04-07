import React from "react";
import { FaHome, FaPlus, FaFilter } from "react-icons/fa";

const PropertyHeader = ({
  onAddProperty,
  isFilterVisible,
  setIsFilterVisible,
  propertyCount,
}) => {
  return (
    <div className="bg-gradient-to-r from-[#20319D] to-[#3949AB] text-white p-5 rounded-lg shadow-lg mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <FaHome className="text-2xl mr-3" />
          <h2 className="text-2xl font-bold">Your Properties</h2>
          {propertyCount > 0 && (
            <span className="ml-3 bg-white/20 text-white text-sm px-3 py-1 rounded-full">
              {propertyCount} {propertyCount === 1 ? "property" : "properties"}
            </span>
          )}
        </div>

        <div className="flex space-x-3">
          {/* Add Property Button */}
          <button
            onClick={onAddProperty}
            className="flex items-center gap-2 bg-white text-[#20319D] hover:bg-gray-100 py-2 px-4 rounded-lg shadow-md transition-colors duration-300"
          >
            <FaPlus />
            <span className="font-medium">Add Property</span>
          </button>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="flex items-center gap-2 bg-white text-[#20319D] hover:bg-gray-100 py-2 px-4 rounded-lg shadow-md transition-colors duration-300"
          >
            <FaFilter />
            <span className="font-medium">
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyHeader;
