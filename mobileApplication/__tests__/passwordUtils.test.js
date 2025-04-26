import { hashPassword, verifyPassword } from "../utils/passwordUtils";

describe("Password Hashing", () => {
  // Basic functionality tests
  test("password hash has correct format", async () => {
    const hash = await hashPassword("TestPassword123");
    expect(hash).toMatch(/^sha256:[a-f0-9]+:[a-f0-9]+$/);
  });

  test("password verification works with correct password", async () => {
    const password = "CorrectPassword123!";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  test("password verification fails with wrong password", async () => {
    const password = "CorrectPassword123!";
    const wrongPassword = "WrongPassword456!";
    const hash = await hashPassword(password);
    const result = await verifyPassword(wrongPassword, hash);
    expect(result).toBe(false);
  });

  test("same password hashed twice produces different hashes", async () => {
    const password = "SamePassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  test("verifyPassword returns false for invalid hash format", async () => {
    const result = await verifyPassword("password", "invalid-format");
    expect(result).toBe(false);
  });
});
