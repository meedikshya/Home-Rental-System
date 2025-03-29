import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiHandler from "../../api/ApiHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { getUserDataFromFirebase } from "../../context/AuthContext";

const Profile = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const userId = await getUserDataFromFirebase();
        if (userId) {
          setCurrentUserId(userId);
          fetchUserDetails(userId);
          fetchUser(userId);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Unable to fetch user data.");
      }
    };

    fetchCurrentUserId();
  }, []);

  const fetchUserDetails = async (userId) => {
    try {
      const response = await ApiHandler.get(`/UserDetails/userId/${userId}`);
      if (response) {
        setUserDetails(response);
      } else {
        console.log("No user details found");
        setUserDetails(null);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      Alert.alert("Error", "Failed to fetch user details.");
      setUserDetails(null);
    }
  };

  const fetchUser = async (userId) => {
    try {
      const response = await ApiHandler.get(`/Users/${userId}`);
      if (response) {
        setUser(response);
      } else {
        console.log("No user found");
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      Alert.alert("Error", "Failed to fetch user.");
      setUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);

      await AsyncStorage.removeItem("jwtToken");

      ApiHandler.setAuthToken(null);

      Alert.alert("Success", "User logged out successfully");

      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.error("Logout failed: ", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName || !lastName) return "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Profile Content */}
      <View style={styles.profileContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userDetails ? (
              <Text style={styles.avatarText}>
                {getInitials(userDetails.firstName, userDetails.lastName)}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={40} color="#20319D" />
            )}
          </View>
          <View style={styles.profileHeaderText}>
            <Text style={styles.profileName}>
              {userDetails
                ? `${userDetails.firstName} ${userDetails.lastName}`
                : "Loading..."}
            </Text>
            <Text style={styles.profileEmail}>
              {user ? user.email : "Loading..."}
            </Text>
          </View>
        </View>

        {/* Profile Options */}
        <TouchableOpacity
          style={styles.profileOption}
          onPress={() => router.push("/(pages)/profile-page")}
        >
          <Ionicons name="person-circle-outline" size={24} color="#20319D" />
          <Text style={styles.profileOptionText}>Edit Profile</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#20319D" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileOption}
          onPress={() => router.push("/(pages)/my-bookings")}
        >
          <Ionicons name="calendar-outline" size={24} color="#20319D" />
          <Text style={styles.profileOptionText}>My Bookings</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#20319D" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileOption}
          onPress={() => router.push("/(pages)/my-payments")}
        >
          <Ionicons name="card-outline" size={24} color="#20319D" />
          <Text style={styles.profileOptionText}>Payments</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#20319D" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileOption}
          onPress={() => router.push("/(pages)/my-agreements")}
        >
          <Ionicons name="document-text-outline" size={24} color="#20319D" />
          <Text style={styles.profileOptionText}>Agreements</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#20319D" />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  headerContainer: {
    backgroundColor: "#20319D",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  headerRight: {
    width: 40,
  },
  profileContent: {
    flex: 1,
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#20319D",
  },
  profileHeaderText: {
    flexDirection: "column",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  profileEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  profilePhone: {
    fontSize: 14,
    color: "#6B7280",
  },
  profileAddress: {
    fontSize: 14,
    color: "#6B7280",
  },
  profileOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#20319D",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 24,
    justifyContent: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 12,
  },
});

export default Profile;
