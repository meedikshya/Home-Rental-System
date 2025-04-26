// Test image format validation for property uploads
const PropertyImageValidator = {
  // Check if file is a valid image type
  isValidImageType: function (file) {
    return Boolean(file && file.type && file.type.startsWith("image/"));
  },

  // Filter valid images from mixed files
  filterValidImages: function (files) {
    return Array.from(files).filter(
      (file) => file.type && file.type.startsWith("image/")
    );
  },

  // Validate file for Cloudinary upload
  validateForUpload: function (file) {
    if (!file) {
      return { valid: false, message: "No file provided" };
    }

    if (!this.isValidImageType(file)) {
      return {
        valid: false,
        message: "Invalid file format. Please select an image file.",
      };
    }

    const maxSize = 0.8 * 1024 * 1024; // 0.8MB
    if (file.size > maxSize) {
      return {
        valid: false,
        message: `File size exceeds the maximum limit of 0.8MB. Current size: ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB`,
      };
    }

    return { valid: true, message: "File is valid for upload" };
  },

  // Check dimensions against Cloudinary limit
  isValidDimension: function (width, height) {
    const maxDimension = 1200;
    return width <= maxDimension && height <= maxDimension;
  },
};

// Create file mock helper
function createFileMock(name, type, size = 1024) {
  return { name, type, size };
}

describe("Property Image Validation", () => {
  test("Should identify valid and invalid file types", () => {
    const jpgFile = createFileMock("photo.jpg", "image/jpeg");
    const pdfFile = createFileMock("document.pdf", "application/pdf");

    expect(PropertyImageValidator.isValidImageType(jpgFile)).toBe(true);
    expect(PropertyImageValidator.isValidImageType(pdfFile)).toBe(false);
    expect(PropertyImageValidator.isValidImageType(null)).toBe(false);
  });

  test("Should filter valid images from mixed file types", () => {
    const files = [
      createFileMock("photo.jpg", "image/jpeg"),
      createFileMock("document.pdf", "application/pdf"),
      createFileMock("logo.png", "image/png"),
    ];

    const validImages = PropertyImageValidator.filterValidImages(files);

    expect(validImages.length).toBe(2);
    expect(validImages[0].name).toBe("photo.jpg");
    expect(validImages[1].name).toBe("logo.png");
  });

  test("Should validate file size with appropriate messages", () => {
    const validFile = createFileMock(
      "small.jpg",
      "image/jpeg",
      0.5 * 1024 * 1024
    );
    const exactSizeFile = createFileMock(
      "exact.jpg",
      "image/jpeg",
      0.8 * 1024 * 1024
    );
    const oversizedFile = createFileMock(
      "large.jpg",
      "image/jpeg",
      1 * 1024 * 1024
    );

    const validResult = PropertyImageValidator.validateForUpload(validFile);
    const exactResult = PropertyImageValidator.validateForUpload(exactSizeFile);
    const oversizedResult =
      PropertyImageValidator.validateForUpload(oversizedFile);

    expect(validResult.valid).toBe(true);
    expect(exactResult.valid).toBe(true);
    expect(oversizedResult.valid).toBe(false);
    expect(oversizedResult.message).toContain("exceeds the maximum limit");
  });

  test("Should validate image dimensions", () => {
    expect(PropertyImageValidator.isValidDimension(800, 600)).toBe(true);
    expect(PropertyImageValidator.isValidDimension(1200, 1200)).toBe(true);
    expect(PropertyImageValidator.isValidDimension(1201, 1000)).toBe(false);
    expect(PropertyImageValidator.isValidDimension(1000, 1201)).toBe(false);
  });

  test("Should properly handle invalid inputs", () => {
    const nullResult = PropertyImageValidator.validateForUpload(null);
    const invalidTypeFile = createFileMock("doc.pdf", "application/pdf");
    const invalidTypeResult =
      PropertyImageValidator.validateForUpload(invalidTypeFile);

    expect(nullResult.valid).toBe(false);
    expect(nullResult.message).toContain("No file provided");
    expect(invalidTypeResult.valid).toBe(false);
    expect(invalidTypeResult.message).toContain("Invalid file format");
  });
});
