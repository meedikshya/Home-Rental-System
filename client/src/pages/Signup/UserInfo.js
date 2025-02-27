import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ApiHandler from "../../api/ApiHandler.js";

const UserInfo = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !phone || !address) {
      setError("Please fill in all fields.");
      return;
    }

    setError(""); // Clear previous errors

    try {
      const response = await ApiHandler.post("/UserDetails", {
        userId,
        firstName,
        lastName,
        phone,
        address,
      });

      console.log("User details saved:", response);
      alert("Your information has been saved successfully!");

      navigate("/login"); // Ensure correct redirection
    } catch (error) {
      console.error("Error saving user details:", error);
      setError(
        error.response?.data?.message ||
          "Failed to save user details. Please try again."
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl text-center text-blue-700 font-extrabold mb-6">
        GHARBHADA
      </h1>
      <p className="text-lg text-center text-blue-700 mb-4">
        To complete your registration and sign in, please provide your first
        name, last name, phone number, and address.
      </p>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="mb-4">
          <label className="block text-lg text-blue-700 mb-2">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Enter your first name"
          />
        </div>
        <div className="mb-4">
          <label className="block text-lg text-blue-700 mb-2">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Enter your last name"
          />
        </div>
        <div className="mb-4">
          <label className="block text-lg text-blue-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Enter your phone number"
          />
        </div>
        <div className="mb-4">
          <label className="block text-lg text-blue-700 mb-2">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="Enter your address"
          />
        </div>
        {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
        <button
          type="submit"
          className="w-full bg-blue-700 text-white p-3 rounded-lg"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default UserInfo;
