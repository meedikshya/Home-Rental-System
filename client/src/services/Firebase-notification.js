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
  getDoc,
} from "firebase/firestore";
import { FIREBASE_DB, FIREBASE_AUTH } from "./Firebase-config.js";
import { getUserDataFromFirebase } from "../context/AuthContext.js";

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

    const userId = getUserId();
    if (!userId) {
      console.log("No user ID available, can't set up notification listeners");
      return () => {};
    }

    // Listen for new notifications in Firebase
    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId.toString()),
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
    // Convert receiverId to string to ensure consistency
    receiverId = receiverId.toString();

    // Get current user as sender
    const senderId = FIREBASE_AUTH.currentUser?.uid || "system";

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
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available, can't send test notification");
      return null;
    }

    // Store in Firebase - sending to self
    const notificationId = await storeNotificationInFirebase(
      title,
      body,
      userId.toString(),
      userId.toString(),
      {
        route: "/profile",
        action: "test_notification",
        timestamp: new Date().toISOString(),
      }
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

    // Ensure IDs are strings
    senderId = senderId.toString();
    receiverId = receiverId.toString();

    const notificationData = {
      title,
      body,
      senderId,
      receiverId,
      data,
      read: false,
      createdAt: serverTimestamp(),
    };

    console.log("Storing notification:", notificationData);

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
    console.log("Marking notification as read:", notificationId);

    // Use the local getUserId function instead of imported one
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available to mark notification as read");
      return false;
    }

    console.log("User ID retrieved:", userId);

    // Get the notification document
    const notificationRef = doc(FIREBASE_DB, "notifications", notificationId);

    // Simply update the read status - only updating 'read' field to match security rules
    // Your rules only allow updating the 'read' field specifically
    await updateDoc(notificationRef, {
      read: true,
      // Removed readAt since your rules don't include it
    });

    console.log("Notification marked as read successfully");
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};
// Comprehensive function to get the current user ID from multiple sources
function getUserId(passedUserId = null) {
  try {
    // If a userId is explicitly passed, use it first
    if (passedUserId !== null && passedUserId !== undefined) {
      return passedUserId.toString();
    }

    // Rest of existing function remains the same...
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    // These are all the different ways user ID might be stored
    const possibleIds = [
      userData.userId,
      userData.user_id,
      userData.id,
      userData.uid,
      FIREBASE_AUTH.currentUser?.uid,
    ];

    // Get first non-null value
    let userId = possibleIds.find((id) => id !== null && id !== undefined);

    // If we found an ID, convert to string and return
    if (userId) {
      console.log("Found user ID:", userId);
      return userId.toString();
    }

    // If all else fails, log warning and return null
    console.warn("Could not find user ID");
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

// Function to listen for user's notifications (as receiver)
export const listenForUserNotifications = (callback, passedUserId = null) => {
  try {
    // Get the current user ID, passing along any provided userId
    const userId = passedUserId || getUserId();
    console.log(
      "Setting up notification listener for user ID:",
      userId,
      passedUserId ? "(from passed parameter)" : "(from local storage/auth)"
    );

    if (!userId) {
      console.error("No user ID available for notifications");
      callback([]);
      return () => {};
    }

    // IMPORTANT: Convert userId to string to match "29" in Firebase
    const userIdString = userId.toString();
    console.log("Using userId as string:", userIdString);

    // Create a query for notifications where receiverId equals the current user's ID
    const q = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userIdString),
      orderBy("createdAt", "desc")
    );

    console.log("Query created for receiverId:", userIdString);

    // Set up the listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          // Convert Firestore timestamp to JavaScript Date
          const data = doc.data();

          // Log notification details for debugging
          console.log("Found notification:", doc.id, {
            title: data.title,
            receiverId: data.receiverId,
            read: data.read,
          });

          notifications.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        });

        console.log(
          `Retrieved ${notifications.length} notifications for user ${userIdString}`
        );
        callback(notifications);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        // If we get an index error, suggest creating the index
        if (
          error.code === "failed-precondition" ||
          error.message.includes("index")
        ) {
          console.error(
            "This query requires an index. Please create it in the Firebase console."
          );
        }
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    callback([]);
    return () => {};
  }
};

// Direct fetch function to test notifications - bypassing the listener
export const directFetchNotifications = async (userId) => {
  try {
    if (!userId) {
      userId = getUserId();
    }

    if (!userId) {
      console.error("No user ID available for direct notification fetch");
      return [];
    }

    const userIdString = userId.toString();
    console.log("Directly fetching notifications for userId:", userIdString);

    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userIdString),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(notificationsQuery);
    const notifications = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });

    console.log(
      `Directly fetched ${notifications.length} notifications for user ${userIdString}`
    );
    return notifications;
  } catch (error) {
    console.error("Error directly fetching notifications:", error);
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

    // Convert to strings
    senderId = senderId.toString();
    receiverId = receiverId.toString();

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
    const userId = getUserId();
    if (!userId) {
      console.log("No user ID available, can't get unread count");
      callback(0);
      return () => {};
    }

    // Create query for unread notifications where user is RECEIVER
    const unreadQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId.toString()),
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
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available");
      return false;
    }

    // Get all unread notifications
    const unreadQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId.toString()),
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
