import React from "react";
import {
  FaRegEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaUserCog,
  FaUserTie,
  FaUser,
} from "react-icons/fa";

const UserProfileSidebar = ({ user, userDetails }) => {
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
    <div className="md:w-1/3 mb-6 md:mb-0 flex flex-col items-center md:border-r md:border-gray-200 md:pr-6">
      <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-700 mb-4">
        {userDetails.firstName?.charAt(0).toUpperCase()}
        {userDetails.lastName?.charAt(0).toUpperCase()}
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">
        {userDetails.firstName} {userDetails.lastName}
      </h2>

      <div className="mb-4 flex items-center justify-center">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            user.userRole === "Admin"
              ? "bg-blue-100 text-blue-800"
              : user.userRole === "Landlord"
              ? "bg-purple-100 text-purple-800"
              : "bg-pink-100 text-pink-800"
          }`}
        >
          {getUserRoleIcon(user.userRole)}
          <span className="ml-1">{user.userRole}</span>
        </span>
      </div>

      <div className="w-full space-y-3">
        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
          <FaRegEnvelope className="text-gray-500 mr-3" />
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
          <FaPhoneAlt className="text-gray-500 mr-3" />
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium">
              {userDetails.phone || "Not provided"}
            </p>
          </div>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
          <FaMapMarkerAlt className="text-gray-500 mr-3" />
          <div>
            <p className="text-xs text-gray-500">Address</p>
            <p className="text-sm font-medium">
              {userDetails.address || "Not provided"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSidebar;
