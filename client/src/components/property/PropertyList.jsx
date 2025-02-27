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
} from "react-icons/fa";

const PropertyList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [failedImages, setFailedImages] = useState({}); // Add state to track failed images
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Get landlord ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      FIREBASE_AUTH,
      async (currentUser) => {
        if (currentUser) {
          const userId = await getUserDataFromFirebase();
          if (userId) {
            setLandlordId(userId);
            console.log("Landlord ID in property listings:", userId);
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

  // Fetch properties when landlordId is available
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

        // After getting properties, fetch their images
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
        console.log("Total images received:", imageResponse.length);

        // Create a map of propertyId -> images
        const imageMap = {};

        // Group images by propertyId
        imageResponse.forEach((img) => {
          if (!imageMap[img.propertyId]) {
            imageMap[img.propertyId] = [];
          }
          imageMap[img.propertyId].push(img);
        });

        console.log("Properties with images:", Object.keys(imageMap).length);
        setPropertyImages(imageMap);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
      // We don't set an error state here as images are not critical
    }
  };

  const getPropertyImage = (propertyId) => {
    // Skip if we already know this image fails
    if (failedImages[propertyId]) {
      return null;
    }

    if (propertyImages[propertyId] && propertyImages[propertyId].length > 0) {
      const imageUrl = propertyImages[propertyId][0].imageUrl;

      // If imageUrl is null or undefined, return null
      if (!imageUrl) {
        return null;
      }

      try {
        // If the imageUrl already is a full URL (HTTP/HTTPS), return it as is
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return imageUrl;
        }

        // If it already has a data:image prefix, return it
        if (imageUrl.startsWith("data:image")) {
          return imageUrl;
        }

        // Check if the image is already base64 encoded with proper formatting
        if (
          imageUrl.startsWith("/9j/") ||
          imageUrl.startsWith("iVBOR") ||
          imageUrl.startsWith("PHN2") ||
          imageUrl.startsWith("R0lGO")
        ) {
          return `data:image/jpeg;base64,${imageUrl}`;
        }

        // For images that might be double-encoded or have other formats
        return `data:image/jpeg;base64,${imageUrl}`;
      } catch (err) {
        console.error("Error processing image URL:", err);
        return null;
      }
    }
    return null;
  };

  // Handle property deletion
  const handleDeleteProperty = async (propertyId) => {
    if (window.confirm("Are you sure you want to delete this property?")) {
      try {
        const token = await FIREBASE_AUTH.currentUser.getIdToken(true);
        await ApiHandler.delete(`/Properties/${propertyId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Update the properties list after deletion
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

  // Navigate to add images page
  const handleAddImages = (propertyId) => {
    navigate(`/landlord/property/images/${propertyId}`);
  };

  if (loading && !properties.length) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <div
          key={property.propertyId}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          {/* Property image */}
          <div className="h-48 bg-gray-200 relative overflow-hidden">
            {getPropertyImage(property.propertyId) &&
            !failedImages[property.propertyId] ? (
              <img
                src={getPropertyImage(property.propertyId)}
                alt={property.title}
                className="w-full h-full object-cover"
                onError={() => {
                  console.error(
                    "Image failed to load for property:",
                    property.propertyId
                  );
                  // Mark this image as failed so we don't try to render it again
                  setFailedImages((prev) => ({
                    ...prev,
                    [property.propertyId]: true,
                  }));
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <FaHome className="text-gray-400 text-5xl" />
              </div>
            )}
            <button
              onClick={() => handleAddImages(property.propertyId)}
              className="absolute bottom-2 right-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors text-sm shadow-md"
            >
              {getPropertyImage(property.propertyId) &&
              !failedImages[property.propertyId]
                ? "Update Images"
                : "Add Images"}
            </button>
          </div>

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

            {/* Property features */}
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

            {/* Property status */}
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
                onClick={() => handleEditProperty(property.propertyId)}
              >
                <FaEdit className="mr-1" />
                <span>Edit</span>
              </button>
              <button
                className="flex items-center text-red-500 hover:text-red-700"
                onClick={() => handleDeleteProperty(property.propertyId)}
              >
                <FaTrash className="mr-1" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PropertyList;
