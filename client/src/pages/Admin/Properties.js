import React, { useState, useEffect, useCallback, useMemo } from "react";
import ApiHandler from "../../api/ApiHandler.js";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaInfoCircle,
  FaUserTie,
  FaBuilding,
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// Import the components
import PaginationControls from "../../components/UI/PaginationControls.js";
import PropertyListAdmin from "../../components/admin/PropertyListAdmin.jsx";
import PropertyFilterPanel from "../../components/admin/PropertyFilterPanel.js";
import ImageSlider from "../../components/property/Imageslider.js"; // Import ImageSlider

const Properties = () => {
  // Base states
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [objectUrls, setObjectUrls] = useState({});
  const [currentImageIndices, setCurrentImageIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(6);
  const [allProperties, setAllProperties] = useState([]); // Store all properties

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRoomType, setFilterRoomType] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [kitchens, setKitchens] = useState(""); // Added kitchen filter

  // Landlord data
  const [landlords, setLandlords] = useState([]);
  const [selectedLandlordId, setSelectedLandlordId] = useState("");
  const [loadingLandlords, setLoadingLandlords] = useState(false);
  const [landlordInfo, setLandlordInfo] = useState({});

  // UI State
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Fetch landlord information
  const fetchLandlordInfo = useCallback(
    async (landlordIds) => {
      try {
        const landlordData = {};

        for (const id of landlordIds) {
          if (id) {
            const response = await ApiHandler.get(`/UserDetails/userId/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (response) {
              landlordData[id] = {
                name: `${response.firstName} ${response.lastName}`,
                email: response.email,
                phone: response.phone || "No phone",
              };
            }
          }
        }

        setLandlordInfo(landlordData);
      } catch (err) {
        console.error("Error fetching landlord info:", err);
      }
    },
    [token]
  );

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
        } catch (err) {
          console.error("Error getting token:", err);
        }
      } else {
        setToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Data fetching effects
  useEffect(() => {
    if (token) {
      fetchLandlords();
      setIsPageLoaded(true);
    } else {
      setIsPageLoaded(false);
    }
  }, [token]);

  // Main effect to fetch properties when filters change
  useEffect(() => {
    if (token) fetchProperties();
  }, [
    token,
    currentPage,
    pageSize,
    filterStatus,
    filterRoomType,
    selectedLandlordId,
    bedrooms,
    bathrooms,
    kitchens,
    searchTerm,
  ]);

  // Handler for Apply Filters button
  const handleApplyFilters = (filters) => {
    setCurrentPage(1);
    setSearchTerm(filters?.city || "");
    setFilterStatus(filters?.status || "All");
    setFilterRoomType(filters?.roomType || "All");
    setMinPrice(filters?.minPrice || "");
    setMaxPrice(filters?.maxPrice || "");
    setBedrooms(filters?.bedrooms || "");
    setBathrooms(filters?.bathrooms || "");
    setKitchens(filters?.kitchens || "");

    fetchProperties();
  };

  // Landlord data fetching
  const fetchLandlords = useCallback(async () => {
    try {
      setLoadingLandlords(true);
      const [userDetailsResponse, usersResponse] = await Promise.all([
        ApiHandler.get("/UserDetails", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        ApiHandler.get("/Users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (userDetailsResponse && usersResponse) {
        const userRolesMap = {};
        usersResponse.forEach((user) => {
          userRolesMap[user.userId] = user.userRole;
        });

        const landlordUsers = userDetailsResponse.filter(
          (user) => userRolesMap[user.userId] === "Landlord"
        );

        setLandlords(landlordUsers);
      }
    } catch (err) {
      console.error("Error fetching landlords:", err);
      toast.error("Could not load landlord list");
    } finally {
      setLoadingLandlords(false);
    }
  }, [token]);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("pageSize", pageSize);

      if (searchTerm) params.append("city", searchTerm);
      if (filterStatus !== "All") params.append("status", filterStatus);
      if (filterRoomType !== "All") params.append("roomType", filterRoomType);
      if (minPrice) params.append("minPrice", parseInt(minPrice, 10));
      if (maxPrice) params.append("maxPrice", parseInt(maxPrice, 10));
      if (bedrooms) params.append("totalBedrooms", parseInt(bedrooms, 10));
      if (bathrooms) params.append("totalWashrooms", parseInt(bathrooms, 10));
      if (kitchens) params.append("totalKitchens", parseInt(kitchens, 10));

      const endpoint = selectedLandlordId
        ? `/Properties/Landlord/${selectedLandlordId}`
        : `/Properties`;
      const urlWithParams = `${endpoint}?${params.toString()}`;

      console.log("Fetching with URL:", urlWithParams);

      const [propertiesResponse, imagesResponse] = await Promise.all([
        ApiHandler.get(urlWithParams, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        ApiHandler.get("/PropertyImages", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      console.log("API Response:", propertiesResponse);

      let propertyData = [];
      let totalPagesCount = 1;

      if (selectedLandlordId && Array.isArray(propertiesResponse)) {
        propertyData = propertiesResponse;
      } else if (
        propertiesResponse?.items &&
        typeof propertiesResponse.totalPages === "number"
      ) {
        propertyData = propertiesResponse.items;
        totalPagesCount = propertiesResponse.totalPages;
      } else if (Array.isArray(propertiesResponse)) {
        propertyData = propertiesResponse;
      } else {
        setProperties([]);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      // Apply filters client-side
      propertyData = applyFilters(propertyData);
      setAllProperties(propertyData); // Store all filtered properties

      // Calculate total pages based on allProperties
      totalPagesCount = Math.ceil(propertyData.length / pageSize);

      // Calculate start and end index for pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProperties = propertyData.slice(startIndex, endIndex);

      // Process images
      const imageMap = {};
      const urls = {};
      const initialIndices = {};

      if (imagesResponse?.length > 0) {
        imagesResponse.forEach((img) => {
          const propertyId = img.propertyId;
          if (!imageMap[propertyId]) {
            imageMap[propertyId] = [];
            initialIndices[propertyId] = 0;
          }
          imageMap[propertyId].push(img);
        });

        paginatedProperties.forEach((property) => {
          const propertyId = property.propertyId;
          const propertyImages = imageMap[propertyId] || [];

          if (propertyImages.length > 0) {
            property.images = propertyImages.map((img) => img.imageUrl); // Store all image URLs
            const firstImage = propertyImages[0];
            if (firstImage?.imageUrl) {
              urls[propertyId] = firstImage.imageUrl.startsWith("http")
                ? firstImage.imageUrl.includes("cloudinary.com")
                  ? firstImage.imageUrl.replace(
                      "/upload/",
                      "/upload/q_auto,f_auto,w_600/"
                    )
                  : firstImage.imageUrl
                : firstImage.imageUrl.startsWith("data:image")
                ? firstImage.imageUrl
                : null;
            }
          } else {
            property.images = []; // Ensure each property has an images array
          }
        });
      }

      setProperties(paginatedProperties);
      setPropertyImages(imageMap);
      setObjectUrls(urls);
      setCurrentImageIndices(initialIndices);
      setTotalPages(totalPagesCount);

      if (paginatedProperties.length > 0) {
        const landlordIds = [
          ...new Set(
            paginatedProperties
              .filter((p) => p?.landlordId)
              .map((p) => p.landlordId)
          ),
        ];
        if (landlordIds.length > 0) {
          fetchLandlordInfo(landlordIds);
        }
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError("Failed to load properties. Please try again.");
      toast.error("Could not load properties.");
      setProperties([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    currentPage,
    pageSize,
    searchTerm,
    filterStatus,
    filterRoomType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    kitchens,
    selectedLandlordId,
    fetchLandlordInfo,
  ]);

  const applyFilters = useCallback(
    (properties) => {
      let filtered = [...properties];

      if (searchTerm) {
        filtered = filtered.filter((property) => property.city === searchTerm);
      }
      if (filterRoomType !== "All") {
        filtered = filtered.filter(
          (property) => property.roomType === filterRoomType
        );
      }
      if (filterStatus !== "All") {
        filtered = filtered.filter(
          (property) => property.status === filterStatus
        );
      }
      if (minPrice) {
        filtered = filtered.filter(
          (property) => parseInt(property.price) >= parseInt(minPrice, 10)
        );
      }
      if (maxPrice) {
        filtered = filtered.filter(
          (property) => parseInt(property.price) <= parseInt(maxPrice, 10)
        );
      }
      if (bedrooms) {
        filtered = filtered.filter(
          (property) => property.totalBedrooms >= parseInt(bedrooms, 10)
        );
      }
      if (bathrooms) {
        filtered = filtered.filter(
          (property) => property.totalWashrooms >= parseInt(bathrooms, 10)
        );
      }
      if (kitchens) {
        filtered = filtered.filter(
          (property) => property.totalKitchens >= parseInt(kitchens, 10)
        );
      }

      return filtered;
    },
    [
      searchTerm,
      filterStatus,
      filterRoomType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      kitchens,
    ]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm ||
      filterStatus !== "All" ||
      filterRoomType !== "All" ||
      minPrice ||
      maxPrice ||
      bedrooms ||
      bathrooms ||
      kitchens ||
      selectedLandlordId
    );
  }, [
    searchTerm,
    filterStatus,
    filterRoomType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    kitchens,
    selectedLandlordId,
  ]);

  // Handle property deletion
  const handleDeleteProperty = async (propertyId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this property? This action cannot be undone."
      )
    ) {
      try {
        setLoading(true);
        await ApiHandler.delete(`/Properties/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        toast.success("Property deleted successfully");
        setProperties((prevProperties) =>
          prevProperties.filter((p) => p.propertyId !== propertyId)
        );

        if (properties.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (err) {
        console.error("Error deleting property:", err);
        toast.error("Failed to delete property");
      } finally {
        setLoading(false);
      }
    }
  };

  // Image URL processing
  const processImageUrl = useCallback((url) => {
    if (!url) return null;
    if (url.startsWith("http")) {
      return url.includes("cloudinary.com")
        ? url.replace("/upload/", "/upload/q_auto,f_auto,w_600/")
        : url;
    }
    return url.startsWith("data:image") ? url : null;
  }, []);

  // Image navigation functions
  const goToNextImage = (propertyId, e) => {
    e.stopPropagation();
    e.preventDefault();

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    const currentIdx = currentImageIndices[propertyId] || 0;
    const nextIdx = (currentIdx + 1) % images.length;

    setCurrentImageIndices((prev) => ({ ...prev, [propertyId]: nextIdx }));
    setObjectUrls((prev) => ({
      ...prev,
      [propertyId]: processImageUrl(images[nextIdx].imageUrl),
    }));
  };

  const goToPrevImage = (propertyId, e) => {
    e.stopPropagation();
    e.preventDefault();

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    const currentIdx = currentImageIndices[propertyId] || 0;
    const prevIdx = (currentIdx - 1 + images.length) % images.length;

    setCurrentImageIndices((prev) => ({ ...prev, [propertyId]: prevIdx }));
    setObjectUrls((prev) => ({
      ...prev,
      [propertyId]: processImageUrl(images[prevIdx].imageUrl),
    }));
  };

  // Helper function for status badge styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800";
      case "Rented":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Unavailable":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Reset all filters - updated to include kitchens
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("All");
    setFilterRoomType("All");
    setSelectedLandlordId("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setKitchens("");
    setCurrentPage(1);

    fetchProperties();
  };

  // Image Slider Component
  const ImageSlider = ({ images, propertyId }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = (e) => {
      e.stopPropagation();
      setCurrentImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    };

    const prevImage = (e) => {
      e.stopPropagation();
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
    };

    return (
      <div className="relative">
        {images && images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={`Property ${propertyId} - Image ${currentImageIndex + 1}`}
            className="w-full h-64 object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 rounded-md flex items-center justify-center">
            <FaInfoCircle className="text-gray-400 text-4xl" />
          </div>
        )}

        {images?.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
            >
              <FaChevronRight />
            </button>
          </>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading && !properties.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-lg shadow-md">
        <FaSpinner className="animate-spin text-blue-500 text-4xl mb-4" />
        <p className="text-gray-600">Loading properties...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 my-4 shadow-sm">
        <p className="flex items-center text-lg font-medium mb-2">
          <FaInfoCircle className="mr-2" /> Error
        </p>
        <p className="mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm flex items-center"
          onClick={fetchProperties}
        >
          <FaSpinner className="mr-2" /> Try Again
        </button>
      </div>
    );
  }

  // Main component render
  return (
    <div
      className={`p-6 bg-gray-50 min-h-screen transition-opacity duration-500 ${
        isPageLoaded ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md flex justify-between items-center">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <FaBuilding className="mr-2" /> Property Management
          </h1>
          <p className="text-blue-100">Manage all properties in the system</p>
        </div>

        {/* Top Right Filters and Landlord Selection */}
        <div className="flex items-center space-x-4">
          {/* Landlord Filter */}
          <div className="relative">
            <select
              className="block appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded leading-tight focus:outline-none focus:border-blue-500"
              value={selectedLandlordId}
              onChange={(e) => {
                setSelectedLandlordId(e.target.value);
                setCurrentPage(1);
                fetchProperties();
              }}
              disabled={loadingLandlords}
            >
              <option value="">All Landlords</option>
              {landlords.map((landlord) => (
                <option key={landlord.userId} value={landlord.userId}>
                  {landlord.firstName} {landlord.lastName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="relative inline-flex items-center justify-center px-4 py-2  text-gray-700 rounded-md bg-white border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 transition-colors duration-200"
          >
            <FaFilter className="mr-2" />
            {isFilterVisible ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>

      {/* Property Filter Panel - Only shown when isFilterVisible is true */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isFilterVisible ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <PropertyFilterPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterRoomType={filterRoomType}
          setFilterRoomType={setFilterRoomType}
          handleResetFilters={handleResetFilters}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          bedrooms={bedrooms}
          setBedrooms={setBedrooms}
          bathrooms={bathrooms}
          setBathrooms={setBathrooms}
          kitchens={kitchens}
          setKitchens={setKitchens}
          token={token}
          isLoading={loading}
          onApplyFilters={handleApplyFilters}
        />
      </div>

      {/* Active filters summary - Always visible when filters are applied */}
      {hasActiveFilters && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-wrap gap-2">
          <div className="w-full mb-2 flex items-center">
            <FaFilter className="text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Active Filters:</span>
          </div>

          {searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Location: {searchTerm}
              <button
                className="ml-1 text-blue-500 hover:text-blue-700"
                onClick={() => {
                  setSearchTerm("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {filterStatus !== "All" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Status: {filterStatus}
              <button
                className="ml-1 text-green-500 hover:text-green-700"
                onClick={() => {
                  setFilterStatus("All");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {filterRoomType !== "All" && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Type: {filterRoomType}
              <button
                className="ml-1 text-purple-500 hover:text-purple-700"
                onClick={() => {
                  setFilterRoomType("All");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {minPrice && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Min Price: {minPrice}
              <button
                className="ml-1 text-orange-500 hover:text-orange-700"
                onClick={() => {
                  setMinPrice("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {maxPrice && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              Max Price: {maxPrice}
              <button
                className="ml-1 text-orange-500 hover:text-orange-700"
                onClick={() => {
                  setMaxPrice("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {bedrooms && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              Bedrooms: {bedrooms}
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => {
                  setBedrooms("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {bathrooms && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              Bathrooms: {bathrooms}
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => {
                  setBathrooms("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          {kitchens && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              Kitchens: {kitchens}
              <button
                className="ml-1 text-indigo-500 hover:text-indigo-700"
                onClick={() => {
                  setKitchens("");
                  fetchProperties();
                }}
              >
                <FaTimes size={10} />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      <div className="transition-all duration-300">
        <PropertyListAdmin
          properties={properties}
          propertyImages={propertyImages}
          objectUrls={objectUrls}
          currentImageIndices={currentImageIndices}
          landlordInfo={landlordInfo}
          getStatusBadgeStyle={getStatusBadgeStyle}
          handleDeleteProperty={handleDeleteProperty}
          handleResetFilters={handleResetFilters}
          goToPrevImage={goToPrevImage}
          goToNextImage={goToNextImage}
        />
      </div>

      {allProperties.length > pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      )}
    </div>
  );
};

export default Properties;
