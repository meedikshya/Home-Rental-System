import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FIREBASE_AUTH } from "../firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({ user: null, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setAuthState({ user, loading: false });
    });

    return () => unsubscribe();
  }, []);

  const onLogout = async () => {
    await signOut(FIREBASE_AUTH);
    setAuthState({ user: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ authState, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
