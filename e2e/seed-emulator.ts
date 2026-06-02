import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { E2E_IDS, E2E_LABELS, E2E_PROJECT_ID } from "./constants";

function ensureEmulatorEnv(): void {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  process.env.GCLOUD_PROJECT = E2E_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID = E2E_PROJECT_ID;
}

export type E2eAuthTokens = {
  student: string;
  coach: string;
};

export async function seedEmulatorAndCreateTokens(): Promise<E2eAuthTokens> {
  ensureEmulatorEnv();

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: E2E_PROJECT_ID });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  await clearCollections(db, [
    "checkins",
    "checkinCounters",
    "classCheckinCounters",
    "feedback",
  ]);

  const { studentUid, coachUid, planId, classId } = E2E_IDS;

  try {
    await auth.createUser({
      uid: studentUid,
      email: "student-e2e@test.local",
      displayName: E2E_LABELS.studentName,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/uid-already-exists") throw error;
  }

  try {
    await auth.createUser({
      uid: coachUid,
      email: "coach-e2e@test.local",
      displayName: E2E_LABELS.coachName,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/uid-already-exists") throw error;
  }

  const now = Timestamp.now();

  await db.collection("plans").doc(planId).set({
    name: E2E_LABELS.planName,
    price: 100,
    classesPerWeek: 3,
    description: "Plano para testes E2E",
    active: true,
    createdAt: now,
  });

  await db.collection("classes").doc(classId).set({
    name: E2E_LABELS.className,
    startTime: "20:00",
    checkinDeadlineTime: "19:00",
    capacity: 20,
    utcOffsetMinutes: -180,
    active: true,
    createdBy: coachUid,
    createdAt: now,
  });

  await db.collection("users").doc(studentUid).set({
    name: E2E_LABELS.studentName,
    email: "student-e2e@test.local",
    role: "student",
    planId,
    active: true,
    monthlyPaymentPaid: true,
    createdAt: now,
  });

  await db.collection("users").doc(coachUid).set({
    name: E2E_LABELS.coachName,
    email: "coach-e2e@test.local",
    role: "coach",
    active: true,
    createdAt: now,
  });

  await db.collection("publicProfiles").doc(coachUid).set({
    name: E2E_LABELS.coachName,
    role: "coach",
    bio: "Professor E2E",
    active: true,
  });

  const [studentToken, coachToken] = await Promise.all([
    auth.createCustomToken(studentUid),
    auth.createCustomToken(coachUid),
  ]);

  return { student: studentToken, coach: coachToken };
}

async function clearCollections(
  db: admin.firestore.Firestore,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
