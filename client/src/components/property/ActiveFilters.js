import React from "react";
import { FaFilter, FaTimes } from "react-icons/fa";

const ActiveFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  filterRoomType,
  setFilterRoomType,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  bedrooms,
  setBedrooms,
  bathrooms,
  setBathrooms,
  kitchens,
  setKitchens,
  handleResetFilters,
  hasActiveFilters,
}) => {
  if (!hasActiveFilters) return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
      <div className="w-full mb-3 flex items-center">
        <div className="bg-blue-100 p-2 rounded-full mr-3">
          <FaFilter className="text-blue-600" />
        </div>
        <span className="font-medium text-blue-800 text-lg">
          Active Filters
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {searchTerm && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 transition-all hover:bg-blue-200">
            Location: {searchTerm}
            <button
              className="ml-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-300/30 p-1 rounded-full"
              onClick={() => setSearchTerm("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {statusFilter !== "All" && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 transition-all hover:bg-green-200">
            Status: {statusFilter}
            <button
              className="ml-1.5 text-green-500 hover:text-green-700 hover:bg-green-300/30 p-1 rounded-full"
              onClick={() => setStatusFilter("All")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {filterRoomType !== "All" && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 transition-all hover:bg-purple-200">
            Type: {filterRoomType}
            <button
              className="ml-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-300/30 p-1 rounded-full"
              onClick={() => setFilterRoomType("All")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {minPrice && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 transition-all hover:bg-orange-200">
            Min Price: ₹{minPrice}
            <button
              className="ml-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-300/30 p-1 rounded-full"
              onClick={() => setMinPrice("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {maxPrice && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 transition-all hover:bg-orange-200">
            Max Price: ₹{maxPrice}
            <button
              className="ml-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-300/30 p-1 rounded-full"
              onClick={() => setMaxPrice("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {bedrooms && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 transition-all hover:bg-indigo-200">
            {bedrooms}+ Bed
            <button
              className="ml-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-300/30 p-1 rounded-full"
              onClick={() => setBedrooms("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {bathrooms && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 transition-all hover:bg-indigo-200">
            {bathrooms}+ Bath
            <button
              className="ml-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-300/30 p-1 rounded-full"
              onClick={() => setBathrooms("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        {kitchens && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 transition-all hover:bg-indigo-200">
            {kitchens}+ Kitchen
            <button
              className="ml-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-300/30 p-1 rounded-full"
              onClick={() => setKitchens("")}
            >
              <FaTimes size={10} />
            </button>
          </span>
        )}

        <button
          onClick={handleResetFilters}
          className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors flex items-center"
        >
          <FaTimes size={10} className="mr-1" /> Clear All
        </button>
      </div>
    </div>
  );
};

export default ActiveFilters;
