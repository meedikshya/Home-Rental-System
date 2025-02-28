import { useState, useEffect } from "react";
import {
  FIREBASE_AUTH,
  getMessages,
  sendMessage,
} from "../services/Firebase-config.js";

const useChat = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Authentication effect
  useEffect(() => {
    console.log("Setting up auth listener in useChat");
    const unsubscribe = FIREBASE_AUTH.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        console.log("User authenticated in useChat:", currentUser.email);
        setUser(currentUser);
      } else {
        console.log("No authenticated user in useChat");
        setError("User not logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Message subscription effect - only runs when we have both user and chatId
  useEffect(() => {
    if (!user) {
      console.log("No authenticated user yet, not setting up chat listener");
      return;
    }

    if (!chatId) {
      console.log("No chat ID yet, not setting up chat listener");
      setLoading(false);
      return;
    }

    console.log(`Setting up message listener for chat: ${chatId}`);
    try {
      const unsubscribe = getMessages(chatId, (fetchedMessages) => {
        console.log(
          `Received ${fetchedMessages.length} messages for ${chatId}`
        );
        setMessages(fetchedMessages || []);
        setLoading(false);
      });

      // Clean up subscription when component unmounts or chatId/user changes
      return () => {
        console.log(`Cleaning up message listener for chat: ${chatId}`);
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    } catch (err) {
      console.error("Error setting up message subscription:", err);
      setError(`Failed to load messages: ${err.message}`);
      setLoading(false);
    }
  }, [chatId, user]);

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
      console.log("Sending message:", {
        chatId,
        messageData,
      });

      // If messageData is an object with text property
      if (typeof messageData === "object" && messageData.text) {
        const messageId = await sendMessage(
          chatId,
          messageData.text,
          messageData.senderId || user.uid,
          messageData.receiverId
        );
        console.log("Message sent with ID:", messageId);
      } else {
        // If messageData is just a text string
        const messageId = await sendMessage(
          chatId,
          messageData,
          user.uid,
          user.email
        );
        console.log("Message sent with ID:", messageId);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(`Failed to send message: ${err.message}`);
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
