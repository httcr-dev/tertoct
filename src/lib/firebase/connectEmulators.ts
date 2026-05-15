import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "./client";

let connected = false;

export function connectEmulatorsIfEnabled(): void {
  if (connected || typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "true") return;

  connected = true;
  const authHost =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const firestoreHost =
    process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";

  const [authHostname, authPort = "9099"] = authHost.split(":");
  const [fsHostname, fsPort = "8080"] = firestoreHost.split(":");

  connectAuthEmulator(
    getFirebaseAuth(),
    `http://${authHostname}:${authPort}`,
    { disableWarnings: true },
  );
  connectFirestoreEmulator(
    getFirestoreDb(),
    fsHostname,
    Number(fsPort),
  );
}
