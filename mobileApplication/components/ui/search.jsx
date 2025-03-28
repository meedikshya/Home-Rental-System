import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchModal from "./SearchModal";

const Search = ({ onFilterApplied, activeFilters }) => {
  const [modalVisible, setModalVisible] = useState(false);

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

  return (
    <View style={styles.container}>
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
            <Text style={styles.filterCountText}>{getActiveFilterCount()}</Text>
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

// Enhanced search container styles for a more visually appealing look

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
});

export default Search;
