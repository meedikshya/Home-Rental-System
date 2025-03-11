import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import { toast } from "react-toastify";
import ApiHandler from "../../api/ApiHandler.js";
import {
  FaBed,
  FaBath,
  FaHome,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaImage,
  FaTimes,
  FaCheck,
  FaImages,
  FaCheckCircle,
  FaArrowLeft,
} from "react-icons/fa";
import PropertyDetailsForm from "./PropertyDetailsForm.js";
import PropertyImageUpload from "./PropertyImageUpload.js";

const PropertyList = () => {
  const navigate = useNavigate();
  const [landlordId, setLandlordId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [objectUrls, setObjectUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Get user's landlord ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          const userId = await getUserDataFromFirebase();
          if (userId) {
            setLandlordId(userId);
          } else {
            toast.error("Failed to fetch landlord ID.");
          }
        } else {
          setLandlordId(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch properties when landlord ID is available
  useEffect(() => {
    const fetchProperties = async () => {
      if (!landlordId) return;

      try {
        setLoading(true);
        setError(null);

        const token = await FIREBASE_AUTH.currentUser.getIdToken(true);
        const response = await ApiHandler.get(
          `/Properties/Landlord/${landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setProperties(response || []);

        if (response && response.length > 0) {
          fetchPropertyImages(token);
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError("Failed to fetch your properties. Please try again later.");
        toast.error("Could not load your properties.");
      } finally {
        setLoading(false);
      }
    };

    if (landlordId) {
      fetchProperties();
    }
  }, [landlordId]);

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

        // Group images by property ID and extract URLs in one pass
        imageResponse.forEach((img) => {
          const propertyId = img.propertyId;

          // Store all images for reference (for counting etc.)
          if (!imageMap[propertyId]) {
            imageMap[propertyId] = [];
          }
          imageMap[propertyId].push(img);

          // Only store the first image URL for each property
          if (!urls[propertyId] && img.imageUrl) {
            if (img.imageUrl.startsWith("http")) {
              // If it's a Cloudinary URL, optimize it
              if (img.imageUrl.includes("cloudinary.com")) {
                urls[propertyId] = img.imageUrl.replace(
                  "/upload/",
                  "/upload/q_auto,f_auto,w_600/"
                );
              } else {
                // Any other HTTP URL (keep as is)
                urls[propertyId] = img.imageUrl;
              }
            } else if (img.imageUrl.startsWith("data:image")) {
              // It's already a complete data URL
              urls[propertyId] = img.imageUrl;
            }
          }
        });

        setPropertyImages(imageMap);
        setObjectUrls(urls);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
    }
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
            setProperties(response || []);
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

  // Loading state
  if (loading && !properties.length) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700">
        <p>{error}</p>
        <button
          className="mt-2 text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state
  if (!loading && !properties.length) {
    return (
      <div className="bg-blue-50 p-8 rounded-lg border border-blue-200 text-center">
        <FaHome className="text-blue-400 text-5xl mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-blue-700 mb-2">
          No Properties Yet
        </h3>
        <p className="text-blue-600 mb-4">
          You haven't added any properties to your listing.
        </p>
        <p className="text-gray-500 mb-4">
          Click the "Add Property" button to get started.
        </p>
      </div>
    );
  }

  // Main property list
  return (
    <>
      {/* Edit Property Modal */}
      {isModalOpen && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Edit Property: {selectedProperty.title}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center">
                  {/* Step 1 Indicator */}
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full cursor-pointer
                      ${currentStep >= 1 ? "bg-blue-500" : "bg-gray-300"}
                      transition-colors duration-300`}
                    onClick={() => handleStepChange(1)}
                  >
                    {currentStep > 1 ? (
                      <FaCheck className="text-white text-xl" />
                    ) : (
                      <FaHome className="text-white text-xl" />
                    )}
                  </div>

                  {/* Connector */}
                  <div
                    className={`h-1 w-32 mx-2 ${
                      currentStep > 1 ? "bg-blue-500" : "bg-gray-300"
                    } transition-colors duration-300`}
                  />

                  {/* Step 2 Indicator */}
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full cursor-pointer
                      ${currentStep >= 2 ? "bg-blue-500" : "bg-gray-300"}
                      transition-colors duration-300`}
                    onClick={() => currentStep > 1 && handleStepChange(2)}
                  >
                    {currentStep > 2 ? (
                      <FaCheck className="text-white text-xl" />
                    ) : (
                      <FaImages className="text-white text-xl" />
                    )}
                  </div>

                  {/* Connector */}
                  <div
                    className={`h-1 w-32 mx-2 ${
                      currentStep > 2 ? "bg-blue-500" : "bg-gray-300"
                    } transition-colors duration-300`}
                  />

                  {/* Step 3 Indicator */}
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full
                      ${currentStep === 3 ? "bg-blue-500" : "bg-gray-300"}
                      transition-colors duration-300`}
                  >
                    <FaCheckCircle className="text-white text-xl" />
                  </div>
                </div>
              </div>

              {/* Step Labels */}
              <div className="flex justify-center text-sm">
                <div
                  className={`text-center mx-8 ${
                    currentStep >= 1
                      ? "text-blue-600 font-medium"
                      : "text-gray-500"
                  } transition-colors duration-300`}
                >
                  Edit Details
                </div>
                <div
                  className={`text-center mx-8 ${
                    currentStep >= 2
                      ? "text-blue-600 font-medium"
                      : "text-gray-500"
                  } transition-colors duration-300`}
                >
                  Manage Images
                </div>
                <div
                  className={`text-center mx-8 ${
                    currentStep === 3
                      ? "text-blue-600 font-medium"
                      : "text-gray-500"
                  } transition-colors duration-300`}
                >
                  Finish
                </div>
              </div>
            </div>

            {/* Content based on current step */}
            <div className="p-4 overflow-y-auto">
              {currentStep === 1 && (
                <PropertyDetailsForm
                  initialData={selectedProperty}
                  propertyId={parseInt(selectedProperty.propertyId)}
                  landlordId={landlordId}
                  setCurrentStep={setCurrentStep}
                  mode="edit"
                />
              )}

              {currentStep === 2 && (
                <PropertyImageUpload
                  propertyId={parseInt(selectedProperty.propertyId)}
                  setCurrentStep={setCurrentStep}
                  onClose={null}
                />
              )}

              {currentStep === 3 && (
                <div className="text-center py-10 bg-white rounded-lg">
                  <div className="bg-green-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
                    <FaCheckCircle className="text-green-600 text-4xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-600 mb-4">
                    Success!
                  </h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your property has been updated successfully. All details and
                    images have been saved.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleCloseModal}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Your Properties</h2>
      </div>

      {/* Property grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => {
          const propertyId = property.propertyId;
          const imageUrl = objectUrls[propertyId];
          const hasMultipleImages = propertyImages[propertyId]?.length > 1;

          return (
            <div
              key={propertyId}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Property image section */}
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                {imageUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={imageUrl}
                      alt={property.title || "Property image"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Image count badge if multiple images */}
                    {hasMultipleImages && (
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                        <FaImage className="mr-1" />
                        {propertyImages[propertyId].length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col">
                    <FaHome className="text-gray-400 text-5xl mb-2" />
                    <span className="text-gray-500 text-sm">No image</span>
                  </div>
                )}
              </div>

              {/* Property details */}
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {property.title}
                  </h3>
                  <span className="text-lg font-bold text-green-600">
                    ₹{property.price}
                  </span>
                </div>

                <div className="flex items-center text-gray-500 mb-3">
                  <FaMapMarkerAlt className="mr-1" />
                  <span>
                    {property.municipality}, {property.city}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {property.description}
                </p>

                <div className="flex justify-between mb-4">
                  <div className="flex items-center text-gray-700">
                    <FaBed className="mr-1" />
                    <span>{property.totalBedrooms} bed</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <FaBath className="mr-1" />
                    <span>{property.totalWashrooms} bath</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                      {property.roomType}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      property.status === "Available"
                        ? "bg-green-100 text-green-800"
                        : property.status === "Rented"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {property.status}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex justify-between pt-2 border-t">
                  <button
                    className="flex items-center text-blue-500 hover:text-blue-700"
                    onClick={() => handleEditProperty(propertyId)}
                  >
                    <FaEdit className="mr-1" />
                    <span>Edit</span>
                  </button>
                  <button
                    className="flex items-center text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteProperty(propertyId)}
                  >
                    <FaTrash className="mr-1" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PropertyList;
