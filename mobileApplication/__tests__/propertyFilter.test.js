const PropertyFilterTester = {
  sampleProperties: [
    {
      id: 1,
      title: "Luxury Apartment",
      city: "Kathmandu",
      price: "15000",
      roomType: "Apartment",
      status: "Available",
      bedrooms: 3,
      washrooms: 2,
    },
    {
      id: 2,
      title: "Budget Room",
      city: "Pokhara",
      price: "5000",
      roomType: "Room",
      status: "Available",
      bedrooms: 1,
      washrooms: 1,
    },
    {
      id: 3,
      title: "Family House",
      city: "Kathmandu",
      price: "25000",
      roomType: "House",
      status: "Rented",
      bedrooms: 4,
      washrooms: 3,
    },
  ],

  // Simplified filter function
  applyFilters: function (properties, filters) {
    if (!filters) return properties;

    return properties.filter((property) => {
      // Match all filter criteria
      if (filters.city && property.city !== filters.city) return false;
      if (filters.roomType && property.roomType !== filters.roomType)
        return false;
      if (filters.status && property.status !== filters.status) return false;
      if (filters.minPrice && parseInt(property.price) < filters.minPrice)
        return false;
      if (filters.maxPrice && parseInt(property.price) > filters.maxPrice)
        return false;
      if (filters.bedrooms && property.bedrooms < filters.bedrooms)
        return false;
      if (filters.washrooms && property.washrooms < filters.washrooms)
        return false;

      return true;
    });
  },
};

describe("Property Search and Filter", () => {
  const { sampleProperties, applyFilters } = PropertyFilterTester;

  test("Should filter by basic criteria", () => {
    // By city
    expect(applyFilters(sampleProperties, { city: "Kathmandu" }).length).toBe(
      2
    );
    // By type
    expect(applyFilters(sampleProperties, { roomType: "Room" })[0].title).toBe(
      "Budget Room"
    );
    // By status
    expect(applyFilters(sampleProperties, { status: "Available" }).length).toBe(
      2
    );
  });
  test("Should filter by price range", () => {
    // Min price
    expect(applyFilters(sampleProperties, { minPrice: 20000 }).length).toBe(1);
    // Max price
    expect(applyFilters(sampleProperties, { maxPrice: 10000 })[0].title).toBe(
      "Budget Room"
    );
    // Price range
    const midRange = applyFilters(sampleProperties, {
      minPrice: 10000,
      maxPrice: 20000,
    });
    expect(midRange.length).toBe(1);
    expect(midRange[0].title).toBe("Luxury Apartment");
  });
  test("Should filter by room specifications", () => {
    // By bedrooms
    expect(applyFilters(sampleProperties, { bedrooms: 3 }).length).toBe(2);
    // By washrooms
    expect(applyFilters(sampleProperties, { washrooms: 2 }).length).toBe(2);
  });
  test("Should combine multiple filters", () => {
    // Combined filters
    const result = applyFilters(sampleProperties, {
      city: "Kathmandu",
      minPrice: 20000,
    });
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Family House");
    // Another combination
    const combined2 = applyFilters(sampleProperties, {
      status: "Available",
      bedrooms: 1,
      city: "Pokhara",
    });
    expect(combined2.length).toBe(1);
    expect(combined2[0].title).toBe("Budget Room");
  });
  test("Should handle edge cases", () => {
    // Null filters
    expect(applyFilters(sampleProperties, null).length).toBe(
      sampleProperties.length
    );
    // No matches
    expect(applyFilters(sampleProperties, { city: "Biratnagar" }).length).toBe(
      0
    );
  });
});
