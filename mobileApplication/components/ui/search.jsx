import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchModal from "./SearchModal";

const Search = ({ onFilterApplied, activeFilters, propertyTypes = [] }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // If propertyTypes isn't provided, use these defaults
  const defaultPropertyTypes = [
    "Apartment",
    "Room",
    "House",
    "Villa",
    "Office",
  ];

  // Use property types from props or defaults if not provided
  const availablePropertyTypes =
    propertyTypes.length > 0 ? propertyTypes : defaultPropertyTypes;

  // Add debug logs to track activeFilters
  useEffect(() => {
    console.log("Search component activeFilters:", activeFilters);
  }, [activeFilters]);

  const handleApplyFilters = (filters) => {
    console.log("Search received filters:", filters);
    if (onFilterApplied) {
      onFilterApplied(filters);
    }
  };

  const clearFilters = () => {
    if (onFilterApplied) {
      onFilterApplied(null);
    }
  };

  // Count active filters for badge display
  const getActiveFilterCount = () => {
    if (!activeFilters) return 0;
    let count = 0;
    if (activeFilters.city) count++;
    if (activeFilters.roomType) count++;
    if (activeFilters.status) count++;
    if (activeFilters.minPrice) count++;
    if (activeFilters.maxPrice) count++;
    return count;
  };

  // More robust check for empty filters
  const hasActiveFilters =
    activeFilters && Object.keys(activeFilters).length > 0;

  // Handle property type filter selection
  const handlePropertyTypeFilter = (type) => {
    // If this type is already selected, clear it
    if (activeFilters?.roomType === type) {
      const newFilters = { ...activeFilters };
      delete newFilters.roomType;

      // If empty filters, set to null
      const hasFilters = Object.keys(newFilters).length > 0;
      onFilterApplied(hasFilters ? newFilters : null);
    } else {
      // Otherwise apply this filter
      const newFilters = { ...(activeFilters || {}), roomType: type };
      onFilterApplied(newFilters);
    }
  };

  // Handle "All" filter selection
  const handleAllTypesFilter = () => {
    // If roomType is already not set, do nothing
    if (!activeFilters?.roomType) return;

    // Otherwise remove roomType filter
    const newFilters = { ...activeFilters };
    delete newFilters.roomType;

    // If empty filters, set to null
    const hasFilters = Object.keys(newFilters).length > 0;
    onFilterApplied(hasFilters ? newFilters : null);
  };

  // Map property types to appropriate icons
  const getIconForPropertyType = (type) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes("apartment")) return "business-outline";
    if (typeLower.includes("room")) return "bed-outline";
    if (typeLower.includes("house")) return "home-outline";
    if (typeLower.includes("villa")) return "business-outline";
    if (typeLower.includes("office")) return "briefcase-outline";
    if (typeLower.includes("shop")) return "storefront-outline";
    return "home-outline"; // Default
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TouchableOpacity
        style={[styles.searchBar, hasActiveFilters && styles.searchBarActive]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name={hasActiveFilters ? "options" : "search"}
          size={20}
          color={hasActiveFilters ? "#20319D" : "#777"}
          style={styles.icon}
        />

        {!hasActiveFilters ? (
          <Text style={styles.placeholder}>Search properties...</Text>
        ) : (
          <View style={styles.filterSummaryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContainer}
            >
              {activeFilters.city && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {activeFilters.city}
                  </Text>
                </View>
              )}

              {activeFilters.roomType && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {activeFilters.roomType}
                  </Text>
                </View>
              )}

              {activeFilters.status && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {activeFilters.status}
                  </Text>
                </View>
              )}

              {(activeFilters.minPrice || activeFilters.maxPrice) && (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    {activeFilters.minPrice
                      ? `₹${activeFilters.minPrice}`
                      : "₹0"}
                    {" - "}
                    {activeFilters.maxPrice
                      ? `₹${activeFilters.maxPrice}`
                      : "₹∞"}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {hasActiveFilters && (
          <View style={styles.actionsContainer}>
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>
                {getActiveFilterCount()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#20319D" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      {/* Property Type Quick Filters */}
      <View style={styles.quickFiltersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersScroll}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#20319D" />
          ) : (
            <>
              {/* All Properties Filter Option */}
              <TouchableOpacity
                style={[
                  styles.propertyTypeFilter,
                  !activeFilters?.roomType && styles.propertyTypeFilterActive,
                ]}
                onPress={handleAllTypesFilter}
              >
                <View
                  style={[
                    styles.propertyTypeIconContainer,
                    !activeFilters?.roomType &&
                      styles.propertyTypeIconContainerActive,
                  ]}
                >
                  <Ionicons
                    name="grid-outline"
                    size={22}
                    color={!activeFilters?.roomType ? "white" : "#20319D"}
                  />
                </View>
                <Text
                  style={[
                    styles.propertyTypeLabel,
                    !activeFilters?.roomType && styles.propertyTypeLabelActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              {/* Dynamic Property Type Filters */}
              {availablePropertyTypes.map((type) => {
                const isSelected = activeFilters?.roomType === type;
                const iconName = getIconForPropertyType(type);

                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.propertyTypeFilter,
                      isSelected && styles.propertyTypeFilterActive,
                    ]}
                    onPress={() => handlePropertyTypeFilter(type)}
                  >
                    <View
                      style={[
                        styles.propertyTypeIconContainer,
                        isSelected && styles.propertyTypeIconContainerActive,
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={22}
                        color={isSelected ? "white" : "#20319D"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.propertyTypeLabel,
                        isSelected && styles.propertyTypeLabelActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>

      {/* Search Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SearchModal
          setModalVisible={setModalVisible}
          onApplyFilters={handleApplyFilters}
          activeFilters={activeFilters}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBarActive: {
    borderColor: "#BFD4F8",
    backgroundColor: "#F8FAFF",
    shadowColor: "#3045AD",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  icon: {
    marginRight: 12,
    marginLeft: 4,
    color: "#20319D",
  },
  placeholder: {
    color: "#757575",
    fontSize: 16,
    flex: 1,
    fontWeight: "500",
  },
  filterSummaryContainer: {
    flex: 1,
    paddingVertical: 2,
  },
  filterChipsContainer: {
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: "#E8F0FE",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 2,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#BFD4F8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  filterChipText: {
    color: "#20319D",
    fontSize: 13,
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: "rgba(32, 49, 157, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterCountBadge: {
    backgroundColor: "#20319D",
    width: 22,
    height: 22,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  filterCountText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  clearButton: {
    padding: 2,
  },

  // Quick Filters Styles
  quickFiltersContainer: {
    marginTop: 12,
    paddingVertical: 14,
    paddingLeft: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  quickFiltersScroll: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  propertyTypeFilter: {
    alignItems: "center",
    marginRight: 16,
    width: 70,
  },
  propertyTypeFilterActive: {
    opacity: 1,
  },
  propertyTypeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  propertyTypeIconContainerActive: {
    backgroundColor: "#20319D",
    borderColor: "#20319D",
  },
  propertyTypeLabel: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },
  propertyTypeLabelActive: {
    color: "#20319D",
    fontWeight: "600",
  },
});

export default Search;
