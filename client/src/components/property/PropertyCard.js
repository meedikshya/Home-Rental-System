import React from "react";
import {
  FaBed,
  FaBath,
  FaMapMarkerAlt,
  FaHome,
  FaEdit,
  FaTrash,
  FaExpand,
  FaChevronLeft,
  FaChevronRight,
  FaImages,
  FaUtensils,
} from "react-icons/fa";

const PropertyCard = ({
  property,
  imageUrl,
  images,
  hasMultipleImages,
  currentIdx,
  goToPrevImage,
  goToNextImage,
  handleOpenImageSlider,
  handleEditProperty,
  handleDeleteProperty,
  processImageUrl,
  setCurrentImageIndices,
  setObjectUrls,
}) => {
  const propertyId = property.propertyId;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100 transform ">
      {/* Property image section with slider controls */}
      <div className="h-56 bg-gray-100 relative overflow-hidden group">
        {imageUrl ? (
          <div className="relative w-full h-full">
            <img
              src={imageUrl}
              alt={property.title || "Property image"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Image slider navigation arrows - only show if multiple images */}
            {hasMultipleImages && (
              <>
                {/* Left arrow */}
                <button
                  onClick={(e) => goToPrevImage(propertyId, e)}
                  className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <FaChevronLeft size={16} />
                </button>

                {/* Right arrow */}
                <button
                  onClick={(e) => goToNextImage(propertyId, e)}
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <FaChevronRight size={16} />
                </button>
              </>
            )}

            {/* Image count indicator */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();

                      setCurrentImageIndices((prev) => ({
                        ...prev,
                        [propertyId]: index,
                      }));

                      // Update displayed image
                      setObjectUrls((prev) => ({
                        ...prev,
                        [propertyId]: processImageUrl(images[index].imageUrl),
                      }));
                    }}
                    className={`w-2 h-2 rounded-full transition-transform duration-200 ${
                      currentIdx === index
                        ? "bg-white scale-125"
                        : "bg-white opacity-60 hover:opacity-80"
                    }`}
                    aria-label={`Image ${index + 1} of ${images.length}`}
                  />
                ))}
              </div>
            )}

            {/* Overlay gradient for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full flex-col">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <FaHome className="text-gray-400 text-2xl" />
            </div>
            <span className="text-gray-500 text-sm">No image available</span>
          </div>
        )}

        {/* View all images overlay button */}
        {hasMultipleImages && (
          <div
            onClick={() => handleOpenImageSlider(propertyId)}
            className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full cursor-pointer transition opacity-0 group-hover:opacity-100"
          >
            <FaImages size={14} />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full shadow-sm ${
              property.status === "Available"
                ? "bg-green-500 text-white"
                : property.status === "Rented"
                ? "bg-red-500 text-white"
                : "bg-yellow-500 text-white"
            }`}
          >
            {property.status}
          </span>
        </div>
      </div>

      {/* Property details */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-800 truncate flex-1">
            {property.title}
          </h3>
          <span className="text-lg font-bold text-[#20319D] whitespace-nowrap ml-2">
            ₹{property.price}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <div className="flex items-center">
            <FaMapMarkerAlt className="mr-1 text-[#20319D]" />
            <span>
              {property.municipality}, {property.city}
            </span>
          </div>
          {/* Property Type Badge - New placement */}
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
            <FaHome className="mr-1" /> {property.roomType}
          </span>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2 h-12">
          {property.description}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-center mb-1">
              <FaBed className="text-[#20319D]" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {property.totalBedrooms} bed
            </span>
          </div>

          <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-center mb-1">
              <FaBath className="text-[#20319D]" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {property.totalWashrooms} bath
            </span>
          </div>

          {/* Changed from property type to kitchens */}
          <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-center mb-1">
              <FaUtensils className="text-[#20319D]" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {property.totalKitchens || 0} kitchen
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-3">
          <button
            className="flex items-center justify-center px-4 py-2 text-[#20319D] bg-[#20319D]/10 hover:bg-[#20319D]/20 rounded-lg transition-colors"
            onClick={() => handleEditProperty(propertyId)}
          >
            <FaEdit className="mr-2" />
            <span>Edit</span>
          </button>
          <button
            className="flex items-center justify-center px-4 py-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            onClick={() => handleDeleteProperty(propertyId)}
          >
            <FaTrash className="mr-2" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
