import React, { useState, useEffect, useRef } from "react";
import {
  FaBed,
  FaBath,
  FaHome,
  FaTrash,
  FaMapMarkerAlt,
  FaUser,
  FaSpinner,
  FaUtensils,
  FaChevronLeft,
  FaChevronRight,
  FaImages,
} from "react-icons/fa";
import { Link } from "react-router-dom";

const PropertyListAdmin = ({
  properties,
  propertyImages,
  objectUrls,
  currentImageIndices,
  landlordInfo,
  getStatusBadgeStyle,
  handleDeleteProperty,
  handleResetFilters,
  goToPrevImage,
  goToNextImage,
}) => {
  // Track which images are loading
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const imageCache = useRef(new Set());

  // State to track current image index for each property
  const [activeImages, setActiveImages] = useState({});

  // Initialize loading states for all properties when the component mounts or properties change
  useEffect(() => {
    const newLoadingStates = {};
    const initialActiveImages = {};

    properties.forEach((property) => {
      const propertyId = property.propertyId;
      // If this image URL is already in our cache, don't mark it as loading
      const imageUrl = objectUrls[propertyId];
      newLoadingStates[propertyId] =
        imageUrl && !imageCache.current.has(imageUrl);
      initialActiveImages[propertyId] = 0; // Start with first image
    });

    setImageLoadingStates(newLoadingStates);
    setActiveImages(initialActiveImages);

    // Preload images
    properties.forEach((property) => {
      const propertyId = property.propertyId;
      const imageUrl = objectUrls[propertyId];

      if (imageUrl && !imageCache.current.has(imageUrl)) {
        const img = new Image();
        img.onload = () => {
          // Add to cache
          imageCache.current.add(imageUrl);
          // Update loading state
          setImageLoadingStates((prev) => ({
            ...prev,
            [propertyId]: false,
          }));
        };
        img.onerror = () => {
          setImageLoadingStates((prev) => ({
            ...prev,
            [propertyId]: false,
          }));
        };
        img.src = imageUrl;
      }
    });
  }, [properties, objectUrls]);

  // Navigate to the previous image
  const handlePrevImage = (propertyId, e) => {
    e.stopPropagation();
    e.preventDefault();

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    setActiveImages((prev) => ({
      ...prev,
      [propertyId]:
        prev[propertyId] > 0 ? prev[propertyId] - 1 : images.length - 1,
    }));
  };

  // Navigate to the next image
  const handleNextImage = (propertyId, e) => {
    e.stopPropagation();
    e.preventDefault();

    const images = propertyImages[propertyId] || [];
    if (images.length <= 1) return;

    setActiveImages((prev) => ({
      ...prev,
      [propertyId]:
        prev[propertyId] < images.length - 1 ? prev[propertyId] + 1 : 0,
    }));
  };

  // Go directly to a specific image
  const goToSpecificImage = (propertyId, index, e) => {
    e.stopPropagation();
    e.preventDefault();

    setActiveImages((prev) => ({
      ...prev,
      [propertyId]: index,
    }));
  };

  // Empty state - no properties
  if (properties.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-sm text-center">
        <FaHome className="text-blue-400 text-5xl mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-blue-700 mb-2">
          No Properties Found
        </h3>
        <p className="text-gray-600 mb-4">
          There are no properties matching your search criteria.
        </p>
        <button
          onClick={handleResetFilters}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition duration-200"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {properties.map((property) => {
        const propertyId = property.propertyId;
        const images = propertyImages[propertyId] || [];
        const hasMultipleImages = images.length > 1;
        const currentImageIndex = activeImages[propertyId] || 0;
        const currentImage = images[currentImageIndex];
        const landlord = landlordInfo[property.landlordId];

        return (
          <div
            key={propertyId}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
          >
            {/* Property image section with simple slider */}
            <div className="h-64 bg-gray-100 relative overflow-hidden group">
              {images.length > 0 ? (
                <div className="relative w-full h-full">
                  <img
                    src={currentImage?.imageUrl || ""}
                    alt={property.title || "Property image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Image navigation controls - only show if multiple images */}
                  {hasMultipleImages && (
                    <>
                      {/* Left arrow */}
                      <button
                        onClick={(e) => handlePrevImage(propertyId, e)}
                        className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <FaChevronLeft size={16} />
                      </button>

                      {/* Right arrow */}
                      <button
                        onClick={(e) => handleNextImage(propertyId, e)}
                        className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <FaChevronRight size={16} />
                      </button>

                      {/* Image indicators/dots */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) =>
                              goToSpecificImage(propertyId, index, e)
                            }
                            className={`w-2 h-2 rounded-full transition-transform duration-200 ${
                              currentImageIndex === index
                                ? "bg-white scale-125"
                                : "bg-white opacity-60 hover:opacity-80"
                            }`}
                            aria-label={`Image ${index + 1} of ${
                              images.length
                            }`}
                          />
                        ))}
                      </div>

                      {/* Image counter */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-md">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full flex-col">
                  <FaHome className="text-gray-400 text-4xl mb-2" />
                  <span className="text-gray-500 text-sm">
                    No images available
                  </span>
                </div>
              )}
            </div>

            {/* Property details */}
            <div className="p-5">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">
                  {property.title || "Untitled Property"}
                </h3>
                <span className="text-lg font-bold text-green-600">
                  ₹{property.price || "N/A"}
                </span>
              </div>

              <div className="flex items-center text-gray-500 mb-3">
                <FaMapMarkerAlt className="mr-1 text-sm" />
                <span className="line-clamp-1 text-sm">
                  {property.municipality || "Unknown"},{" "}
                  {property.city || "Unknown"}
                </span>
              </div>

              <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
                {property.description || "No description available"}
              </p>

              <div className="flex justify-between mb-4">
                <div className="flex items-center text-gray-700 text-sm">
                  <FaBed className="mr-1" />
                  <span>{property.totalBedrooms || 0} bed</span>
                </div>
                <div className="flex items-center text-gray-700 text-sm">
                  <FaBath className="mr-1" />
                  <span>{property.totalWashrooms || 0} bath</span>
                </div>
                <div className="flex items-center text-gray-700 text-sm">
                  <FaUtensils className="mr-1" />
                  <span>{property.totalKitchens || 0} kitchen</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                  {property.roomType || "Unknown"}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeStyle(
                    property.status
                  )}`}
                >
                  {property.status || "Unknown"}
                </span>
              </div>

              {/* Landlord info */}
              {landlord && (
                <div className="mb-3 text-xs text-gray-600 flex items-center">
                  <FaUser className="mr-1" />
                  <span>Landlord: {landlord.name}</span>
                </div>
              )}

              {/* Admin actions */}
              <div className="flex justify-between pt-2 border-t">
                <Link
                  to={`/admin/property/${propertyId}`}
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors"
                >
                  View Details
                </Link>
                <button
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors"
                  onClick={() => handleDeleteProperty(propertyId)}
                  title="Delete Property"
                >
                  <FaTrash size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PropertyListAdmin;
