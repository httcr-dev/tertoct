import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { E2E_IDS, E2E_LABELS, E2E_PROJECT_ID } from "../constants";
import { currentWeekIsoKey, workWeekDateKeys } from "./dates";
import { getDateKeyForOffset } from "../../src/lib/utils/dateKey";

const UTC_OFFSET = -180;

function ensureEmulatorEnv(): void {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  process.env.GCLOUD_PROJECT = E2E_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID = E2E_PROJECT_ID;
}

function getDb(): admin.firestore.Firestore {
  ensureEmulatorEnv();
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: E2E_PROJECT_ID });
  }
  return admin.firestore();
}

export function gymTodayKey(now = new Date()): string {
  return getDateKeyForOffset(now, UTC_OFFSET);
}

/** Minutes since midnight in gym timezone (UTC−3). */
export function gymLocalMinutes(now = new Date()): number {
  const shifted = new Date(now.getTime() + UTC_OFFSET * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** HH:mm for (local minutes − offset), clamped to 00:00. */
export function hhmmFromGymMinutes(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function clearStudentCheckinData(): Promise<void> {
  const db = getDb();
  const { studentUid } = E2E_IDS;

  const checkins = await db
    .collection("checkins")
    .where("userId", "==", studentUid)
    .get();
  const batch = db.batch();
  checkins.docs.forEach((doc) => batch.delete(doc.ref));

  const counterSnap = await db.collection("checkinCounters").get();
  counterSnap.docs
    .filter((doc) => doc.id.startsWith(`${studentUid}_`))
    .forEach((doc) => batch.delete(doc.ref));

  const classCounterSnap = await db.collection("classCheckinCounters").get();
  classCounterSnap.docs
    .filter((doc) => doc.id.startsWith(`${E2E_IDS.classId}_`))
    .forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
}

export async function restoreDefaultStudentProfile(): Promise<void> {
  const db = getDb();
  const now = Timestamp.now();
  await db.collection("users").doc(E2E_IDS.studentUid).set(
    {
      name: E2E_LABELS.studentName,
      email: "student-e2e@test.local",
      role: "student",
      planId: E2E_IDS.planId,
      active: true,
      monthlyPaymentPaid: true,
      paymentDueDay: admin.firestore.FieldValue.delete(),
      paymentValidUntil: admin.firestore.FieldValue.delete(),
      createdAt: now,
    },
    { merge: true },
  );
}

export async function setStudentPlan(planId: string | null): Promise<void> {
  const db = getDb();
  await db
    .collection("users")
    .doc(E2E_IDS.studentUid)
    .set(
      planId
        ? { planId, active: true }
        : { planId: admin.firestore.FieldValue.delete() },
      { merge: true },
    );
}

export async function setStudentPaymentOverdue(overdue: boolean): Promise<void> {
  const db = getDb();
  if (overdue) {
    await db.collection("users").doc(E2E_IDS.studentUid).set(
      {
        monthlyPaymentPaid: false,
        paymentDueDay: 1,
        paymentValidUntil: admin.firestore.FieldValue.delete(),
      },
      { merge: true },
    );
    return;
  }
  await db.collection("users").doc(E2E_IDS.studentUid).set(
    {
      monthlyPaymentPaid: true,
      paymentDueDay: admin.firestore.FieldValue.delete(),
      paymentValidUntil: admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );
}

export async function setClassSchedule(options: {
  startTime: string;
  checkinDeadlineTime: string;
  capacity?: number;
  active?: boolean;
}): Promise<void> {
  const db = getDb();
  await db
    .collection("classes")
    .doc(E2E_IDS.classId)
    .set(options, { merge: true });
}

export async function setClassFullForDate(
  classDateKey: string,
  capacity = 20,
): Promise<void> {
  const db = getDb();
  await db
    .collection("classCheckinCounters")
    .doc(`${E2E_IDS.classId}_${classDateKey}`)
    .set({
      classId: E2E_IDS.classId,
      classDateKey,
      count: capacity,
      updatedAt: Timestamp.now(),
    });
}

/** Insere um check-in do aluno E2E para exibir histórico/modal no coach. */
export async function seedStudentCheckinForDate(
  classDateKey: string,
): Promise<void> {
  const db = getDb();
  const { studentUid, planId, classId } = E2E_IDS;
  const weekKey = currentWeekIsoKey();
  const now = Timestamp.now();

  await db
    .collection("checkins")
    .doc(`${studentUid}_${classId}_${classDateKey}`)
    .set({
      userId: studentUid,
      planId,
      classId,
      classDateKey,
      className: E2E_LABELS.className,
      classStartTime: "20:00",
      weekKey,
      createdAt: now,
    });
}

/** Preenche limite semanal (3 check-ins) com documentos reais + contador. */
export async function fillWeeklyCheckinLimit(): Promise<void> {
  const db = getDb();
  const { studentUid, planId, classId } = E2E_IDS;
  const weekKey = currentWeekIsoKey();
  const dateKeys = workWeekDateKeys().slice(0, 3);
  const now = Timestamp.now();
  const batch = db.batch();

  for (const classDateKey of dateKeys) {
    batch.set(db.collection("checkins").doc(`${studentUid}_${classId}_${classDateKey}`), {
      userId: studentUid,
      planId,
      classId,
      classDateKey,
      className: E2E_LABELS.className,
      classStartTime: "20:00",
      weekKey,
      createdAt: now,
    });
  }

  batch.set(db.collection("checkinCounters").doc(`${studentUid}_${weekKey}`), {
    userId: studentUid,
    weekKey,
    count: 3,
    updatedAt: now,
  });

  await batch.commit();
}

/** Deadline already passed today; start remains after deadline. */
export async function setClassDeadlineInPast(now = new Date()): Promise<void> {
  const localMin = gymLocalMinutes(now);
  const deadline = hhmmFromGymMinutes(localMin - 120);
  const start = hhmmFromGymMinutes(localMin + 120);
  await setClassSchedule({
    checkinDeadlineTime: deadline,
    startTime: start,
  });
}

export async function restoreDefaultClassSchedule(): Promise<void> {
  await setClassSchedule({
    startTime: "20:00",
    checkinDeadlineTime: "19:00",
    capacity: 20,
    active: true,
  });
}

/** Restaura perfil e turma padrão do aluno E2E (use entre specs/arquivos). */
export async function resetE2eStudentState(): Promise<void> {
  await restoreDefaultStudentProfile();
  await restoreDefaultClassSchedule();
}
