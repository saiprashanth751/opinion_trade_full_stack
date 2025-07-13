import * as admin from "firebase-admin";
import serviceAccount from "../user-otp-auth-83792-firebase-adminsdk-fbsvc-a741487270.json"
// import { ServiceAccount } from "firebase-admin";


if (!admin.apps.length) {
  // TypeScript will infer the correct type from JSON
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const adminAuth:admin.auth.Auth = admin.auth();
