import * as admin from 'firebase-admin';


if (!admin.apps.length) {

  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG as string);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth: admin.auth.Auth = admin.auth();
