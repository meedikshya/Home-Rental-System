import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ApiHandler from "../../api/ApiHandler";

const { width } = Dimensions.get("window");

const SearchModal = ({ setModalVisible, onApplyFilters, activeFilters }) => {
  // Add activeFilters prop
  const [slideAnim] = useState(new Animated.Value(-width));
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  // States for filter options
  const [addresses, setAddresses] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // States for selected items
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState(null);

  // State for address search
  const [addressQuery, setAddressQuery] = useState("");
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  // Initialize modal with active filters if they exist
  useEffect(() => {
    if (activeFilters) {
      setSelectedAddress(activeFilters.city || null);
      if (activeFilters.city) {
        setAddressQuery(activeFilters.city);
      }
      setSelectedPropertyType(activeFilters.roomType || null);
      setSelectedAvailability(activeFilters.status || null);
      setMinPrice(
        activeFilters.minPrice ? activeFilters.minPrice.toString() : ""
      );
      setMaxPrice(
        activeFilters.maxPrice ? activeFilters.maxPrice.toString() : ""
      );
    }
  }, [activeFilters]);

  // Reset filters when activeFilters is null (cleared from parent)
  useEffect(() => {
    if (activeFilters === null) {
      setSelectedAddress(null);
      setAddressQuery("");
      setSelectedPropertyType(null);
      setSelectedAvailability(null);
      setMinPrice("");
      setMaxPrice("");
    }
  }, [activeFilters]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  // Fetch filter options from API
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoading(true);
      try {
        // Single API call to get all properties
        const propertiesResponse = await ApiHandler.get("/Properties");

        // Extract unique values for each filter
        const uniqueAddresses = [
          ...new Set(propertiesResponse.map((property) => property.city)),
        ];
        const uniquePropertyTypes = [
          ...new Set(propertiesResponse.map((property) => property.roomType)),
        ];
        const uniqueAvailability = [
          ...new Set(propertiesResponse.map((property) => property.status)),
        ];

        setAddresses(uniqueAddresses);
        setPropertyTypes(uniquePropertyTypes);
        setAvailability(uniqueAvailability);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  // Filter addresses based on search query
  useEffect(() => {
    if (addressQuery.trim() === "") {
      setFilteredAddresses([]);
      setShowAddressSuggestions(false);
    } else {
      const filtered = addresses.filter((address) =>
        address.toLowerCase().includes(addressQuery.toLowerCase())
      );
      setFilteredAddresses(filtered);
      setShowAddressSuggestions(true);
    }
  }, [addressQuery, addresses]);

  // Update the handleSearch function to ensure proper object creation

  const handleSearch = () => {
    // Create filters object - only include non-empty values
    const filters = {};

    if (selectedAddress) filters.city = selectedAddress;
    if (selectedPropertyType) filters.roomType = selectedPropertyType;
    if (selectedAvailability) filters.status = selectedAvailability;
    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);

    // Only apply filters if at least one filter is selected
    const hasFilters = Object.keys(filters).length > 0;

    console.log("SearchModal applying filters:", hasFilters ? filters : null);

    // Pass filters to parent component
    if (onApplyFilters) {
      onApplyFilters(hasFilters ? filters : null);
    }

    // Close modal after search
    handleClose();
  };

  const selectAddress = (address) => {
    setSelectedAddress(address);
    setAddressQuery(address);
    setShowAddressSuggestions(false);
  };

  const togglePropertyTypeSelection = (type) => {
    setSelectedPropertyType(selectedPropertyType === type ? null : type);
  };

  const toggleAvailabilitySelection = (available) => {
    setSelectedAvailability(
      selectedAvailability === available ? null : available
    );
  };

  const handleReset = () => {
    setSelectedAddress(null);
    setAddressQuery("");
    setSelectedPropertyType(null);
    setSelectedAvailability(null);
    setMinPrice("");
    setMaxPrice("");

    // Apply empty filters to reset the view
    if (onApplyFilters) {
      onApplyFilters(null); // Pass null to indicate reset
    }
  };

  return (
    <View style={styles.modalContainer} className="modal-container">
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        className="modal-content"
      >
        <SafeAreaView style={{ paddingTop: insets.top }}>
          <View style={styles.headerContainer} className="header-container">
            <TouchableOpacity
              style={styles.closeButton}
              className="close-button"
              onPress={handleClose}
            >
              <Ionicons name="arrow-back" size={24} color="#20319D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} className="modal-title">
              Customize Your Search
            </Text>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.loadingContainer} className="loading-container">
            <ActivityIndicator size="large" color="#20319D" />
            <Text style={styles.loadingText} className="loading-text">
              Loading options...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            className="scroll-container"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Filter by Address - Searchable */}
            <View style={styles.filterSection} className="filter-section">
              <View
                style={styles.filterHeaderRow}
                className="filter-header-row"
              >
                <Ionicons name="location-outline" size={22} color="#20319D" />
                <Text
                  style={styles.filterSectionTitle}
                  className="filter-section-title"
                >
                  Filter by Address
                </Text>
              </View>
              <View
                style={styles.searchInputContainer}
                className="search-input-container"
              >
                <TextInput
                  style={styles.searchInput}
                  className="search-input"
                  placeholder="Search address..."
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  placeholderTextColor="#999"
                />
                {addressQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    className="clear-button"
                    onPress={() => {
                      setAddressQuery("");
                      setSelectedAddress(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {showAddressSuggestions && filteredAddresses.length > 0 && (
                <View
                  style={styles.suggestionsContainer}
                  className="suggestions-container"
                >
                  {filteredAddresses.map((address) => (
                    <TouchableOpacity
                      key={address}
                      style={styles.suggestionItem}
                      className="suggestion-item"
                      onPress={() => selectAddress(address)}
                    >
                      <Ionicons
                        name="location"
                        size={16}
                        color="#20319D"
                        style={styles.suggestionIcon}
                        className="suggestion-icon"
                      />
                      <Text
                        style={styles.suggestionText}
                        className="suggestion-text"
                      >
                        {address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedAddress && (
                <View
                  style={styles.selectedAddressContainer}
                  className="selected-address-container"
                >
                  <View
                    style={styles.selectedAddressBadge}
                    className="selected-address-badge"
                  >
                    <Text
                      style={styles.selectedAddressText}
                      className="selected-address-text"
                    >
                      Selected: {selectedAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Filter by Availability */}
            <View style={styles.filterSection} className="filter-section">
              <View
                style={styles.filterHeaderRow}
                className="filter-header-row"
              >
                <Ionicons name="calendar-outline" size={22} color="#20319D" />
                <Text
                  style={styles.filterSectionTitle}
                  className="filter-section-title"
                >
                  Filter by Availability
                </Text>
              </View>
              <View
                style={styles.filterOptionsContainer}
                className="filter-options-container"
              >
                {availability.map((available) => (
                  <TouchableOpacity
                    key={available}
                    style={[
                      styles.filterChip,
                      selectedAvailability === available &&
                        styles.filterChipSelected,
                    ]}
                    className={`filter-chip ${
                      selectedAvailability === available
                        ? "filter-chip-selected"
                        : ""
                    }`}
                    onPress={() => toggleAvailabilitySelection(available)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedAvailability === available &&
                          styles.filterChipTextSelected,
                      ]}
                      className={`filter-chip-text ${
                        selectedAvailability === available
                          ? "filter-chip-text-selected"
                          : ""
                      }`}
                    >
                      {available}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter by Property Type */}
            <View style={styles.filterSection} className="filter-section">
              <View
                style={styles.filterHeaderRow}
                className="filter-header-row"
              >
                <Ionicons name="home-outline" size={22} color="#20319D" />
                <Text
                  style={styles.filterSectionTitle}
                  className="filter-section-title"
                >
                  Filter by Property Type
                </Text>
              </View>
              <View
                style={styles.filterOptionsContainer}
                className="filter-options-container"
              >
                {propertyTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      selectedPropertyType === type &&
                        styles.filterChipSelected,
                    ]}
                    className={`filter-chip ${
                      selectedPropertyType === type
                        ? "filter-chip-selected"
                        : ""
                    }`}
                    onPress={() => togglePropertyTypeSelection(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPropertyType === type &&
                          styles.filterChipTextSelected,
                      ]}
                      className={`filter-chip-text ${
                        selectedPropertyType === type
                          ? "filter-chip-text-selected"
                          : ""
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter by Price Range */}
            <View style={styles.filterSection} className="filter-section">
              <View
                style={styles.filterHeaderRow}
                className="filter-header-row"
              >
                <Ionicons name="cash-outline" size={22} color="#20319D" />
                <Text
                  style={styles.filterSectionTitle}
                  className="filter-section-title"
                >
                  Filter by Price Range
                </Text>
              </View>
              <View
                style={styles.priceRangeContainer}
                className="price-range-container"
              >
                <TextInput
                  style={styles.priceInput}
                  className="price-input"
                  placeholder="Min Price"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholderTextColor="#999"
                />
                <Text style={styles.priceSeparator} className="price-separator">
                  -
                </Text>
                <TextInput
                  style={styles.priceInput}
                  className="price-input"
                  placeholder="Max Price"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Apply Filters Button */}
            <TouchableOpacity
              style={styles.searchButton}
              className="search-button"
              onPress={handleSearch}
            >
              <Ionicons
                name="search"
                size={22}
                color="white"
                style={styles.searchIcon}
                className="search-icon"
              />
              <Text
                style={styles.searchButtonText}
                className="search-button-text"
              >
                Apply Filters
              </Text>
            </TouchableOpacity>

            {/* Reset Button */}
            <TouchableOpacity
              style={styles.resetButton}
              className="reset-button"
              onPress={handleReset}
            >
              <Text
                style={styles.resetButtonText}
                className="reset-button-text"
              >
                Reset All Filters
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Darker overlay for better contrast
  },
  modalContent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width * 0.85,
    height: "100%",
    backgroundColor: "#F0F4F8", // Light blue-gray background
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    color: "#20319D", // Blue title color
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  scrollContainer: {
    width: "100%",
  },
  filterSection: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
    color: "#333",
  },
  // New styles for searchable address
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#F5F7FA",
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedAddressContainer: {
    marginTop: 8,
    alignItems: "flex-start",
  },
  selectedAddressBadge: {
    backgroundColor: "#E8F0FE",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFD4F8",
  },
  selectedAddressText: {
    color: "#20319D",
    fontSize: 14,
    fontWeight: "500",
  },
  // Existing styles
  filterOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  filterChip: {
    backgroundColor: "#F5F7FA",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipSelected: {
    backgroundColor: "#20319D",
    borderColor: "#20319D",
  },
  filterChipText: {
    fontSize: 14,
    color: "#555",
  },
  filterChipTextSelected: {
    color: "white",
    fontWeight: "500",
  },
  priceRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#F5F7FA",
    fontSize: 16,
    color: "#333",
  },
  priceSeparator: {
    fontSize: 18,
    color: "#666",
    marginHorizontal: 8,
    fontWeight: "bold",
  },
  searchButton: {
    backgroundColor: "#20319D",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#20319D",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  resetButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "transparent",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 30,
  },
  resetButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default SearchModal;
