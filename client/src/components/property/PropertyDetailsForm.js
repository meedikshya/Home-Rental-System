import React, { useState } from "react";
import { toast } from "react-toastify";
import ApiHandler from "../../api/ApiHandler.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import {
  FaHome,
  FaLocationArrow,
  FaBed,
  FaBath,
  FaArrowRight,
} from "react-icons/fa";

const PropertyDetailsForm = ({ setPropertyId, landlordId, setCurrentStep }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    district: "",
    city: "",
    municipality: "",
    ward: "",
    nearestLandmark: "",
    price: "",
    roomType: "",
    status: "",
    totalBedrooms: "",
    totalLivingRooms: "",
    totalWashrooms: "",
    totalKitchens: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmitProperty = async (e) => {
    e.preventDefault();

    if (!landlordId) {
      toast.error("Landlord ID is missing.");
      return;
    }

    try {
      const propertyData = {
        ...formData,
        landlordId,
        ward: parseInt(formData.ward),
        price: parseFloat(formData.price),
        totalBedrooms: parseInt(formData.totalBedrooms),
        totalLivingRooms: parseInt(formData.totalLivingRooms) || 0,
        totalWashrooms: parseInt(formData.totalWashrooms),
        totalKitchens: parseInt(formData.totalKitchens) || 0,
      };

      const token = await FIREBASE_AUTH.currentUser.getIdToken();
      const response = await ApiHandler.post("/Properties", propertyData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response && response.propertyId) {
        setPropertyId(response.propertyId);
        toast.success("Property details saved successfully!");
        setCurrentStep(2);
      } else {
        toast.error("Failed to get property ID from response");
      }
    } catch (error) {
      toast.error("Failed to add property.");
      console.error("Error:", error);
    }
  };

  const formFields = [
    {
      section: "Basic Details",
      icon: <FaHome />,
      fields: [
        { label: "Title", name: "title", type: "text" },
        { label: "Description", name: "description", type: "textarea" },
        { label: "Price", name: "price", type: "number" },
        { label: "Room Type", name: "roomType", type: "text" },
        { label: "Status", name: "status", type: "text" },
      ],
    },
    {
      section: "Location",
      icon: <FaLocationArrow />,
      fields: [
        { label: "District", name: "district", type: "text" },
        { label: "City", name: "city", type: "text" },
        { label: "Municipality", name: "municipality", type: "text" },
        { label: "Ward", name: "ward", type: "number" },
        { label: "Nearest Landmark", name: "nearestLandmark", type: "text" },
      ],
    },
    {
      section: "Room Details",
      icon: <FaBed />,
      fields: [
        { label: "Total Bedrooms", name: "totalBedrooms", type: "number" },
        {
          label: "Total Living Rooms",
          name: "totalLivingRooms",
          type: "number",
        },
        { label: "Total Washrooms", name: "totalWashrooms", type: "number" },
        { label: "Total Kitchens", name: "totalKitchens", type: "number" },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center">
        <FaHome className="mr-2" />
        Add Property Details
      </h2>

      <form onSubmit={handleSubmitProperty} className="space-y-8">
        {formFields.map((section) => (
          <div key={section.section} className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-500 flex items-center">
              {section.icon}
              <span className="ml-2">{section.section}</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"
        >
          Next: Upload Images
          <FaArrowRight className="ml-2" />
        </button>
      </form>
    </div>
  );
};

export default PropertyDetailsForm;
