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
  FaExclamationCircle,
} from "react-icons/fa";

// Modified component with standard React form handling (no Formik)
const PropertyDetailsForm = ({
  initialData = null,
  propertyId = null,
  setPropertyId,
  landlordId,
  setCurrentStep,
  mode = "create",
}) => {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Form values state
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

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const preparedData = { ...initialData };
      const numericFields = [
        "ward",
        "price",
        "totalBedrooms",
        "totalLivingRooms",
        "totalWashrooms",
        "totalKitchens",
      ];

      numericFields.forEach((field) => {
        if (preparedData[field] !== undefined) {
          preparedData[field] = preparedData[field].toString();
        }
      });

      setFormData(preparedData);
    }
  }, [initialData]);

  // Form fields with validation rules
  const validationRules = {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      errorMessage: (val) => {
        if (!val) return "Title is required";
        if (val.length < 3) return "Title must be at least 3 characters";
        if (val.length > 100) return "Title must be less than 100 characters";
        return "";
      },
    },
    description: {
      required: true,
      minLength: 10,
      errorMessage: (val) => {
        if (!val) return "Description is required";
        if (val.length < 10)
          return "Description must be at least 10 characters";
        return "";
      },
    },
    price: {
      required: true,
      min: 0,
      type: "number",
      errorMessage: (val) => {
        if (!val) return "Price is required";
        if (isNaN(parseFloat(val))) return "Price must be a number";
        if (parseFloat(val) <= 0) return "Price must be positive";
        return "";
      },
    },
    // Add other validation rules as needed
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Mark field as touched
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate field
    validateField(name, value);
  };

  // Field validation
  const validateField = (name, value) => {
    const rule = validationRules[name];
    if (!rule) return;

    let error = "";
    if (rule.errorMessage) {
      error = rule.errorMessage(value);
    } else {
      if (rule.required && !value) {
        error = `${name} is required`;
      } else if (rule.type === "number") {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) {
          error = `${name} must be a number`;
        } else if (rule.min !== undefined && numVal < rule.min) {
          error = `${name} must be at least ${rule.min}`;
        }
      }
    }

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    return !error;
  };

  // Validate all fields
  const validateForm = () => {
    let isValid = true;
    let newErrors = {};
    let newTouched = {};

    Object.keys(validationRules).forEach((name) => {
      newTouched[name] = true;
      const valid = validateField(name, formData[name]);
      if (!valid) isValid = false;
    });

    setTouched(newTouched);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const isValid = validateForm();
    if (!isValid) {
      toast.error("Please fix the errors in the form");
      return;
    }

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

      // Parse numeric values
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

      // Check for negative values
      const numericFields = [
        "ward",
        "price",
        "totalBedrooms",
        "totalLivingRooms",
        "totalWashrooms",
        "totalKitchens",
      ];

      const hasNegativeValues = numericFields.some(
        (field) => propertyData[field] < 0
      );

      if (hasNegativeValues) {
        toast.error("Negative values are not allowed.");
        setSaving(false);
        return;
      }

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
        // Update property
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
      console.error("Error:", error);

      if (error.response?.data) {
        const errorMessage =
          typeof error.response.data === "string"
            ? error.response.data
            : "Server validation failed. Please check your inputs.";
        toast.error(errorMessage);
      } else {
        toast.error(
          mode === "create"
            ? "Failed to add property."
            : "Failed to update property."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Form sections configuration
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

      <form onSubmit={handleSubmit} className="space-y-8">
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
                  className={`${field.span === 2 ? "md:col-span-2" : ""}`}
                >
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      className={`w-full p-2 border ${
                        errors[field.name] && touched[field.name]
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      } rounded-md focus:ring-2 focus:border-transparent transition-colors`}
                      rows="3"
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      className={`w-full p-2 border ${
                        errors[field.name] && touched[field.name]
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      } rounded-md focus:ring-2 focus:border-transparent transition-colors`}
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
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      min={field.type === "number" ? "0" : undefined}
                      className={`w-full p-2 border ${
                        errors[field.name] && touched[field.name]
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      } rounded-md focus:ring-2 focus:border-transparent transition-colors`}
                    />
                  )}

                  {errors[field.name] && touched[field.name] && (
                    <div className="mt-1 text-sm text-red-600 flex items-center">
                      <FaExclamationCircle className="mr-1" />
                      {errors[field.name]}
                    </div>
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
