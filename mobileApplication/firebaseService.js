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
} from "firebase/firestore";

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

export { getMessages, sendMessage, getAssociatedUsers };
