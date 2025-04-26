import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";
import { generateAgreementHtml } from "./generateAgreementHtml.js";

export const downloadAgreement = async (agreementData, setIsDownloading) => {
  try {
    setIsDownloading(true);
    // Extract property address for filename
    const propertyName = agreementData.address
      .split(",")[0]
      .trim()
      .replace(/\s+/g, "_");
    // Clean up names for filename
    const landlordName = agreementData.landlordName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
    const renterName = agreementData.renterName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
    // Generate file name
    const fileName = `Lease_${renterName}_${landlordName}_${propertyName}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    // Generate HTML content
    const htmlContent = generateAgreementHtml(agreementData);
    // Create a PDF file
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    // Move the file to a permanent location
    await FileSystem.moveAsync({
      from: uri,
      to: fileUri,
    });
    // Confirm file is saved before notifying the user
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: "Download Agreement",
          UTI: "com.adobe.pdf",
          filename: fileName,
        });
      } else {
        Alert.alert(
          "Sharing Unavailable",
          "You can find the file in your downloads."
        );
      }
    } else {
      throw new Error("File was not saved correctly.");
    }
  } catch (error) {
    console.error("Error downloading agreement:", error);
    Alert.alert("Error", "Failed to download the agreement.");
  } finally {
    setIsDownloading(false);
  }
};
