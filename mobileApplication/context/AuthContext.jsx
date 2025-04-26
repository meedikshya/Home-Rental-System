import { getAuth } from "firebase/auth";
import ApiHandler from "../api/ApiHandler"; 

export const getUserDataFromFirebase = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      const firebaseUserId = currentUser.uid;
      console.log("Firebase User ID:", firebaseUserId);

      // Fetch user data from the database using the Firebase user ID
      const response = await ApiHandler.get(
        `/Users/firebase/${firebaseUserId}`
      );

      console.log("API Response:", response);

      if (response) {
        const userId = response; // Treat response.data as a plain string
        console.log("User ID retrieved:", userId);
        return userId; // Return the userId from the database
      } else {
        console.log("No user data returned from the API.");
        return null; // No user data returned from the API
      }
    } else {
      console.log("No current user found.");
      return null; // No user logged in
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null; // In case of error, return null or handle accordingly
  }
};

// Function to get user data from Firebase ID
export const getUserDataFromFirebaseId = async (firebaseId) => {
  try {
    console.log("Fetching user data for Firebase ID:", firebaseId);

    // Fetch user data from the database using the provided Firebase ID
    const response = await ApiHandler.get(`/Users/firebase/${firebaseId}`);

    console.log("API Response:", response);

    if (response) {
      const userId = response; // Treat response as a plain string
      console.log(`User ID for Firebase ID (${firebaseId}):`, userId);
      return userId; // Return the corresponding user ID
    } else {
      console.log("No user data returned from the API.");
      return null; // No user data found
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null; // Return null in case of an errorrs
  }
};
