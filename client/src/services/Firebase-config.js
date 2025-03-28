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
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBfEdQ6VymOIcCOyeEuppeGyWfYt4_PKKo",
  authDomain: "library-management-68286.firebaseapp.com",
  projectId: "library-management-68286",
  storageBucket: "library-management-68286.appspot.com",
  messagingSenderId: "897588484552",
  appId: "1:897588484552:web:37e4a761676c052a0948fd",
  measurementId: "G-0D1EFQ7FZW",
};

// Initialize Firebase
const FIREBASE_APP = initializeApp(firebaseConfig);
const FIREBASE_AUTH = getAuth(FIREBASE_APP);
const FIREBASE_DB = getFirestore(FIREBASE_APP);

// Initialize Messaging
let messaging = null;
isSupported().then((isSupported) => {
  if (isSupported) {
    messaging = getMessaging(FIREBASE_APP);
  }
});

const getMessages = (chatId, setMessages) => {
  getDoc(doc(FIREBASE_DB, "chats", chatId))
    .then((chatDoc) => {
      if (chatDoc.exists()) {
        setupDirectMessageListener(chatId, setMessages);
      } else {
        setMessages([]);
      }
    })
    .catch((err) => {
      setMessages([]);
    });

  function setupDirectMessageListener(chatId, setMessages) {
    const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");
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
        console.error(`Error fetching messages from ${chatId}:`, error);
      }
    );
    return unsubscribe;
  }

  return () => {};
};

const findMessagesBetweenUsers = async (
  currentUserFirebaseId,
  partnerFirebaseId
) => {
  let messages = [];

  try {
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
    } catch (err) {}

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

const sendMessage = async (chatId, messageData, senderFirebaseId) => {
  try {
    // First ensure the chat document exists
    await setDoc(
      doc(FIREBASE_DB, "chats", chatId),
      { lastUpdated: serverTimestamp() },
      { merge: true }
    );

    const messagesRef = collection(FIREBASE_DB, "chats", chatId, "messages");

    // Get current user's email to ensure senderEmail is always present
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userEmail = currentUser ? currentUser.email : "unknown@user.com";

    // Prepare the message data in the correct format
    let finalMessageData = {};

    if (typeof messageData === "string") {
      finalMessageData = {
        text: messageData,
        senderId: senderFirebaseId,
        senderEmail: userEmail,
        timestamp: serverTimestamp(),
      };
    } else if (typeof messageData === "object") {
      // Object message with proper formatting
      finalMessageData = {
        text:
          typeof messageData.text === "object"
            ? messageData.text.text
            : messageData.text,
        senderId: messageData.senderId || senderFirebaseId,
        senderEmail: messageData.senderEmail || userEmail,
        ...(messageData.receiverId && { receiverId: messageData.receiverId }),
        timestamp: messageData.timestamp || serverTimestamp(),
      };
    } else {
      throw new Error("Invalid message data format");
    }

    // Add document to Firestore
    const docRef = await addDoc(messagesRef, finalMessageData);
    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const getAssociatedUsers = async (currentUserId) => {
  try {
    const chatPartners = new Set();

    // Method 1: Find chats directly
    try {
      const chatsRef = collection(FIREBASE_DB, "chats");
      const chatsSnapshot = await getDocs(chatsRef);

      // Process each chat room to find messages
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id;
        // Only check chats that might involve the current user
        if (!chatId.includes("chat_")) continue;

        const messagesRef = collection(
          FIREBASE_DB,
          "chats",
          chatId,
          "messages"
        );
        const messagesSnapshot = await getDocs(
          query(messagesRef, orderBy("timestamp", "desc"))
        );

        // Find messages where current user is receiver
        for (const messageDoc of messagesSnapshot.docs) {
          const data = messageDoc.data();

          if (
            data.text &&
            typeof data.text === "object" &&
            data.text.receiverId === currentUserId
          ) {
            // Add sender to chat partners
            if (data.senderId && data.senderId !== currentUserId) {
              chatPartners.add(data.senderId);
            }

            // Also check text.senderId for database ID
            if (
              data.text.senderId &&
              String(data.text.senderId) !== String(currentUserId)
            ) {
              chatPartners.add(data.text.senderId);
            }
          }
        }
      }
    } catch (err) {}

    // Method 2: Use collectionGroup
    try {
      const messagesGroupRef = collectionGroup(FIREBASE_DB, "messages");
      const sentQuery = query(
        messagesGroupRef,
        where("senderId", "!=", currentUserId)
      );
      const sentSnapshot = await getDocs(sentQuery);

      // Check messages for receivers
      sentSnapshot.docs.forEach((doc) => {
        const data = doc.data();

        if (
          data.text &&
          typeof data.text === "object" &&
          data.text.receiverId === currentUserId
        ) {
          if (data.senderId) {
            chatPartners.add(data.senderId);
          }
        }
      });
    } catch (err) {
      // Continue with partners already found
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
  getMessages,
  sendMessage,
  messaging,
  getAssociatedUsers,
  findMessagesBetweenUsers,
};
