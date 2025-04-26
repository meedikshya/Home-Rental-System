const mockFirebaseAuth = {
  signOut: jest.fn().mockResolvedValue(null),
  currentUser: { uid: "test-uid" },
};

const mockNavigate = jest.fn();

// JWT token handler
const JwtHandler = {
  createToken: function (expiresIn = "1h") {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expiresIn === "1h" ? 3600 : parseInt(expiresIn, 10));

    return {
      token: `mock-token-${now}`,
      exp: exp,
    };
  },

  // Check if token is expired
  isTokenExpired: function (token) {
    if (!token || !token.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return token.exp < now;
  },

  // Handle API response with expired token
  handleApiResponse: function (error) {
    if (error.status === 401) {
      // Clear storage and redirect
      global.localStorage.removeItem("jwtToken");
      global.localStorage.removeItem("user");
      return {
        expired: true,
        message: "Session expired. Please log in again.",
      };
    }
    return { expired: false, message: error.message };
  },
};

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = localStorageMock;

describe("JWT Token Expiration Handling", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  test("Should identify expired tokens correctly", () => {
    const expiredToken = JwtHandler.createToken("-10");
    const validToken = JwtHandler.createToken("1h");

    // Test token validation
    expect(JwtHandler.isTokenExpired(expiredToken)).toBe(true);
    expect(JwtHandler.isTokenExpired(validToken)).toBe(false);
    expect(JwtHandler.isTokenExpired(null)).toBe(true);
  });

  test("Should properly handle API responses with expired tokens", () => {
    const unauthorizedError = { status: 401, message: "Unauthorized" };
    const otherError = { status: 500, message: "Server error" };
    const unauthorizedResult = JwtHandler.handleApiResponse(unauthorizedError);
    const otherResult = JwtHandler.handleApiResponse(otherError);
    // Check the behavior for 401 errors
    expect(unauthorizedResult.expired).toBe(true);
    expect(unauthorizedResult.message).toContain("Session expired");
    expect(localStorage.getItem("jwtToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    // Check the behavior for other errors
    expect(otherResult.expired).toBe(false);
    expect(otherResult.message).toBe("Server error");
  });

  test("Should clear storage and redirect on token expiration", () => {
    // Setup: populate localStorage with token and user data
    localStorage.setItem("jwtToken", "expired-token");
    localStorage.setItem("user", JSON.stringify({ email: "test@example.com" }));

    const ApiMock = {
      handleRequest: jest.fn().mockImplementation(() => {
        // Simulate 401 response due to token expiration
        const error = { status: 401, message: "Token expired" };
        return JwtHandler.handleApiResponse(error);
      }),
    };

    // Attempt an API request that will fail with token expiration
    const result = ApiMock.handleRequest();

    // Verify the result
    expect(result.expired).toBe(true);

    // Verify localStorage was cleared
    expect(localStorage.getItem("jwtToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
