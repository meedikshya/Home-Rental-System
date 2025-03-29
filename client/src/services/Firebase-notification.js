import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { FIREBASE_DB, FIREBASE_AUTH } from "./Firebase-config.js";

// Request notification permission for browser
export const requestNotificationPermission = async () => {
  console.log("Requesting notification permission");

  // Check if browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  // Check if permission is already granted
  if (Notification.permission === "granted") {
    console.log("Notification permission already granted");
    return true;
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted");
      return true;
    } else {
      console.log("Notification permission denied");
      return false;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Show a browser notification
export const showBrowserNotification = (
  title,
  body,
  icon = "/favicon.ico",
  onClick = () => {}
) => {
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        icon,
      });

      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  }
  return null;
};

// Set up listeners for receiving notifications
export const setupNotificationListeners = () => {
  try {
    // For web, we don't have foreground notification listeners like in Expo
    // Instead, we'll set up a Firebase listener and show browser notifications

    const userId = FIREBASE_AUTH.currentUser?.uid;
    if (!userId) {
      console.log("No user logged in, can't set up notification listeners");
      return () => {};
    }

    // Listen for new notifications in Firebase
    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      // Look for newly added documents in the snapshot
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const notification = change.doc.data();

          // Show browser notification
          if (Notification.permission === "granted") {
            showBrowserNotification(
              notification.title,
              notification.body,
              "/favicon.ico",
              () => {
                // Mark as read when clicked
                markNotificationAsRead(change.doc.id);
              }
            );
          }
        }
      });
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up notification listeners:", error);
    return () => {};
  }
};

// Send a notification to a specific user
export const sendNotificationToUser = async (
  receiverId,
  title = "New Notification",
  body = "You have a new notification",
  additionalData = {}
) => {
  try {
    // Get current user as sender
    const senderId = FIREBASE_AUTH.currentUser?.uid;
    if (!senderId) {
      console.error("No user logged in, can't send notification");
      return null;
    }

    // Store in Firebase with sender and receiver
    const notificationId = await storeNotificationInFirebase(
      title,
      body,
      senderId,
      receiverId,
      { ...additionalData, route: "/notifications" }
    );

    console.log(`Notification sent from ${senderId} to ${receiverId}`);
    return notificationId;
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return null;
  }
};

// Send a test notification (self-notification)
export const sendTestNotification = async (
  title = "Test Notification",
  body = "This is a test notification"
) => {
  try {
    // Get current user for both sender and receiver
    const userId = FIREBASE_AUTH.currentUser?.uid;
    if (!userId) {
      console.error("No user logged in, can't send test notification");
      return null;
    }

    // Store in Firebase - sending to self
    const notificationId = await storeNotificationInFirebase(
      title,
      body,
      userId,
      userId,
      { route: "/profile" }
    );

    // Show browser notification if permission granted
    if (Notification.permission === "granted") {
      showBrowserNotification(title, body, "/favicon.ico", () => {
        // Mark as read when clicked
        markNotificationAsRead(notificationId);
      });
    }

    console.log("Test notification sent and stored in Firebase");
    return notificationId;
  } catch (error) {
    console.error("Error sending test notification:", error);
    return null;
  }
};

// Store notification in Firebase with sender and receiver
export const storeNotificationInFirebase = async (
  title,
  body,
  senderId,
  receiverId,
  data = {}
) => {
  try {
    // Validate inputs
    if (!senderId || !receiverId) {
      console.error("Missing senderId or receiverId");
      return null;
    }

    const notificationData = {
      title,
      body,
      senderId,
      receiverId,
      data,
      read: false,
      createdAt: serverTimestamp(),
    };

    // Add to Firestore
    const docRef = await addDoc(
      collection(FIREBASE_DB, "notifications"),
      notificationData
    );
    console.log("Notification stored in Firebase with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error storing notification:", error);
    return null;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(FIREBASE_DB, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
    console.log("Notification marked as read:", notificationId);
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// Function to listen for user's notifications (as receiver)
export const listenForUserNotifications = (callback, passedUserId = null) => {
  try {
    // Get current user ID or use passed ID
    const userId = passedUserId || FIREBASE_AUTH.currentUser?.uid;

    if (!userId) {
      console.log("No user ID available for notifications");
      callback([]);
      return () => {};
    }

    // CRITICAL: Convert to string to match Firestore format
    const userIdString = String(userId);
    console.log(
      "Setting up notification listener for receiverId:",
      userIdString
    );

    // Create query for notifications where user is the RECEIVER
    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userIdString),
      orderBy("createdAt", "desc")
    );

    // Setup real-time listener
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
          // Convert Firestore Timestamp to JS Date for display
          const data = doc.data();

          console.log("Found notification:", {
            id: doc.id,
            title: data.title,
            action: data.data?.action || "unknown",
          });

          // Format timestamp - different handling for web vs mobile
          let createdAt = null;
          if (data.createdAt) {
            createdAt =
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          notifications.push({
            id: doc.id,
            ...data,
            createdAt,
          });
        });

        // Pass notifications to callback
        callback(notifications);
      },
      (error) => {
        console.error("Error listening for notifications:", error);
        callback([]);
      }
    );

    // Return unsubscribe function with safety check
    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    callback([]);
    return () => {};
  }
};

// Fetch both chat notifications and agreement notifications specifically
export const fetchSpecificNotifications = async (userId) => {
  if (!userId) {
    console.error("No user ID provided");
    return [];
  }

  // Convert to string to match Firebase format
  const userIdString = String(userId);
  console.log("Fetching specific notifications for user:", userIdString);

  try {
    // First query agreement notifications
    const agreementQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userIdString),
      where("data.action", "==", "view_agreement"),
      orderBy("createdAt", "desc")
    );

    const agreementSnapshot = await getDocs(agreementQuery);
    const agreementNotifications = [];

    agreementSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Found agreement notification:", {
        id: doc.id,
        title: data.title,
        body: data.body,
      });

      agreementNotifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    // Then query chat notifications
    const chatQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userIdString),
      where("data.action", "==", "view_chat"),
      orderBy("createdAt", "desc")
    );

    const chatSnapshot = await getDocs(chatQuery);
    const chatNotifications = [];

    chatSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Found chat notification:", {
        id: doc.id,
        title: data.title,
        body: data.body,
      });

      chatNotifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    // Combine results
    const allSpecificNotifications = [
      ...agreementNotifications,
      ...chatNotifications,
    ];
    console.log(
      `Found ${agreementNotifications.length} agreement and ${chatNotifications.length} chat notifications`
    );

    return allSpecificNotifications;
  } catch (error) {
    console.error("Error fetching specific notifications:", error);
    return [];
  }
};

// Get notifications between two specific users
export const getNotificationsBetweenUsers = (
  senderId,
  receiverId,
  callback
) => {
  try {
    if (!senderId || !receiverId) {
      console.error("Missing senderId or receiverId");
      callback([]);
      return () => {};
    }

    // Query for notifications between these users
    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt);

          notifications.push({
            id: doc.id,
            ...data,
            createdAt,
          });
        });

        callback(notifications);
      },
      (error) => {
        console.error("Error getting notifications between users:", error);
        callback([]);
      }
    );

    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  } catch (error) {
    console.error("Error setting up notifications between users:", error);
    callback([]);
    return () => {};
  }
};

// Get count of unread notifications
export const getUnreadNotificationCount = (callback) => {
  try {
    // Get current user ID
    const userId = FIREBASE_AUTH.currentUser?.uid;
    if (!userId) {
      console.log("No user logged in, can't get unread count");
      callback(0);
      return () => {};
    }

    // Create query for unread notifications where user is RECEIVER
    const unreadQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    // Setup real-time listener
    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        callback(snapshot.size);
      },
      (error) => {
        console.error("Error getting unread notification count:", error);
        callback(0);
      }
    );

    return typeof unsubscribe === "function" ? unsubscribe : () => {};
  } catch (error) {
    console.error("Error setting up unread count listener:", error);
    callback(0);
    return () => {};
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const userId = FIREBASE_AUTH.currentUser?.uid;
    if (!userId) {
      console.error("No user logged in");
      return false;
    }

    // Get all unread notifications
    const unreadQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(unreadQuery);

    if (snapshot.empty) {
      console.log("No unread notifications to mark as read");
      return true;
    }

    // Update each notification
    const promises = [];
    snapshot.forEach((doc) => {
      const notificationRef = doc.ref;
      promises.push(
        updateDoc(notificationRef, {
          read: true,
          readAt: serverTimestamp(),
        })
      );
    });

    await Promise.all(promises);
    console.log(`Marked ${promises.length} notifications as read`);
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};

// Initialize notification system
export const initializeNotifications = async () => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
      console.log("Notifications initialized");

      // Set up listeners for new notifications
      const unsubscribe = setupNotificationListeners();

      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    }

    return () => {};
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return () => {};
  }
};
