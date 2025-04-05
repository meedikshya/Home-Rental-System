import React, { useState, useEffect, useMemo, useCallback } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaHome,
  FaBed,
  FaBath,
  FaUtensils,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaSpinner,
  FaFilter,
  FaDollarSign,
} from "react-icons/fa";

const PropertyFilterPanel = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterRoomType,
  setFilterRoomType,
  handleResetFilters,
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
  token,
  isLoading = false,
  onApplyFilters,
}) => {
  // Core states
  const [addresses, setAddresses] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [addressQuery, setAddressQuery] = useState("");
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // UI state
  const [openSection, setOpenSection] = useState(null);

  // Helper to check if a value is valid and not a function
  const isValid = useCallback(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      typeof value !== "function",
    []
  );

  // Calculate active filters with useMemo
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm ||
      filterStatus !== "All" ||
      filterRoomType !== "All" ||
      isValid(bedrooms) ||
      isValid(bathrooms) ||
      isValid(kitchens) ||
      isValid(minPrice) ||
      isValid(maxPrice)
    );
  }, [
    searchTerm,
    filterStatus,
    filterRoomType,
    bedrooms,
    bathrooms,
    kitchens,
    minPrice,
    maxPrice,
    isValid,
  ]);

  // Fetch filter options
  useEffect(() => {
    if (!token) return;

    const fetchFilterOptions = async () => {
      setLoading(true);
      try {
        const propertiesResponse = await ApiHandler.get("/Properties", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(propertiesResponse)) {
          setAddresses([
            ...new Set(propertiesResponse.map((p) => p.city).filter(Boolean)),
          ]);
          setAvailability([
            ...new Set(propertiesResponse.map((p) => p.status).filter(Boolean)),
          ]);
          setPropertyTypes([
            ...new Set(
              propertiesResponse.map((p) => p.roomType).filter(Boolean)
            ),
          ]);
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
        setAvailability(["Available", "Rented", "Inactive"]);
        setPropertyTypes(["Apartment", "Room", "House", "Villa", "Office"]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, [token]);

  // Sync searchTerm with addressQuery
  useEffect(() => {
    setAddressQuery(searchTerm || "");
  }, [searchTerm]);

  // Filter addresses when searching
  useEffect(() => {
    if (!addressQuery) {
      setFilteredAddresses([]);
      setIsSearching(false);
      return;
    }

    const filtered = addresses.filter((address) =>
      address.toLowerCase().includes(addressQuery.toLowerCase())
    );
    setFilteredAddresses(filtered);
  }, [addressQuery, addresses]);

  // Handle section toggle
  const toggleSection = useCallback((section) => {
    setOpenSection((prevSection) => (prevSection === section ? null : section));
  }, []);

  // Handle location selection
  const selectAddress = useCallback(
    (address) => {
      setAddressQuery(address);
      setSearchTerm(address);
      setIsSearching(false);
    },
    [setAddressQuery, setSearchTerm, setIsSearching]
  );

  // Handle apply filters with validation
  const handleApplyFilters = useCallback(() => {
    // Ensure we're working with valid values
    const filters = {
      city: searchTerm,
      status: filterStatus === "All" ? null : filterStatus,
      roomType: filterRoomType === "All" ? null : filterRoomType,
      bedrooms: isValid(bedrooms) ? parseInt(bedrooms, 10) : null,
      bathrooms: isValid(bathrooms) ? parseInt(bathrooms, 10) : null,
      kitchens: isValid(kitchens) ? parseInt(kitchens, 10) : null,
      minPrice: isValid(minPrice) ? parseInt(minPrice, 10) : null,
      maxPrice: isValid(maxPrice) ? parseInt(maxPrice, 10) : null,
    };

    // Remove null or empty filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] == null || filters[key] === "") {
        delete filters[key];
      }
    });

    // Call the parent's onApplyFilters function
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  }, [
    searchTerm,
    filterStatus,
    filterRoomType,
    bedrooms,
    bathrooms,
    kitchens,
    minPrice,
    maxPrice,
    isValid,
    onApplyFilters,
  ]);

  // Handle reset
  const handleResetAll = useCallback(() => {
    setAddressQuery("");
    setIsSearching(false);
    handleResetFilters();
  }, [handleResetFilters]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-base font-medium text-gray-700 flex items-center">
          <FaFilter className="mr-2 text-blue-600" /> Filters
        </h2>
        {hasActiveFilters && (
          <span className="text-xs bg-blue-100 text-blue-800 py-1 px-2 rounded-full">
            {
              Object.values({
                city: searchTerm,
                status: filterStatus !== "All" ? filterStatus : null,
                roomType: filterRoomType !== "All" ? filterRoomType : null,
                bedrooms: isValid(bedrooms) ? bedrooms : null,
                bathrooms: isValid(bathrooms) ? bathrooms : null,
                kitchens: isValid(kitchens) ? kitchens : null,
                minPrice: isValid(minPrice) ? minPrice : null,
                maxPrice: isValid(maxPrice) ? maxPrice : null,
              }).filter(Boolean).length
            }{" "}
            active
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {/* Location Filter */}
        <div className="px-4 py-3">
          <button
            className="w-full flex justify-between items-center text-left"
            onClick={() => toggleSection("location")}
            type="button"
          >
            <div className="flex items-center text-sm font-medium text-gray-700">
              <FaMapMarkerAlt className="text-blue-600 mr-2 flex-shrink-0" />
              <span className="truncate">Location</span>
              {searchTerm && (
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-[200px]">
                  {searchTerm}
                </span>
              )}
            </div>
            {openSection === "location" ? (
              <FaChevronUp className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            ) : (
              <FaChevronDown className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            )}
          </button>

          {openSection === "location" && (
            <div className="mt-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400 text-sm" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by city..."
                  value={addressQuery}
                  onChange={(e) => {
                    setAddressQuery(e.target.value);
                    setIsSearching(true);
                  }}
                  onFocus={() => setIsSearching(true)}
                />
                {addressQuery && (
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setAddressQuery("");
                      setSearchTerm("");
                      setIsSearching(false);
                    }}
                    type="button"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>

              {/* Dropdown positioning */}
              {isSearching && addressQuery && filteredAddresses.length > 0 && (
                <div className="relative">
                  <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredAddresses.map((address) => (
                      <div
                        key={address}
                        className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => selectAddress(address)}
                      >
                        <FaMapMarkerAlt className="text-blue-600 mr-2 text-xs flex-shrink-0" />
                        <span className="text-gray-700 truncate">
                          {address}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No matches found */}
              {isSearching &&
                addressQuery &&
                filteredAddresses.length === 0 && (
                  <div className="mt-2 p-2 text-xs text-gray-500 bg-gray-50 rounded-md flex items-center">
                    <FaTimes className="mr-1 text-gray-400 flex-shrink-0" />
                    No matching locations found
                  </div>
                )}

              {/* Selected city */}
              {searchTerm && !isSearching && (
                <div className="mt-2 bg-blue-50 p-2 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center overflow-hidden">
                      <FaMapMarkerAlt className="text-blue-600 mr-2 text-xs flex-shrink-0" />
                      <span className="text-sm text-blue-700 truncate">
                        {searchTerm}
                      </span>
                    </div>
                    <button
                      className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100 flex-shrink-0 ml-2"
                      onClick={() => {
                        setSearchTerm("");
                        setAddressQuery("");
                      }}
                      type="button"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price Range Filter - FIXED SECTION */}
        <div className="px-4 py-3">
          <button
            className="w-full flex justify-between items-center text-left"
            onClick={() => toggleSection("priceRange")}
            type="button"
          >
            <div className="flex items-center text-sm font-medium text-gray-700 overflow-hidden">
              <FaDollarSign className="text-blue-600 mr-2 flex-shrink-0" />
              <span className="truncate">Price Range</span>
              {(isValid(minPrice) || isValid(maxPrice)) && (
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-[200px]">
                  {isValid(minPrice) ? `Rs. ${minPrice}` : ""}
                  {isValid(maxPrice) ? `Rs. ${maxPrice}` : ""}

                  {isValid(minPrice) && isValid(maxPrice) ? " - " : ""}
                </span>
              )}
            </div>
            {openSection === "priceRange" ? (
              <FaChevronUp className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            ) : (
              <FaChevronDown className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            )}
          </button>

          {openSection === "priceRange" && (
            <div
              className="mt-3 grid grid-cols-2 gap-4"
              onClick={(e) => e.stopPropagation()} // Add this to prevent bubbling
            >
              {/* Minimum Price */}
              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <FaDollarSign className="mr-1 text-gray-500 flex-shrink-0" />
                  <span>Min Price</span>
                </div>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Min price"
                  value={minPrice || ""}
                  onChange={(e) => setMinPrice(e.target.value)}
                  min="0"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()} // Add this event handler
                />
              </div>

              {/* Maximum Price - Fixed and restructured */}
              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <FaDollarSign className="mr-1 text-gray-500 flex-shrink-0" />
                  <span>Max Price</span>
                </div>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max price"
                  value={maxPrice || ""}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </div>

        {/* Property Type Filter */}
        <div className="px-4 py-3">
          <button
            className="w-full flex justify-between items-center text-left"
            onClick={() => toggleSection("propertyType")}
            type="button"
          >
            <div className="flex items-center text-sm font-medium text-gray-700 overflow-hidden">
              <FaHome className="text-blue-600 mr-2 flex-shrink-0" />
              <span className="truncate">Property Type</span>
              {filterRoomType !== "All" && (
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-[200px]">
                  {filterRoomType}
                </span>
              )}
            </div>
            {openSection === "propertyType" ? (
              <FaChevronUp className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            ) : (
              <FaChevronDown className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            )}
          </button>

          {openSection === "propertyType" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div
                onClick={() => setFilterRoomType("All")}
                className={`px-3 py-1.5 rounded-md text-xs cursor-pointer ${
                  filterRoomType === "All"
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                All Types
              </div>

              {propertyTypes.length > 0 ? (
                propertyTypes.map((type) => (
                  <div
                    key={type}
                    onClick={() =>
                      setFilterRoomType(filterRoomType === type ? "All" : type)
                    }
                    className={`px-3 py-1.5 rounded-md text-xs cursor-pointer ${
                      filterRoomType === type
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {type}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 py-1">
                  {loading
                    ? "Loading property types..."
                    : "No property types available"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="px-4 py-3">
          <button
            className="w-full flex justify-between items-center text-left"
            onClick={() => toggleSection("status")}
            type="button"
          >
            <div className="flex items-center text-sm font-medium text-gray-700 overflow-hidden">
              <FaCheckCircle className="text-blue-600 mr-2 flex-shrink-0" />
              <span className="truncate">Status</span>
              {filterStatus !== "All" && (
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-[200px]">
                  {filterStatus}
                </span>
              )}
            </div>
            {openSection === "status" ? (
              <FaChevronUp className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            ) : (
              <FaChevronDown className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            )}
          </button>

          {openSection === "status" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <div
                className={`px-3 py-1.5 rounded-md text-xs cursor-pointer ${
                  filterStatus === "All"
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setFilterStatus("All")}
              >
                All
              </div>

              {availability.length > 0 ? (
                availability.map((status) => (
                  <div
                    key={status}
                    className={`px-3 py-1.5 rounded-md text-xs cursor-pointer ${
                      filterStatus === status
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() =>
                      setFilterStatus(filterStatus === status ? "All" : status)
                    }
                  >
                    {status}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 py-1">
                  {loading
                    ? "Loading statuses..."
                    : "No status options available"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="px-4 py-3">
          <button
            className="w-full flex justify-between items-center text-left"
            onClick={() => toggleSection("features")}
            type="button"
          >
            <div className="flex items-center text-sm font-medium text-gray-700 overflow-hidden">
              <FaHome className="text-blue-600 mr-2 flex-shrink-0" />
              <span className="truncate">Features</span>
              {(bedrooms || bathrooms || kitchens) && (
                <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate max-w-[120px] sm:max-w-[200px]">
                  {bedrooms && `${bedrooms} Bed`}
                  {bathrooms && bedrooms && ", "}
                  {bathrooms && `${bathrooms} Bath`}
                  {((kitchens && bedrooms) || (kitchens && bathrooms)) && ", "}
                  {kitchens && `${kitchens} Kitchen`}
                </span>
              )}
            </div>
            {openSection === "features" ? (
              <FaChevronUp className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            ) : (
              <FaChevronDown className="text-gray-400 text-xs flex-shrink-0 ml-2" />
            )}
          </button>

          {openSection === "features" && (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Bedrooms */}
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaBed className="mr-2 text-gray-500 flex-shrink-0" />
                    <span>Bedrooms (Min)</span>
                  </div>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min bedrooms"
                    value={bedrooms || ""}
                    onChange={(e) => setBedrooms(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Bathrooms */}
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaBath className="mr-2 text-gray-500 flex-shrink-0" />
                    <span>Washrooms (Min)</span>
                  </div>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min washrooms"
                    value={bathrooms || ""}
                    onChange={(e) => setBathrooms(e.target.value)}
                    min="0"
                  />
                </div>

                {/* Kitchens */}
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaUtensils className="mr-2 text-gray-500 flex-shrink-0" />
                    <span>Kitchens (Min)</span>
                  </div>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Min kitchens"
                    value={kitchens || ""}
                    onChange={(e) => setKitchens(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 flex gap-3">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              !hasActiveFilters || isLoading
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
            onClick={handleResetAll}
            disabled={isLoading || !hasActiveFilters}
            type="button"
          >
            Reset
          </button>
          <button
            className={`flex-2 py-2 px-4 text-sm font-medium rounded-md shadow-sm transition-all flex justify-center items-center ${
              isLoading
                ? "bg-blue-400 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={handleApplyFilters}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Filtering...
              </>
            ) : (
              <>
                <FaFilter className="mr-2" /> Apply Filters
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex flex-wrap gap-1">
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
              City: {searchTerm}
              <button
                className="ml-1 text-blue-500 hover:text-blue-700"
                onClick={() => {
                  setSearchTerm("");
                  setAddressQuery("");
                }}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {filterStatus !== "All" && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
              Status: {filterStatus}
              <button
                className="ml-1 text-green-500 hover:text-green-700"
                onClick={() => setFilterStatus("All")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {filterRoomType !== "All" && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
              Type: {filterRoomType}
              <button
                className="ml-1 text-purple-500 hover:text-purple-700"
                onClick={() => setFilterRoomType("All")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {isValid(minPrice) && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
              Min: Rs. {minPrice}
              <button
                className="ml-1 text-orange-500 hover:text-orange-700"
                onClick={() => setMinPrice("")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {isValid(maxPrice) && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
              Max: Rs. {maxPrice}
              <button
                className="ml-1 text-orange-500 hover:text-orange-700"
                onClick={() => setMaxPrice("")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {bedrooms && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              {bedrooms}+ Bed
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => setBedrooms("")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {bathrooms && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              {bathrooms}+ Bath
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => setBathrooms("")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {kitchens && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              {kitchens}+ Kitchen
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => setKitchens("")}
                type="button"
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyFilterPanel;
