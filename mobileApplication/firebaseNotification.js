import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  getDocs,
  getDoc,
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
  try {
    // Convert receiverId to string to ensure consistency
    receiverId = receiverId.toString();

    // Get current user as sender
    const senderId = FIREBASE_AUTH.currentUser?.uid || "system";
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
      console.error("No user logged in, can't send test notification");
      return null;
    }

    // Store in Firebase - sending to self
    const notificationId = await storeNotificationInFirebase(
      title,
      body,
      userId.toString(),
      userId.toString(),
      {
        screen: "Profile",
        action: "test_notification",
        timestamp: new Date().toISOString(),
      }
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

    // Use the getUserId function
    const userId = getUserId();
    if (!userId) {
      console.error("No user ID available to mark notification as read");
      return false;
    }

    console.log("User ID retrieved:", userId);

    // Get the notification document
    const notificationRef = doc(FIREBASE_DB, "notifications", notificationId);

    // Simply update the read status - only updating 'read' field to match security rules
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

// Comprehensive function to get the current user ID from multiple sources
export const getUserId = (passedUserId = null) => {
  try {
    // If a userId is explicitly passed, use it first
    if (passedUserId !== null && passedUserId !== undefined) {
      return passedUserId.toString();
    }

    // For mobile, try to get from Firebase Auth first
    const firebaseUser = FIREBASE_AUTH.currentUser;
    if (firebaseUser && firebaseUser.uid) {
      return firebaseUser.uid.toString();
    }

    // In mobile app, we might have stored it in AsyncStorage
    // This would need to be accessed asynchronously, so this is just a placeholder
    // You would need to call this function using await if you want to use AsyncStorage

    console.warn("Could not find user ID");
    return null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
};

// Function to listen for user's notifications (as receiver)
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

// Direct fetch function when listener fails
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

// Mark all notifications as read
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

// Initialize notification system
export const initializeNotifications = async () => {
  try {
    // For mobile, we register for push notifications
    const hasPermission = await registerForPushNotificationsAsync();

    if (hasPermission) {
      console.log("Notifications initialized");

      // Set up listeners for new notifications
      const { foregroundSubscription, responseSubscription } =
        setupNotificationListeners();

      // Return an unsubscribe function that cleans up both listeners
      return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
      };
    }

    return () => {};
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return () => {};
  }
};
