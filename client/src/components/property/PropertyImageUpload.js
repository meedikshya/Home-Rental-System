import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import imageCompression from "browser-image-compression";
import ApiHandler from "../../api/ApiHandler.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { FaImages, FaUpload, FaTrash, FaCheck } from "react-icons/fa";

const PropertyImageUpload = ({ propertyId }) => {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addValidImages(selectedFiles);
  };

  const addValidImages = (files) => {
    const validImageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );
    if (validImageFiles.length === 0) {
      toast.error("Please select valid image files.");
      return;
    }

    if (files.length !== validImageFiles.length) {
      toast.warning("Some files were skipped because they weren't images.");
    }

    setImages((prevImages) => [...prevImages, ...validImageFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    addValidImages(files);
  };

  const handleRemoveImage = (index) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  // IMPROVED: Function to compress and upload an image with better base64 handling
  const uploadImage = async (image) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Get image format - this will help ensure proper base64 markers
        const imageFormat = image.type.split("/")[1];
        console.log(`Image format: ${imageFormat}`);

        // Compression Options
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(image, options);

        // Convert compressed image to Base64
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);

        reader.onload = async () => {
          try {
            // Get the full base64 data URL
            const fullDataUrl = reader.result;

            // Extract just the base64 portion (without the data:image/xxx;base64, prefix)
            const base64Image = fullDataUrl.split(",")[1];

            // Add a format marker at the beginning for easier identification later
            let formattedBase64;

            if (imageFormat === "jpeg" || imageFormat === "jpg") {
              // Add JPEG file marker - ensures correct identification
              formattedBase64 = base64Image;
              console.log("Uploading JPEG image");
            } else if (imageFormat === "png") {
              // Add PNG file marker - ensures correct identification
              formattedBase64 = base64Image;
              console.log("Uploading PNG image");
            } else {
              // Default to standard base64
              formattedBase64 = base64Image;
              console.log(`Uploading ${imageFormat} image`);
            }

            const imageData = {
              propertyId: parseInt(propertyId),
              imageUrl: fullDataUrl,
              imageFormat: imageFormat, // Store format for reference
            };

            const token = await FIREBASE_AUTH.currentUser.getIdToken();
            const response = await ApiHandler.post(
              "/PropertyImages",
              imageData,
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            console.log("Image upload successful:", response);
            resolve(response);
          } catch (error) {
            console.error("Upload processing error:", error);
            reject(error);
          }
        };

        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(error);
        };
      } catch (error) {
        console.error("Image compression error:", error);
        reject(error);
      }
    });
  };

  const handleSubmitImages = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error("Please select at least one image.");
      return;
    }

    if (!propertyId) {
      toast.error("Property ID is missing.");
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Show progress toast
      const progressToast = toast.info(`Uploading images: 0/${images.length}`, {
        autoClose: false,
      });

      // Upload each image
      for (let i = 0; i < images.length; i++) {
        try {
          await uploadImage(images[i]);
          successCount++;

          // Update progress toast
          toast.update(progressToast, {
            render: `Uploading images: ${i + 1}/${images.length}`,
          });
        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
          failCount++;
        }
      }

      // Close progress toast
      toast.dismiss(progressToast);

      // Show final result toast
      if (successCount > 0) {
        toast.success(
          `Successfully uploaded ${successCount} image${
            successCount !== 1 ? "s" : ""
          }.`
        );
        setImages([]);

        if (failCount === 0) {
          navigate("/dashboard/property");
        }
      }

      if (failCount > 0) {
        toast.error(
          `Failed to upload ${failCount} image${failCount !== 1 ? "s" : ""}.`
        );
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload images. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center">
        <FaImages className="mr-2" />
        Upload Property Images
      </h2>

      <form onSubmit={handleSubmitImages} className="space-y-6">
        <div
          className={`border-2 border-dashed ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-blue-300"
          } rounded-lg p-8 text-center transition-colors duration-300`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label className="block cursor-pointer">
            <FaUpload className="mx-auto text-4xl text-blue-500 mb-4" />
            <span className="text-gray-600">
              Click to select or drag and drop your images
            </span>
            <input
              type="file"
              name="imageUrl"
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
              multiple
            />
          </label>
        </div>

        {images.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-500">
                Preview ({images.length} images)
              </h3>
              <button
                type="button"
                onClick={() => setImages([])}
                className="text-red-500 hover:text-red-700"
              >
                Remove All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs rounded px-2 py-1">
                    Format: {image.type.split("/")[1]}
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg flex items-center"
          disabled={uploading}
        >
          <FaCheck className="mr-2" />
          {uploading ? "Uploading..." : "Upload Images"}
        </button>
      </form>
    </div>
  );
};

export default PropertyImageUpload;
