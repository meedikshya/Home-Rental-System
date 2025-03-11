import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ApiHandler from "../../api/ApiHandler.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";
import {
  FaHome,
  FaLocationArrow,
  FaBed,
  FaBath,
  FaArrowRight,
  FaEdit,
} from "react-icons/fa";

// Modified component to handle both create and edit modes
const PropertyDetailsForm = ({
  initialData = null, // Pass existing data for edit mode
  propertyId = null, // Pass ID for edit mode
  setPropertyId, // Only used in create mode
  landlordId,
  setCurrentStep,
  mode = "create", // "create" or "edit"
}) => {
  // Initialize with empty values or provided data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    district: "",
    city: "",
    municipality: "",
    ward: "",
    nearestLandmark: "",
    price: "",
    roomType: "Apartment",
    status: "Available",
    totalBedrooms: "0",
    totalLivingRooms: "0",
    totalWashrooms: "0",
    totalKitchens: "0",
  });

  const [saving, setSaving] = useState(false);

  // If in edit mode, load initial data
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData(initialData);
    }
  }, [initialData, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmitProperty = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (!landlordId) {
      toast.error("Landlord ID is missing.");
      setSaving(false);
      return;
    }

    try {
      if (!FIREBASE_AUTH.currentUser) {
        toast.error("User authentication error. Please log in again.");
        setSaving(false);
        return;
      }

      const token = await FIREBASE_AUTH.currentUser.getIdToken();

      const propertyData = {
        ...formData,
        landlordId,
        ward: parseInt(formData.ward) || 0,
        price: parseFloat(formData.price) || 0,
        totalBedrooms: parseInt(formData.totalBedrooms) || 0,
        totalLivingRooms: parseInt(formData.totalLivingRooms) || 0,
        totalWashrooms: parseInt(formData.totalWashrooms) || 0,
        totalKitchens: parseInt(formData.totalKitchens) || 0,
      };

      if (mode === "create") {
        // Create new property
        const response = await ApiHandler.post("/Properties", propertyData, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response?.propertyId) {
          setPropertyId(response.propertyId);
          toast.success("Property details saved successfully!");
          setCurrentStep(2);
        } else {
          toast.error("Failed to get property ID from response.");
        }
      } else {
        // Update existing property
        const response = await ApiHandler.put(
          `/Properties/${propertyId}`,
          { ...propertyData, propertyId: parseInt(propertyId) },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        toast.success("Property updated successfully!");
        setCurrentStep(2);
      }
    } catch (error) {
      toast.error(
        mode === "create"
          ? "Failed to add property."
          : "Failed to update property."
      );
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Improved form fields with expanded options
  const formFields = [
    {
      section: "Basic Details",
      icon: <FaHome />,
      fields: [
        { label: "Title", name: "title", type: "text" },
        {
          label: "Description",
          name: "description",
          type: "textarea",
          span: 2,
        },
        { label: "Price", name: "price", type: "number" },
        {
          label: "Room Type",
          name: "roomType",
          type: "select",
          options: ["Apartment", "House", "Studio"],
        },
        {
          label: "Status",
          name: "status",
          type: "select",
          options: ["Available", "Rented", "Inactive"],
        },
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
        {
          label: "Nearest Landmark",
          name: "nearestLandmark",
          type: "text",
          span: 2,
        },
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
    <div className="bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center">
        {mode === "create" ? (
          <>
            <FaHome className="mr-2" /> Add Property Details
          </>
        ) : (
          <>
            <FaEdit className="mr-2" /> Edit Property Details
          </>
        )}
      </h2>

      <form onSubmit={handleSubmitProperty} className="space-y-8">
        {formFields.map((section) => (
          <div key={section.section} className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-500 flex items-center">
              {section.icon}
              <span className="ml-2">{section.section}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className={field.span === 2 ? "md:col-span-2" : ""}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      required
                    />
                  ) : field.type === "select" ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={field.type === "number" ? "0" : undefined}
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
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center disabled:bg-blue-300"
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              {mode === "create" ? "Adding..." : "Updating..."}
            </>
          ) : (
            <>
              {mode === "create"
                ? "Next: Upload Images"
                : "Save Changes & Continue to Images"}
              <FaArrowRight className="ml-2" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default PropertyDetailsForm;
