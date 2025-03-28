import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getMessages,
  sendMessage,
  findMessagesBetweenUsers,
} from "../services/Firebase-config.js";
import { sendNotificationToUser } from "../services/Firebase-notification.js";

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
    }
  }, [currentUserFirebaseId, partnerFirebaseId, user]);

  // Enhanced message sending with notification - EXACTLY like mobile version
  const sendNewMessage = async (messageData) => {
    if (!user || !chatId) {
      setError("User is not logged in or chat ID is missing");
      return;
    }

    try {
      console.log("Sending message:", messageData);

      // Format message data based on type
      const formattedMessage =
        typeof messageData === "string" ? { text: messageData } : messageData;

      // Add email and timestamp if not provided
      const completeMessage = {
        ...formattedMessage,
        senderEmail: formattedMessage.senderEmail || user.email,
        timestamp: formattedMessage.timestamp || new Date(),
        receiverId: partnerFirebaseId, // Make sure receiverId is included
      };

      // Send the message
      await sendMessage(chatId, completeMessage, user.uid);
      console.log("Message sent successfully");

      // NOTIFICATION SECTION - EXACTLY matching mobile implementation
      try {
        // Get receiverId from partner's Firebase ID
        const receiverId = partnerFirebaseId;

        if (!receiverId) {
          console.error("No receiver ID available for notification");
          return;
        }

        console.log("Sending notification to:", receiverId);

        const notificationTitle = "New Message";
        const notificationBody = `You have a new message from ${
          user.email || "a user"
        }`;

        // Additional data to be included with the notification - EXACT match to mobile
        const additionalData = {
          chatId: chatId,
          senderId: currentUserFirebaseId || user.uid,
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
        // Don't throw here - just like mobile, we continue even if notification fails
      }

      // After sending, refresh messages with timeout - EXACT match to mobile
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
      }, 500); // Same 500ms delay as mobile
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
