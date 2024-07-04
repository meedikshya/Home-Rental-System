// firebase-config.js
import admin from "firebase-admin";
import serviceAccount from "./serviceAccount.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
export { auth };
