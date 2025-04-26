jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock ApiHandler
jest.mock("../api/ApiHandler", () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import ApiHandler from "../api/ApiHandler";
import { hashPassword } from "../utils/passwordUtils";

describe("Firebase Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: User Registration
  test("User can register with email and password", async () => {
    const mockUser = { uid: "test-uid-123" };
    createUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    doc.mockReturnValue("users/test-uid-123");

    setDoc.mockResolvedValue(undefined);

    ApiHandler.post.mockResolvedValue({
      userId: "backend-user-id-123",
    });

    const email = "test@example.com";
    const password = "Password123!";
    const hashedPassword = await hashPassword(password);

    const userCredential = await createUserWithEmailAndPassword(
      null,
      email,
      password
    );
    const firebaseUserId = userCredential.user.uid;

    await setDoc(doc(null, "users", firebaseUserId), {
      email: email,
      userRole: "Renter",
      firebaseUId: firebaseUserId,
      createdAt: new Date(),
    });

    await ApiHandler.post("/Users", {
      email: email,
      passwordHash: hashedPassword,
      userRole: "Renter",
      firebaseUId: firebaseUserId,
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      null,
      email,
      password
    );

    expect(doc).toHaveBeenCalledWith(null, "users", firebaseUserId);

    expect(setDoc).toHaveBeenCalledWith(
      "users/test-uid-123",
      expect.objectContaining({
        email: email,
        firebaseUId: mockUser.uid,
        userRole: "Renter",
      })
    );

    expect(ApiHandler.post).toHaveBeenCalledWith(
      "/Users",
      expect.objectContaining({
        email: email,
        passwordHash: expect.stringMatching(/^sha256:[a-f0-9]+:[a-f0-9]+$/),
        firebaseUId: mockUser.uid,
      })
    );
  });

  // Test 2: Login with Firebase
  test("User can login with correct credentials", async () => {
    const mockUser = {
      uid: "test-uid-123",
      email: "test@example.com",
    };

    signInWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    const email = "test@example.com";
    const password = "Password123!";

    const userCredential = await signInWithEmailAndPassword(
      null,
      email,
      password
    );

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      null,
      email,
      password
    );

    expect(userCredential.user.uid).toBe(mockUser.uid);
    expect(userCredential.user.email).toBe(mockUser.email);
  });

  // Test 3: Registration Error Handling
  test("Registration handles existing email error", async () => {
    const errorMessage = "auth/email-already-in-use";
    createUserWithEmailAndPassword.mockRejectedValue({
      code: errorMessage,
    });

    const email = "existing@example.com";
    const password = "Password123!";

    await expect(
      createUserWithEmailAndPassword(null, email, password)
    ).rejects.toEqual({ code: errorMessage });

    expect(setDoc).not.toHaveBeenCalled();

    expect(ApiHandler.post).not.toHaveBeenCalled();
  });
});
