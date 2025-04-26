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
} from "firebase/firestore";
import { FIREBASE_DB, FIREBASE_AUTH } from "./Firebase-config.js";

// Request notification permission for browser
export const requestNotificationPermission = async () => {
  // console.log("Requesting notification permission");

  if (!("Notification" in window)) {
    // console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    // console.log("Notification permission already granted");
    return true;
  }
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      // console.log("Notification permission granted");
      return true;
    } else {
      // console.log("Notification permission denied");
      return false;
    }
  } catch (error) {
    // console.error("Error requesting notification permission:", error);
    return false;
  }
};

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

export const setupNotificationListeners = () => {
  try {
    const userId = getUserId();
    if (!userId) {
      // console.log("No user ID available, can't set up notification listeners");
      return () => {};
    }
    const notificationsQuery = query(
      collection(FIREBASE_DB, "notifications"),
      where("receiverId", "==", userId.toString()),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
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

export const sendNotificationToUser = async (
  receiverId,
  title = "New Notification",
  body = "You have a new notification",
  additionalData = {}
) => {
  try {
    receiverId = receiverId.toString();

    const senderId = FIREBASE_AUTH.currentUser?.uid || "system";
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

export const storeNotificationInFirebase = async (
  title,
  body,
  senderId,
  receiverId,
  data = {}
) => {
  try {
    if (!senderId || !receiverId) {
      console.error("Missing senderId or receiverId");
      return null;
    }

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
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available to mark notification as read");
      return false;
    }
    console.log("User ID retrieved:", userId);
    const notificationRef = doc(FIREBASE_DB, "notifications", notificationId);
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

function getUserId(passedUserId = null) {
  try {
    if (passedUserId !== null && passedUserId !== undefined) {
      return passedUserId.toString();
    }
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const possibleIds = [
      userData.userId,
      userData.user_id,
      userData.id,
      userData.uid,
      FIREBASE_AUTH.currentUser?.uid,
    ];
    let userId = possibleIds.find((id) => id !== null && id !== undefined);
    if (userId) {
      console.log("Found user ID:", userId);
      return userId.toString();
    }
    console.warn("Could not find user ID");
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

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

export const initializeNotifications = async () => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
      console.log("Notifications initialized");
      const unsubscribe = setupNotificationListeners();
      return typeof unsubscribe === "function" ? unsubscribe : () => {};
    }
    return () => {};
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return () => {};
  }
};
