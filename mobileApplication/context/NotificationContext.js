import React, { createContext, useState, useContext, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { directFetchNotifications } from "../firebaseNotification.js";

// Create the context
const NotificationContext = createContext();

// Create a provider component
export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = (count) => {
    setUnreadCount(count);
  };

  // Fetch initial count when app loads
  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const firebaseId = currentUser.uid;
          const notifications = await directFetchNotifications(firebaseId);
          const count = notifications.filter((n) => !n.read).length;
          setUnreadCount(count);
        }
      } catch (error) {
        console.error("Error fetching initial notification count:", error);
      }
    };

    fetchInitialCount();
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, updateUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Create a custom hook to use the context
export const useNotifications = () => useContext(NotificationContext);
