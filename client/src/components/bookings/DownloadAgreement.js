import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const downloadAgreement = async (
  agreement,
  propertyDetails,
  renterName,
  formatDate,
  setDownloadingId,
  unsetDownloadingId
) => {
  try {
    if (setDownloadingId) setDownloadingId(agreement.agreementId);

    // Get property details
    const property = propertyDetails[agreement.bookingId] || {};

    // Create a temporary element to render the agreement
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.left = "-9999px";
    element.style.top = "-9999px";
    element.style.width = "794px"; // A4 width in pixels at 96 DPI

    // Create agreement content with proper styling
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #20319D; color: white;">
          <div style="font-size: 18px; font-weight: bold;">RentEase</div>
          <div style="width: 40px; height: 2px; background-color: rgba(255,255,255,0.5); margin: 8px auto;"></div>
          <h1 style="font-size: 24px; font-weight: bold; margin: 0;">LEASE AGREEMENT</h1>
          <div style="font-size: 12px; margin-top: 8px;">Agreement #${
            agreement.agreementId
          }</div>
        </div>
        
        <div style="text-align: center; padding: 15px; background-color: #f9fafb; margin-bottom: 20px; border: 1px solid #e5e7eb;">
          <p style="color: #4b5563; margin-bottom: 10px; font-size: 14px;">
            This agreement is made between the landlord and renter for the rental property:
          </p>
          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; font-weight: 500; color: #1f2937; font-size: 16px; margin: 8px 0;">
            ${property.title || "Property"}
          </div>
          <div style="font-size: 14px; color: #6b7280;">${
            property.address || "Address not available"
          }</div>
          <div style="display: inline-block; margin-top: 8px; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; 
            ${
              agreement.status === "Approved"
                ? "background-color: #dcfce7; color: #166534;"
                : agreement.status === "Pending"
                ? "background-color: #fef3c7; color: #92400e;"
                : "background-color: #fee2e2; color: #b91c1c;"
            }">
            Status: ${agreement.status}
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <div style="width: 30px; height: 30px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#20319D">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Lease Period</div>
              <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                ${formatDate(agreement.startDate)} to ${formatDate(
      agreement.endDate
    )}
              </div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <div style="width: 30px; height: 30px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#20319D">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Landlord</div>
              <div style="font-size: 14px; color: #1f2937; font-weight: 500;">Property Owner</div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
            <div style="width: 30px; height: 30px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#20319D">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Renter</div>
              <div style="font-size: 14px; color: #1f2937; font-weight: 500;">${renterName}</div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center;">
            <div style="width: 30px; height: 30px; background-color: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#20319D">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Monthly Rent</div>
              <div style="font-size: 14px; color: #20319D; font-weight: 600;">Rs. ${
                property.price || "N/A"
              }</div>
            </div>
          </div>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <div style="background-color: #20319D; color: white; padding: 8px 15px; font-weight: 600; font-size: 16px;">Agreement Terms</div>
          <div style="padding: 15px 20px; background-color: white;">
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">Renter will pay the rent amount on the 1st of each month.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">Renter will maintain the property in good condition.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">Renter will not sublease the property without the landlord's permission.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">The landlord will be responsible for major repairs.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">The landlord will provide notice before visiting the property.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">Either party may terminate this agreement with 30 days' notice.</div>
            </div>
            <div style="margin-bottom: 8px; display: flex;">
              <div style="color: #20319D; font-weight: bold; margin-right: 8px;">•</div>
              <div style="color: #4b5563; font-size: 14px;">A security deposit equal to one month's rent is due before moving in.</div>
            </div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 30px; margin-bottom: 20px;">
          <div style="width: 45%;">
            <div style="border-top: 1px solid #9ca3af; margin-bottom: 5px;"></div>
            <div style="font-size: 12px; color: #6b7280; text-align: center;">Landlord Signature</div>
          </div>
          <div style="width: 45%;">
            <div style="border-top: 1px solid #9ca3af; margin-bottom: 5px;"></div>
            <div style="font-size: 12px; color: #6b7280; text-align: center;">Tenant Signature</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
            Signed on: ${formatDate(agreement.signedAt)}
          </div>
          <div style="height: 1px; background-color: #e5e7eb; margin: 10px 0;"></div>
          <div style="font-size: 12px; color: #6b7280; text-align: center;">
            This is a legally binding agreement. This document was generated electronically and is valid without physical signatures.
          </div>
        </div>
      </div>
    `;

    // Append element to the body
    document.body.appendChild(element);

    try {
      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // PDF configuration
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Add image to PDF (scaled to fit A4)
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(width / imgWidth, height / imgHeight);
      const imgX = (width - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        "PNG",
        imgX,
        imgY,
        imgWidth * ratio, 
        imgHeight * ratio
      );

      // Generate filename based on agreement details
      const fileName = `Agreement_${agreement.agreementId}_${renterName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.pdf`;

      // Save PDF
      pdf.save(fileName);

      return true;
    } finally {
      // Clean up - remove the element
      if (element && document.body.contains(element)) {
        document.body.removeChild(element);
      }

      // Reset downloading state
      if (unsetDownloadingId) unsetDownloadingId(agreement.agreementId);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (unsetDownloadingId) unsetDownloadingId(agreement.agreementId);
    return false;
  }
};
