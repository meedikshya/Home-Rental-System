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
  getFirestore,
  or,
} from "firebase/firestore";
import { FIREBASE_DB, FIREBASE_AUTH } from "./firebaseConfig";
import { getAuth } from "firebase/auth";
import { getUserDataFromFirebase } from "./context/AuthContext";

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
      { ...additionalData, screen: additionalData.screen || "Notification" }
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

// Enhanced function to listen for notifications with multiple user ID formats
export const listenForUserNotificationsWithUserIds = async (
  onNotificationsUpdate
) => {
  try {
    // Get Firebase Auth user
    const auth = getAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      console.error("No Firebase user logged in");
      onNotificationsUpdate([]);
      return () => {};
    }

    const firebaseId = firebaseUser.uid;
    console.log(
      "Setting up enhanced notification listener for Firebase ID:",
      firebaseId
    );

    // Get the numeric user ID using the AuthContext function
    let numericUserId;
    try {
      numericUserId = await getUserDataFromFirebase();
      console.log("Numeric User ID retrieved from AuthContext:", numericUserId);
    } catch (error) {
      console.error("Error retrieving numeric user ID:", error);
    }

    // Create array of possible receiver IDs to check
    const receiverIds = [firebaseId];

    // Add numeric user ID in various formats if available
    if (numericUserId) {
      // As string format (like "30")
      const numericIdStr = numericUserId.toString();
      if (!receiverIds.includes(numericIdStr)) {
        receiverIds.push(numericIdStr);
      }

      // As number format (like 30) if it's a valid number
      if (!isNaN(numericUserId)) {
        const numericValue = Number(numericUserId);
        if (!receiverIds.includes(numericValue)) {
          receiverIds.push(numericValue);
        }
      }
    }

    console.log("Checking for receiverIds:", receiverIds);

    // If we have multiple IDs to check, we need to use an "in" query
    // If we only have one ID, use a simple "==" query for better performance
    let notificationsQuery;

    if (receiverIds.length > 1) {
      notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "in", receiverIds),
        orderBy("createdAt", "desc")
      );
    } else if (receiverIds.length === 1) {
      notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", receiverIds[0]),
        orderBy("createdAt", "desc")
      );
    } else {
      console.error("No receiver IDs available");
      onNotificationsUpdate([]);
      return () => {};
    }

    // Set up the snapshot listener
    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = [];
        snapshot.forEach((doc) => {
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
          `Found ${notifications.length} notifications for receiverIds:`,
          receiverIds
        );
        onNotificationsUpdate(notifications);
      },
      (error) => {
        console.error("Error in notification listener:", error);
        onNotificationsUpdate([]);
      }
    );
  } catch (error) {
    console.error("Error setting up notification listener:", error);
    onNotificationsUpdate([]);
    return () => {};
  }
};

// Enhanced direct fetch function with multiple user ID formats
export const directFetchNotifications = async (firebaseId = null) => {
  try {
    if (!firebaseId) {
      firebaseId = FIREBASE_AUTH.currentUser?.uid;
    }

    if (!firebaseId) {
      console.error("No Firebase ID available for direct notification fetch");
      return [];
    }

    console.log("Starting direct fetch with Firebase ID:", firebaseId);

    // Get numeric user ID
    let numericUserId;
    try {
      numericUserId = await getUserDataFromFirebase();
      console.log("Numeric User ID retrieved for direct fetch:", numericUserId);
    } catch (error) {
      console.error(
        "Error retrieving numeric user ID for direct fetch:",
        error
      );
    }

    // Create array of receiverIds to check
    const receiverIds = [firebaseId];

    if (numericUserId) {
      // Add as string
      const numericIdStr = numericUserId.toString();
      if (!receiverIds.includes(numericIdStr)) {
        receiverIds.push(numericIdStr);
      }

      // Add as number if valid
      if (!isNaN(numericUserId)) {
        const numericValue = Number(numericUserId);
        if (!receiverIds.includes(numericValue)) {
          receiverIds.push(numericValue);
        }
      }
    }

    console.log(
      "Directly fetching notifications for receiverIds:",
      receiverIds
    );

    // Track all notifications to avoid duplicates
    const notificationMap = new Map();

    // Process each receiverId separately
    for (const receiverId of receiverIds) {
      console.log("Checking receiverId:", receiverId);

      const notificationsQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", receiverId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(notificationsQuery);

      querySnapshot.forEach((doc) => {
        // Only add if we haven't already added this notification
        if (!notificationMap.has(doc.id)) {
          const data = doc.data();
          notificationMap.set(doc.id, {
            id: doc.id,
            ...data,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : data.createdAt
                ? new Date(data.createdAt)
                : new Date(),
          });
        }
      });
    }

    // Convert the map values to an array
    const notifications = Array.from(notificationMap.values());

    // Sort by createdAt descending
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`Directly fetched ${notifications.length} notifications`);
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
export const getUnreadNotificationCount = async (callback) => {
  try {
    // Get current Firebase user ID
    const firebaseId = FIREBASE_AUTH.currentUser?.uid;
    if (!firebaseId) {
      console.log("No Firebase ID available, can't get unread count");
      callback(0);
      return () => {};
    }

    // Get numeric user ID
    let numericUserId;
    try {
      numericUserId = await getUserDataFromFirebase();
    } catch (error) {
      console.error(
        "Error retrieving numeric user ID for unread count:",
        error
      );
    }

    // Create array of possible receiver IDs
    const receiverIds = [firebaseId];

    if (numericUserId) {
      receiverIds.push(numericUserId.toString());
      if (!isNaN(numericUserId)) {
        receiverIds.push(Number(numericUserId));
      }
    }

    // For unread count, we need to use separate queries and combine the results
    // since compound queries with "in" and "==" aren't supported
    let unsubscribes = [];
    let countMap = new Map(); // Use a map to track unique notification IDs

    // Set up a listener for each receiver ID
    for (const receiverId of receiverIds) {
      const unreadQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", receiverId),
        where("read", "==", false)
      );

      const unsubscribe = onSnapshot(
        unreadQuery,
        (snapshot) => {
          // Add each notification ID to the map
          snapshot.forEach((doc) => {
            countMap.set(doc.id, true);
          });

          // Call the callback with the total unique count
          callback(countMap.size);
        },
        (error) => {
          console.error(`Error getting unread count for ${receiverId}:`, error);
        }
      );

      unsubscribes.push(unsubscribe);
    }

    // Return a function that unsubscribes from all listeners
    return () => {
      unsubscribes.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  } catch (error) {
    console.error("Error setting up unread count listener:", error);
    callback(0);
    return () => {};
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    // Get Firebase user ID
    const firebaseId = FIREBASE_AUTH.currentUser?.uid;
    if (!firebaseId) {
      console.error("No Firebase ID available");
      return false;
    }

    // Get numeric user ID
    let numericUserId;
    try {
      numericUserId = await getUserDataFromFirebase();
    } catch (error) {
      console.error(
        "Error retrieving numeric user ID for marking all read:",
        error
      );
    }

    // Create array of possible receiver IDs
    const receiverIds = [firebaseId];

    if (numericUserId) {
      receiverIds.push(numericUserId.toString());
      if (!isNaN(numericUserId)) {
        receiverIds.push(Number(numericUserId));
      }
    }

    // Track unique notification IDs to avoid duplicates
    const processedIds = new Set();
    const promises = [];

    // Process each receiver ID
    for (const receiverId of receiverIds) {
      const unreadQuery = query(
        collection(FIREBASE_DB, "notifications"),
        where("receiverId", "==", receiverId),
        where("read", "==", false)
      );

      const snapshot = await getDocs(unreadQuery);

      snapshot.forEach((doc) => {
        // Only process each notification once
        if (!processedIds.has(doc.id)) {
          processedIds.add(doc.id);

          const notificationRef = doc.ref;
          promises.push(
            updateDoc(notificationRef, {
              read: true,
            })
          );
        }
      });
    }

    if (promises.length === 0) {
      console.log("No unread notifications to mark as read");
      return true;
    }

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
