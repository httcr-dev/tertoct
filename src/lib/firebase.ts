import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type AppUserRole = "admin" | "coach" | "student";

export interface AppUserProfile {
  id: string;
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  role: AppUserRole;
  planId?: string | null;
  active: boolean;
  createdAt?: Date | null;
  paymentDueDay?: number | null;
  monthlyPaymentPaid?: boolean;
  paymentValidUntil?: any | null;
}

let firebaseApp: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        "Firebase config is missing. Did you forget to set environment variables?",
      );
    }

    firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    // Set persistence to LOCAL (survives page refresh and browser close)
    setPersistence(authInstance, browserLocalPersistence).catch((error) => {
      console.error("Failed to set persistence:", error);
    });
  }

  return authInstance;
}

export function getFirestoreDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }

  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();


export async function ensureUserDocument(user: User): Promise<AppUserProfile> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const profile: Omit<AppUserProfile, "id" | "createdAt"> = {
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: "student",
      planId: null,
      active: true,
    };

    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
    });

    return {
      id: user.uid,
      ...profile,
      createdAt: null,
    };
  }

  const data = snap.data();
  const updates: Record<string, string> = {};

  // Sync name, email and photoURL if they are missing or different
  if (user.displayName && data.name !== user.displayName) {
    updates.name = user.displayName;
  }
  if (user.email && data.email !== user.email) {
    updates.email = user.email;
  }
  if (user.photoURL && data.photoURL !== user.photoURL) {
    updates.photoURL = user.photoURL;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await updateDoc(userRef, updates);
    } catch (err) {
      console.warn("Failed to sync user profile to Firestore (skipping):", err);
    }
  }

  return {
    id: snap.id,
    name: updates.name ?? data.name ?? user.displayName ?? null,
    email: updates.email ?? data.email ?? user.email ?? null,
    photoURL: updates.photoURL ?? data.photoURL ?? user.photoURL ?? null,
    role: data.role ?? "student",
    planId: data.planId ?? null,
    active: data.active ?? true,
    createdAt: data.createdAt?.toDate?.() ?? null,
    paymentDueDay: data.paymentDueDay ?? null,
    monthlyPaymentPaid: data.monthlyPaymentPaid ?? false,
    paymentValidUntil: data.paymentValidUntil ?? null,
  };
}
