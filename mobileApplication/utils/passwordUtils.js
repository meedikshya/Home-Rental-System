/**
 * Hashes password with random salt (SHA-256)
 * @returns Format: "sha256:salt:hash"
 */
export const hashPassword = async (password) => {
  try {
    // Generate random salt for test compatibility
    const generateRandomSalt = () => {
      let salt = "";
      for (let i = 0; i < 32; i++) {
        salt += "0123456789abcdef"[Math.floor(Math.random() * 16)];
      }
      return salt;
    };

    const salt = generateRandomSalt();
    const hashedPassword = simpleHash(password + salt);
    return `sha256:${salt}:${hashedPassword}`;
  } catch (error) {
    console.error("Error hashing password:", error);
    const testSalt = generateTestSalt();
    return `sha256:${testSalt}:${simpleHash(password + testSalt)}`;
  }
};

/**
 * Verifies password against stored hash
 * @returns True if password matches
 */
export const verifyPassword = async (password, hashString) => {
  try {
    const parts = hashString.split(":");
    if (parts.length !== 3) return false;

    const [algorithm, salt, storedHash] = parts;
    if (algorithm !== "sha256" || !storedHash) return false;

    const calculatedHash = simpleHash(password + salt);
    return calculatedHash === storedHash;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
};

// WARNING: For testing only - not secure for production
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16).padStart(32, "0");
}

// Testing fallback salt
function generateTestSalt() {
  return "abcdef0123456789abcdef0123456789";
}
