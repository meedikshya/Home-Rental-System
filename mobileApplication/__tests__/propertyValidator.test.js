const PropertyValidator = {
  rules: {
    title: {
      validate: (value) => {
        if (!value) return "Title is required";
        if (value.length < 3) return "Title must be at least 3 characters";
        if (value.length > 100) return "Title must be less than 100 characters";
        return "";
      },
    },
    description: {
      validate: (value) => {
        if (!value) return "Description is required";
        if (value.length < 10)
          return "Description must be at least 10 characters";
        return "";
      },
    },
    price: {
      validate: (value) => {
        if (!value) return "Price is required";
        if (isNaN(parseFloat(value))) return "Price must be a number";
        if (parseFloat(value) <= 0) return "Price must be positive";
        return "";
      },
    },
  },

  // Validate a single field
  validateField: function (fieldName, value) {
    if (!this.rules[fieldName]) return { valid: true, error: "" };

    const error = this.rules[fieldName].validate(value);
    return {
      valid: !error,
      error: error,
    };
  },

  // Validate entire form
  validateForm: function (formData) {
    const errors = {};
    let isValid = true;

    // Check each field with validation rules
    Object.keys(this.rules).forEach((fieldName) => {
      const { valid, error } = this.validateField(
        fieldName,
        formData[fieldName]
      );
      if (!valid) {
        errors[fieldName] = error;
        isValid = false;
      }
    });

    return { isValid, errors };
  },
};

describe("Property Form Validation", () => {
  test("Should validate title field correctly", () => {
    // Empty title
    expect(PropertyValidator.validateField("title", "")).toEqual({
      valid: false,
      error: "Title is required",
    });

    // Too short title
    expect(PropertyValidator.validateField("title", "Hi")).toEqual({
      valid: false,
      error: "Title must be at least 3 characters",
    });

    // Too long title
    const longTitle = "A".repeat(101);
    expect(PropertyValidator.validateField("title", longTitle)).toEqual({
      valid: false,
      error: "Title must be less than 100 characters",
    });

    // Valid title
    expect(PropertyValidator.validateField("title", "Nice Apartment")).toEqual({
      valid: true,
      error: "",
    });
  });

  test("Should validate description field correctly", () => {
    // Empty description
    expect(PropertyValidator.validateField("description", "")).toEqual({
      valid: false,
      error: "Description is required",
    });

    // Too short description
    expect(PropertyValidator.validateField("description", "Short")).toEqual({
      valid: false,
      error: "Description must be at least 10 characters",
    });

    // Valid description
    expect(
      PropertyValidator.validateField(
        "description",
        "This is a good description of the property"
      )
    ).toEqual({
      valid: true,
      error: "",
    });
  });

  test("Should validate price field correctly", () => {
    // Empty price
    expect(PropertyValidator.validateField("price", "")).toEqual({
      valid: false,
      error: "Price is required",
    });

    // Non-numeric price
    expect(PropertyValidator.validateField("price", "abc")).toEqual({
      valid: false,
      error: "Price must be a number",
    });

    // Zero price
    expect(PropertyValidator.validateField("price", "0")).toEqual({
      valid: false,
      error: "Price must be positive",
    });

    // Negative price
    expect(PropertyValidator.validateField("price", "-10")).toEqual({
      valid: false,
      error: "Price must be positive",
    });

    // Valid price
    expect(PropertyValidator.validateField("price", "1500")).toEqual({
      valid: true,
      error: "",
    });
  });

  test("Should validate complete form data correctly", () => {
    // Invalid form data
    const invalidForm = {
      title: "Hi",
      description: "Short",
      price: "-10",
    };

    const invalidResult = PropertyValidator.validateForm(invalidForm);
    expect(invalidResult.isValid).toBe(false);
    expect(Object.keys(invalidResult.errors).length).toBe(3);

    // Valid form data
    const validForm = {
      title: "Beautiful Apartment",
      description: "This is a spacious apartment with nice views",
      price: "1500",
    };

    const validResult = PropertyValidator.validateForm(validForm);
    expect(validResult.isValid).toBe(true);
    expect(Object.keys(validResult.errors).length).toBe(0);
  });
});
