import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { FaTimes, FaFilePdf, FaDownload, FaPrint } from "react-icons/fa";

const AgreementPDF = ({
  isOpen,
  onClose,
  agreement,
  propertyDetails,
  renterName,
  formatDate,
}) => {
  const printRef = useRef(null);

  // Get property details
  const property = propertyDetails[agreement?.bookingId] || {};

  // Handle print/PDF generation
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Agreement_${agreement.agreementId}`,
    onAfterPrint: () => {
      console.log("PDF generated successfully");
    },
  });

  if (!isOpen || !agreement) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FaFilePdf className="text-red-600 mr-2" />
            Agreement #{agreement.agreementId} - PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition"
          >
            <FaTimes size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 relative">
          {/* This div will be printed/exported */}
          <div className="bg-white p-8 mx-auto" ref={printRef}>
            {/* PDF Content Template */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#20319D] mb-2">
                LEASE AGREEMENT
              </h1>
              <p className="text-gray-500">
                Agreement #{agreement.agreementId}
              </p>
            </div>

            <div className="mb-6 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">1. PARTIES</h2>
              <p>
                <span className="font-medium">LANDLORD:</span> System Landlord
              </p>
              <p>
                <span className="font-medium">TENANT:</span> {renterName}
              </p>
            </div>

            <div className="mb-6 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">2. PREMISES</h2>
              <p>
                <span className="font-medium">Property:</span> {property.title}
              </p>
              <p>
                <span className="font-medium">Address:</span> {property.address}
              </p>
              <p>
                <span className="font-medium">Details:</span>{" "}
                {property.bedrooms} Bedroom(s), {property.bathrooms} Bathroom(s)
              </p>
            </div>

            <div className="mb-6 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">3. TERM</h2>
              <p>
                <span className="font-medium">START DATE:</span>{" "}
                {formatDate(agreement.startDate)}
              </p>
              <p>
                <span className="font-medium">END DATE:</span>{" "}
                {formatDate(agreement.endDate)}
              </p>
            </div>

            <div className="mb-6 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">4. RENT</h2>
              <p>
                <span className="font-medium">Monthly Rent:</span> Rs.{" "}
                {property.price}
              </p>
              <p>
                <span className="font-medium">Payment Due:</span> 1st of each
                month
              </p>
            </div>

            <div className="mb-8 pb-4 border-b">
              <h2 className="text-lg font-semibold mb-4">5. SIGNATURES</h2>
              <p>
                <span className="font-medium">Agreement Status:</span>{" "}
                {agreement.status}
              </p>
              <p>
                <span className="font-medium">Signed on:</span>{" "}
                {formatDate(agreement.signedAt)}
              </p>
            </div>

            <div className="mt-10 text-center text-sm text-gray-500">
              <p>
                This is a computer-generated document and does not require
                physical signature.
              </p>
              <p>
                Generated on {new Date().toLocaleDateString()} for recordkeeping
                purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              <FaDownload className="mr-2" /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#20319D] hover:bg-blue-800 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FaPrint className="mr-2" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgreementPDF;
