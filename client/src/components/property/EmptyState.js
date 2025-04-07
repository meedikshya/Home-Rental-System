import React from "react";
import { FaHome, FaPlus } from "react-icons/fa";

const EmptyState = ({ onAddProperty }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="w-24 h-24 bg-[#20319D]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <FaHome className="text-[#20319D] text-4xl" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-3">
        No Properties Yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        You haven't added any properties to your listing. Add your first
        property to start managing your real estate.
      </p>
      <button
        onClick={onAddProperty}
        className="bg-[#20319D] hover:bg-[#162881] text-white px-5 py-3 rounded-lg transition-colors duration-300 flex items-center mx-auto"
      >
        <FaPlus className="mr-2" /> Add Your First Property
      </button>
    </div>
  );
};

export default EmptyState;
