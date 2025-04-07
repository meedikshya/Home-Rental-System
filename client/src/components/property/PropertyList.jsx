import React, { useState, useEffect, useCallback, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import { toast } from "react-toastify";
import ApiHandler from "../../api/ApiHandler.js";
import PaginationControls from "../UI/PaginationControls.js";
import PropertyFilterPanel from "../admin/PropertyFilterPanel.js";

// Import the extracted components
import PropertyHeader from "./PropertyHeader.js";
import PropertyCard from "./PropertyCard.js";
import EditPropertyModal from "./EditPropertyModal.js";
import ImageSliderModal from "./ImageSliderModal.js";
import ActiveFilters from "./ActiveFilters.js";
import EmptyState from "./EmptyState.js";
// import ResultsCount from "./ResultCount.js";
import NoMatchingProperties from "./NoMatchingProperties.js";
import LoadingState from "./LoadingState.js";
import ErrorState from "./ErrorState.js";

const PropertyList = ({ onAddProperty }) => {
  const [landlordId, setLandlordId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [objectUrls, setObjectUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Image slider state
  const [isImageSliderOpen, setIsImageSliderOpen] = useState(false);
  const [currentPropertyImages, setCurrentPropertyImages] = useState([]);

  // Track which image is currently displayed for each property
  const [currentImageIndices, setCurrentImageIndices] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterRoomType, setFilterRoomType] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [kitchens, setKitchens] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [allProperties, setAllProperties] = useState([]);

  // Get user's landlord ID and token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          try {
            const userId = await getUserDataFromFirebase();
            if (userId) {
              setLandlordId(userId);
            } else {
              toast.error("Failed to fetch landlord ID.");
            }
            const idToken = await currentUser.getIdToken(true);
            setToken(idToken);
          } catch (error) {
            console.error("Error getting token or user data:", error);
          }
        } else {
          setLandlordId(null);
          setToken(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch properties when landlord ID is available
  useEffect(() => {
    const fetchProperties = async () => {
      if (!landlordId || !token) return;

      try {
        setLoading(true);
        setError(null);

        const response = await ApiHandler.get(
          `/Properties/Landlord/${landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response) {
          setAllProperties(response || []);
          setProperties(response || []);
          setTotalPages(Math.ceil(response.length / itemsPerPage));

          if (response.length > 0) {
            fetchPropertyImages(token);
          }
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError("Failed to fetch your properties. Please try again later.");
        toast.error("Could not load your properties.");
      } finally {
        setLoading(false);
      }
    };

    if (landlordId && token) {
      fetchProperties();
    }
  }, [landlordId, token, itemsPerPage]);

  // Optimized function to fetch and process images in one step
  const fetchPropertyImages = async (token) => {
    try {
      const imageResponse = await ApiHandler.get("/PropertyImages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (imageResponse && imageResponse.length > 0) {
        const imageMap = {};
        const urls = {};
        const initialIndices = {};

        // Group images by property ID and extract URLs in one pass
        imageResponse.forEach((img) => {
          const propertyId = img.propertyId;

          // Store all images for reference
          if (!imageMap[propertyId]) {
            imageMap[propertyId] = [];
            initialIndices[propertyId] = 0; // Initialize current index
          }
          imageMap[propertyId].push(img);
        });

        // Get first image URL for each property
        Object.keys(imageMap).forEach((propertyId) => {
          const firstImage = imageMap[propertyId][0];
          if (firstImage?.imageUrl) {
            if (firstImage.imageUrl.startsWith("http")) {
              // If it's a Cloudinary URL, optimize it
              if (firstImage.imageUrl.includes("cloudinary.com")) {
                urls[propertyId] = firstImage.imageUrl.replace(
                  "/upload/",
                  "/upload/q_auto,f_auto,w_600/"
                );
              } else {
                // Any other HTTP URL (keep as is)
                urls[propertyId] = firstImage.imageUrl;
              }
            } else if (firstImage.imageUrl.startsWith("data:image")) {
              // It's already a complete data URL
              urls[propertyId] = firstImage.imageUrl;
            }
          }
        });

        setPropertyImages(imageMap);
        setObjectUrls(urls);
        setCurrentImageIndices(initialIndices);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
    }
  };

  // Process image URL (helper function)
  const processImageUrl = (url) => {
    if (!url) return null;

    if (url.startsWith("http")) {
      if (url.includes("cloudinary.com")) {
        return url.replace("/upload/", "/upload/q_auto,f_auto,w_600/");
      }
      return url;
    } else if (url.startsWith("data:image")) {
      return url;
    }

    return null;
  };

  // Image navigation functions
  const goToNextImage = (propertyId, e) => {
    e.stopPropagation(); // Prevent opening the modal
    e.preventDefault(); // Prevent any default behavior

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    const currentIdx = currentImageIndices[propertyId] || 0;
    const nextIdx = (currentIdx + 1) % images.length;

    // Update current indices
    setCurrentImageIndices((prev) => ({
      ...prev,
      [propertyId]: nextIdx,
    }));

    // Update displayed image
    setObjectUrls((prev) => ({
      ...prev,
      [propertyId]: processImageUrl(images[nextIdx].imageUrl),
    }));
  };

  const goToPrevImage = (propertyId, e) => {
    e.stopPropagation(); // Prevent opening the modal
    e.preventDefault(); // Prevent any default behavior

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    const currentIdx = currentImageIndices[propertyId] || 0;
    const prevIdx = (currentIdx - 1 + images.length) % images.length;

    // Update current indices
    setCurrentImageIndices((prev) => ({
      ...prev,
      [propertyId]: prevIdx,
    }));

    // Update displayed image
    setObjectUrls((prev) => ({
      ...prev,
      [propertyId]: processImageUrl(images[prevIdx].imageUrl),
    }));
  };

  // Delete property handler
  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      try {
        const token = await FIREBASE_AUTH.currentUser.getIdToken(true);
        await ApiHandler.delete(`/Properties/${propertyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProperties(properties.filter((p) => p.propertyId !== propertyId));
        setAllProperties(
          allProperties.filter((p) => p.propertyId !== propertyId)
        );
        toast.success("Property deleted successfully");
      } catch (err) {
        console.error("Error deleting property:", err);
        toast.error("Could not delete property.");
      }
    }
  };

  // Open edit modal
  const handleEditProperty = (propertyId) => {
    const property = properties.find((p) => p.propertyId === propertyId);
    if (property) {
      setSelectedProperty(property);
      setCurrentStep(1);
      setIsModalOpen(true);
    }
  };

  // Close modal and reset state
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    // Refresh properties data after edit
    if (landlordId) {
      const refreshData = async () => {
        try {
          const token = await FIREBASE_AUTH.currentUser.getIdToken(true);
          const response = await ApiHandler.get(
            `/Properties/Landlord/${landlordId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response) {
            setAllProperties(response || []);
            applyFiltersToProperties(response);
            fetchPropertyImages(token);
          }
        } catch (err) {
          console.error("Error refreshing properties:", err);
        }
      };

      refreshData();
    }

    // Reset after animation
    setTimeout(() => {
      setSelectedProperty(null);
    }, 300);
  };

  // Handle step navigation
  const handleStepChange = (step) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step);
    }
  };

  // Open image slider with property images
  const handleOpenImageSlider = (propertyId) => {
    // Get images for this property
    const images = propertyImages[propertyId] || [];
    if (images.length > 0) {
      setCurrentPropertyImages(images);
      setIsImageSliderOpen(true);
    } else {
      toast.info("This property has no images to display.");
    }
  };

  // Close image slider
  const handleCloseImageSlider = () => {
    setIsImageSliderOpen(false);
    setCurrentPropertyImages([]);
  };

  // Reset filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter("All");
    setFilterRoomType("All");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setKitchens("");
    setCurrentPage(1);

    if (allProperties.length > 0) {
      setProperties(allProperties);
      setTotalPages(Math.ceil(allProperties.length / itemsPerPage));
    }
  }, [allProperties, itemsPerPage]);

  // Apply filters to properties
  const applyFiltersToProperties = useCallback(
    (propertiesToFilter = allProperties) => {
      if (!propertiesToFilter || propertiesToFilter.length === 0) return;

      // Apply all filters
      let filteredData = [...propertiesToFilter];

      // Apply search term filter (city or municipality or title)
      if (searchTerm) {
        filteredData = filteredData.filter(
          (property) =>
            property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.municipality
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            property.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply status filter
      if (statusFilter !== "All") {
        filteredData = filteredData.filter(
          (property) => property.status === statusFilter
        );
      }

      // Apply room type filter
      if (filterRoomType !== "All") {
        filteredData = filteredData.filter(
          (property) => property.roomType === filterRoomType
        );
      }

      // Apply price range filters
      if (minPrice) {
        filteredData = filteredData.filter(
          (property) => parseInt(property.price) >= parseInt(minPrice)
        );
      }
      if (maxPrice) {
        filteredData = filteredData.filter(
          (property) => parseInt(property.price) <= parseInt(maxPrice)
        );
      }

      // Apply room count filters
      if (bedrooms) {
        filteredData = filteredData.filter(
          (property) => property.totalBedrooms >= parseInt(bedrooms)
        );
      }
      if (bathrooms) {
        filteredData = filteredData.filter(
          (property) => property.totalWashrooms >= parseInt(bathrooms)
        );
      }
      if (kitchens) {
        filteredData = filteredData.filter(
          (property) => property.totalKitchens >= parseInt(kitchens)
        );
      }

      // Update properties with the filtered results
      setProperties(filteredData);

      // Update total pages
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage));

      // Reset to first page when filters change
      setCurrentPage(1);
    },
    [
      searchTerm,
      statusFilter,
      filterRoomType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      kitchens,
      allProperties,
      itemsPerPage,
    ]
  );

  // Handle apply filters button click
  const handleApplyFilters = useCallback(
    (filters) => {
      // Set all filter states based on the filters object
      if (filters.city !== undefined) setSearchTerm(filters.city);
      if (filters.status !== undefined)
        setStatusFilter(filters.status || "All");
      if (filters.roomType !== undefined)
        setFilterRoomType(filters.roomType || "All");
      if (filters.minPrice !== undefined) setMinPrice(filters.minPrice || "");
      if (filters.maxPrice !== undefined) setMaxPrice(filters.maxPrice || "");
      if (filters.bedrooms !== undefined) setBedrooms(filters.bedrooms || "");
      if (filters.bathrooms !== undefined)
        setBathrooms(filters.bathrooms || "");
      if (filters.kitchens !== undefined) setKitchens(filters.kitchens || "");

      // Apply filters manually since we're setting state values that won't be reflected immediately
      let filteredData = [...allProperties];

      if (filters.city) {
        filteredData = filteredData.filter(
          (property) =>
            property.city?.toLowerCase().includes(filters.city.toLowerCase()) ||
            property.municipality
              ?.toLowerCase()
              .includes(filters.city.toLowerCase()) ||
            property.title?.toLowerCase().includes(filters.city.toLowerCase())
        );
      }

      if (filters.status && filters.status !== "All") {
        filteredData = filteredData.filter(
          (property) => property.status === filters.status
        );
      }

      if (filters.roomType && filters.roomType !== "All") {
        filteredData = filteredData.filter(
          (property) => property.roomType === filters.roomType
        );
      }

      if (filters.minPrice) {
        filteredData = filteredData.filter(
          (property) => parseInt(property.price) >= parseInt(filters.minPrice)
        );
      }

      if (filters.maxPrice) {
        filteredData = filteredData.filter(
          (property) => parseInt(property.price) <= parseInt(filters.maxPrice)
        );
      }

      if (filters.bedrooms) {
        filteredData = filteredData.filter(
          (property) => property.totalBedrooms >= parseInt(filters.bedrooms)
        );
      }

      if (filters.bathrooms) {
        filteredData = filteredData.filter(
          (property) => property.totalWashrooms >= parseInt(filters.bathrooms)
        );
      }

      if (filters.kitchens) {
        filteredData = filteredData.filter(
          (property) => property.totalKitchens >= parseInt(filters.kitchens)
        );
      }

      setProperties(filteredData);
      setTotalPages(Math.ceil(filteredData.length / itemsPerPage));
      setCurrentPage(1);
    },
    [allProperties, itemsPerPage]
  );

  // Effect to apply filters when any filter changes
  useEffect(() => {
    if (allProperties.length > 0) {
      applyFiltersToProperties();
    }
  }, [
    searchTerm,
    statusFilter,
    filterRoomType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    kitchens,
    applyFiltersToProperties,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm ||
      statusFilter !== "All" ||
      filterRoomType !== "All" ||
      minPrice ||
      maxPrice ||
      bedrooms ||
      bathrooms ||
      kitchens
    );
  }, [
    searchTerm,
    statusFilter,
    filterRoomType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    kitchens,
  ]);

  // Get paginated properties
  const paginatedProperties = useMemo(() => {
    const indexOfLastProperty = currentPage * itemsPerPage;
    const indexOfFirstProperty = indexOfLastProperty - itemsPerPage;
    return properties.slice(indexOfFirstProperty, indexOfLastProperty);
  }, [properties, currentPage, itemsPerPage]);

  // Loading state
  if (loading && !properties.length) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Empty state
  if (!loading && !allProperties.length) {
    return <EmptyState onAddProperty={onAddProperty} />;
  }

  // Main property list
  return (
    <>
      {/* Modals */}
      <EditPropertyModal
        isModalOpen={isModalOpen}
        selectedProperty={selectedProperty}
        handleCloseModal={handleCloseModal}
        currentStep={currentStep}
        handleStepChange={handleStepChange}
        setCurrentStep={setCurrentStep}
        landlordId={landlordId}
      />

      <ImageSliderModal
        isOpen={isImageSliderOpen}
        onClose={handleCloseImageSlider}
        images={currentPropertyImages}
      />

      {/* Header */}
      <PropertyHeader
        onAddProperty={onAddProperty}
        isFilterVisible={isFilterVisible}
        setIsFilterVisible={setIsFilterVisible}
        propertyCount={allProperties.length}
      />

      {/* Filters */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isFilterVisible
            ? "max-h-[1000px] opacity-100 mb-6 transform translate-y-0"
            : "max-h-0 opacity-0 transform -translate-y-4"
        }`}
      >
        <PropertyFilterPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={statusFilter}
          setFilterStatus={setStatusFilter}
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

      {/* Active Filters */}
      <ActiveFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        filterRoomType={filterRoomType}
        setFilterRoomType={setFilterRoomType}
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
        handleResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Property Grid */}
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProperties.map((property) => {
            const propertyId = property.propertyId;
            const images = propertyImages[propertyId] || [];
            const hasMultipleImages = images.length > 1;
            const currentIdx = currentImageIndices[propertyId] || 0;
            const imageUrl =
              hasMultipleImages && images[currentIdx]?.imageUrl
                ? images[currentIdx].imageUrl
                : objectUrls[propertyId];

            return (
              <PropertyCard
                key={propertyId}
                property={property}
                imageUrl={imageUrl}
                images={images}
                hasMultipleImages={hasMultipleImages}
                currentIdx={currentIdx}
                goToPrevImage={goToPrevImage}
                goToNextImage={goToNextImage}
                handleOpenImageSlider={handleOpenImageSlider}
                handleEditProperty={handleEditProperty}
                handleDeleteProperty={handleDeleteProperty}
                processImageUrl={processImageUrl}
                setCurrentImageIndices={setCurrentImageIndices}
                setObjectUrls={setObjectUrls}
              />
            );
          })}
        </div>
      ) : hasActiveFilters ? (
        <NoMatchingProperties handleResetFilters={handleResetFilters} />
      ) : null}

      {/* Pagination */}
      {properties.length > itemsPerPage && (
        <div className="mt-8">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}
    </>
  );
};

export default PropertyList;
