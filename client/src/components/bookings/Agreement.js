import React, { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaUserAlt,
  FaHome,
  FaMoneyBillWave,
} from "react-icons/fa";
import ApiHandler from "../../api/ApiHandler.js";
import { FIREBASE_AUTH } from "../../services/Firebase-config.js";

const Agreement = ({
  isOpen,
  onClose,
  agreement,
  propertyDetails,
  getRenterName,
  formatDate,
}) => {
  const [landlordName, setLandlordName] = useState("You");

  // Add ESC key handler for modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);

    // Prevent body scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Fetch landlord name when agreement changes
  useEffect(() => {
    const fetchLandlordName = async () => {
      if (!agreement) return;

      try {
        const token = await FIREBASE_AUTH.currentUser?.getIdToken(true);
        const response = await ApiHandler.get(
          `/UserDetails/userId/${agreement.landlordId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response && response.firstName) {
          const fullName = `${response.firstName} ${
            response.lastName || ""
          }`.trim();
          setLandlordName(fullName);
          console.log(`Fetched landlord name: ${fullName}`);
        } else {
          setLandlordName("You");
        }
      } catch (error) {
        console.error("Error fetching landlord name:", error);
        setLandlordName("You");
      }
    };

    if (agreement) {
      fetchLandlordName();
    }
  }, [agreement]);

  if (!isOpen || !agreement) return null;

  const bookingId = agreement.bookingId;
  const property = propertyDetails[bookingId];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-60"
        onClick={onClose}
      ></div>
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block">
        <div className="relative inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
          <div className="p-6">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Lease Agreement
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            {/* Status indicator */}
            <div className="mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agreement.status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : agreement.status === "Active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {agreement.status}
              </span>
            </div>

            {/* Property info */}
            {property && (
              <div className="bg-gray-50 p-4 rounded-lg shadow-sm flex items-center mb-6">
                {property.image && (
                  <img
                    src={property.image}
                    alt={property.title || "Property"}
                    className="w-28 h-28 rounded-lg object-cover mr-4"
                  />
                )}
                <div>
                  <h3 className="text-xl font-semibold">{property.title}</h3>
                  <p className="text-gray-600">{property.address}</p>
                  <div className="flex flex-wrap mt-2 gap-3">
                    <span className="text-sm text-gray-600">
                      {property.bedrooms} Bedrooms
                    </span>
                    <span className="text-sm text-gray-600">
                      {property.bathrooms} Bathrooms
                    </span>
                    <span className="text-sm text-gray-600">
                      {property.kitchen} Kitchen
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green-700 mt-1">
                    Rs. {property.price} / month
                  </p>
                </div>
              </div>
            )}

            {/* Agreement details */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-xl font-semibold mb-4">Lease Agreement</h3>

              <div className="space-y-4 text-gray-700">
                <div className="flex items-start">
                  <FaHome className="text-gray-400 mr-2 mt-1" />
                  <p>
                    This agreement is made between the landlord and tenant for
                    the rental property
                    {property?.address && (
                      <span className="font-semibold">
                        {" "}
                        located at: {property.address}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-start">
                  <FaCalendarAlt className="text-gray-400 mr-2 mt-1" />
                  <p>
                    <span className="font-semibold">Lease Period:</span>{" "}
                    {formatDate(agreement.startDate)} to{" "}
                    {formatDate(agreement.endDate)}
                  </p>
                </div>

                <div className="flex items-start">
                  <FaUserAlt className="text-gray-400 mr-2 mt-1" />
                  <p>
                    <span className="font-semibold">Landlord:</span>{" "}
                    {landlordName}
                  </p>
                </div>

                <div className="flex items-start">
                  <FaUserAlt className="text-gray-400 mr-2 mt-1" />
                  <p>
                    <span className="font-semibold">Renter:</span>{" "}
                    {getRenterName(agreement.renterId)}
                  </p>
                </div>

                {property?.price && (
                  <div className="flex items-start">
                    <FaMoneyBillWave className="text-gray-400 mr-2 mt-1" />
                    <p>
                      <span className="font-semibold">Rent Amount:</span> Rs.{" "}
                      {property.price} per month
                    </p>
                  </div>
                )}

                <div className="flex items-start">
                  <FaCalendarAlt className="text-gray-400 mr-2 mt-1" />
                  <p>
                    <span className="font-semibold">Signed On:</span>{" "}
                    {formatDate(agreement.signedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Agreement terms */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <h4 className="font-semibold mb-2">Agreement Terms:</h4>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                <li>
                  The tenant will pay the rent amount on the 1st of each month.
                </li>
                <li>
                  The tenant will maintain the property in good condition.
                </li>
                <li>
                  The tenant will not sublease the property without the
                  landlord's permission.
                </li>
                <li>The landlord will be responsible for major repairs.</li>
                <li>
                  The landlord will provide notice before visiting the property.
                </li>
                <li>
                  Either party may terminate this agreement with 30 days'
                  notice.
                </li>
                <li>
                  A security deposit equal to one month's rent is due before
                  moving in.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agreement;
