import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkExpiredAgreements } from "../services/checkExpiredAgreements.js";

export const useAgreementExpirationCheck = () => {
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        performExpirationCheck();
      }
    });

    // Check on mount as well
    performExpirationCheck();

    return () => {
      subscription.remove();
    };
  }, []);

  const performExpirationCheck = async () => {
    // Prevent multiple simultaneous checks
    if (isChecking) return;

    try {
      setIsChecking(true);

      // Only check once per day to avoid excessive API calls
      const lastCheck = await AsyncStorage.getItem("lastExpirationCheck");
      const now = new Date();

      if (lastCheck) {
        const lastCheckDate = new Date(lastCheck);
        const hoursSinceLastCheck = (now - lastCheckDate) / (1000 * 60 * 60);

        if (hoursSinceLastCheck < 24) {
          console.log(
            `Last expiration check was ${hoursSinceLastCheck.toFixed(
              1
            )} hours ago, skipping`
          );
          setLastCheckTime(lastCheckDate);
          setIsChecking(false);
          return;
        }
      }

      // Perform the check
      const hasExpirations = await checkExpiredAgreements();

      // Update last check time
      await AsyncStorage.setItem("lastExpirationCheck", now.toISOString());
      setLastCheckTime(now);

      // Return result for any component that needs it
      return hasExpirations;
    } catch (error) {
      console.error("Error in expiration check hook:", error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    lastCheckTime,
    isChecking,
    checkNow: performExpirationCheck,
  };
};
