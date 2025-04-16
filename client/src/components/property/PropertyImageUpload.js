import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import ApiHandler from "../../api/ApiHandler.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import {
  FaImages,
  FaUpload,
  FaTrash,
  FaCheck,
  FaSpinner,
} from "react-icons/fa";

// Cloudinary configuration
const CLOUD_NAME = "dz2wbpnd7";
const UPLOAD_PRESET = "Gharbhada";

const PropertyImageUpload = ({
  propertyId,
  onClose = null,
  setCurrentStep = null,
  onUploadComplete = null,
}) => {
  // States for images management
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // States for existing images
  const [existingImages, setExistingImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch existing property images when component loads
  useEffect(() => {
    if (propertyId) {
      fetchPropertyImages();
    }
  }, [propertyId]);

  // Fetch existing images for this property
  const fetchPropertyImages = async () => {
    try {
      setLoadingImages(true);
      const token = await FIREBASE_AUTH.currentUser.getIdToken();
      const response = await ApiHandler.get("/PropertyImages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Filter images for this property
      if (response && response.length > 0) {
        const propertyImages = response.filter(
          (img) => img.propertyId === parseInt(propertyId)
        );
        setExistingImages(propertyImages);
      }
    } catch (error) {
      console.error("Error fetching property images:", error);
      toast.error("Failed to load existing images.");
    } finally {
      setLoadingImages(false);
    }
  };

  // Image handling functions
  const handleImageChange = (e) => {
    addValidImages(Array.from(e.target.files));
  };

  const addValidImages = (files) => {
    const validImages = files.filter((file) => file.type.startsWith("image/"));
    if (validImages.length === 0) {
      toast.error("Please select valid image files.");
      return;
    }
    setImages((prev) => [...prev, ...validImages]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addValidImages(Array.from(e.dataTransfer.files));
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Delete an existing image
  const handleDeleteImage = async (imageId, imageUrl) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeleting(true);
      const token = await FIREBASE_AUTH.currentUser.getIdToken();
      await ApiHandler.delete(`/PropertyImages/${imageId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // If it's a Cloudinary image, also try to delete from Cloudinary
      if (imageUrl && imageUrl.includes("cloudinary.com")) {
        try {
          const urlParts = imageUrl.split("/");
          const filenameWithExtension = urlParts[urlParts.length - 1];
          const publicId = filenameWithExtension.split(".")[0];
          const folder = `properties/${propertyId}`;
          const fullPublicId = `${folder}/${publicId}`;
          console.log("Would delete from Cloudinary:", fullPublicId);
        } catch (err) {
          console.error("Error parsing Cloudinary URL:", err);
        }
      }

      // Update the UI
      setExistingImages(
        existingImages.filter((img) => img.propertyImageId !== imageId)
      );
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image.");
    } finally {
      setDeleting(false);
    }
  };

  // Upload image to Cloudinary with optimizations
  const uploadToCloudinary = async (image) => {
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        initialQuality: 0.8,
      };

      const compressedFile = await imageCompression(image, options);
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", `properties/${propertyId}`);
      formData.append("tags", `property_${propertyId},uploaded`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  };

  // Save Cloudinary image data to database
  const saveToDatabase = async (cloudinaryData) => {
    try {
      const token = await FIREBASE_AUTH.currentUser.getIdToken();
      return await ApiHandler.post(
        "/PropertyImages",
        {
          propertyId: parseInt(propertyId),
          imageUrl: cloudinaryData.secure_url,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Database save error:", error);
      throw error;
    }
  };

  const handleSubmitImages = async (e) => {
    e.preventDefault();
    if (images.length === 0)
      return toast.error("Please select at least one image.");

    if (!propertyId) {
      return toast.error(
        "Property ID is missing. Please save the property first."
      );
    }

    setUploading(true);
    const progressToast = toast.info(`Uploading ${images.length} images...`, {
      autoClose: false,
    });

    try {
      let successCount = 0;

      for (let i = 0; i < images.length; i++) {
        toast.update(progressToast, {
          render: `Uploading ${i + 1}/${images.length}`,
        });

        try {
          const cloudinaryData = await uploadToCloudinary(images[i]);
          const savedImage = await saveToDatabase(cloudinaryData);
          successCount++;

          // Add the newly uploaded image to existing images for immediate display
          if (savedImage) {
            setExistingImages((prev) => [...prev, savedImage]);
          }
        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
        }
      }

      toast.dismiss(progressToast);
      if (successCount > 0) {
        toast.success(`Uploaded ${successCount} of ${images.length} images.`);
        setImages([]);

        // If this was called from the wizard flow
        if (setCurrentStep) {
          setCurrentStep(3); // Move to next step if needed
        } else if (onClose) {
          onClose();
        }

        // Call onUploadComplete to close the modal automatically
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error("Failed to upload images. Please try again.");
      }
    } catch (error) {
      toast.dismiss(progressToast);
      toast.error(`Upload error: ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center">
        <FaImages className="mr-2" /> Property Images
      </h2>

      {/* Existing Images Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <FaImages className="mr-2" />
          Current Images{" "}
          {existingImages.length > 0 && `(${existingImages.length})`}
        </h3>

        {loadingImages ? (
          <div className="flex justify-center items-center py-8">
            <FaSpinner className="animate-spin text-blue-500 text-3xl" />
          </div>
        ) : existingImages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingImages.map((image) => (
              <div key={image.propertyImageId} className="relative group">
                <img
                  src={image.imageUrl}
                  alt="Property"
                  className="w-full h-48 object-cover rounded-lg shadow-md"
                />

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteImage(image.propertyImageId, image.imageUrl)
                    }
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaTrash />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <FaImages className="mx-auto text-gray-300 text-4xl mb-2" />
            <p className="text-gray-500">No images yet. Upload some below!</p>
          </div>
        )}
      </div>

      {/* Upload New Images Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center">
          <FaUpload className="mr-2" />
          Upload New Images
        </h3>

        <form onSubmit={handleSubmitImages} className="space-y-6">
          <div
            className={`border-2 border-dashed ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-blue-300"
            } rounded-lg p-8 text-center transition-colors duration-300`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <label className="block cursor-pointer">
              <FaUpload className="mx-auto text-4xl text-blue-500 mb-4" />
              <span className="text-gray-600">
                Click to select or drag and drop images
              </span>
              <input
                type="file"
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
                multiple
              />
            </label>
          </div>

          {images.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-blue-500">
                Preview ({images.length} new images)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {images.map((image, index) => {
                  const objectUrl = URL.createObjectURL(image);
                  return (
                    <div key={index} className="relative">
                      <img
                        src={objectUrl}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <FaTrash />
                      </button>
                      {/* Clean up object URL */}
                      {setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 flex items-center justify-center disabled:bg-blue-300"
            disabled={uploading || images.length === 0}
          >
            {uploading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" /> Upload Images
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PropertyImageUpload;
