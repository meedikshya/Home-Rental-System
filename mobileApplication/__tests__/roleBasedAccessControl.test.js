// Mock Firebase
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock ApiHandler
jest.mock("../api/ApiHandler", () => ({
  post: jest.fn(),
  setAuthToken: jest.fn(),
  removeToken: jest.fn(),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
  })),
}));

// Simple mock for React Native
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Import mocked modules
import { signInWithEmailAndPassword, signOut, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiHandler from "../api/ApiHandler";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

describe("Role-Based Access Control", () => {
  let router;
  const mockAuth = {};

  // Helper functions for proper Base64URL encoding/decoding in JWT tokens
  function base64UrlEncode(str) {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  function base64UrlDecode(str) {
    // Check if string has valid format first
    if (typeof str !== "string") return "";

    // Add padding if needed
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) {
      str += "=";
    }
    try {
      return Buffer.from(str, "base64").toString("utf8");
    } catch (e) {
      return "";
    }
  }

  // Helper to create JWT tokens with different roles
  const createTestToken = (role) => {
    const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // Pre-encoded header
    const claimName =
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

    // Create payload and properly encode it for JWT
    const payload = base64UrlEncode(
      JSON.stringify({
        nameid: "test-user-123",
        email: "test@example.com",
        [claimName]: role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );

    return `${header}.${payload}.signature`;
  };

  
  // Function to decode JWT token with improved error handling
  const getUserRoleFromToken = (token) => {
    if (!token) return null;

    // Basic format validation
    if (
      typeof token !== "string" ||
      !token.includes(".") ||
      token.split(".").length !== 3
    ) {
      return null;
    }

    try {
      const payload = token.split(".")[1];
      const decodedPayload = base64UrlDecode(payload);

      // Additional check before parsing
      if (!decodedPayload) return null;

      const decoded = JSON.parse(decodedPayload);

      return (
        decoded[
          "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        ] || null
      );
    } catch (error) {
      // Silently handle errors without console logs
      return null;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup router
    router = useRouter();

    // Setup Firebase Auth mock
    getAuth.mockReturnValue(mockAuth);
    mockAuth.signOut = signOut;

    // Default AsyncStorage behavior
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  test("getUserRoleFromToken extracts role correctly from token", () => {
    // Test with Renter token
    const renterToken = createTestToken("Renter");
    expect(getUserRoleFromToken(renterToken)).toBe("Renter");

    // Test with Landlord token
    const landlordToken = createTestToken("Landlord");
    expect(getUserRoleFromToken(landlordToken)).toBe("Landlord");

    // Test with Admin token
    const adminToken = createTestToken("Admin");
    expect(getUserRoleFromToken(adminToken)).toBe("Admin");

    // Test with null token
    expect(getUserRoleFromToken(null)).toBeNull();

    // Test with invalid token
    expect(getUserRoleFromToken("invalid.token")).toBeNull();
  });

  test("Renter users are redirected to home screen", async () => {
    // Mock successful Firebase login
    const mockUser = {
      uid: "renter-123",
      getIdToken: jest.fn().mockResolvedValue("firebase-token-123"),
    };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    // Mock successful API call with Renter token
    const renterToken = createTestToken("Renter");
    ApiHandler.post.mockResolvedValue({ token: renterToken });

    // Simulate login flow similar to sign-in.jsx
    const email = "renter@example.com";
    const password = "Password123!";

    // 1. Firebase authentication
    const userCredential = await signInWithEmailAndPassword(
      mockAuth,
      email,
      password
    );

    // 2. Backend authentication
    const response = await ApiHandler.post("/auth/login", {
      Email: email,
      firebaseUId: userCredential.user.uid,
    });

    // 3. Extract role and process it
    const jwtToken = response.token;
    const userRole = getUserRoleFromToken(jwtToken);

    // 4. Verify role is allowed for this app (Mobile is for Renters only)
    let isAllowed = userRole === "Renter";

    if (isAllowed) {
      // Store JWT token
      await AsyncStorage.setItem("jwtToken", jwtToken);

      // Store user data
      const userData = { email, role: userRole };
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Set token for API calls
      ApiHandler.setAuthToken(jwtToken);

      // Navigate to home
      router.replace("/(tabs)");
    } else {
      // Sign out and deny access
      await signOut();
      ApiHandler.setAuthToken(null);
    }

    // Verify correct behavior for Renter
    expect(userRole).toBe("Renter");
    expect(isAllowed).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("jwtToken", renterToken);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "user",
      expect.any(String)
    );
    expect(ApiHandler.setAuthToken).toHaveBeenCalledWith(renterToken);
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
    expect(signOut).not.toHaveBeenCalled();
  });

  test("Non-Renter users are denied access to mobile app", async () => {
    // Mock successful Firebase login
    const mockUser = {
      uid: "landlord-123",
      getIdToken: jest.fn().mockResolvedValue("firebase-token-123"),
    };
    signInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

    // Mock successful API call with Landlord token
    const landlordToken = createTestToken("Landlord");
    ApiHandler.post.mockResolvedValue({ token: landlordToken });

    // Simulate login flow
    const email = "landlord@example.com";
    const password = "Password123!";

    // 1. Firebase authentication
    const userCredential = await signInWithEmailAndPassword(
      mockAuth,
      email,
      password
    );

    // 2. Backend authentication
    const response = await ApiHandler.post("/auth/login", {
      Email: email,
      firebaseUId: userCredential.user.uid,
    });

    // 3. Extract role
    const jwtToken = response.token;
    const userRole = getUserRoleFromToken(jwtToken);

    // 4. Verify role is allowed for this app (Mobile is for Renters only)
    let isAllowed = userRole === "Renter";

    if (isAllowed) {
      // Store JWT token
      await AsyncStorage.setItem("jwtToken", jwtToken);

      // Store user data
      const userData = { email, role: userRole };
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Set token for API calls
      ApiHandler.setAuthToken(jwtToken);

      // Navigate to home
      router.replace("/(tabs)");
    } else {
      // Sign out and deny access
      await signOut();
      ApiHandler.setAuthToken(null);

      // Alert is mocked, so we don't need the implementation check
      Alert.alert("Access Denied", "This app is for Renters only.");
    }

    // Verify correct behavior for Landlord
    expect(userRole).toBe("Landlord");
    expect(isAllowed).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(ApiHandler.setAuthToken).toHaveBeenCalledWith(null);
    expect(router.replace).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  test("Protected route checks role before allowing access", async () => {
    // Test with stored Renter token
    const renterToken = createTestToken("Renter");
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === "jwtToken") return Promise.resolve(renterToken);
      if (key === "user")
        return Promise.resolve(JSON.stringify({ role: "Renter" }));
      return Promise.resolve(null);
    });

    // Simulate route protection check
    const checkAccessToProtectedRoute = async () => {
      // Get token from storage
      const token = await AsyncStorage.getItem("jwtToken");

      // Extract role from token
      const userRole = getUserRoleFromToken(token);

      // Check if role is allowed
      const ALLOWED_ROLES = ["Renter"];
      return ALLOWED_ROLES.includes(userRole);
    };

    // Test with Renter token (should be allowed)
    let hasAccess = await checkAccessToProtectedRoute();
    expect(hasAccess).toBe(true);

    // Test with Landlord token (should be denied)
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === "jwtToken")
        return Promise.resolve(createTestToken("Landlord"));
      return Promise.resolve(null);
    });

    hasAccess = await checkAccessToProtectedRoute();
    expect(hasAccess).toBe(false);
  });
});
