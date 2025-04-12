import ApiHandler from "../api/ApiHandler";
import { sendNotificationToUser } from "../firebaseNotification.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const checkExpiredAgreements = async () => {
  try {
    console.log("Checking for expired agreements...");

    // Get current user ID from storage
    const userData = await AsyncStorage.getItem("userData");
    if (!userData) {
      console.log("No user data found in storage, skipping check");
      return false;
    }

    const { userId, firebaseId } = JSON.parse(userData);
    if (!userId || !firebaseId) {
      console.log("Invalid user data in storage, skipping check");
      return false;
    }

    // Get all agreements for current user
    let agreements = [];
    try {
      agreements = await ApiHandler.get(`/Agreements/byRenterId/${userId}`);
      console.log(
        `Retrieved ${agreements.length} agreements for user ID ${userId}`
      );
    } catch (error) {
      console.error("Error fetching agreements:", error);
      return false;
    }

    if (!agreements || agreements.length === 0) {
      console.log("No agreements found, nothing to check");
      return false;
    }

    const today = new Date();
    // Format date to YYYY-MM-DD for comparison
    const todayFormatted = today.toISOString().split("T")[0];

    // Find expired agreements
    const expiredAgreements = agreements.filter((agreement) => {
      // Check if agreement is active and end date has passed
      return (
        agreement.status === "Approved" &&
        agreement.endDate < todayFormatted &&
        !agreement.processed // Flag to track if we've processed this expiration
      );
    });

    console.log(`Found ${expiredAgreements.length} expired agreements`);

    if (expiredAgreements.length === 0) {
      console.log("No expired agreements that need processing");
      return false;
    }

    // Process each expired agreement
    for (const agreement of expiredAgreements) {
      console.log(`Processing expired agreement: ${agreement.agreementId}`);

      // 1. Get property and booking details
      let booking = null;
      try {
        booking = await ApiHandler.get(`/Bookings/${agreement.bookingId}`);
        if (!booking) {
          console.log(
            `Booking not found for agreement ${agreement.agreementId}, skipping`
          );
          continue;
        }
      } catch (error) {
        console.error(
          `Error fetching booking for agreement ${agreement.agreementId}:`,
          error
        );
        continue;
      }

      let property = null;
      try {
        property = await ApiHandler.get(`/Properties/${booking.propertyId}`);
        if (!property) {
          console.log(
            `Property not found for booking ${booking.bookingId}, skipping`
          );
          continue;
        }
      } catch (error) {
        console.error(
          `Error fetching property for booking ${booking.bookingId}:`,
          error
        );
        continue;
      }

      // 2. Update property status to available
      try {
        await ApiHandler.put(`/Properties/${property.propertyId}`, {
          ...property,
          availabilityStatus: "Available",
        });
        console.log(`Updated property ${property.propertyId} to Available`);
      } catch (error) {
        console.error(`Error updating property ${property.propertyId}:`, error);
        // Continue processing even if this step fails
      }

      // 3. Mark booking as completed
      try {
        await ApiHandler.post(`/Bookings/updateStatus`, {
          bookingId: booking.bookingId,
          agreementId: agreement.agreementId,
          status: "Completed",
        });
        console.log(`Updated booking ${booking.bookingId} to Completed`);
      } catch (error) {
        console.error(`Error updating booking ${booking.bookingId}:`, error);
        // Continue processing even if this step fails
      }

      // 4. Mark agreement as processed
      try {
        await ApiHandler.put(`/Agreements/${agreement.agreementId}`, {
          ...agreement,
          processed: true,
          status: "Completed",
        });
        console.log(`Updated agreement ${agreement.agreementId} to Completed`);
      } catch (error) {
        console.error(
          `Error updating agreement ${agreement.agreementId}:`,
          error
        );
        // Continue processing even if this step fails
      }

      // 5. Send notification to renter
      try {
        const propertyAddress =
          property.address ||
          `${property.city}, ${property.municipality} - ${property.ward}`;

        await sendNotificationToUser(
          firebaseId,
          "Lease Agreement Expired",
          `Your lease agreement for property at ${propertyAddress} has expired.`,
          {
            propertyId: property.propertyId,
            agreementId: agreement.agreementId,
            screen: "/(tabs)",
            action: "agreement_expired",
            timestamp: new Date().toISOString(),
          }
        );
        console.log(`Sent expiration notification to renter ${firebaseId}`);
      } catch (error) {
        console.error(
          `Error sending notification to renter ${firebaseId}:`,
          error
        );
        // Continue processing even if this step fails
      }

      // 6. Send notification to landlord if they have a Firebase ID
      if (property.landlordFirebaseId) {
        try {
          const propertyAddress =
            property.address ||
            `${property.city}, ${property.municipality} - ${property.ward}`;

          await sendNotificationToUser(
            property.landlordFirebaseId,
            "Lease Agreement Expired",
            `The lease agreement for your property at ${propertyAddress} has expired.`,
            {
              propertyId: property.propertyId,
              agreementId: agreement.agreementId,
              screen: "/(tabs)/landlord-properties",
              action: "agreement_expired",
              timestamp: new Date().toISOString(),
            }
          );
          console.log(
            `Sent expiration notification to landlord ${property.landlordFirebaseId}`
          );
        } catch (error) {
          console.error(
            `Error sending notification to landlord ${property.landlordFirebaseId}:`,
            error
          );
          // Continue processing even if this step fails
        }
      }

      console.log(
        `Successfully processed expired agreement: ${agreement.agreementId}`
      );
    }

    return expiredAgreements.length > 0;
  } catch (error) {
    console.error("Error checking expired agreements:", error);
    return false;
  }
};
