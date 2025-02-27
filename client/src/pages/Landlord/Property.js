import React, { useState } from "react";
import AddPropertyForm from "../../components/property/AddPropertyForm.js";
import { FaPlus, FaTimes } from "react-icons/fa";
import PropertyList from "../../components/property/PropertyList.jsx";

const Property = () => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => {
    setShowModal(true);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setShowModal(false);
    document.body.style.overflow = "auto";
  };

  return (
    <div className="relative min-h-screen">
      <div className="flex justify-end mb-6 pr-4">
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg shadow-md transition-colors duration-300"
        >
          <FaPlus />
          <span>Add New Property</span>
        </button>
      </div>

      {/* Your existing property list/content would go here */}
      <div className="mt-6">
        <PropertyList />
      </div>

      {showModal && (
        <div className="fixed inset-0 overflow-auto bg-black bg-opacity-50 flex items-center justify-end pr-4 md:pr-16 lg:pr-36">
          <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-xl animate-slideInRight mr-0 ml-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Add New Property
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <FaTimes size={24} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <AddPropertyForm onComplete={closeModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Property;
