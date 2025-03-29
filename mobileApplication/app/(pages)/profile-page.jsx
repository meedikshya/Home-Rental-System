import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import ApiHandler from "../../api/ApiHandler";
import { getUserDataFromFirebase } from "../../context/AuthContext";
import { getAuth } from "firebase/auth";

const { width } = Dimensions.get("window");

const ProfilePage = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [userDetails, setUserDetails] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get Firebase current user for email
        const auth = getAuth();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          setUserEmail(firebaseUser.email);
        }

        // Get user ID from Firebase
        const userId = await getUserDataFromFirebase();
        if (userId) {
          setCurrentUserId(userId);
          const response = await ApiHandler.get(
            `/UserDetails/userId/${userId}`
          );
          if (response) {
            setUserDetails(response);
            setEditedDetails(response); // Initialize editedDetails with current details
          } else {
            Alert.alert("Error", "Could not load user details.");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (field, value) => {
    setEditedDetails({ ...editedDetails, [field]: value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (!userDetails?.userDetailId) {
        Alert.alert("Error", "User Detail ID is missing.");
        return;
      }

      // Try with a more resilient approach
      const success = await updateUserProfile(
        userDetails.userDetailId,
        editedDetails
      );

      if (success) {
        setUserDetails(editedDetails);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);

      // Even if there's an error, try to update the UI anyway
      // since you mentioned it's updating in the database
      setUserDetails(editedDetails);
      setIsEditing(false);
      Alert.alert(
        "Note",
        "Profile may have been updated, but there was an error in the response."
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to handle the update logic
  const updateUserProfile = async (userDetailId, data) => {
    try {
      const response = await ApiHandler.put(
        `/UserDetails/${userDetailId}`,
        data
      );

      // Check if response exists in any form
      if (response !== undefined && response !== null) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("API call error:", error);
      // If the API call throws but the database is updated anyway,
      // we'll catch it in the parent function
      return false;
    }
  };

  const handleCancel = () => {
    setEditedDetails(userDetails);
    setIsEditing(false);
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName || !lastName) return "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20319D" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20319D" barStyle="light-content" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Profile" : "Profile"}
          </Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profilePictureWrapper}>
            <View style={styles.profilePicture}>
              {userDetails ? (
                <Text style={styles.initials}>
                  {getInitials(userDetails.firstName, userDetails.lastName)}
                </Text>
              ) : (
                <Ionicons name="person" size={60} color="#FFFFFF" />
              )}
            </View>
          </View>

          <Text style={styles.userName}>
            {userDetails
              ? `${userDetails.firstName} ${userDetails.lastName}`
              : "User Name"}
          </Text>

          <Text style={styles.userEmail}>
            {userEmail || "user@example.com"}
          </Text>

          {!isEditing && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color="white" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {!isEditing ? (
          /* About Section */
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#20319D"
              />
              <Text style={styles.cardTitle}>About</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={22} color="#65676B" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {userEmail || "No email available"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={22} color="#65676B" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {userDetails?.phone || "Add Phone Number"}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={22} color="#65676B" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {userDetails?.address || "Add Address"}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Edit Profile Form */
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="create-outline" size={22} color="#20319D" />
              <Text style={styles.cardTitle}>Edit Profile</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>First Name</Text>
              <TextInput
                style={styles.formInput}
                value={editedDetails?.firstName || ""}
                onChangeText={(text) => handleInputChange("firstName", text)}
                placeholder="Enter your first name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Last Name</Text>
              <TextInput
                style={styles.formInput}
                value={editedDetails?.lastName || ""}
                onChangeText={(text) => handleInputChange("lastName", text)}
                placeholder="Enter your last name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={editedDetails?.phone || ""}
                onChangeText={(text) => handleInputChange("phone", text)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                value={editedDetails?.address || ""}
                onChangeText={(text) => handleInputChange("address", text)}
                placeholder="Enter your address"
                multiline
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  contentContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#20319D",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
  },
  profilePictureWrapper: {
    padding: 4,
    backgroundColor: "white",
    borderRadius: 80,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePicture: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#20319D",
  },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    marginTop: 8,
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  editProfileText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
  },
  divider: {
    height: 8,
    backgroundColor: "#F0F2F5",
    marginVertical: 8,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1c1e21",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#65676B",
  },
  infoValue: {
    fontSize: 16,
    color: "#1c1e21",
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#65676B",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#F5F7FA",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#1c1e21",
    borderWidth: 1,
    borderColor: "#E4E6EB",
  },
  formActions: {
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: "#20319D",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#F5F7FA",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E6EB",
  },
  cancelText: {
    color: "#1c1e21",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#65676B",
  },
});

export default ProfilePage;
