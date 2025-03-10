const express = require("express");
const router = express.Router();
const { getEsewaPaymentHash, verifyEsewaPayment } = require("../models/esewa");
const Agreement = require("../models/Agreement");
const Payment = require("../models/Payment");
const { db } = require("../db");

// Update the initialize-agreement-payment route:

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
        transactionId: transactionId, // Include this for reference
      },
      paymentParams: {
        amt: amount,
        pid: transactionId, // Important: Use the unique transaction ID here
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

  if (!data) {
    return res.status(400).json({
      success: false,
      message: "Payment data is required",
    });
  }

  const transaction = await db.transaction();

  try {
    // Verify payment with eSewa
    const paymentInfo = await verifyEsewaPayment(data);

    if (!paymentInfo || !paymentInfo.response || !paymentInfo.decodedData) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid payment information received",
      });
    }

    // Extract payment ID from transaction_uuid
    const paymentId = parseInt(paymentInfo.response.transaction_uuid);

    if (isNaN(paymentId)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID in response",
      });
    }

    // Find the payment record
    const payment = await Payment.findOne({
      where: { paymentId: paymentId },
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Check if payment is already completed
    if (payment.paymentStatus === "Completed") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment has already been completed",
      });
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

    // No agreement status update here - payment process is independent

    await transaction.commit();

    res.json({
      success: true,
      message: "Payment successful",
      payment: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        status: "Completed",
        transactionId: paymentInfo.decodedData.transaction_code,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during payment verification",
      error: error.message,
    });
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

module.exports = router;
