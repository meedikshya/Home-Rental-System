import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { FIREBASE_AUTH } from "../firebaseConfig";
import ApiHandler from "../ApiHandler"; // Import your ApiHandler

// Create the AuthContext to manage authentication state
const AuthContext = createContext();

// AuthProvider component to manage authentication state across the app
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({ user: null, loading: true });

  // Monitor auth state changes using Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      if (user) {
        // After user logs in, fetch Firebase ID Token
        user.getIdToken().then((idToken) => {
          console.log("Firebase ID Token:", idToken);
          // Send the ID Token to backend API
          ApiHandler.saveToken(idToken); // Save the token using your ApiHandler
        });
      }
      setAuthState({ user, loading: false });
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  // Login handler (signIn using Firebase Authentication)
  const onLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();
      console.log("Generated Firebase ID Token:", idToken);
      // Send the ID token to the backend
      ApiHandler.saveToken(idToken); // Save token for API requests
      setAuthState({ user: userCredential.user, loading: false });
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  // Logout handler
  const onLogout = async () => {
    try {
      await signOut(FIREBASE_AUTH);
      setAuthState({ user: null, loading: false }); // Reset state after sign out
      ApiHandler.removeToken(); // Remove token from API handler
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ authState, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access the auth context
export const useAuth = () => useContext(AuthContext);
