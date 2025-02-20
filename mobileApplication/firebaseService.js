// import {
//   doc,
//   updateDoc,
//   arrayUnion,
//   serverTimestamp,
//   getDoc,
//   setDoc,
// } from "firebase/firestore";
// import { FIREBASE_DB } from "./firebaseConfig";

// export const createChat = async (user1Id, user2Id, messageText) => {
//   try {
//     const chatId = [user1Id, user2Id].sort().join("_");
//     console.log("Creating/updating chat:", chatId);

//     const chatRef = doc(FIREBASE_DB, "chats", chatId);
//     const chatSnap = await getDoc(chatRef);

//     if (!chatSnap.exists()) {
//       // Create chat document if it does not exist
//       await setDoc(chatRef, {
//         users: [user1Id, user2Id],
//         messages: [],
//       });
//     }

//     // Add message to the messages array inside the chat document
//     await updateDoc(chatRef, {
//       messages: arrayUnion({
//         senderId: user1Id,
//         text: messageText,
//         timestamp: serverTimestamp(),
//       }),
//     });

//     console.log("✅ Message sent successfully");
//     return true;
//   } catch (error) {
//     console.error("❌ Error in createChat:", error);
//     throw error;
//   }
// };
