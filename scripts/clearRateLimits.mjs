#!/usr/bin/env node
/**
 * Clears all documents from the Firestore _rateLimits collection.
 * Run this once to flush poisoned rate-limit counters:
 *   node scripts/clearRateLimits.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, "../.env");
const envLines = readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error("No FIREBASE_PROJECT_ID found in .env");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ projectId });
}

const db = getFirestore();
const col = db.collection("_rateLimits");

console.log(`Connecting to project: ${projectId}`);
console.log("Fetching _rateLimits documents...");

const snapshot = await col.get();
if (snapshot.empty) {
  console.log("Collection is already empty.");
  process.exit(0);
}

const batch = db.batch();
snapshot.docs.forEach((doc) => {
  console.log(`  Deleting: ${doc.id}`);
  batch.delete(doc.ref);
});

await batch.commit();
console.log(`\nDeleted ${snapshot.size} document(s). Rate limits cleared.`);
