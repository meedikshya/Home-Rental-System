const mockDate = (() => {
  let currentDate = new Date();

  return {
    set: (date) => {
      currentDate = new Date(date);
    },
    now: () => currentDate.getTime(),
    restore: () => {
      currentDate = new Date();
    },
  };
})();
const AgreementExpirationHandler = {
  findExpiredAgreements: function (agreements, currentDate = new Date()) {
    return agreements.filter(
      (agreement) =>
        new Date(agreement.endDate) < currentDate &&
        agreement.status !== "Expired"
    );
  },
  processExpiredAgreements: function (
    agreements,
    bookings,
    properties,
    currentDate = new Date()
  ) {
    const expiredAgreements = this.findExpiredAgreements(
      agreements,
      currentDate
    );
    if (expiredAgreements.length === 0) {
      return {
        processed: false,
        message: "No expired agreements found",
        updatedItems: {
          agreements: [],
          bookings: [],
          properties: [],
        },
      };
    }
    // Get booking IDs from expired agreements
    const bookingIds = expiredAgreements.map((a) => a.bookingId);
    // Update agreement statuses
    expiredAgreements.forEach((agreement) => {
      agreement.status = "Expired";
    });
    // Find and update associated bookings
    const affectedBookings = bookings.filter((booking) =>
      bookingIds.includes(booking.bookingId)
    );
    affectedBookings.forEach((booking) => {
      booking.status = "Expired";
    });
    // Get property IDs from the bookings
    const propertyIds = [...new Set(affectedBookings.map((b) => b.propertyId))];
    // Find and update associated properties
    const affectedProperties = properties.filter((property) =>
      propertyIds.includes(property.propertyId)
    );
    affectedProperties.forEach((property) => {
      property.status = "Available";
    });
    return {
      processed: true,
      message: `Updated ${expiredAgreements.length} agreements, ${affectedBookings.length} bookings, and ${affectedProperties.length} properties`,
      updatedItems: {
        agreements: expiredAgreements,
        bookings: affectedBookings,
        properties: affectedProperties,
      },
    };
  },
};
describe("Agreement Expiration Detection", () => {
  // Sample data for testing
  const sampleData = {
    agreements: [
      {
        agreementId: 1,
        bookingId: 101,
        startDate: "2024-01-01",
        endDate: "2024-03-31",
        status: "Active",
      },
      {
        agreementId: 2,
        bookingId: 102,
        startDate: "2024-02-01",
        endDate: "2025-01-31",
        status: "Active",
      },
      {
        agreementId: 3,
        bookingId: 103,
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        status: "Active",
      },
      {
        agreementId: 4,
        bookingId: 104,
        startDate: "2023-06-01",
        endDate: "2023-11-30",
        status: "Expired",
      },
    ],
    bookings: [
      { bookingId: 101, propertyId: 201, status: "Confirmed" },
      { bookingId: 102, propertyId: 202, status: "Confirmed" },
      { bookingId: 103, propertyId: 203, status: "Confirmed" },
      { bookingId: 104, propertyId: 204, status: "Expired" },
    ],
    properties: [
      { propertyId: 201, status: "Rented" },
      { propertyId: 202, status: "Rented" },
      { propertyId: 203, status: "Rented" },
      { propertyId: 204, status: "Available" },
    ],
  };
  // Reset data before each test
  let agreements, bookings, properties;
  beforeEach(() => {
    // Deep clone the sample data to avoid test interference
    agreements = JSON.parse(JSON.stringify(sampleData.agreements));
    bookings = JSON.parse(JSON.stringify(sampleData.bookings));
    properties = JSON.parse(JSON.stringify(sampleData.properties));
    mockDate.restore();
  });
  test("Should identify expired agreements correctly", () => {
    // Set current date to April 15, 2024
    mockDate.set("2024-04-15");
    const currentDate = new Date(mockDate.now());
    // Find expired agreements
    const expiredAgreements = AgreementExpirationHandler.findExpiredAgreements(
      agreements,
      currentDate
    );
    // Should find only one expired agreement (ID: 1 and 3, but 3 has earlier endDate)
    expect(expiredAgreements.length).toBe(2);
    expect(expiredAgreements[0].agreementId).toBe(1);
    expect(expiredAgreements[1].agreementId).toBe(3);
  });
  test("Should not identify non-expired agreements", () => {
    // Set current date to March 15, 2024 (before the first agreement expires)
    mockDate.set("2024-03-15");
    const currentDate = new Date(mockDate.now());
    // Find expired agreements
    const expiredAgreements = AgreementExpirationHandler.findExpiredAgreements(
      agreements,
      currentDate
    );
    // Should find only agreement 3 (from 2023)
    expect(expiredAgreements.length).toBe(1);
    expect(expiredAgreements[0].agreementId).toBe(3);
  });
  test("Should not process already expired agreements", () => {
    // Set current date to December 15, 2023 (after agreement 4 expired)
    mockDate.set("2023-12-15");
    const currentDate = new Date(mockDate.now());
    // Find expired agreements
    const expiredAgreements = AgreementExpirationHandler.findExpiredAgreements(
      agreements,
      currentDate
    );
    // Should not include agreement 4 which is already marked expired
    expect(expiredAgreements.every((a) => a.agreementId !== 4)).toBe(true);
  });
  test("Should update all related records when agreements expire", () => {
    // Set current date to April 15, 2024 (after agreement 1 expires)
    mockDate.set("2024-04-15");
    const currentDate = new Date(mockDate.now());
    // Process expired agreements
    const result = AgreementExpirationHandler.processExpiredAgreements(
      agreements,
      bookings,
      properties,
      currentDate
    );
    // Verify process ran successfully
    expect(result.processed).toBe(true);
    // Verify agreements were updated
    expect(result.updatedItems.agreements.length).toBe(2);
    expect(agreements.find((a) => a.agreementId === 1).status).toBe("Expired");
    expect(agreements.find((a) => a.agreementId === 3).status).toBe("Expired");
    // Verify bookings were updated
    expect(result.updatedItems.bookings.length).toBe(2);
    expect(bookings.find((b) => b.bookingId === 101).status).toBe("Expired");
    expect(bookings.find((b) => b.bookingId === 103).status).toBe("Expired");
    // Verify properties were updated
    expect(result.updatedItems.properties.length).toBe(2);
    expect(properties.find((p) => p.propertyId === 201).status).toBe(
      "Available"
    );
    expect(properties.find((p) => p.propertyId === 203).status).toBe(
      "Available"
    );
  });
});
