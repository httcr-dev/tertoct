/**
 * Rebuilds the 30-day check-in count rollup in Firestore.
 *
 * Usage:
 *   node scripts/rebuildCheckinRollup.js
 *
 * Credentials via Application Default Credentials (same as seedFirestore.js).
 */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
const ROLLUP_DOC_ID = "checkinCounts30d";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function rebuild() {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const snap = await db
    .collection("checkins")
    .where("createdAt", ">=", since)
    .select("userId")
    .get();

  const counts = {};
  for (const doc of snap.docs) {
    const userId = doc.data().userId;
    if (typeof userId !== "string" || userId.length === 0) continue;
    counts[userId] = (counts[userId] ?? 0) + 1;
  }

  await db.collection("metrics").doc(ROLLUP_DOC_ID).set({
    windowDays: 30,
    updatedAt: new Date(),
    counts,
  });

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(
    `✅ Rollup rebuilt: ${Object.keys(counts).length} users, ${total} check-ins (since ${since.toISOString()})`,
  );
}

rebuild().catch((err) => {
  console.error("❌ Rollup rebuild failed:", err);
  process.exit(1);
});
