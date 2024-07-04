import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/Firebase-config.js";
import { signOut } from "firebase/auth";
import { FaUserCircle } from "react-icons/fa";

export const WelcomePage = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaUserCircle className="text-4xl text-gray-600" />
            {user && user.email ? (
              <p className="ml-4 text-lg font-semibold">{user.email}</p>
            ) : (
              <p className="ml-4 text-lg font-semibold">No user logged in</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold">Welcome to the Home Page!</h1>
          <p className="mt-4 text-gray-600">You are successfully logged in.</p>
        </div>
      </div>
    </div>
  );
};
