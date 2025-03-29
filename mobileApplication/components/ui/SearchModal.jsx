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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ApiHandler from "../../api/ApiHandler";

const { width } = Dimensions.get("window");

const SearchModal = ({ setModalVisible, onApplyFilters, activeFilters }) => {
  const [slideAnim] = useState(new Animated.Value(-width));
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  // States for filter options
  const [addresses, setAddresses] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Room filters
  const [bedrooms, setBedrooms] = useState("");
  const [washrooms, setWashrooms] = useState("");
  const [kitchens, setKitchens] = useState("");

  // States for selected items
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState(null);

  // State for address search
  const [addressQuery, setAddressQuery] = useState("");
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [noAddressesFound, setNoAddressesFound] = useState(false);

  // Initialize modal with active filters if they exist
  useEffect(() => {
    if (activeFilters) {
      setSelectedAddress(activeFilters.city || null);
      if (activeFilters.city) {
        setAddressQuery(activeFilters.city);
      }
      setSelectedAvailability(activeFilters.status || null);
      setMinPrice(
        activeFilters.minPrice ? activeFilters.minPrice.toString() : ""
      );
      setMaxPrice(
        activeFilters.maxPrice ? activeFilters.maxPrice.toString() : ""
      );

      // Initialize with existing filter values
      setBedrooms(
        activeFilters.totalBedrooms
          ? activeFilters.totalBedrooms.toString()
          : ""
      );
      setWashrooms(
        activeFilters.totalWashrooms
          ? activeFilters.totalWashrooms.toString()
          : ""
      );
      setKitchens(
        activeFilters.totalKitchens
          ? activeFilters.totalKitchens.toString()
          : ""
      );
    }
  }, [activeFilters]);

  useEffect(() => {
    if (activeFilters === null) {
      setSelectedAddress(null);
      setAddressQuery("");
      setSelectedAvailability(null);
      setMinPrice("");
      setMaxPrice("");
      setBedrooms("");
      setWashrooms("");
      setKitchens("");
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
        const uniqueAvailability = [
          ...new Set(propertiesResponse.map((property) => property.status)),
        ];

        setAddresses(uniqueAddresses);
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
      setNoAddressesFound(false);
    } else {
      const filtered = addresses.filter((address) =>
        address.toLowerCase().includes(addressQuery.toLowerCase())
      );
      setFilteredAddresses(filtered);
      setShowAddressSuggestions(true);
      setNoAddressesFound(filtered.length === 0);
    }
  }, [addressQuery, addresses]);

  const handleSearch = () => {
    // Create filters object with correct property names
    const filters = {};

    if (selectedAddress) filters.city = selectedAddress;
    if (selectedAvailability) filters.status = selectedAvailability;
    if (minPrice) filters.minPrice = parseInt(minPrice);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice);

    // Use the correct property names for filtering
    if (bedrooms) filters.totalBedrooms = parseInt(bedrooms);
    if (washrooms) filters.totalWashrooms = parseInt(washrooms);
    if (kitchens) filters.totalKitchens = parseInt(kitchens);

    // Only apply filters if at least one filter is selected
    const hasFilters = Object.keys(filters).length > 0;

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
    setNoAddressesFound(false);
  };

  const toggleAvailabilitySelection = (available) => {
    setSelectedAvailability(
      selectedAvailability === available ? null : available
    );
  };

  const handleReset = () => {
    setSelectedAddress(null);
    setAddressQuery("");
    setSelectedAvailability(null);
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setWashrooms("");
    setKitchens("");
    setNoAddressesFound(false);

    // Apply empty filters to reset the view
    if (onApplyFilters) {
      onApplyFilters(null);
    }

    // Close modal after reset
    handleClose();
  };

  return (
    <View style={styles.modalContainer}>
      <Animated.View
        style={[
          styles.modalContent,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={{ paddingTop: insets.top }}>
          <View style={styles.headerContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="arrow-back" size={24} color="#20319D" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Filters</Text>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#20319D" />
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Filter by Address - Searchable */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <Ionicons name="location-outline" size={22} color="#20319D" />
                <Text style={styles.filterSectionTitle}>Location</Text>
              </View>
              <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by city..."
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  placeholderTextColor="#999"
                />
                {addressQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setAddressQuery("");
                      setSelectedAddress(null);
                      setNoAddressesFound(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* No addresses found message */}
              {noAddressesFound && (
                <View style={styles.noResultsContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#888"
                  />
                  <Text style={styles.noResultsText}>
                    No properties available in this area
                  </Text>
                </View>
              )}

              {showAddressSuggestions && filteredAddresses.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {filteredAddresses.map((address) => (
                    <TouchableOpacity
                      key={address}
                      style={styles.suggestionItem}
                      onPress={() => selectAddress(address)}
                    >
                      <Ionicons
                        name="location"
                        size={16}
                        color="#20319D"
                        style={styles.suggestionIcon}
                      />
                      <Text style={styles.suggestionText}>{address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedAddress && (
                <View style={styles.selectedAddressContainer}>
                  <View style={styles.selectedAddressBadge}>
                    <Text style={styles.selectedAddressText}>
                      {selectedAddress}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Status */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#20319D"
                />
                <Text style={styles.filterSectionTitle}>Status</Text>
              </View>
              <View style={styles.filterOptionsContainer}>
                {availability.map((available) => (
                  <TouchableOpacity
                    key={available}
                    style={[
                      styles.filterChip,
                      selectedAvailability === available &&
                        styles.filterChipSelected,
                    ]}
                    onPress={() => toggleAvailabilitySelection(available)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedAvailability === available &&
                          styles.filterChipTextSelected,
                      ]}
                    >
                      {available}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Property Features */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <Ionicons name="home-outline" size={22} color="#20319D" />
                <Text style={styles.filterSectionTitle}>Features</Text>
              </View>

              <View style={styles.roomFiltersContainer}>
                {/* Bedrooms */}
                <View style={styles.roomFilterItem}>
                  <View style={styles.roomFilterLabelRow}>
                    <Ionicons name="bed-outline" size={18} color="#666" />
                    <Text style={styles.roomFilterLabel}>Bedrooms</Text>
                  </View>
                  <TextInput
                    style={styles.roomFilterInput}
                    placeholder="Min bedrooms"
                    keyboardType="numeric"
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Washrooms */}
                <View style={styles.roomFilterItem}>
                  <View style={styles.roomFilterLabelRow}>
                    <Ionicons name="water-outline" size={18} color="#666" />
                    <Text style={styles.roomFilterLabel}>Washrooms</Text>
                  </View>
                  <TextInput
                    style={styles.roomFilterInput}
                    placeholder="Min washrooms"
                    keyboardType="numeric"
                    value={washrooms}
                    onChangeText={setWashrooms}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Kitchens */}
                <View style={styles.roomFilterItem}>
                  <View style={styles.roomFilterLabelRow}>
                    <Ionicons
                      name="restaurant-outline"
                      size={18}
                      color="#666"
                    />
                    <Text style={styles.roomFilterLabel}>Kitchens</Text>
                  </View>
                  <TextInput
                    style={styles.roomFilterInput}
                    placeholder="Min kitchens"
                    keyboardType="numeric"
                    value={kitchens}
                    onChangeText={setKitchens}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <View style={styles.filterHeaderRow}>
                <Ionicons name="cash-outline" size={22} color="#20319D" />
                <Text style={styles.filterSectionTitle}>Price Range</Text>
              </View>
              <View style={styles.priceRangeContainer}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min Price"
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholderTextColor="#999"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max Price"
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleSearch}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width * 0.85,
    height: "100%",
    backgroundColor: "white",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F0F4F8",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 15,
    color: "#333",
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
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 0,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  // No results message
  noResultsContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  noResultsText: {
    color: "#666",
    marginLeft: 8,
    fontSize: 14,
  },
  // Room filters
  roomFiltersContainer: {
    marginTop: 8,
  },
  roomFilterItem: {
    marginBottom: 16,
  },
  roomFilterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  roomFilterLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: "#444",
  },
  roomFilterInput: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
  },
  // Address search
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
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
    borderColor: "#EEEEEE",
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
    backgroundColor: "#F0F4FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0DCFF",
  },
  selectedAddressText: {
    color: "#20319D",
    fontSize: 14,
    fontWeight: "500",
  },
  // Status chips
  filterOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  filterChip: {
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  filterChipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#D0DCFF",
  },
  filterChipText: {
    fontSize: 14,
    color: "#555",
  },
  filterChipTextSelected: {
    color: "#20319D",
    fontWeight: "500",
  },
  // Price range
  priceRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#F7F7F7",
    fontSize: 15,
    color: "#333",
  },
  priceSeparator: {
    fontSize: 18,
    color: "#666",
    marginHorizontal: 8,
    fontWeight: "bold",
  },
  // Button container
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  resetButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "500",
  },
  applyButton: {
    flex: 2,
    backgroundColor: "#20319D",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#1A237E",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  applyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SearchModal;
