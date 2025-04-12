import { useState, useEffect, useCallback } from "react";
import { getUserDataFromFirebase } from "../context/AuthContext";
import ApiHandler from "../api/ApiHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendNotificationToUser } from "../firebaseNotification.js";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";

// Define the background task name
const BACKGROUND_EXPIRY_CHECK_TASK = "background-expiry-check";

// Register the background task
if (!TaskManager.isTaskDefined(BACKGROUND_EXPIRY_CHECK_TASK)) {
  TaskManager.defineTask(BACKGROUND_EXPIRY_CHECK_TASK, async () => {
    try {
      console.log("Running background expiry check task");
      await checkForExpiringAgreements();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error("Error in background task:", error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

async function checkForExpiringAgreements() {
  try {
    const userId = await getUserDataFromFirebase();
    if (!userId) {
      console.log("No user ID found, skipping expiry check");
      return;
    }

    console.log("Starting expiry check for user", userId);

    // Check if we've already notified today - use one consistent key format
    const today = new Date().toISOString().split("T")[0];
    const globalNotificationKey = `expiry_global_check_${userId}_${today}`;
    const hasCheckedToday = await AsyncStorage.getItem(globalNotificationKey);

    // IMPORTANT: Add this global check to prevent multiple checks per day
    if (hasCheckedToday === "true") {
      console.log(
        "Already performed global check for expiring agreements today"
      );
      return;
    }

    const agreements = await ApiHandler.get(`/Agreements/User/${userId}`);

    if (!agreements || !Array.isArray(agreements)) {
      console.log("No agreements found or invalid response");
      return;
    }

    console.log(
      `Found ${agreements.length} total agreements for user ${userId}`
    );

    // Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Looking for agreements expiring on: ${tomorrowStr}`);

    // Find agreements expiring tomorrow
    const expiringTomorrow = agreements.filter((agreement) => {
      if (!agreement.endDate) return false;

      const endDate = new Date(agreement.endDate);
      endDate.setHours(0, 0, 0, 0);
      const endDateStr = endDate.toISOString().split("T")[0];

      return endDateStr === tomorrowStr && agreement.status !== "Expired";
    });

    console.log(
      `Found ${expiringTomorrow.length} agreements expiring tomorrow`
    );

    // IMPORTANT: Record that we performed the global check first
    await AsyncStorage.setItem(globalNotificationKey, "true");

    // Create a single notification for all expiring agreements
    if (expiringTomorrow.length > 0) {
      // Get property information for all expiring agreements
      const propertyInfo = await Promise.all(
        expiringTomorrow.map(async (agreement) => {
          try {
            const booking = await ApiHandler.get(
              `/Bookings/${agreement.bookingId}`
            );
            if (!booking) return "your property";

            const property = await ApiHandler.get(
              `/Properties/${booking.propertyId}`
            );
            return property ? property.title : "your property";
          } catch (error) {
            console.error("Error fetching property details:", error);
            return "your property";
          }
        })
      );

      // Create a single notification message
      let notificationTitle, notificationBody;

      if (expiringTomorrow.length === 1) {
        notificationTitle = "Agreement Expiring Tomorrow";
        notificationBody = `Your rental agreement for ${propertyInfo[0]} expires tomorrow. Please contact your landlord if you wish to extend your stay.`;
      } else {
        notificationTitle = "Agreements Expiring Tomorrow";
        notificationBody = `You have ${expiringTomorrow.length} rental agreements expiring tomorrow. Please check your agreements page.`;
      }

      // Send ONLY ONE notification with a summary
      await sendNotificationToUser(
        userId.toString(),
        notificationTitle,
        notificationBody,
        {
          screen: "/(pages)/my-agreements",
          action: "view_expiring_agreements",
          count: expiringTomorrow.length,
          agreementIds: expiringTomorrow.map((a) => a.agreementId),
          receiverId: userId.toString(),
        }
      );

      console.log(
        `Successfully sent a single notification for ${expiringTomorrow.length} expiring agreements`
      );
    }

    // Return the current time for hook state
    return new Date().toISOString();
  } catch (error) {
    console.error("Error in automatic expiration check:", error);
    return null;
  }
}

// Register the background fetch task
async function registerBackgroundTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    // Only register if not already registered
    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.log("Registering background fetch task");
      await BackgroundFetch.registerTaskAsync(BACKGROUND_EXPIRY_CHECK_TASK, {
        minimumInterval: 60 * 60, // Check every hour (in seconds)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log("Background task registered");
    } else {
      console.log("Background task already registered");
    }
  } catch (err) {
    console.error("Background task registration failed:", err);
  }
}

export function useAgreementExpirationCheck() {
  const [lastCheckTime, setLastCheckTime] = useState(null);

  // Initialize background task and perform initial check
  useEffect(() => {
    async function initialize() {
      try {
        // Register background task
        await registerBackgroundTask();

        // Do an immediate check
        const checkTime = await checkForExpiringAgreements();
        if (checkTime) {
          setLastCheckTime(checkTime);
        }
      } catch (error) {
        console.error("Error initializing agreement expiration check:", error);
      }
    }

    initialize();
  }, []);

  // Function to manually force a check (useful for testing)
  const forceCheck = useCallback(async () => {
    try {
      // Get user ID
      const userId = await getUserDataFromFirebase();
      if (!userId) return;

      // Remove the stored notification flag to force a new check
      const today = new Date().toISOString().split("T")[0];
      const notificationKey = `expiry_check_${userId}_${today}`;
      await AsyncStorage.removeItem(notificationKey);

      // Run the check
      const checkTime = await checkForExpiringAgreements();
      if (checkTime) {
        setLastCheckTime(checkTime);
      }

      return checkTime;
    } catch (error) {
      console.error("Error in force check:", error);
      return null;
    }
  }, []);

  return { lastCheckTime, forceCheck };
}
