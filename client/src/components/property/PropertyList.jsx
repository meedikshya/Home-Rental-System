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
} from "react-icons/fa";

const PropertyList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [objectUrls, setObjectUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Clean up blob URLs on component unmount
  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((url) => {
        if (url && typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [objectUrls]);

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

  // Fetch images for all properties
  const fetchPropertyImages = async (token) => {
    try {
      const imageResponse = await ApiHandler.get("/PropertyImages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (imageResponse && imageResponse.length > 0) {
        const imageMap = {};

        // Group images by property ID
        imageResponse.forEach((img) => {
          if (!imageMap[img.propertyId]) {
            imageMap[img.propertyId] = [];
          }
          imageMap[img.propertyId].push(img);
        });

        setPropertyImages(imageMap);
        processImages(imageMap);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
    }
  };

  // Convert base64 strings to proper image URLs
  const processImages = (imageMap) => {
    const urls = {};

    Object.entries(imageMap).forEach(([propertyId, images]) => {
      if (images.length > 0) {
        const imageData = images[0];
        const imageString = imageData.imageUrl;

        if (imageString) {
          // Already a complete data URL
          if (imageString.startsWith("data:image")) {
            urls[propertyId] = imageString;
          }
          // Web URL (http/https)
          else if (imageString.startsWith("http")) {
            urls[propertyId] = imageString;
          }
          // Base64 JPEG data
          else if (imageString.startsWith("/9j/")) {
            urls[propertyId] = `data:image/jpeg;base64,${imageString}`;
          }
          // Other base64 data
          else {
            urls[propertyId] = `data:image/jpeg;base64,${imageString}`;
          }
        }
      }
    });

    setObjectUrls(urls);
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

  // Navigate to edit property page
  const handleEditProperty = (propertyId) => {
    navigate(`/landlord/property/edit/${propertyId}`);
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
        <p className="text-gray-500">
          Click the "Add New Property" button to get started.
        </p>
      </div>
    );
  }

  // Main property list
  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Your Properties</h2>
        <button
          onClick={() => navigate("/landlord/property/add")}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center"
        >
          <FaHome className="mr-1" /> Add Property
        </button>
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

                    {/* Property ID badge */}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded">
                      ID: {propertyId}
                    </div>

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
