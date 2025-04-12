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
    const { agreementId, amount, uniqueSuffix, bookingId } = req.body;

    if (!agreementId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID and amount are required",
      });
    }

    // Validate agreement exists
    const agreement = await Agreement.findOne({
      where: { agreementId: agreementId },
    });

    if (!agreement) {
      return res.status(400).json({
        success: false,
        message: "Agreement not found",
      });
    }

    // Use bookingId from request or from agreement
    const paymentBookingId = bookingId || agreement.bookingId;

    // Create a pending payment record
    const payment = await Payment.create({
      agreementId: agreementId,
      renterId: agreement.renterId,
      amount: amount,
      paymentStatus: "Pending",
      PaymentGateway: "eSewa",
      paymentDate: new Date(),
      bookingId: paymentBookingId, // Store bookingId in payment record
    });

    // Create unique transaction ID by combining payment ID with suffix
    const transactionId = uniqueSuffix
      ? `${payment.paymentId}-${uniqueSuffix}`
      : payment.paymentId.toString();

    // Store the transactionId for later reference
    await payment.update({
      TransactionId: transactionId,
    });

    // Get eSewa payment hash
    const paymentInitiate = await getEsewaPaymentHash({
      amount: amount,
      transaction_uuid: transactionId,
    });

    // Return payment data and eSewa parameters
    res.json({
      success: true,
      payment: paymentInitiate,
      paymentData: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        renterId: payment.renterId,
        bookingId: paymentBookingId, // Include bookingId in response
        status: payment.paymentStatus,
        transactionId: transactionId,
      },
      paymentParams: {
        amt: amount,
        pid: transactionId,
        scd: process.env.ESEWA_PRODUCT_CODE,
      },
      redirectUrl: `https://rc-epay.esewa.com.np/api/epay/main/v2/form`,
      successUrl: `http://${req.headers.host}/api/esewa/complete-payment`,
      failureUrl: `http://${req.headers.host}/api/esewa/payment-failed`,
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/complete-payment", async (req, res) => {
  const { data } = req.query;
  console.log("Payment success callback received with data:", data);

  if (!data) {
    return res.status(400).json({
      success: false,
      message: "Missing payment data",
    });
  }

  const transaction = await db.transaction();

  try {
    const paymentInfo = await verifyEsewaPayment(data);

    if (!paymentInfo || !paymentInfo.response || !paymentInfo.decodedData) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Extract payment ID from transaction_uuid
    let paymentId;
    if (paymentInfo.response.transaction_uuid.includes("-")) {
      paymentId = parseInt(paymentInfo.response.transaction_uuid.split("-")[0]);
    } else {
      paymentId = parseInt(paymentInfo.response.transaction_uuid);
    }

    if (isNaN(paymentId)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    // Find the payment record
    const payment = await Payment.findOne({
      where: { paymentId: paymentId },
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Check if payment is already completed
    if (payment.paymentStatus === "Completed") {
      await transaction.rollback();
      return res.json({
        success: true,
        message: "Payment already processed",
        paymentData: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          transactionId: payment.TransactionId || "N/A",
          date: payment.paymentDate,
          status: payment.paymentStatus,
          bookingId: payment.bookingId, // Include bookingId in response
        },
        redirectData: {
          type: "success",
          paymentId: payment.paymentId,
          transactionId: payment.TransactionId || "N/A",
          amount: payment.amount,
          bookingId: payment.bookingId, // Include bookingId in redirect data
        },
      });
    }

    let propertyId = null;
    let landlordId = null;
    let address = null;
    let bookingId = payment.bookingId || null;

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

    // Find the agreement
    const agreement = await Agreement.findOne({
      where: { agreementId: agreementId },
      transaction,
    });

    if (agreement) {
      // Use bookingId from payment if available, otherwise use from agreement
      bookingId = bookingId || agreement.bookingId;
      landlordId = agreement.landlordId;

      // Only query booking if we have a bookingId
      if (bookingId) {
        const booking = await Booking.findOne({
          where: { bookingId: bookingId },
          transaction,
        });

        if (booking) {
          propertyId = booking.propertyId;

          const property = await Property.findOne({
            where: { propertyId: propertyId },
            transaction,
          });

          if (property) {
            address = property.address;
          }

          // Update property status to "Rented"
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

          // Update booking status to "Approved"
          await Booking.update(
            { status: "Accepted" },
            {
              where: { bookingId: booking.bookingId },
              transaction,
            }
          );

          console.log(
            `Booking ${booking.bookingId} marked as Approved after payment ${paymentId}`
          );
        }
      }
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Payment processed successfully",
      paymentData: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        transactionId: paymentInfo.decodedData.transaction_code,
        date: payment.paymentDate,
        status: "Completed",
        bookingId: bookingId,
      },
      redirectData: {
        type: "success",
        paymentId: payment.paymentId,
        transactionId: paymentInfo.decodedData.transaction_code,
        amount: payment.amount,
        landlordId: landlordId,
        renterId: payment.renterId,
        propertyId: propertyId,
        agreementId: agreementId,
        bookingId: bookingId,
        address: address,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Payment verification error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      redirectData: {
        type: "error",
        message: error.message,
      },
    });
  }
});

router.post("/payment-failed", async (req, res) => {
  try {
    const paymentId = req.body.paymentId || req.body.pid || req.query.pid;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    let parsedPaymentId = paymentId;
    if (paymentId.includes("-")) {
      parsedPaymentId = parseInt(paymentId.split("-")[0]);
    }

    const payment = await Payment.findOne({
      where: { paymentId: parsedPaymentId },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
        redirectData: {
          type: "error",
          message: "Payment record not found",
        },
      });
    }

    await payment.update({
      paymentStatus: "Failed",
    });

    return res.json({
      success: true,
      message: "Payment failure recorded",
      payment: {
        paymentId: payment.paymentId,
        amount: payment.amount,
        agreementId: payment.agreementId,
        status: "Failed",
      },
      redirectData: {
        type: "error",
        message: "Payment was unsuccessful",
        paymentId: payment.paymentId,
        agreementId: payment.agreementId,
      },
    });
  } catch (error) {
    console.error("Error recording payment failure:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      redirectData: {
        type: "error",
        message: error.message,
      },
    });
  }
});

router.post("/updateBookingStatus", async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and status are required",
      });
    }

    // Update the booking status
    const [updatedRows] = await Booking.update(
      { status: status },
      { where: { bookingId: bookingId } }
    );

    if (updatedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Booking status not updated",
      });
    }

    // Get the updated booking
    const booking = await Booking.findOne({
      where: { bookingId: bookingId },
    });

    return res.json({
      success: true,
      message: `Booking ${bookingId} status updated to ${status}`,
      booking: booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/updateStatusByAgreement", async (req, res) => {
  try {
    const { agreementId, status } = req.body;

    if (!agreementId || !status) {
      return res.status(400).json({
        success: false,
        message: "Agreement ID and status are required",
      });
    }

    // Find the agreement to get the booking ID
    const agreement = await Agreement.findOne({
      where: { agreementId: agreementId },
    });

    if (!agreement || !agreement.bookingId) {
      return res.status(404).json({
        success: false,
        message: "Agreement not found or no booking associated",
      });
    }

    // Update the booking status
    const [updatedRows] = await Booking.update(
      { status: status },
      { where: { bookingId: agreement.bookingId } }
    );

    if (updatedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Booking status not updated",
      });
    }

    // Get the updated booking
    const booking = await Booking.findOne({
      where: { bookingId: agreement.bookingId },
    });

    return res.json({
      success: true,
      message: `Booking ${agreement.bookingId} status updated to ${status}`,
      booking: booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/payment-params", async (req, res) => {
  try {
    const { pid, amount, scd } = req.query;

    if (!pid || !amount || !scd) {
      return res.status(400).json({
        success: false,
        message: "Payment ID, amount, and merchant code are required",
      });
    }

    // Get payment hash from eSewa
    const paymentHash = await getEsewaPaymentHash({
      amount,
      transaction_uuid: pid,
    });

    // Return parameters needed for the frontend form
    return res.json({
      success: true,
      formParams: {
        formAction: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        amount: amount,
        tax_amount: "0",
        total_amount: amount,
        transaction_uuid: pid,
        product_code: scd,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `http://${req.headers.host}/api/esewa/complete-payment`,
        failure_url: `http://${req.headers.host}/api/esewa/payment-failed`,
        signed_field_names: paymentHash.signed_field_names,
        signature: paymentHash.signature,
      },
    });
  } catch (error) {
    console.error("Error generating payment parameters:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
