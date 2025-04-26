jest.mock("../api/ApiHandler", () => ({
  delete: jest.fn(),
}));
import ApiHandler from "../api/ApiHandler";

const cancelAgreementAndBooking = async (bookingId, agreementId) => {
  await ApiHandler.delete(`/Agreements/${agreementId}`);
  await ApiHandler.delete(`/Bookings/${bookingId}`);
  return true;
};
describe("Booking Cancellation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Cancel agreement and booking", async () => {
    const bookingId = 54;
    const agreementId = 49;
    ApiHandler.delete.mockResolvedValueOnce({ status: 200 });
    ApiHandler.delete.mockResolvedValueOnce({ status: 200 });
    await cancelAgreementAndBooking(bookingId, agreementId);
    expect(ApiHandler.delete).toHaveBeenCalledTimes(2);
    expect(ApiHandler.delete).toHaveBeenNthCalledWith(
      1,
      `/Agreements/${agreementId}`
    );
    expect(ApiHandler.delete).toHaveBeenNthCalledWith(
      2,
      `/Bookings/${bookingId}`
    );
  });
});
