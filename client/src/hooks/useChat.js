import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getMessages,
  sendMessage,
  findMessagesBetweenUsers,
} from "../services/Firebase-config.js";

const useChat = (chatId, currentUserFirebaseId, partnerFirebaseId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setError("User not logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Standard chat room subscription using chatId
  useEffect(() => {
    if (user && chatId) {
      try {
        const unsubscribe = getMessages(chatId, setMessages);
        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up chat subscription:", error);
        setError("Failed to load messages");
        setLoading(false);
      }
    }
  }, [chatId, user]);

  // Direct message fetching between two users - this is more reliable
  useEffect(() => {
    if (user && currentUserFirebaseId && partnerFirebaseId) {
      setLoading(true);
      findMessagesBetweenUsers(currentUserFirebaseId, partnerFirebaseId)
        .then((fetchedMessages) => {
          if (fetchedMessages.length > 0) {
            setMessages(fetchedMessages);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error in direct message fetching:", err);
          setLoading(false);
        });
    }
  }, [currentUserFirebaseId, partnerFirebaseId, user]);

  const sendNewMessage = async (messageData) => {
    if (!user) {
      setError("User is not logged in");
      return;
    }

    try {
      // If messageData is just a string, convert to proper object
      const formattedMessage =
        typeof messageData === "string" ? { text: messageData } : messageData;

      // Add email and timestamp if not provided
      const completeMessage = {
        ...formattedMessage,
        senderEmail: formattedMessage.senderEmail || user.email,
        timestamp: formattedMessage.timestamp || new Date(),
      };

      // Send the message
      await sendMessage(chatId, completeMessage, user.uid);

      // Optionally refresh messages
      if (currentUserFirebaseId && partnerFirebaseId) {
        const updatedMessages = await findMessagesBetweenUsers(
          currentUserFirebaseId,
          partnerFirebaseId
        );
        setMessages(updatedMessages);
      }
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
