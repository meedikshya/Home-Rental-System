const AgreementDateValidator = {
  validateStartDate: function (startDate) {
    if (!startDate) {
      return { valid: false, message: "Start date is required" };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return { valid: false, message: "Start date cannot be in the past" };
    }

    return { valid: true, message: "Valid start date" };
  },

  // Proposed fix for the validateEndDate function
  validateEndDate: function (startDate, endDate) {
    if (!endDate) {
      return { valid: false, message: "End date is required" };
    }

    if (!startDate) {
      return { valid: false, message: "Please select a start date first" };
    }

    if (endDate <= startDate) {
      return { valid: false, message: "End date must be after start date" };
    }

    // Calculate difference in months correctly
    const diffMonths =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    // If less than 3 months difference, or exactly 3 months but day of month is earlier
    if (
      diffMonths < 3 ||
      (diffMonths === 3 && endDate.getDate() < startDate.getDate())
    ) {
      return {
        valid: false,
        message: "Lease period must be at least 3 months",
      };
    }

    return { valid: true, message: "Valid end date" };
  },

  validateLeasePeriod: function (startDate, endDate) {
    const startResult = this.validateStartDate(startDate);
    if (!startResult.valid) {
      return startResult;
    }

    const endResult = this.validateEndDate(startDate, endDate);
    if (!endResult.valid) {
      return endResult;
    }

    return { valid: true, message: "Valid lease period" };
  },
};

describe("Agreement Date Validation", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const fourMonthsLater = new Date(today);
  fourMonthsLater.setMonth(fourMonthsLater.getMonth() + 4);
  test("Should validate start date correctly", () => {
    expect(AgreementDateValidator.validateStartDate(null).valid).toBe(false);
    expect(AgreementDateValidator.validateStartDate(yesterday).valid).toBe(
      false
    );
    expect(AgreementDateValidator.validateStartDate(today).valid).toBe(true);
    expect(AgreementDateValidator.validateStartDate(nextMonth).valid).toBe(
      true
    );
  });

  test("Should validate end date correctly", () => {
    expect(AgreementDateValidator.validateEndDate(today, null).valid).toBe(
      false
    );
    expect(
      AgreementDateValidator.validateEndDate(null, fourMonthsLater).valid
    ).toBe(false);
    expect(AgreementDateValidator.validateEndDate(nextMonth, today).valid).toBe(
      false
    );
    expect(AgreementDateValidator.validateEndDate(today, nextMonth).valid).toBe(
      false
    );
    expect(
      AgreementDateValidator.validateEndDate(today, threeMonthsLater).valid
    ).toBe(true);
    expect(
      AgreementDateValidator.validateEndDate(today, fourMonthsLater).valid
    ).toBe(true);
  });
  test("Should validate complete lease period correctly", () => {
    expect(AgreementDateValidator.validateLeasePeriod(null, null).valid).toBe(
      false
    );
    expect(AgreementDateValidator.validateLeasePeriod(today, null).valid).toBe(
      false
    );
    expect(
      AgreementDateValidator.validateLeasePeriod(yesterday, fourMonthsLater)
        .valid
    ).toBe(false);
    expect(
      AgreementDateValidator.validateLeasePeriod(today, nextMonth).valid
    ).toBe(false);
    expect(
      AgreementDateValidator.validateLeasePeriod(today, threeMonthsLater).valid
    ).toBe(true);
    expect(
      AgreementDateValidator.validateLeasePeriod(today, fourMonthsLater).valid
    ).toBe(true);
    const nextMonthThreeMonthsLater = new Date(nextMonth);
    nextMonthThreeMonthsLater.setMonth(
      nextMonthThreeMonthsLater.getMonth() + 3
    );
    expect(
      AgreementDateValidator.validateLeasePeriod(
        nextMonth,
        nextMonthThreeMonthsLater
      ).valid
    ).toBe(true);
  });
  test("Should return appropriate error messages", () => {
    expect(AgreementDateValidator.validateStartDate(null).message).toBe(
      "Start date is required"
    );
    expect(AgreementDateValidator.validateStartDate(yesterday).message).toBe(
      "Start date cannot be in the past"
    );
    expect(
      AgreementDateValidator.validateEndDate(null, fourMonthsLater).message
    ).toBe("Please select a start date first");
    expect(
      AgreementDateValidator.validateEndDate(nextMonth, today).message
    ).toBe("End date must be after start date");
    expect(
      AgreementDateValidator.validateEndDate(today, nextMonth).message
    ).toBe("Lease period must be at least 3 months");
  });
});

describe("Edge Cases in Date Validation", () => {
  test("Should validate lease periods with month boundary correctly", () => {
    const today = new Date();
    const futureYear = today.getFullYear() + 1;

    // Start date: January 31 of next year
    const startDate = new Date(futureYear, 0, 31);

    // End date: April 30 of next year (exactly 3 months later)
    const endDate = new Date(futureYear, 3, 30);

    // Calculate what the validator will calculate
    const minEndDateExpected = new Date(startDate);
    minEndDateExpected.setMonth(minEndDateExpected.getMonth() + 3);

    // Log the issue for debugging
    console.log(`Start date: ${startDate.toDateString()}`);
    console.log(`End date: ${endDate.toDateString()}`);
    console.log(
      `Calculated min end date: ${minEndDateExpected.toDateString()}`
    );
    console.log(
      `The issue is that Jan 31 + 3 months = ${minEndDateExpected.toDateString()} (not Apr 30)`
    );

    const result = AgreementDateValidator.validateLeasePeriod(
      startDate,
      endDate
    );
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Lease period must be at least 3 months");
  });
});
