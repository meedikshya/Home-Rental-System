const EmailValidator = {
  // The regex from RegisterForm.js: /\S+@\S+\.\S+/
  emailRegex: /\S+@\S+\.\S+/,

  // Validation method matching RegisterForm.js implementation
  validateEmail: function (email) {
    if (!email || !email.trim()) {
      return { valid: false, message: "Email is required." };
    }

    if (!this.emailRegex.test(email)) {
      return { valid: false, message: "Please enter a valid email address." };
    }

    return { valid: true, message: "Email is valid" };
  },
};

describe("Email Format Validation", () => {
  test("Should accept valid email formats", () => {
    const validEmails = [
      "user@example.com",
      "user.name@example.com",
      "user+tag@example.com",
      "user-name@example.co.uk",
      "user_name@example-site.com",
      "user123@example.io",
    ];

    validEmails.forEach((email) => {
      const result = EmailValidator.validateEmail(email);
      expect(result.valid).toBe(true);
    });
  });

  test("Should reject emails missing @ symbol", () => {
    const email = "userexample.com";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(false);
  });

  test("Should reject emails missing username", () => {
    const email = "@example.com";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(false);
  });

  test("Should reject emails missing domain", () => {
    const email = "user@";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(false);
  });

  test("Should reject emails missing dot in domain", () => {
    const email = "user@domain";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(false);
  });

  test("Should allow emails with leading dots in domain", () => {
    const email = "user@.example.com";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(true);
  });

  test("Should reject emails with trailing dots", () => {
    const email = "user@example.";
    const result = EmailValidator.validateEmail(email);
    expect(result.valid).toBe(false);
  });

  test("Should validate against empty or null inputs", () => {
    const result1 = EmailValidator.validateEmail("");
    const result2 = EmailValidator.validateEmail("   ");
    const result3 = EmailValidator.validateEmail(null);
    const result4 = EmailValidator.validateEmail(undefined);

    expect(result1.valid).toBe(false);
    expect(result1.message).toBe("Email is required.");

    expect(result2.valid).toBe(false);
    expect(result2.message).toBe("Email is required.");

    expect(result3.valid).toBe(false);
    expect(result3.message).toBe("Email is required.");

    expect(result4.valid).toBe(false);
    expect(result4.message).toBe("Email is required.");
  });

  test("Should handle domain name with hyphen correctly", () => {
    const result = EmailValidator.validateEmail("user@example-domain.com");
    expect(result.valid).toBe(true);
  });

  test("Should handle subdomains correctly", () => {
    const result = EmailValidator.validateEmail("user@sub.example.com");
    expect(result.valid).toBe(true);
  });
});
