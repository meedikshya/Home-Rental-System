import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getMessages,
  sendMessage,
  FIREBASE_DB,
} from "../services/Firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  collectionGroup,
} from "firebase/firestore";

const useChat = (
  chatId,
  currentFirebaseId = null,
  partnerFirebaseId = null
) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [messagesFetched, setMessagesFetched] = useState(false);

  // Debug information
  useEffect(() => {
    console.log("useChat params:", {
      chatId,
      currentFirebaseId,
      partnerFirebaseId,
      messagesFetched,
      messagesCount: messages.length,
    });
  }, [chatId, currentFirebaseId, partnerFirebaseId, messagesFetched, messages]);

  // Authentication effect
  useEffect(() => {
    console.log("Setting up auth listener");
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("User authenticated in useChat:", currentUser.email);
        setUser(currentUser);
        setError(null);
      } else {
        console.log("No authenticated user in useChat");
        setError("User not logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Primary message fetching effect
  useEffect(() => {
    if (!user || !chatId) {
      console.log("Missing user or chatId, not fetching messages");
      return;
    }

    console.log("Setting up message listener for chat:", chatId);
    let unsubscribe;

    try {
      unsubscribe = getMessages(chatId, (fetchedMessages) => {
        console.log(
          `Got ${fetchedMessages.length} messages for chat ${chatId}`
        );
        setMessages(fetchedMessages);
        setLoading(false);
        setMessagesFetched(true);

        // If we didn't get any messages, try searching by current user's Firebase ID
        if (fetchedMessages.length === 0 && currentFirebaseId) {
          console.log(
            "No messages found with chatId, searching by Firebase ID"
          );
          searchMessagesByFirebaseId();
        }
      });
    } catch (err) {
      console.error("Error setting up message listener:", err);
      setError("Failed to set up message listener");
      setLoading(false);

      // Try searching by Firebase ID as fallback
      if (currentFirebaseId) {
        searchMessagesByFirebaseId();
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, user, currentFirebaseId]);

  const searchMessagesByFirebaseId = async () => {
    if (!currentFirebaseId) {
      console.log("No Firebase ID to search with");
      return;
    }

    console.log(
      "Searching messages where current user is receiver:",
      currentFirebaseId
    );
    setLoading(true);

    try {
      const messagesRef = collectionGroup(FIREBASE_DB, "messages");
      let foundMessages = [];

      // Try finding messages where user is sender first
      try {
        const senderQuery = query(
          messagesRef,
          where("senderId", "==", currentFirebaseId)
        );

        const senderSnapshot = await getDocs(senderQuery);

        senderSnapshot.forEach((doc) => {
          foundMessages.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log(
          `Found ${senderSnapshot.size} messages where user is sender`
        );
      } catch (err) {
        console.warn("Error searching sender messages:", err.message);
      }

      // Then try finding messages where user is receiver (nested in text object)
      try {
        const receiverQuery = query(
          messagesRef,
          where("text.receiverId", "==", currentFirebaseId)
        );

        const receiverSnapshot = await getDocs(receiverQuery);

        receiverSnapshot.forEach((doc) => {
          foundMessages.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        console.log(
          `Found ${receiverSnapshot.size} messages where user is nested receiver`
        );
      } catch (err) {
        console.warn(
          "Error searching nested receiver messages (index required):",
          err.message
        );
        console.warn(
          "To fix this permanently, create the index using Firebase console"
        );
      }

      // Update state if we found messages
      if (foundMessages.length > 0) {
        setMessages(foundMessages);
        setMessagesFetched(true);
      }
    } catch (err) {
      console.error("Error in message search fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  // Send message function
  const sendNewMessage = async (messageData) => {
    if (!user) {
      console.error("Cannot send message: User not authenticated");
      setError("User is not logged in");
      return;
    }

    if (!chatId) {
      console.error("Cannot send message: Chat ID not available");
      setError("Chat ID is not available");
      return;
    }

    try {
      console.log("Sending message with:", { chatId, messageData });
      await sendMessage(chatId, messageData, user.uid, user.email);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Error sending message");
    }
  };

  return {
    messages,
    loading,
    error,
    sendNewMessage,
  };
};

export default useChat;
