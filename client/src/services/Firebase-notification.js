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

// Send a notification to a specific user - EXACTLY like mobile version
// Send a notification to a specific user - EXACT MOBILE MATCH
export const sendNotificationToUser = async (
  receiverId,
  title = "New Notification",
  body = "You have a new notification",
  additionalData = {}
) => {
  try {
    console.log("🟢 WEB APP: sendNotificationToUser called for:", receiverId);

    // MUST CONVERT to string to match mobile - this is critical
    receiverId = String(receiverId);

    // Get current user as sender - EXACTLY like mobile
    const senderId = FIREBASE_AUTH.currentUser?.uid || "system";
    if (!senderId) {
      console.error("❌ WEB APP: No user logged in, can't send notification");
      return null;
    }

    console.log(
      `🟢 WEB APP: Sending notification from ${senderId} to ${receiverId}`
    );

    // Store in Firebase with sender and receiver - EXACTLY like mobile
    const notificationId = await storeNotificationInFirebase(
      title,
      body,
      senderId,
      receiverId,
      { ...additionalData, screen: additionalData.screen || "Notification" }
    );

    console.log(`✅ WEB APP: Notification ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error("❌ WEB APP ERROR sending notification:", error);
    return null;
  }
};
// Store notification in Firebase - EXACT MOBILE MATCH
export const storeNotificationInFirebase = async (
  title,
  body,
  senderId,
  receiverId,
  data = {}
) => {
  try {
    console.log("🟢 WEB APP: storeNotificationInFirebase called with:", {
      title,
      body: body.substring(0, 30) + (body.length > 30 ? "..." : ""),
      senderId,
      receiverId,
      dataKeys: Object.keys(data),
    });

    // Validate inputs
    if (!senderId || !receiverId) {
      console.error("❌ WEB APP: Missing senderId or receiverId");
      return null;
    }

    // Ensure IDs are strings - VERY IMPORTANT
    senderId = String(senderId);
    receiverId = String(receiverId);

    console.log(
      `🟢 WEB APP: Using senderId: ${senderId}, receiverId: ${receiverId}`
    );

    // Create notification data object - EXACTLY like mobile
    const notificationData = {
      title,
      body,
      senderId,
      receiverId,
      data,
      read: false,
      createdAt: new Date(), // Use regular Date instead of serverTimestamp for reliability
    };

    console.log("🟢 WEB APP: About to store notification data:", {
      title: notificationData.title,
      body:
        notificationData.body.substring(0, 30) +
        (notificationData.body.length > 30 ? "..." : ""),
      senderId: notificationData.senderId,
      receiverId: notificationData.receiverId,
    });

    // Access Firestore collection - THE EXACT SAME AS MOBILE
    const docRef = await addDoc(
      collection(FIREBASE_DB, "notifications"),
      notificationData
    );

    console.log(
      "✅ WEB APP: Notification stored in Firebase with ID:",
      docRef.id
    );
    return docRef.id;
  } catch (error) {
    console.error("❌ WEB APP ERROR storing notification:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    try {
      console.error("Error details:", JSON.stringify(error, null, 2));
    } catch (e) {
      // Ignore error serialization issues
    }
    return null;
  }
};

// Mark notification as read - EXACTLY like mobile version
export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log("Marking notification as read:", notificationId);

    // Use the getUserId function
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available to mark notification as read");
      return false;
    }

    console.log("User ID retrieved:", userId);

    // Get the notification document
    const notificationRef = doc(FIREBASE_DB, "notifications", notificationId);

    // Simply update the read status
    await updateDoc(notificationRef, {
      read: true,
    });

    console.log("Notification marked as read successfully");
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// User ID function - SIMPLIFIED to match mobile version
export const getUserId = (passedUserId = null) => {
  try {
    // If a userId is explicitly passed, use it first
    if (passedUserId !== null && passedUserId !== undefined) {
      return passedUserId.toString();
    }

    // For web, try to get from Firebase Auth first - JUST LIKE MOBILE
    const firebaseUser = FIREBASE_AUTH.currentUser;
    if (firebaseUser && firebaseUser.uid) {
      return firebaseUser.uid.toString();
    }

    // Web fallback - check localStorage
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (userData.userId || userData.id || userData.uid) {
      return (userData.userId || userData.id || userData.uid).toString();
    }

    console.warn("Could not find user ID");
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

// Function to listen for user's notifications - EXACTLY like mobile
export const listenForUserNotifications = (callback, passedUserId = null) => {
  try {
    // Get the current user ID, passing along any provided userId
    const userId = passedUserId || FIREBASE_AUTH.currentUser?.uid;
    console.log(
      "Setting up notification listener for user ID:",
      userId,
      passedUserId ? "(from passed parameter)" : "(from Firebase Auth)"
    );

    if (!userId) {
      console.error("No user ID available for notifications");
      callback([]);
      return () => {};
    }

    // IMPORTANT: Convert userId to string to match format in Firebase
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
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : data.createdAt
                ? new Date(data.createdAt)
                : new Date(),
          });
        });

        console.log(
          `Retrieved ${notifications.length} notifications for user ${userIdString}`
        );
        callback(notifications);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
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

// Direct fetch function when listener fails - EXACTLY like mobile
export const directFetchNotifications = async (userId = null) => {
  try {
    if (!userId) {
      userId = FIREBASE_AUTH.currentUser?.uid;
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
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : data.createdAt
            ? new Date(data.createdAt)
            : new Date(),
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

// Get count of unread notifications - EXACTLY like mobile
export const getUnreadNotificationCount = (callback) => {
  try {
    // Get current user ID
    const userId = FIREBASE_AUTH.currentUser?.uid;
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

// Mark all notifications as read - EXACTLY like mobile
export const markAllNotificationsAsRead = async () => {
  try {
    const userId = FIREBASE_AUTH.currentUser?.uid;
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

// Initialize notification system - modified for web
export const initializeNotifications = async () => {
  try {
    // For web, request permission
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
