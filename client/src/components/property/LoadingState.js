import React from "react";

const LoadingState = () => {
  return (
    <div className="flex justify-center items-center min-h-[400px] bg-white rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#20319D] border-t-transparent"></div>
        <p className="mt-4 text-[#20319D]">Loading your properties...</p>
      </div>
    </div>
  );
};

export default LoadingState;
