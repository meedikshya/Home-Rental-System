import React from "react";
import {
  FaCheck,
  FaHome,
  FaImages,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import PropertyDetailsForm from "./PropertyDetailsForm.js";
import PropertyImageUpload from "./PropertyImageUpload.js";

const EditPropertyModal = ({
  isModalOpen,
  selectedProperty,
  handleCloseModal,
  currentStep,
  handleStepChange,
  setCurrentStep,
  landlordId,
}) => {
  if (!isModalOpen || !selectedProperty) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Edit Property: {selectedProperty.title}
          </h2>
          <button
            onClick={handleCloseModal}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
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
                  ${currentStep >= 1 ? "bg-[#20319D]" : "bg-gray-300"}
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
                  currentStep > 1 ? "bg-[#20319D]" : "bg-gray-300"
                } transition-colors duration-300`}
              />

              {/* Step 2 Indicator */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full cursor-pointer
                  ${currentStep >= 2 ? "bg-[#20319D]" : "bg-gray-300"}
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
                  currentStep > 2 ? "bg-[#20319D]" : "bg-gray-300"
                } transition-colors duration-300`}
              />

              {/* Step 3 Indicator */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full
                  ${currentStep === 3 ? "bg-[#20319D]" : "bg-gray-300"}
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
                  ? "text-[#20319D] font-medium"
                  : "text-gray-500"
              } transition-colors duration-300`}
            >
              Edit Details
            </div>
            <div
              className={`text-center mx-8 ${
                currentStep >= 2
                  ? "text-[#20319D] font-medium"
                  : "text-gray-500"
              } transition-colors duration-300`}
            >
              Manage Images
            </div>
            <div
              className={`text-center mx-8 ${
                currentStep === 3
                  ? "text-[#20319D] font-medium"
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
                  className="bg-[#20319D] hover:bg-[#162881] text-white px-6 py-2 rounded-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPropertyModal;
