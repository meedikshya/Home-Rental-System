const express = require("express");
const router = express.Router();
const { getEsewaPaymentHash, verifyEsewaPayment } = require("../models/esewa");
const Agreement = require("../models/Agreement");
const Payment = require("../models/Payment");
const { db } = require("../db");

// Initialize eSewa payment for an agreement with signature-based approach
router.post("/initialize-agreement-payment", async (req, res) => {
  try {
    const { agreementId, amount } = req.body;

    if (!agreementId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID and amount are required",
      });
    }

    // Validate agreement exists and is pending payment
    const agreement = await Agreement.findOne({
      where: {
        agreementId: agreementId,
        status: "Approved",
      },
    });

    if (!agreement) {
      return res.status(400).json({
        success: false,
        message: "Agreement not found or payment not required",
      });
    }

    // Check if payment already exists for this agreement
    const existingPayment = await Payment.findOne({
      where: {
        agreementId: agreementId,
        paymentStatus: "Completed",
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this agreement",
        payment: existingPayment,
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

    // Initiate payment with eSewa - get payment hash
    const paymentInitiate = await getEsewaPaymentHash({
      amount: amount,
      transaction_uuid: payment.paymentId.toString(),
    });

    // Update agreement status
    await agreement.update({
      status: "PAYMENT_INITIATED",
    });

    // Respond with payment details (signature-based approach)
    res.json({
      success: true,
      payment: paymentInitiate, // Contains signature and field names
      paymentData: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        renterId: payment.renterId,
        status: payment.paymentStatus,
      },
      // Include these additional fields for frontend integration
      paymentParams: {
        amt: amount,
        pid: payment.paymentId.toString(),
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

    // Update the related agreement status
    await Agreement.update(
      { status: "ACTIVE" },
      {
        where: { agreementId: payment.agreementId },
        transaction,
      }
    );

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

    // Update agreement status back to pending payment
    await Agreement.update(
      { status: "PENDING_PAYMENT" },
      { where: { agreementId: payment.agreementId } }
    );

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

// Get payment status for an agreement
router.get("/agreement-payment-status/:agreementId", async (req, res) => {
  try {
    const { agreementId } = req.params;

    if (!agreementId) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID is required",
      });
    }

    // Find the latest payment for this agreement
    const payment = await Payment.findOne({
      where: { agreementId: agreementId },
      order: [["paymentDate", "DESC"]],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "No payment found for this agreement",
      });
    }

    // Get related agreement
    const agreement = await Agreement.findOne({
      where: { agreementId: agreementId },
    });

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found",
      });
    }

    res.json({
      success: true,
      payment: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        status: payment.paymentStatus,
        date: payment.paymentDate,
        paymentGateway: payment.PaymentGateway,
        transactionId: payment.TransactionId,
      },
      agreement: {
        agreementId: agreement.agreementId,
        status: agreement.status,
        startDate: agreement.startDate,
        endDate: agreement.endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
