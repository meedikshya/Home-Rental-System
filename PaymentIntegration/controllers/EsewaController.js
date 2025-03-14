const express = require("express");
const router = express.Router();
const { getEsewaPaymentHash, verifyEsewaPayment } = require("../models/esewa");
const Agreement = require("../models/Agreement");
const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const Property = require("../models/Property");
const { db } = require("../db");

router.post("/initialize-agreement-payment", async (req, res) => {
  try {
    const { agreementId, amount, uniqueSuffix } = req.body;

    if (!agreementId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID and amount are required",
      });
    }

    // Validate agreement exists
    const agreement = await Agreement.findOne({
      where: {
        agreementId: agreementId,
      },
    });

    if (!agreement) {
      return res.status(400).json({
        success: false,
        message: "Agreement not found",
      });
    }

    // Create a pending payment record
    const payment = await Payment.create({
      agreementId: agreementId,
      renterId: agreement.renterId,
      amount: amount,
      paymentStatus: "Pending",
      PaymentGateway: "eSewa",
      paymentDate: new Date(),
    });

    // Create unique transaction ID by combining payment ID with suffix
    const transactionId = uniqueSuffix
      ? `${payment.paymentId}-${uniqueSuffix}`
      : payment.paymentId.toString();

    // Store the transactionId for later reference
    await payment.update({
      TransactionId: transactionId,
    });

    // Initiate payment with eSewa using the unique transaction ID
    const paymentInitiate = await getEsewaPaymentHash({
      amount: amount,
      transaction_uuid: transactionId, // Use the unique transaction ID here
    });

    // Respond with payment details
    res.json({
      success: true,
      payment: paymentInitiate,
      paymentData: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        renterId: payment.renterId,
        status: payment.paymentStatus,
        transactionId: transactionId,
      },
      paymentParams: {
        amt: amount,
        pid: transactionId,
        scd: process.env.ESEWA_PRODUCT_CODE,
      },
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Handle payment success/verification

router.get("/complete-payment", async (req, res) => {
  const { data } = req.query;
  console.log("Payment success callback received with data:", data);

  if (!data) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #fff0f0; }
          .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .icon { font-size: 60px; color: #e74c3c; margin: 20px 0; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Payment Error</h1>
          <p>Missing payment data. Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }

  const transaction = await db.transaction();

  try {
    // Verify payment with eSewa
    const paymentInfo = await verifyEsewaPayment(data);

    if (!paymentInfo || !paymentInfo.response || !paymentInfo.decodedData) {
      await transaction.rollback();

      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Verification Failed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #fff0f0; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .icon { font-size: 60px; color: #e74c3c; margin: 20px 0; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Payment Verification Failed</h1>
            <p>We couldn't verify your payment with eSewa. Please contact support.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Extract payment ID from transaction_uuid
    let paymentId;
    // Handle transaction IDs with suffixes (e.g., "26-1741621169214")
    if (paymentInfo.response.transaction_uuid.includes("-")) {
      paymentId = parseInt(paymentInfo.response.transaction_uuid.split("-")[0]);
    } else {
      paymentId = parseInt(paymentInfo.response.transaction_uuid);
    }

    if (isNaN(paymentId)) {
      await transaction.rollback();
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #fff0f0; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .icon { font-size: 60px; color: #e74c3c; margin: 20px 0; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Invalid Payment ID</h1>
            <p>The payment reference is invalid. Please contact support.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Find the payment record
    const payment = await Payment.findOne({
      where: { paymentId: paymentId },
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Record Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #fff0f0; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .icon { font-size: 60px; color: #e74c3c; margin: 20px 0; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❓</div>
            <h1>Payment Not Found</h1>
            <p>We couldn't find your payment record (ID: ${paymentId}). Please contact support.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if payment is already completed
    if (payment.paymentStatus === "Completed") {
      await transaction.rollback();
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Already Processed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f0fff0; }
            .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .icon { font-size: 60px; color: #2ecc71; margin: 20px 0; }
            h1 { color: #333; }
            .button { background-color: #60bb46; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h1>Payment Already Processed</h1>
            <p>This payment was already completed successfully.</p>
            <p><strong>Amount:</strong> Rs. ${payment.amount}</p>
            <p><strong>Transaction ID:</strong> ${
              payment.TransactionId || "N/A"
            }</p>
            <p><strong>Date:</strong> ${new Date(
              payment.paymentDate
            ).toLocaleString()}</p>
            <a href="rentease://payment/success?paymentId=${
              payment.paymentId
            }" class="button">Return to App</a>
          </div>
        </body>
        </html>
      `);
    }

    // Update payment record
    await payment.update(
      {
        paymentStatus: "Completed",
        TransactionId: paymentInfo.decodedData.transaction_code,
        ReferenceId: paymentInfo.decodedData.transaction_code,
      },
      { transaction }
    );

    // Get the agreementId from the payment
    const agreementId = payment.agreementId;

    // Find the agreement using the Agreement model
    const agreement = await Agreement.findOne({
      where: { agreementId: agreementId },
      transaction,
    });

    if (agreement) {
      const bookingId = agreement.bookingId;

      // Get booking using Booking model
      const booking = await Booking.findOne({
        where: { bookingId: bookingId },
        transaction,
      });

      if (booking) {
        const propertyId = booking.propertyId;

        // Update property status using Property model
        await Property.update(
          { status: "Rented" },
          {
            where: { propertyId: propertyId },
            transaction,
          }
        );

        console.log(
          `Property ${propertyId} marked as Rented after payment ${paymentId}`
        );
      } else {
        console.log(`No booking found for bookingId: ${bookingId}`);
      }
    } else {
      console.log(`No agreement found for agreementId: ${agreementId}`);
    }

    await transaction.commit();

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f0fff0; }
          .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .icon { font-size: 60px; color: #2ecc71; margin: 20px 0; }
          h1 { color: #333; }
          .button { background-color: #60bb46; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
        </style>
        <script>
          // Try to redirect back to the app after a delay
          setTimeout(function() {
            window.location.href = "rentease://payment/success?paymentId=${
              payment.paymentId
            }";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Your payment has been processed successfully.</p>
          <p><strong>Amount:</strong> Rs. ${payment.amount}</p>
          <p><strong>Transaction ID:</strong> ${
            paymentInfo.decodedData.transaction_code
          }</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p>You will be automatically redirected back to the app in a few seconds.</p>
          <a href="rentease://payment/success?paymentId=${
            payment.paymentId
          }" class="button">Return to App</a>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    await transaction.rollback();
    console.error("Payment verification error:", error);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #fff0f0; }
          .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .icon { font-size: 60px; color: #e74c3c; margin: 20px 0; }
          h1 { color: #333; }
          .button { background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Payment Error</h1>
          <p>There was an error processing your payment: ${error.message}</p>
          <p>Please try again or contact customer support.</p>
          <a href="rentease://payment/error" class="button">Return to App</a>
        </div>
      </body>
      </html>
    `);
  }
});
// Handle payment failure
router.post("/payment-failed", async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find the payment
    const payment = await Payment.findOne({
      where: { paymentId: paymentId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment status
    await payment.update({
      paymentStatus: "Failed",
    });

    res.json({
      success: true,
      message: "Payment failure recorded",
      payment: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        status: "Failed",
      },
    });
  } catch (error) {
    console.error("Error recording payment failure:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add this route to your EsewaController.js file
router.get("/mobile-payment-bridge", (req, res) => {
  const { amount, pid, scd, signature, signed_field_names } = req.query;

  // Create an HTML page with auto-submitting form
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>eSewa Payment</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      padding: 20px;
      background-color: #f8f8f8;
      margin: 0;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .logo {
      width: 120px;
      margin-bottom: 20px;
    }
    .loader {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #60bb46;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 {
      color: #333;
      font-size: 24px;
      margin-bottom: 10px;
    }
    p {
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://esewa.com.np/common/images/esewa_logo.png" alt="eSewa" class="logo">
    <h1>Connecting to eSewa</h1>
    <div class="loader"></div>
    <p>Please wait while we connect to eSewa payment system...</p>
    
    <!-- This form will be auto-submitted to eSewa -->
    <form id="esewaForm" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="tax_amount" value="0" />
      <input type="hidden" name="total_amount" value="${amount}" />
      <input type="hidden" name="transaction_uuid" value="${pid}" />
      <input type="hidden" name="product_code" value="${scd}" />
      <input type="hidden" name="product_service_charge" value="0" />
      <input type="hidden" name="product_delivery_charge" value="0" />
      <input type="hidden" name="success_url" value="http://${req.headers.host}/api/esewa/complete-payment" />
      <input type="hidden" name="failure_url" value="http://${req.headers.host}/api/esewa/payment-failed" />
      <input type="hidden" name="signed_field_names" value="${signed_field_names}" />
      <input type="hidden" name="signature" value="${signature}" />
    </form>
    
    <script>
      // Submit the form automatically after a short delay
      window.onload = function() {
        setTimeout(function() {
          document.getElementById('esewaForm').submit();
        }, 1000);
      };
    </script>
  </div>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
