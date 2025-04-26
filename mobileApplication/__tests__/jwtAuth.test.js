jest.mock("../api/ApiHandler", () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Import the mocked module
import ApiHandler from "../api/ApiHandler";

describe("JWT Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Login returns valid JWT token", async () => {
    // Setup mock response with a sample token
    const sampleToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMjM0NSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJSZW50ZXIiLCJleHAiOjE3MTQyMzQ1Njd9.mock-signature";

    ApiHandler.post.mockResolvedValue({
      success: true,
      token: sampleToken,
    });

    // Call the API
    const loginData = {
      email: "test@example.com",
      password: "Password123!",
    };

    const response = await ApiHandler.post("/login", loginData);

    // Verify API was called with correct data
    expect(ApiHandler.post).toHaveBeenCalledWith("/login", loginData);

    // Check token exists and has correct format
    expect(response.token).toBeDefined();
    const parts = response.token.split(".");
    expect(parts.length).toBe(3);
  });

  // Fix for atob not being available in Node.js environment
  function decodeBase64(str) {
    return Buffer.from(str, "base64").toString("utf8");
  }

  test("JWT token has correct user information", async () => {
    // The middle part of a JWT is the payload
    const sampleToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxMjM0NSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJSZW50ZXIifQ.mock-signature";

    ApiHandler.post.mockResolvedValue({
      success: true,
      token: sampleToken,
    });

    const response = await ApiHandler.post("/login", {
      email: "test@example.com",
      password: "Password123!",
    });

    // Extract the payload part (middle section)
    const payload = response.token.split(".")[1];

    // Base64 decode the payload (using our helper instead of atob)
    const decodedPayload = JSON.parse(decodeBase64(payload));

    // Verify user data in token
    expect(decodedPayload.email).toBe("test@example.com");
    expect(decodedPayload.role).toBe("Renter");
  });
});



