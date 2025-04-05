import React from "react";
import { FaArrowLeft, FaUserCog, FaUserTie, FaUser } from "react-icons/fa";

const UserProfileHeader = ({ user, userDetails, navigate }) => {
  // Helper function to get user role icon
  const getUserRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <FaUserCog className="text-blue-600" />;
      case "landlord":
        return <FaUserTie className="text-indigo-600" />;
      case "renter":
        return <FaUser className="text-purple-600" />;
      default:
        return <FaUser className="text-gray-600" />;
    }
  };

  return (
    <div className="mb-6 bg-[#20319D] text-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Back"
        >
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-xl font-bold mb-1 flex items-center">
            {getUserRoleIcon(user.userRole)}
            <span className="ml-2">
              User Profile: {userDetails.firstName} {userDetails.lastName}
            </span>
          </h1>
          <p className="text-blue-100">
            View detailed information about this {user.userRole.toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
