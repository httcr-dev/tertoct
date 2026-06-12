import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/auth/admin";
import {
  aggregateCheckinCountsSince,
  getDefaultCoachCountsSince,
} from "./checkinCounts";

export const CHECKIN_ROLLUP_DOC_ID = "checkinCounts30d";
export const ROLLUP_WINDOW_DAYS = 30;
export const THIRTY_DAYS_MS = ROLLUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function checkinCountRollupRef(db: Firestore) {
  return db.collection("metrics").doc(CHECKIN_ROLLUP_DOC_ID);
}

function clampRollupCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [userId, count] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof count !== "number" || !Number.isFinite(count)) continue;
    if (count > 0) out[userId] = count;
  }
  return out;
}

/** Reads pre-aggregated 30-day check-in counts (Admin SDK only). */
export async function readCheckinCountRollup(): Promise<Record<string, number> | null> {
  const snap = await checkinCountRollupRef(getAdminFirestore()).get();
  if (!snap.exists) return null;
  const counts = clampRollupCounts(snap.data()?.counts);
  return Object.keys(counts).length > 0 ? counts : null;
}

export function applyCheckinRollupIncrement(
  tx: Transaction,
  db: Firestore,
  userId: string,
): void {
  const ref = checkinCountRollupRef(db);
  tx.set(
    ref,
    {
      windowDays: ROLLUP_WINDOW_DAYS,
      updatedAt: FieldValue.serverTimestamp(),
      counts: {
        [userId]: FieldValue.increment(1),
      },
    },
    { merge: true },
  );
}

export function applyCheckinRollupDecrement(
  tx: Transaction,
  db: Firestore,
  userId: string,
): void {
  const ref = checkinCountRollupRef(db);
  tx.set(
    ref,
    {
      updatedAt: FieldValue.serverTimestamp(),
      counts: {
        [userId]: FieldValue.increment(-1),
      },
    },
    { merge: true },
  );
}

export function isWithinRollupWindow(createdAt: Date | null | undefined): boolean {
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
  return createdAt.getTime() >= Date.now() - THIRTY_DAYS_MS;
}

/** Rebuilds the 30-day rollup from checkins (backfill / maintenance). */
export async function rebuildCheckinCountRollup(): Promise<Record<string, number>> {
  const since = getDefaultCoachCountsSince();
  const counts = await aggregateCheckinCountsSince(since);
  await checkinCountRollupRef(getAdminFirestore()).set({
    windowDays: ROLLUP_WINDOW_DAYS,
    updatedAt: new Date(),
    counts,
  });
  return counts;
}
