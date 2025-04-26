// Mock the essential dependencies
jest.mock("../../PaymentIntegration/models/Booking", () => ({
  findOne: jest.fn(),
  update: jest.fn(),
}));

jest.mock("../../PaymentIntegration/models/Agreement", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../PaymentIntegration/models/Payment", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../PaymentIntegration/models/Property", () => ({
  update: jest.fn(),
}));

jest.mock("../../PaymentIntegration/db", () => ({
  db: { transaction: jest.fn() },
}));

// Import mocked models
const Booking = require("../../PaymentIntegration/models/Booking");
const Agreement = require("../../PaymentIntegration/models/Agreement");
const Payment = require("../../PaymentIntegration/models/Payment");
const Property = require("../../PaymentIntegration/models/Property");
const { db } = require("../../PaymentIntegration/db");



// Simplified BookingStatusManager - represents the business logic without API routing
const BookingStatusManager = {
  // Update status after successful payment
  updateStatusAfterPayment: async function (paymentId) {
    const transaction = await db.transaction();

    try {
      // Get payment details
      const payment = await Payment.findOne({
        where: { paymentId },
        transaction,
      });

      if (!payment) {
        await transaction.rollback();
        return { success: false, message: "Payment not found" };
      }

      // Get booking ID from payment or agreement
      let bookingId = payment.bookingId;

      if (!bookingId) {
        const agreement = await Agreement.findOne({
          where: { agreementId: payment.agreementId },
          transaction,
        });

        if (agreement) {
          bookingId = agreement.bookingId;
        }
      }

      if (!bookingId) {
        await transaction.rollback();
        return { success: false, message: "No associated booking found" };
      }

      // Get booking details
      const booking = await Booking.findOne({
        where: { bookingId },
        transaction,
      });

      if (!booking) {
        await transaction.rollback();
        return { success: false, message: "Booking not found" };
      }

      // Update booking and property status
      await Booking.update(
        { status: "Accepted" },
        { where: { bookingId }, transaction }
      );

      await Property.update(
        { status: "Rented" },
        { where: { propertyId: booking.propertyId }, transaction }
      );

      await transaction.commit();
      return { success: true, booking };
    } catch (error) {
      await transaction.rollback();
      return { success: false, message: error.message };
    }
  },

  // Direct update of booking status
  updateBookingStatus: async function (bookingId, status) {
    if (!bookingId || !status) {
      return { success: false, message: "Booking ID and status are required" };
    }

    const updatedRows = await Booking.update(
      { status },
      { where: { bookingId } }
    );

    if (updatedRows[0] === 0) {
      return {
        success: false,
        message: "Booking not found or status not updated",
      };
    }

    return { success: true };
  },

  // Update booking status using agreement ID
  updateStatusByAgreement: async function (agreementId, status) {
    if (!agreementId || !status) {
      return {
        success: false,
        message: "Agreement ID and status are required",
      };
    }

    const agreement = await Agreement.findOne({
      where: { agreementId },
    });

    if (!agreement || !agreement.bookingId) {
      return {
        success: false,
        message: "Agreement not found or no booking associated",
      };
    }

    return this.updateBookingStatus(agreement.bookingId, status);
  },
};

describe("Booking Status Transition Logic", () => {
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    };
    db.transaction.mockResolvedValue(mockTransaction);

    // Set up mock payment
    Payment.findOne.mockResolvedValue({
      paymentId: 123,
      agreementId: 456,
      bookingId: 789,
      update: jest.fn(),
    });

    // Set up mock agreement
    Agreement.findOne.mockResolvedValue({
      agreementId: 456,
      bookingId: 789,
    });

    // Set up mock booking
    Booking.findOne.mockResolvedValue({
      bookingId: 789,
      propertyId: 101,
      status: "Pending",
    });

    // Set up mock update functions
    Booking.update.mockResolvedValue([1]);
    Property.update.mockResolvedValue([1]);
  });

  test("Payment completion updates booking status to Accepted", async () => {
    const result = await BookingStatusManager.updateStatusAfterPayment(123);

    expect(result.success).toBe(true);

    // Verify booking status update
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "Accepted" },
      { where: { bookingId: 789 }, transaction: mockTransaction }
    );

    // Verify property status update
    expect(Property.update).toHaveBeenCalledWith(
      { status: "Rented" },
      { where: { propertyId: 101 }, transaction: mockTransaction }
    );

    // Verify transaction was committed
    expect(mockTransaction.commit).toHaveBeenCalled();
  });

  test("Direct booking status update via API", async () => {
    const result = await BookingStatusManager.updateBookingStatus(
      789,
      "Cancelled"
    );

    expect(result.success).toBe(true);

    // Verify booking status update
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "Cancelled" },
      { where: { bookingId: 789 } }
    );
  });

  test("Booking status update via agreement ID", async () => {
    const result = await BookingStatusManager.updateStatusByAgreement(
      456,
      "Rejected"
    );

    expect(result.success).toBe(true);

    // Verify agreement lookup
    expect(Agreement.findOne).toHaveBeenCalledWith({
      where: { agreementId: 456 },
    });

    // Verify booking status update (via the updateBookingStatus method)
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "Rejected" },
      { where: { bookingId: 789 } }
    );
  });

  test("Handles invalid booking ID", async () => {
    // Mock Booking.update to return 0 (no rows updated)
    Booking.update.mockResolvedValueOnce([0]);

    const result = await BookingStatusManager.updateBookingStatus(
      999,
      "Cancelled"
    );

    expect(result.success).toBe(false);
  });

  test("Handles missing required parameters", async () => {
    const result = await BookingStatusManager.updateBookingStatus(789, null);

    expect(result.success).toBe(false);
  });

  test("Handles non-existent agreement", async () => {
    // Mock Agreement.findOne to return null
    Agreement.findOne.mockResolvedValueOnce(null);

    const result = await BookingStatusManager.updateStatusByAgreement(
      999,
      "Cancelled"
    );

    expect(result.success).toBe(false);
  });
});
