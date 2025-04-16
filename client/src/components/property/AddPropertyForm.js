import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import PropertyDetailsForm from "./PropertyDetailsForm.js";
import PropertyImageUpload from "./PropertyImageUpload.js";
import { FaHome, FaImages, FaCheck } from "react-icons/fa";

const AddPropertyForm = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);
  const [landlordId, setLandlordId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleImageUploadComplete = () => {
    toast.success("Property added successfully!");
    if (onComplete) {
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg">
      <div className="mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                currentStep >= 1 ? "bg-blue-500" : "bg-gray-300"
              } transition-colors duration-300`}
            >
              {currentStep > 1 ? (
                <FaCheck className="text-white text-xl" />
              ) : (
                <FaHome className="text-white text-xl" />
              )}
            </div>
            <div
              className={`h-1 w-32 mx-2 ${
                currentStep > 1 ? "bg-blue-500" : "bg-gray-300"
              } transition-colors duration-300`}
            />
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                currentStep === 2 ? "bg-blue-500" : "bg-gray-300"
              } transition-colors duration-300`}
            >
              <FaImages className="text-white text-xl" />
            </div>
          </div>
        </div>
        <div className="flex justify-center text-sm">
          <div
            className={`text-center mx-8 ${
              currentStep >= 1 ? "text-blue-500 font-medium" : "text-gray-500"
            } transition-colors duration-300`}
          >
            Property Details
          </div>
          <div
            className={`text-center mx-8 ${
              currentStep === 2 ? "text-blue-500 font-medium" : "text-gray-500"
            } transition-colors duration-300`}
          >
            Upload Images
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {currentStep === 1 ? (
          <PropertyDetailsForm
            setPropertyId={setPropertyId}
            landlordId={landlordId}
            setCurrentStep={setCurrentStep}
          />
        ) : (
          <PropertyImageUpload
            propertyId={propertyId}
            setCurrentStep={setCurrentStep}
            onUploadComplete={handleImageUploadComplete}
          />
        )}
      </div>
    </div>
  );
};

export default AddPropertyForm;
