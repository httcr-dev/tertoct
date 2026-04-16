import * as admin from "firebase-admin";

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "tertoct-local"
  );
}

export function getAdminApp() {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
        );
        
        // Ensure private_key has actual newlines, not escaped characters from .env
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({

          credential: admin.credential.cert(serviceAccount),
          projectId: getProjectId(),
        });
      } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", err);
        admin.initializeApp({ projectId: getProjectId() });
      }
    } else {
      admin.initializeApp({
        projectId: getProjectId(),
      });
    }
  }

  return admin.app();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}
