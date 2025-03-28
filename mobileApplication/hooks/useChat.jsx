import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getMessages,
  sendMessage,
  findMessagesBetweenUsers,
} from "../firebaseConfig";
import { sendNotificationToUser } from "../firebaseNotification";

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
    if (user && currentUserFirebaseId && partnerFirebaseId && chatId) {
      setLoading(true);
      console.log("Finding messages between users:", {
        currentUserFirebaseId,
        partnerFirebaseId,
      });

      findMessagesBetweenUsers(currentUserFirebaseId, partnerFirebaseId)
        .then((fetchedMessages) => {
          if (fetchedMessages && fetchedMessages.length > 0) {
            console.log(
              `Found ${fetchedMessages.length} messages between users`
            );
            setMessages(fetchedMessages);
          } else {
            console.log("No messages found between these users");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error in direct message fetching:", err);
          setLoading(false);
        });
    } else {
      // Log what's missing
      const missing = [];
      if (!user) missing.push("user");
      if (!currentUserFirebaseId) missing.push("currentUserFirebaseId");
      if (!partnerFirebaseId) missing.push("partnerFirebaseId");
      if (!chatId) missing.push("chatId");

      if (missing.length > 0) {
        console.log(
          `Skipping direct message fetch - missing: ${missing.join(", ")}`
        );
      }
    }
  }, [currentUserFirebaseId, partnerFirebaseId, user, chatId]);

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

      // Send notification to the receiver
      try {
        const receiverId = messageData.receiverId; // Assuming receiverId is in messageData
        const notificationTitle = "New Message";
        const notificationBody = `You have a new message from ${
          user.email || "a user"
        }`; // Customize as needed

        // Additional data to be included with the notification
        const additionalData = {
          chatId: chatId,
          senderId: currentUserFirebaseId,
          receiverId: receiverId,
          screen: "Chat", // Screen to navigate to when notification is tapped
          action: "view_chat",
          timestamp: new Date().toISOString(),
        };

        // Send the notification
        await sendNotificationToUser(
          receiverId,
          notificationTitle,
          notificationBody,
          additionalData
        );

        console.log("Message notification sent to user:", receiverId);
      } catch (notificationError) {
        console.error("Error sending message notification:", notificationError);
      }

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
      }, 500);
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
