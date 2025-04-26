// Mock dependencies
jest.mock("../../PaymentIntegration/models/Payment", () => ({
  findOne: jest.fn(),
  update: jest.fn(),
}));

// Import mocked modules
const Payment = require("../../PaymentIntegration/models/Payment");

const PaymentStatusManager = {
  isValidTransition: function (currentStatus, newStatus) {
    // Valid transitions map
    const validTransitions = {
      Pending: ["Completed", "Failed", "Cancelled"],
      Completed: [],
      Failed: ["Pending"],
      Cancelled: ["Pending"],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  },

  // Update payment status if transition is valid
  updatePaymentStatus: async function (paymentId, newStatus) {
    if (!paymentId || !newStatus) {
      return { success: false, message: "Payment ID and status are required" };
    }

    try {
      // Get current payment
      const payment = await Payment.findOne({
        where: { paymentId },
      });

      if (!payment) {
        return { success: false, message: "Payment not found" };
      }

      // Check if transition is valid
      if (!this.isValidTransition(payment.paymentStatus, newStatus)) {
        return {
          success: false,
          message: `Invalid status transition from ${payment.paymentStatus} to ${newStatus}`,
        };
      }

      // Update payment status
      await Payment.update(
        { paymentStatus: newStatus },
        { where: { paymentId } }
      );

      return {
        success: true,
        message: `Payment status updated to ${newStatus}`,
        oldStatus: payment.paymentStatus,
        newStatus,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
};

describe("Payment Status Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Should validate status transitions correctly", () => {
    // Valid transitions
    expect(PaymentStatusManager.isValidTransition("Pending", "Completed")).toBe(
      true
    );
    expect(PaymentStatusManager.isValidTransition("Pending", "Failed")).toBe(
      true
    );
    expect(PaymentStatusManager.isValidTransition("Failed", "Pending")).toBe(
      true
    );

    // Invalid transitions
    expect(PaymentStatusManager.isValidTransition("Completed", "Failed")).toBe(
      false
    );
    expect(PaymentStatusManager.isValidTransition("Completed", "Pending")).toBe(
      false
    );
    expect(PaymentStatusManager.isValidTransition("Failed", "Completed")).toBe(
      false
    );
  });

  test("Should allow Pending to Completed transition", async () => {
    // Mock current payment with Pending status
    Payment.findOne.mockResolvedValue({
      paymentId: 123,
      paymentStatus: "Pending",
    });

    const result = await PaymentStatusManager.updatePaymentStatus(
      123,
      "Completed"
    );

    expect(result.success).toBe(true);
    expect(result.oldStatus).toBe("Pending");
    expect(result.newStatus).toBe("Completed");

    // Verify payment status update
    expect(Payment.update).toHaveBeenCalledWith(
      { paymentStatus: "Completed" },
      { where: { paymentId: 123 } }
    );
  });

  test("Should allow Pending to Failed transition", async () => {
    // Mock current payment with Pending status
    Payment.findOne.mockResolvedValue({
      paymentId: 123,
      paymentStatus: "Pending",
    });

    const result = await PaymentStatusManager.updatePaymentStatus(
      123,
      "Failed"
    );

    expect(result.success).toBe(true);
    expect(result.oldStatus).toBe("Pending");
    expect(result.newStatus).toBe("Failed");
  });

  test("Should prevent Completed to Failed transition", async () => {
    // Mock current payment with Completed status
    Payment.findOne.mockResolvedValue({
      paymentId: 123,
      paymentStatus: "Completed",
    });

    const result = await PaymentStatusManager.updatePaymentStatus(
      123,
      "Failed"
    );

    expect(result.success).toBe(false);
    expect(Payment.update).not.toHaveBeenCalled();
  });

  test("Should handle non-existent payment", async () => {
    // Mock Payment.findOne to return null
    Payment.findOne.mockResolvedValue(null);

    const result = await PaymentStatusManager.updatePaymentStatus(
      999,
      "Completed"
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
  });
});
