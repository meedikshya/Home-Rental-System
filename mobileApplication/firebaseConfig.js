import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage

const firebaseConfig = {
  apiKey: "AIzaSyBfEdQ6VymOIcCOyeEuppeGyWfYt4_PKKo",
  authDomain: "library-management-68286.firebaseapp.com",
  projectId: "library-management-68286",
  storageBucket: "library-management-68286.firebasestorage.app",
  messagingSenderId: "897588484552",
  appId: "1:897588484552:web:37e4a761676c052a0948fd",
  measurementId: "G-0D1EFQ7FZW",
};

// ✅ Ensure Firebase is initialized only once
const FIREBASE_APP =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Ensure Auth is initialized only once
const FIREBASE_AUTH =
  getAuth(FIREBASE_APP) ||
  initializeAuth(FIREBASE_APP, {
    persistence: getReactNativePersistence(AsyncStorage), // Enable persistence for session
  });

export { FIREBASE_APP, FIREBASE_AUTH };
