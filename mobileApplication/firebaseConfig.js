// /src/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

// 🛡️ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBfEdQ6VymOIcCOyeEuppeGyWfYt4_PKKo",
  authDomain: "library-management-68286.firebaseapp.com",
  projectId: "library-management-68286",
  storageBucket: "library-management-68286.firebasestorage.app",
  messagingSenderId: "897588484552",
  appId: "1:897588484552:web:37e4a761676c052a0948fd",
  measurementId: "G-0D1EFQ7FZW",
};

// ✅ Initialize Firebase App
const FIREBASE_APP =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Auth
const FIREBASE_AUTH =
  getAuth(FIREBASE_APP) ||
  initializeAuth(FIREBASE_APP, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

// ✅ Initialize Firestore
const FIREBASE_DB = getFirestore(FIREBASE_APP);

const getMessages = (chatId, setMessages) => {
  const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));
  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      console.log("Messages fetched:", messages); // Debug log
      setMessages(messages);
    },
    (error) => {
      console.error("Error fetching messages: ", error); // Log error
    }
  );
  return unsubscribe; // Return unsubscribe to clean up listener
};

// Function to send a new message
const sendMessage = async (chatId, messageText, userId, userEmail) => {
  try {
    const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId: userId,
      senderEmail: userEmail,
      text: messageText,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error sending message: ", error);
    throw error;
  }
};

export { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB, getMessages, sendMessage };
