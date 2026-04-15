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
    admin.initializeApp({
      projectId: getProjectId(),
    });
  }

  return admin.app();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}
