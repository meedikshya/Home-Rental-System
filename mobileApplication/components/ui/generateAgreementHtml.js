export const generateAgreementHtml = (data) => {
  const { address, startDate, endDate, landlordName, renterName, price } = data;

  // Format date function
  const formatDate = (date) => {
    if (!date) return "________";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lease Agreement</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        
        body {
          line-height: 1.4; /* Reduced line height */
          color: #333;
          background-color: #f5f7fa;
          padding: 10px; /* Reduced padding */
          font-size: 12px; /* Reduced font size */
        }
        
        .container {
          max-width: 700px; /* Reduced max-width */
          margin: 0 auto;
          border-radius: 8px; /* Reduced border-radius */
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); /* Reduced box-shadow */
          border: 1px solid #e5e7eb;
          background-color: #fff;
        }
        
        .header {
          background-color: #20319D;
          padding: 20px 15px; /* Reduced padding */
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
        }
        
        .header-divider {
          width: 40px; /* Reduced width */
          height: 2px;
          background-color: rgba(255, 255, 255, 0.5);
          margin: 6px auto 10px; /* Reduced margin */
          border-radius: 2px;
        }
        
        .logo {
          text-align: center;
          color: white;
          font-size: 18px; /* Reduced font size */
          font-weight: bold;
          margin-bottom: 3px; /* Reduced margin */
        }
        
        .title {
          color: white;
          font-size: 22px; /* Reduced font size */
          font-weight: bold;
        }
        
        .property-section {
          background-color: #f9fafb;
          padding: 15px; /* Reduced padding */
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .property-intro {
          color: #4b5563;
          margin-bottom: 10px; /* Reduced margin */
          font-size: 12px; /* Reduced font size */
        }
        
        .property-address {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px; /* Reduced border-radius */
          padding: 10px; /* Reduced padding */
          text-align: center;
          font-weight: 500;
          color: #1f2937;
          font-size: 14px; /* Reduced font size */
          margin: 8px 0; /* Reduced margin */
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .content {
          padding: 15px; /* Reduced padding */
        }
        
        .info-section {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px; /* Reduced border-radius */
          padding: 15px; /* Reduced padding */
          margin-bottom: 15px; /* Reduced margin */
        }
        
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px; /* Reduced margin */
          padding-bottom: 8px; /* Reduced padding */
          border-bottom: 1px solid #f0f0f0;
        }
        
        .info-row:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .info-icon {
          width: 28px; /* Reduced width */
          height: 28px; /* Reduced height */
          background-color: #eff6ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px; /* Reduced margin */
          flex-shrink: 0;
        }
        
        .info-icon svg {
          width: 14px; /* Reduced width */
          height: 14px; /* Reduced height */
          fill: #20319D;
        }
        
        .info-content {
          flex: 1;
        }
        
        .info-label {
          font-size: 11px; /* Reduced font size */
          color: #6b7280;
          margin-bottom: 1px; /* Reduced margin */
        }
        
        .info-value {
          font-size: 13px; /* Reduced font size */
          color: #1f2937;
          font-weight: 500;
        }
        
        .rent-value {
          color: #20319D;
          font-weight: 600;
        }
        
        .terms-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px; /* Reduced border-radius */
          overflow: hidden;
          margin-bottom: 15px; /* Reduced margin */
        }
        
        .terms-header {
          background-color: #20319D;
          color: white;
          padding: 8px 15px; /* Reduced padding */
          font-weight: 600;
          font-size: 14px; /* Reduced font size */
        }
        
        .terms-content {
          padding: 10px 15px; /* Reduced padding */
          background-color: white;
        }
        
        .term-item {
          display: flex;
          margin-bottom: 8px; /* Reduced margin */
        }
        
        .term-bullet {
          color: #20319D;
          font-weight: bold;
          margin-right: 8px; /* Reduced margin */
        }
        
        .term-text {
          flex: 1;
          color: #4b5563;
          font-size: 12px; /* Reduced font size */
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 20px; /* Reduced margin */
          margin-bottom: 15px; /* Reduced margin */
        }
        
        .signature-box {
          width: 45%;
        }
        
        .signature-line {
          border-top: 1px solid #9ca3af;
          margin-bottom: 3px; /* Reduced margin */
        }
        
        .signature-label {
          font-size: 11px; /* Reduced font size */
          color: #6b7280;
          text-align: center;
        }
        
        .footer {
          background-color: #f9fafb;
          padding: 10px 15px; /* Reduced padding */
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px; /* Reduced margin */
        }
        
        .meta-item {
          display: flex;
          align-items: center;
        }
        
        .meta-label {
          font-size: 11px; /* Reduced font size */
          color: #6b7280;
          margin-right: 3px; /* Reduced margin */
        }
        
        .meta-value {
          font-size: 11px; /* Reduced font size */
          color: #1f2937;
          font-weight: 500;
        }
        
        .footer-divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 8px 0; /* Reduced margin */
        }
        
        .footer-legal {
          text-align: center;
          font-size: 10px; /* Reduced font size */
          color: #6b7280;
        }
        
        @media (max-width: 600px) {
          .signature-section {
            flex-direction: column;
          }
          
          .signature-box {
            width: 100%;
            margin-bottom: 15px; /* Reduced margin */
          }
          
          .footer-meta {
            flex-direction: column;
          }
          
          .meta-item {
            margin-bottom: 8px; /* Reduced margin */
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">RentEase</div>
          <div class="header-divider"></div>
          <h1 class="title">LEASE AGREEMENT</h1>
        </div>
        
        <div class="property-section">
          <p class="property-intro">This agreement is made between the landlord and renter for the rental property located at:</p>
          <div class="property-address">${address}</div>
        </div>
        
        <div class="content">
          <div class="info-section">
            <div class="info-row">
              <div class="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                </svg>
              </div>
              <div class="info-content">
                <div class="info-label">Lease Period</div>
                <div class="info-value">${formatDate(
                  startDate
                )} to ${formatDate(endDate)}</div>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div class="info-content">
                <div class="info-label">Landlord</div>
                <div class="info-value">${landlordName}</div>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div class="info-content">
                <div class="info-label">Renter
                </div>
                <div class="info-value">${renterName}</div>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                </svg>
              </div>
              <div class="info-content">
                <div class="info-label">Monthly Rent</div>
                <div class="info-value rent-value">Rs. ${price}</div>
              </div>
            </div>
          </div>
          
          <div class="terms-section">
            <div class="terms-header">Agreement Terms</div>
            <div class="terms-content">
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">Renter will pay the rent amount on the 1st of each month.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">Renter will maintain the property in good condition.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">Renter will not sublease the property without the landlord's permission.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">The landlord will be responsible for major repairs.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">The landlord will provide notice before visiting the property.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">Either party may terminate this agreement with 30 days' notice.</div>
              </div>
              <div class="term-item">
                <div class="term-bullet">•</div>
                <div class="term-text">A security deposit equal to one month's rent is due before moving in.</div>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Landlord Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Tenant Signature</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
