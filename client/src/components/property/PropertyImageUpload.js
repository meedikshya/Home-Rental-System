import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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
    const validImageFiles = files.filter(
      (file) => file && file.type.startsWith("image/")
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

  const uploadImage = async (image) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(image);

      reader.onload = async () => {
        try {
          const base64Image = reader.result.split(",")[1];
          const imageData = {
            propertyId: parseInt(propertyId),
            imageUrl: base64Image,
          };

          const token = await FIREBASE_AUTH.currentUser.getIdToken();
          const response = await ApiHandler.post("/PropertyImages", imageData, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };
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
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors duration-300"
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
          disabled={uploading || images.length === 0}
          className={`w-full py-3 px-6 ${
            uploading || images.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white rounded-lg transition duration-300 flex items-center justify-center`}
        >
          {uploading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <FaUpload className="mr-2" />
              Upload Images
            </>
          )}
        </button>

        {images.length > 0 && (
          <div className="text-gray-500 text-center text-sm">
            {images.length} {images.length === 1 ? "image" : "images"} selected
            for upload
          </div>
        )}
      </form>
    </div>
  );
};

export default PropertyImageUpload;
