import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getMessages,
  sendMessage,
  findMessagesBetweenUsers,
} from "../firebaseConfig";

// Updated to match web version with additional parameters
const useChat = (chatId, currentUserFirebaseId, partnerFirebaseId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Auth state monitoring
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

  // Direct message fetching between two users - more reliable approach
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

  // Enhanced message sending with proper formatting
  const sendNewMessage = async (messageData) => {
    if (!user || !chatId) {
      setError("User is not logged in or chat ID is missing");
      return;
    }

    try {
      console.log("Sending message:", messageData);

      // Send the message using updated function
      await sendMessage(chatId, messageData, currentUserFirebaseId || user.uid);

      // After sending, refresh messages
      setTimeout(async () => {
        if (currentUserFirebaseId && partnerFirebaseId) {
          console.log(
            "Refreshing messages between",
            currentUserFirebaseId,
            "and",
            partnerFirebaseId
          );
          const updatedMessages = await findMessagesBetweenUsers(
            currentUserFirebaseId,
            partnerFirebaseId
          );
          if (updatedMessages && updatedMessages.length > 0) {
            console.log(
              "Found",
              updatedMessages.length,
              "messages after refresh"
            );
            setMessages(updatedMessages);
          }
        }
      }, 500); // Small delay to ensure Firebase has processed the write
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
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
