import { useState, useEffect, useContext, createContext } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ApiHandler from "../api/ApiHandler.js";

// Create a context
export const AuthContext = createContext();

// Create provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [appUserId, setAppUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    // This listener persists across page refreshes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Get application user ID from Firebase ID
          const userId = await getUserDataFromFirebase();
          setAppUserId(userId);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      } else {
        setAppUserId(null);
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Value to be provided to consumers
  const value = {
    currentUser,
    appUserId,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Function to get user data from Firebase
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
        const userId = response;
        console.log("User ID retrieved:", userId);
        return userId;
      } else {
        console.log("No user data returned from the API.");
        return null;
      }
    } else {
      console.log("No current user found.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
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
    return null; // Return null in case of an error
  }
};

// NEW FUNCTION: Get Firebase ID from app user ID
export const getFirebaseIdFromUserId = async (userId) => {
  try {
    console.log("Fetching Firebase ID for user ID:", userId);

    // Fetch Firebase ID from the database using the provided app user ID
    // This is the reverse lookup operation compared to getUserDataFromFirebaseId
    const response = await ApiHandler.get(`/Users/firebaseByUserId/${userId}`);

    console.log("API Response for Firebase lookup:", response);

    if (response) {
      const firebaseId = response; // Treat response as a plain string
      console.log(`Firebase ID for user ID (${userId}):`, firebaseId);
      return firebaseId;
    } else {
      console.log("No Firebase ID returned from the API.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching Firebase ID:", error);
    return null;
  }
};
