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

const findMessagesBetweenUsers = async (
  currentUserFirebaseId,
  partnerFirebaseId
) => {
  let messages = [];

  try {
    // Query all messages across all chats
    const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");

    // Find messages where: currentUser → partnerUser
    const sentByCurrentQuery = query(
      messagesGroupRef,
      where("senderId", "==", currentUserFirebaseId)
    );

    const sentByCurrentSnapshot = await getDocs(sentByCurrentQuery);

    sentByCurrentSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Check both direct receiverId and nested receiverId
      const receiverId =
        data.receiverId ||
        (data.text && typeof data.text === "object" && data.text.receiverId);

      if (receiverId === partnerFirebaseId) {
        messages.push({ id: doc.id, ...data });
      }
    });

    // Find messages where: partnerUser → currentUser
    const sentByPartnerQuery = query(
      messagesGroupRef,
      where("senderId", "==", partnerFirebaseId)
    );

    const sentByPartnerSnapshot = await getDocs(sentByPartnerQuery);

    sentByPartnerSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Check both direct receiverId and nested receiverId
      const receiverId =
        data.receiverId ||
        (data.text && typeof data.text === "object" && data.text.receiverId);

      if (receiverId === currentUserFirebaseId) {
        messages.push({ id: doc.id, ...data });
      }
    });

    // Also check chat rooms directly
    try {
      const chatsRef = collection(FIREBASE_DB, "chats");
      const chatsSnapshot = await getDocs(chatsRef);

      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;

        // Only process chat rooms that might involve these users
        if (
          chatId.includes(currentUserFirebaseId) ||
          chatId.includes(partnerFirebaseId)
        ) {
          const messagesRef = collection(
            FIREBASE_DB,
            "chats",
            chatId,
            "messages"
          );
          const messagesSnapshot = await getDocs(
            query(messagesRef, orderBy("timestamp", "asc"))
          );

          for (const messageDoc of messagesSnapshot.docs) {
            const data = messageDoc.data();

            // Check if this message is between our two users
            if (
              (data.senderId === currentUserFirebaseId &&
                (data.receiverId === partnerFirebaseId ||
                  (data.text &&
                    typeof data.text === "object" &&
                    data.text.receiverId === partnerFirebaseId))) ||
              (data.senderId === partnerFirebaseId &&
                (data.receiverId === currentUserFirebaseId ||
                  (data.text &&
                    typeof data.text === "object" &&
                    data.text.receiverId === currentUserFirebaseId)))
            ) {
              // Avoid duplicates
              if (!messages.some((msg) => msg.id === messageDoc.id)) {
                messages.push({ id: messageDoc.id, ...data });
              }
            }
          }
        }
      }
    } catch (err) {
      // Continue with the messages we already found
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

const getAssociatedUsers = async (currentUserId) => {
  try {
    console.log("Fetching chat users for:", currentUserId);

    // Query all messages subcollections
    const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");

    // Query docs where the current user is the sender
    const sentQuery = query(
      messagesGroupRef,
      where("senderId", "==", currentUserId)
    );

    const sentSnapshot = await getDocs(sentQuery);

    let chatPartners = new Set();

    sentSnapshot.forEach((doc) => {
      const data = doc.data();

      // Extract receiverId from the nested text object
      if (data.text && typeof data.text === "object" && data.text.receiverId) {
        const receiverId = data.text.receiverId;

        if (receiverId && receiverId !== currentUserId) {
          console.log("Sent message to:", receiverId);
          chatPartners.add(receiverId);
        }
      }
    });

    console.log("Final chat users list:", [...chatPartners]);
    return [...chatPartners];
  } catch (error) {
    console.error("Error fetching associated users:", error);
    throw error;
  }
};

export {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_DB,
  getMessages,
  sendMessage,
  getAssociatedUsers,
  findMessagesBetweenUsers,
};
