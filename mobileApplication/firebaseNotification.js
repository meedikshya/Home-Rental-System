import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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
import { FIREBASE_DB, FIREBASE_AUTH } from "./firebaseConfig";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // Disable sound
    shouldSetBadge: true,
  }),
});

// This function is explicitly called from _layout.jsx
export const registerForPushNotificationsAsync = async () => {
  console.log("registerForPushNotificationsAsync called");

  // Must use physical device for Push Notifications
  if (!Device.isDevice) {
    console.log("Physical device required for notifications");
    return null;
  }

  // Check for existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If no permission, request it
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If still no permission, exit
  if (finalStatus !== "granted") {
    console.log("Failed to get notification permission!");
    return null;
  }

  // Create notification channels for Android - silent version
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 0, 0, 0], // No vibration
      lightColor: "#FF231F7C",
      sound: null, // No sound
    });
  }

  console.log("Notification permissions set up successfully");
  return true;
};

// Set up listeners for receiving notifications
export const setupNotificationListeners = () => {
  // When a notification is received while the app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received in foreground!", notification);

      // Optionally store the received notification in Firebase
      const { title, body } = notification.request.content;
      const data = notification.request.content.data;

      // If we have both sender and receiver
      if (data.senderId && data.receiverId) {
        storeNotificationInFirebase(
          title,
          body,
          data.senderId,
          data.receiverId,
          data
        );
      }
    }
  );

  // When the user taps on a notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response received!", response);
      const data = response.notification.request.content.data;

      // If the notification has an ID, mark it as read in Firebase
      if (data.notificationId) {
        markNotificationAsRead(data.notificationId);
      }
    });

  // Return the subscriptions so they can be unsubscribed later
  return { foregroundSubscription, responseSubscription };
};

// Send a notification to a specific user
export const sendNotificationToUser = async (
  receiverId,
  title = "New Notification",
  body = "You have a new notification",
  additionalData = {}
) => {
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
    { ...additionalData, screen: "Notification" }
  );

  console.log(`Notification sent from ${senderId} to ${receiverId}`);
  return notificationId;
};

// Send a test notification (self-notification)
export const sendTestNotification = async (
  title = "Test Notification",
  body = "This is a test notification"
) => {
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
    { screen: "Profile" }
  );

  // Then schedule the local notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: {
        screen: "Profile",
        notificationId,
        senderId: userId,
        receiverId: userId,
      },
      sound: null,
    },
    trigger: { seconds: 2 },
  });

  console.log("Test notification sent and stored in Firebase");
  return notificationId;
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
export const listenForUserNotifications = (callback) => {
  // Get current user ID
  const userId = FIREBASE_AUTH.currentUser?.uid;
  if (!userId) {
    console.log("No user logged in, can't listen for notifications");
    return () => {}; // Return empty function as unsubscribe
  }

  // Create query for notifications where user is the RECEIVER
  const notificationsQuery = query(
    collection(FIREBASE_DB, "notifications"),
    where("receiverId", "==", userId),
    orderBy("createdAt", "desc")
  );

  // Setup real-time listener
  const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      // Convert Firestore Timestamp to JS Date for display
      const data = doc.data();
      const createdAt =
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;

      notifications.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });

    // Pass notifications to callback
    callback(notifications);
  });

  // Return unsubscribe function
  return unsubscribe;
};

// Get notifications between two specific users
export const getNotificationsBetweenUsers = (
  senderId,
  receiverId,
  callback
) => {
  if (!senderId || !receiverId) {
    console.error("Missing senderId or receiverId");
    return () => {};
  }

  // Query for notifications between these users
  const notificationsQuery = query(
    collection(FIREBASE_DB, "notifications"),
    where("senderId", "==", senderId),
    where("receiverId", "==", receiverId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt =
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt;

      notifications.push({
        id: doc.id,
        ...data,
        createdAt,
      });
    });

    callback(notifications);
  });

  return unsubscribe;
};

// Get count of unread notifications
export const getUnreadNotificationCount = (callback) => {
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
  const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
    callback(snapshot.size);
  });

  return unsubscribe;
};
