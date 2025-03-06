// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
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

// ⭐ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBfEdQ6VymOIcCOyeEuppeGyWfYt4_PKKo",
  authDomain: "library-management-68286.firebaseapp.com",
  projectId: "library-management-68286",
  storageBucket: "library-management-68286.appspot.com",
  messagingSenderId: "897588484552",
  appId: "1:897588484552:web:37e4a761676c052a0948fd",
  measurementId: "G-0D1EFQ7FZW",
};

// ✅ Initialize Firebase
const FIREBASE_APP = initializeApp(firebaseConfig);
const FIREBASE_AUTH = getAuth(FIREBASE_APP);
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
      console.log("Messages fetched:", messages);
      setMessages(messages);
    },
    (error) => {
      console.error("Error fetching messages: ", error); // Log error
    }
  );
  return unsubscribe;
};

// Update the sendMessage function to match the mobile app structure

const sendMessage = async (chatId, messageText, userId, userEmail) => {
  try {
    console.log("Sending message to chat:", chatId, {
      messageText,
      userId,
      userEmail,
    });
    const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");

    // Structure exactly matching your shown format
    const messageData = {
      senderId: userId, // Firebase ID of sender
      senderEmail: userEmail,
      text: {
        // If messageText is already an object with the right structure, use it
        receiverId:
          typeof messageText === "object" ? messageText.receiverId : null,
        senderId: typeof messageText === "object" ? messageText.senderId : null, // Database ID (number)
        text: typeof messageText === "object" ? messageText.text : messageText,
      },
      timestamp: serverTimestamp(),
    };

    // Debug log
    console.log("Formatted message to send:", messageData);

    await addDoc(messagesRef, messageData);
    console.log("Message sent successfully!");
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const getAssociatedUsers = async (currentUserId) => {
  try {
    console.log("Fetching chat users for:", currentUserId);
    const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");
    const chatPartners = new Set();

    // First try to find chats where current user is the sender (by Firebase ID)
    try {
      const sentQuery = query(
        messagesGroupRef,
        where("senderId", "==", currentUserId)
      );
      const sentSnapshot = await getDocs(sentQuery);

      sentSnapshot.forEach((doc) => {
        const data = doc.data();
        // The receiverId is in the text object
        if (
          data.text &&
          data.text.receiverId &&
          data.text.receiverId !== currentUserId
        ) {
          console.log(
            `Found receiver: ${data.text.receiverId} in sent message`
          );
          chatPartners.add(data.text.receiverId);
        }
      });
      console.log(`Found ${sentSnapshot.size} messages where user is sender`);
    } catch (error) {
      console.warn("Error fetching sent messages:", error);
    }

    // Then try to find chats where current user is the receiver (receiverId is inside text object)
    try {
      // This requires a collection group index on text.receiverId!
      const receivedQuery = query(
        messagesGroupRef,
        where("text.receiverId", "==", currentUserId)
      );
      const receivedSnapshot = await getDocs(receivedQuery);

      receivedSnapshot.forEach((doc) => {
        const data = doc.data();
        // The senderId is at the top level
        if (data.senderId && data.senderId !== currentUserId) {
          console.log(`Found sender: ${data.senderId} in received message`);
          chatPartners.add(data.senderId);
        }
      });
      console.log(
        `Found ${receivedSnapshot.size} messages where user is receiver`
      );
    } catch (error) {
      console.warn(
        "Error fetching received messages (index may be required):",
        error
      );
      console.warn(
        "To fix this permanently, create the index in Firebase console"
      );

      // If no index, add debug users for testing
      console.log("Adding sample users for testing (since index query failed)");
      const debugUsers = ["2WL2WRMZuPSv1t3J57JMK9XcOoE2"]; // Replace with actual Firebase IDs
      debugUsers.forEach((id) => {
        if (id !== currentUserId) {
          chatPartners.add(id);
        }
      });
    }

    const partners = [...chatPartners];
    console.log(`Found ${partners.length} chat partners:`, partners);
    return partners;
  } catch (error) {
    console.error("Error in getAssociatedUsers:", error);
    return [];
  }
};

export {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_DB,
  getMessages,
  sendMessage,
  getAssociatedUsers,
};
