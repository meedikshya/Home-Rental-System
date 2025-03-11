import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { onAuthStateChanged } from "firebase/auth";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import { getUserDataFromFirebase } from "../../context/AuthContext.js";
import ApiHandler from "../../api/ApiHandler.js";
import PropertyDetailsForm from "./PropertyDetailsForm.js"; // Reuse this component
import PropertyImageUpload from "./PropertyImageUpload.js"; // Reuse this component
import {
  FaHome,
  FaImages,
  FaCheck,
  FaArrowLeft,
  FaCheckCircle,
} from "react-icons/fa";

const EditProperty = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [landlordId, setLandlordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [propertyData, setPropertyData] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Fetch property data and verify user authorization
  useEffect(() => {
    const fetchPropertyAndUser = async () => {
      try {
        const unsubscribe = onAuthStateChanged(
          FIREBASE_AUTH,
          async (currentUser) => {
            if (currentUser) {
              const userId = await getUserDataFromFirebase();
              if (userId) {
                setLandlordId(userId);

                // Fetch the property data
                try {
                  const token = await FIREBASE_AUTH.currentUser.getIdToken();
                  const response = await ApiHandler.get(
                    `/Properties/${propertyId}`,
                    {
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );

                  if (response) {
                    setPropertyData(response);

                    // Check if this user is authorized to edit this property
                    if (response.landlordId === userId) {
                      setIsAuthorized(true);
                    } else {
                      toast.error(
                        "You are not authorized to edit this property."
                      );
                      navigate("/my-properties");
                    }
                  } else {
                    toast.error("Property not found.");
                    navigate("/my-properties");
                  }
                } catch (error) {
                  console.error("Error fetching property:", error);
                  toast.error("Failed to load property data.");
                  navigate("/my-properties");
                }
              } else {
                toast.error("Failed to fetch user data.");
                navigate("/login");
              }
            } else {
              toast.error("Please log in to edit properties.");
              navigate("/login");
            }
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
        toast.error("An error occurred while loading data.");
      }
    };

    fetchPropertyAndUser();
  }, [propertyId, navigate]);

  // Handle navigation to a specific step
  const handleStepChange = (step) => {
    if (step >= 1 && step <= 3) {
      setCurrentStep(step);
    }
  };

  // Handle completion of property edit
  const handleFinish = () => {
    toast.success("Property updated successfully!");
    navigate("/my-properties");
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Access denied state
  if (!isAuthorized || !propertyData) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">
            You don't have permission to edit this property or the property
            doesn't exist.
          </p>
          <button
            onClick={() => navigate("/my-properties")}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            <FaArrowLeft className="inline mr-2" /> Back to My Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mb-12">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate("/my-properties")}
          className="flex items-center text-blue-600 hover:underline"
        >
          <FaArrowLeft className="mr-1" /> Back to My Properties
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Edit Property</h1>

      {/* Steps Indicator */}
      <div className="mb-8">
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
              currentStep >= 1 ? "text-blue-600 font-medium" : "text-gray-500"
            } transition-colors duration-300`}
          >
            Edit Details
          </div>
          <div
            className={`text-center mx-8 ${
              currentStep >= 2 ? "text-blue-600 font-medium" : "text-gray-500"
            } transition-colors duration-300`}
          >
            Manage Images
          </div>
          <div
            className={`text-center mx-8 ${
              currentStep === 3 ? "text-blue-600 font-medium" : "text-gray-500"
            } transition-colors duration-300`}
          >
            Finish
          </div>
        </div>
      </div>

      {/* Content based on current step */}
      <div className="transition-all duration-300">
        {currentStep === 1 && (
          <PropertyDetailsForm
            initialData={propertyData}
            propertyId={parseInt(propertyId)}
            landlordId={landlordId}
            setCurrentStep={setCurrentStep}
            mode="edit"
          />
        )}

        {currentStep === 2 && (
          <PropertyImageUpload
            propertyId={parseInt(propertyId)}
            setCurrentStep={setCurrentStep}
          />
        )}

        {currentStep === 3 && (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <div className="bg-green-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-6">
              <FaCheckCircle className="text-green-600 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Success!</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Your property has been updated successfully. All details and
              images have been saved.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(`/property/${propertyId}`)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition"
              >
                View Property
              </button>
              <button
                onClick={() => navigate("/my-properties")}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md transition"
              >
                Back to My Properties
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProperty;
