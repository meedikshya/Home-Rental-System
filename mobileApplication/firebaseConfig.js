// /src/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  collectionGroup,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBfEdQ6VymOIcCOyeEuppeGyWfYt4_PKKo",
  authDomain: "library-management-68286.firebaseapp.com",
  projectId: "library-management-68286",
  storageBucket: "library-management-68286.firebasestorage.app",
  messagingSenderId: "897588484552",
  appId: "1:897588484552:web:37e4a761676c052a0948fd",
  measurementId: "G-0D1EFQ7FZW",
};

// Initialize Firebase App
const FIREBASE_APP =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native persistence
const FIREBASE_AUTH =
  getAuth(FIREBASE_APP) ||
  initializeAuth(FIREBASE_APP, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

// Initialize Firestore
const FIREBASE_DB = getFirestore(FIREBASE_APP);

// Initialize Messaging (add this after your FIREBASE_DB initialization)
let messaging = null;
isSupported().then((isSupported) => {
  if (isSupported) {
    messaging = getMessaging(FIREBASE_APP);
  }
});

const getMessages = (chatId, setMessages) => {
  // Check if chat exists before setting up listener
  getDoc(doc(FIREBASE_DB, "chats", chatId))
    .then((chatDoc) => {
      if (chatDoc.exists()) {
        const messagesRef = collection(
          FIREBASE_DB,
          "chats",
          chatId,
          "messages"
        );
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            const messages = [];
            querySnapshot.forEach((doc) => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            setMessages(messages);
          },
          (error) => {
            console.error("Error fetching messages: ", error);
          }
        );
        return unsubscribe;
      } else {
        setMessages([]);
        return () => {};
      }
    })
    .catch((error) => {
      console.error("Error checking chat existence:", error);
      setMessages([]);
      return () => {};
    });

  return () => {}; // Default unsubscribe function
};

// Updated sendMessage function that handles both simple text and structured messages
const sendMessage = async (chatId, messageData, userId) => {
  try {
    // Ensure the chat document exists
    await setDoc(
      doc(FIREBASE_DB, "chats", chatId),
      { lastUpdated: serverTimestamp() },
      { merge: true }
    );

    // Create collection reference
    const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");

    // Format message based on input type
    let finalMessage = {};

    if (typeof messageData === "string") {
      // Simple string case
      finalMessage = {
        senderId: userId,
        senderEmail: "",
        text: {
          text: messageData,
          senderId: 0, // Default numeric ID
          receiverId: "", // Empty default
        },
        timestamp: serverTimestamp(),
      };
    } else if (typeof messageData === "object") {
      // Object with fields - create the nested structure you want
      finalMessage = {
        senderId: messageData.senderId || userId,
        senderEmail: messageData.senderEmail || "",
        text: {
          text: messageData.text || "",
          senderId: parseInt(messageData.internalUserId) || 0, // Numeric internal ID
          receiverId: messageData.receiverId || "",
        },
        timestamp: messageData.timestamp || serverTimestamp(),
      };
    } else {
      throw new Error("Invalid message format");
    }

    // Send to Firebase
    console.log("Sending formatted message:", finalMessage);
    const docRef = await addDoc(messagesRef, finalMessage);
    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};
// Find all messages between two users (matches web version)
const findMessagesBetweenUsers = async (
  currentUserFirebaseId,
  partnerFirebaseId
) => {
  let messages = [];

  try {
    // APPROACH 1: Find direct messages by sender/receiver pairs
    const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");

    // First query: Messages sent BY current user TO partner
    const sentByCurrentQuery = query(
      messagesGroupRef,
      where("senderId", "==", currentUserFirebaseId)
    );
    const sentByCurrentSnapshot = await getDocs(sentByCurrentQuery);

    sentByCurrentSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Check for receiverId in all possible locations
      const receiverId =
        data.receiverId ||
        (data.text && typeof data.text === "object" && data.text.receiverId);

      if (receiverId === partnerFirebaseId) {
        messages.push({ id: doc.id, ...data });
      }
    });

    // Second query: Messages sent BY partner TO current user
    const sentByPartnerQuery = query(
      messagesGroupRef,
      where("senderId", "==", partnerFirebaseId)
    );
    const sentByPartnerSnapshot = await getDocs(sentByPartnerQuery);

    sentByPartnerSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Check for receiverId in all possible locations
      const receiverId =
        data.receiverId ||
        (data.text && typeof data.text === "object" && data.text.receiverId);

      if (receiverId === currentUserFirebaseId) {
        messages.push({ id: doc.id, ...data });
      }
    });

    // APPROACH 2: Check specific chat rooms
    const possibleChatIds = [
      `chat_${currentUserFirebaseId}_${partnerFirebaseId}`,
      `chat_${partnerFirebaseId}_${currentUserFirebaseId}`,
    ];

    for (const chatId of possibleChatIds) {
      try {
        const messagesRef = collection(
          FIREBASE_DB,
          "chats",
          chatId,
          "messages"
        );
        const messagesSnapshot = await getDocs(
          query(messagesRef, orderBy("timestamp", "asc"))
        );

        messagesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Avoid duplicates
          if (!messages.some((msg) => msg.id === doc.id)) {
            messages.push({ id: doc.id, ...data });
          }
        });
      } catch (err) {
        // Chat might not exist, continue
      }
    }

    // Sort messages by timestamp
    messages.sort((a, b) => {
      const timeA =
        a.timestamp?.seconds ||
        (a.timestamp instanceof Date ? a.timestamp.getTime() / 1000 : 0);
      const timeB =
        b.timestamp?.seconds ||
        (b.timestamp instanceof Date ? b.timestamp.getTime() / 1000 : 0);
      return timeA - timeB;
    });

    return messages;
  } catch (error) {
    console.error("Error finding messages between users:", error);
    return [];
  }
};

// Updated to find all chat partners (both where user is sender and receiver)
const getAssociatedUsers = async (currentUserId) => {
  try {
    const chatPartners = new Set();

    // Method 1: Find users where current user is sender
    try {
      const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");
      const sentQuery = query(
        messagesGroupRef,
        where("senderId", "==", currentUserId)
      );
      const sentSnapshot = await getDocs(sentQuery);

      sentSnapshot.forEach((doc) => {
        const data = doc.data();

        // Check for direct receiverId
        if (data.receiverId && data.receiverId !== currentUserId) {
          chatPartners.add(data.receiverId);
        }

        // Also check nested receiverId
        if (
          data.text &&
          typeof data.text === "object" &&
          data.text.receiverId
        ) {
          const receiverId = data.text.receiverId;
          if (receiverId && receiverId !== currentUserId) {
            chatPartners.add(receiverId);
          }
        }
      });
    } catch (err) {
      // Continue with next method
    }

    // Method 2: Find users where current user is receiver
    try {
      const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");
      const receivedQuery = query(
        messagesGroupRef,
        where("receiverId", "==", currentUserId)
      );
      const receivedSnapshot = await getDocs(receivedQuery);

      receivedSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.senderId && data.senderId !== currentUserId) {
          chatPartners.add(data.senderId);
        }
      });
    } catch (err) {
      // Continue with next method
    }

    // Method 3: Check chat rooms directly
    try {
      const chatsRef = collection(FIREBASE_DB, "chats");
      const chatsSnapshot = await getDocs(chatsRef);

      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;

        // Only process likely chat rooms
        if (chatId.includes(currentUserId) || chatId.includes("chat_")) {
          const messagesRef = collection(
            FIREBASE_DB,
            "chats",
            chatId,
            "messages"
          );
          const messagesSnapshot = await getDocs(
            query(messagesRef, orderBy("timestamp", "desc"))
          );

          for (const messageDoc of messagesSnapshot.docs) {
            const data = messageDoc.data();

            // Add sender if current user is receiver
            if (
              data.receiverId === currentUserId &&
              data.senderId !== currentUserId
            ) {
              chatPartners.add(data.senderId);
            }

            // Add receiver if current user is sender
            if (
              data.senderId === currentUserId &&
              data.receiverId !== currentUserId
            ) {
              chatPartners.add(data.receiverId);
            }

            // Check nested objects
            if (data.text && typeof data.text === "object") {
              if (
                data.text.receiverId === currentUserId &&
                data.senderId !== currentUserId
              ) {
                chatPartners.add(data.senderId);
              }
              if (
                data.text.senderId === currentUserId &&
                data.text.receiverId !== currentUserId
              ) {
                chatPartners.add(data.text.receiverId);
              }
            }
          }
        }
      }
    } catch (err) {
      // Continue with users already found
    }

    return [...chatPartners];
  } catch (error) {
    console.error("Error fetching associated users:", error);
    return [];
  }
};

export {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_DB,
  messaging,
  getMessages,
  sendMessage,
  getAssociatedUsers,
  findMessagesBetweenUsers,
};
