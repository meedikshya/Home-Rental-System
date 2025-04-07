import React from "react";
import { FaExclamationTriangle, FaArrowRight } from "react-icons/fa";

const ErrorState = ({ error }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-red-500">
      <div className="flex items-start mb-4">
        <FaExclamationTriangle className="text-red-500 text-2xl mr-3 mt-1" />
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
      <button
        className="mt-4 bg-[#20319D] hover:bg-[#162881] text-white px-5 py-2 rounded-lg transition-colors duration-300 flex items-center"
        onClick={() => window.location.reload()}
      >
        <FaArrowRight className="mr-2" /> Try Again
      </button>
    </div>
  );
};

export default ErrorState;
