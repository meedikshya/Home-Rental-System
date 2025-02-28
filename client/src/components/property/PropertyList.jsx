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
  FaBug,
  FaImage,
} from "react-icons/fa";

const PropertyList = () => {
  const [landlordId, setLandlordId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [objectUrls, setObjectUrls] = useState({});
  const [failedImages, setFailedImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Only revoke blob URLs, not data URLs
  useEffect(() => {
    return () => {
      Object.values(objectUrls).forEach((url) => {
        if (url && typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [objectUrls]);

  // Check if a base64 string appears to be truncated
  const isBase64Truncated = (str) => {
    if (!str) return false;
    // Check for typical truncation signs
    if (str.length % 4 !== 0) return true;
    // Check for missing padding (should end with = or ==)
    const expectedPadding = (4 - (str.length % 4)) % 4;
    if (expectedPadding > 0) {
      // Should have '=' padding at the end
      return !str.endsWith("=".repeat(expectedPadding));
    }
    return false;
  };

  // Get user's landlord ID
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

  // Fetch properties
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
        console.log("Total images received:", imageResponse.length);

        const imageMap = {};

        imageResponse.forEach((img) => {
          if (!imageMap[img.propertyId]) {
            imageMap[img.propertyId] = [];
          }
          imageMap[img.propertyId].push(img);
        });

        console.log("Properties with images:", Object.keys(imageMap).length);
        setPropertyImages(imageMap);

        processImagesToObjectUrls(imageMap);
      }
    } catch (err) {
      console.error("Error fetching property images:", err);
    }
  };

  // Debug function for image issues
  const debugImages = () => {
    console.log("=== IMAGE DEBUG ===");
    console.log("Properties with images:", Object.keys(propertyImages).length);
    console.log("Failed images:", Object.keys(failedImages).length);

    // Log all images for inspection
    Object.entries(propertyImages).forEach(([propId, images]) => {
      if (images && images.length > 0) {
        const img = images[0];
        console.log(`Property ${propId} image:`, {
          format: img.imageFormat || "unknown",
          startsWithDataImage: img.imageUrl?.startsWith("data:image"),
          startsWithJPEG: img.imageUrl?.startsWith("/9j/"),
          startsWithPNG: img.imageUrl?.startsWith("iVBOR"),
          length: img.imageUrl?.length,
          urlPreview: img.imageUrl?.substring(0, 50) + "...",
        });
      }
    });

    // Try to automatically fix problematic images
    const fixedUrls = { ...objectUrls };
    let fixedCount = 0;

    // First try to fix existing failed images
    Object.keys(failedImages).forEach((propId) => {
      const images = propertyImages[propId];
      if (!images || !images.length) return;

      const img = images[0];
      const imgUrl = img.imageUrl;

      // Try to fix based on format
      if (imgUrl) {
        if (imgUrl.startsWith("data:image")) {
          // Already a data URL, but might be malformed - try fixing it
          const [mimePrefix, base64Data] = imgUrl.split(",");
          if (base64Data) {
            fixedUrls[propId] = `data:image/${
              img.imageFormat || "jpeg"
            };base64,${base64Data}`;
            fixedCount++;
          } else {
            // Last resort: use a placeholder
            fixedUrls[propId] = `https://picsum.photos/seed/${propId}/800/600`;
            fixedCount++;
          }
        } else if (imgUrl.startsWith("/9j/")) {
          // Raw JPEG base64 data
          fixedUrls[propId] = `data:image/jpeg;base64,${imgUrl}`;
          fixedCount++;
        } else if (imgUrl.includes("/9j/")) {
          // JPEG embedded in another string
          const startIdx = imgUrl.indexOf("/9j/");
          fixedUrls[propId] = `data:image/jpeg;base64,${imgUrl.substring(
            startIdx
          )}`;
          fixedCount++;
        } else {
          // Last resort: use a placeholder
          fixedUrls[propId] = `https://picsum.photos/seed/${propId}/800/600`;
          fixedCount++;
        }
      }
    });

    if (fixedCount > 0) {
      setObjectUrls(fixedUrls);
      setFailedImages({});
      toast.info(`Fixed ${fixedCount} problematic images`);
    } else {
      toast.info("No image issues to fix");
    }
  };

  // Process images to create valid URLs for display
  const processImagesToObjectUrls = (imageMap) => {
    const urls = {};
    const newFailedImages = {};

    Object.entries(imageMap).forEach(([propertyId, images]) => {
      if (images.length > 0) {
        const imageData = images[0];
        const imageString = imageData.imageUrl;
        const imageFormat = imageData.imageFormat || "jpeg";

        if (imageString) {
          try {
            // Case 1: Already a complete data URL (most common from updated uploader)
            if (imageString.startsWith("data:image")) {
              urls[propertyId] = imageString;
              console.log(`Property ${propertyId}: Using complete data URL`);
              return;
            }

            // Case 2: Web URL (http/https)
            if (imageString.startsWith("http")) {
              urls[propertyId] = imageString;
              console.log(`Property ${propertyId}: Using web URL`);
              return;
            }

            // Case 3: Raw JPEG base64 data starting with /9j/
            if (imageString.startsWith("/9j/")) {
              // Check if the base64 string is truncated
              if (isBase64Truncated(imageString)) {
                console.warn(`Property ${propertyId}: Truncated JPEG data`);
                urls[
                  propertyId
                ] = `https://picsum.photos/seed/${propertyId}/800/600`;
                newFailedImages[propertyId] = true;
                return;
              }

              urls[propertyId] = `data:image/jpeg;base64,${imageString}`;
              console.log(`Property ${propertyId}: Created JPEG URL`);
              return;
            }

            // Case 4: Raw PNG base64 data starting with iVBOR
            if (imageString.startsWith("iVBOR")) {
              urls[propertyId] = `data:image/png;base64,${imageString}`;
              console.log(`Property ${propertyId}: Created PNG URL`);
              return;
            }

            // Case 5: Base64 data embedded in another string
            if (imageString.includes("/9j/")) {
              const startIndex = imageString.indexOf("/9j/");
              const base64Data = imageString.substring(startIndex);

              if (isBase64Truncated(base64Data)) {
                console.warn(`Property ${propertyId}: Embedded truncated data`);
                urls[
                  propertyId
                ] = `https://picsum.photos/seed/${propertyId}/800/600`;
                newFailedImages[propertyId] = true;
                return;
              }

              urls[propertyId] = `data:image/jpeg;base64,${base64Data}`;
              console.log(
                `Property ${propertyId}: Extracted embedded JPEG data`
              );
              return;
            }

            // Case 6: Last resort with explicit format from metadata
            console.log(
              `Property ${propertyId}: Using format metadata (${imageFormat})`
            );
            urls[
              propertyId
            ] = `data:image/${imageFormat};base64,${imageString}`;
          } catch (err) {
            console.error(
              `Error processing image for property ${propertyId}:`,
              err
            );
            console.log(
              `Problematic data: ${imageString?.substring(0, 50)}...`
            );
            newFailedImages[propertyId] = true;
          }
        }
      }
    });

    setObjectUrls(urls);
    setFailedImages(newFailedImages);
  };

  // Property CRUD handlers
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

  const handleEditProperty = (propertyId) => {
    navigate(`/landlord/property/edit/${propertyId}`);
  };

  const handleAddImages = (propertyId) => {
    navigate(`/landlord/property/images/${propertyId}`);
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
      {/* Header with debug button */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Your Properties</h2>
        <div className="flex space-x-2">
          <button
            onClick={debugImages}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 flex items-center"
            title="Fix any problematic images"
          >
            <FaBug className="mr-1" /> Fix Images
          </button>
          <button
            onClick={() => navigate("/landlord/property/add")}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center"
          >
            <FaHome className="mr-1" /> Add Property
          </button>
        </div>
      </div>

      {/* Property grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => {
          const propertyId = property.propertyId;
          const imageUrl = objectUrls[propertyId];
          const hasValidImage = !!imageUrl && !failedImages[propertyId];
          const hasAnyImage = propertyImages[propertyId]?.length > 0;

          return (
            <div
              key={propertyId}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Property image section */}
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                {hasValidImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={imageUrl}
                      alt={property.title || "Property image"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => {
                        console.error(
                          `Image failed to load for property: ${propertyId}`
                        );
                        // Use a placeholder for failed images
                        setObjectUrls((prev) => ({
                          ...prev,
                          [propertyId]: `https://picsum.photos/seed/${propertyId}/800/600`,
                        }));
                        setFailedImages((prev) => ({
                          ...prev,
                          [propertyId]: true,
                        }));
                      }}
                    />

                    {/* Property ID badge */}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded">
                      ID: {propertyId}
                    </div>

                    {/* Image count badge if multiple images */}
                    {propertyImages[propertyId]?.length > 1 && (
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                        <FaImage className="mr-1" />
                        {propertyImages[propertyId].length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col">
                    <FaHome className="text-gray-400 text-5xl mb-2" />
                    <span className="text-gray-500 text-sm">
                      {hasAnyImage ? "Image failed to load" : "No images yet"}
                    </span>
                  </div>
                )}

                {/* Add/update images button */}
                <button
                  onClick={() => handleAddImages(propertyId)}
                  className="absolute bottom-2 right-2 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors text-sm shadow-md"
                >
                  {hasValidImage ? "Update Images" : "Add Images"}
                </button>
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
