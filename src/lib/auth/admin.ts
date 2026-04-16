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
    const projectId = getProjectId();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        });
        console.log(
          "✅ Firebase Admin inicializado via variáveis individuais.",
        );
      } catch (err) {
        console.error("❌ Erro ao inicializar Admin SDK com cert:", err);
      }
    } else {
      console.warn(
        "⚠️ Firebase Admin: Nenhuma credencial encontrada. Tentando modo default...",
      );
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
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
