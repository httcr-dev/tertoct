import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeRules = emulatorHost ? describe : describe.skip;

describeRules("firestore.rules security", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "tertoct-rules-test",
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
        host: emulatorHost?.split(":")[0] ?? "127.0.0.1",
        port: Number(emulatorHost?.split(":")[1] ?? "8080"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("denies self-create with elevated role", async () => {
    const db = testEnv.authenticatedContext("student_1").firestore();
    const userRef = doc(db, "users", "student_1");

    await assertFails(
      setDoc(userRef, {
        name: "Student",
        email: "student@test.local",
        role: "admin",
      }),
    );
  });

  it("allows self-create only as student role", async () => {
    const db = testEnv.authenticatedContext("student_1").firestore();
    const userRef = doc(db, "users", "student_1");

    await assertSucceeds(
      setDoc(userRef, {
        name: "Student",
        email: "student@test.local",
        role: "student",
        active: true,
      }),
    );
  });

  it("denies public read from users collection", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "coach_1"), {
        role: "coach",
        name: "Coach Private",
        photoURL: "https://example.com/pic.jpg",
      });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, "users", "coach_1")));
  });

  it("allows public read from publicProfiles collection", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "publicProfiles", "coach_1"), {
        role: "coach",
        name: "Coach Public",
        photoURL: "https://example.com/pic.jpg",
        bio: "Coach",
      });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, "publicProfiles", "coach_1")));
  });

  it("allows active student to create checkin", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "student_1"), {
        role: "student",
        name: "Student",
        active: true,
        planId: "plan_1",
        monthlyPaymentPaid: true,
      });
      await setDoc(doc(adminDb, "plans", "plan_1"), {
        active: true,
        classesPerWeek: 3,
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "checkinCounters", "student_1_2026-W16"), {
      userId: "student_1",
      weekKey: "2026-W16",
      count: 1,
    });
    batch.set(doc(db, "checkins", "checkin_1"), {
      userId: "student_1",
      planId: "plan_1",
      weekKey: "2026-W16",
    });

    await assertSucceeds(batch.commit());
  });

  it("denies inactive student creating checkin", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "student_1"), {
        role: "student",
        name: "Student",
        active: false,
        planId: "plan_1",
        monthlyPaymentPaid: true,
      });
      await setDoc(doc(adminDb, "plans", "plan_1"), {
        active: true,
        classesPerWeek: 3,
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "checkinCounters", "student_1_2026-W16"), {
      userId: "student_1",
      weekKey: "2026-W16",
      count: 1,
    });
    batch.set(doc(db, "checkins", "checkin_2"), {
      userId: "student_1",
      planId: "plan_1",
      weekKey: "2026-W16",
    });

    await assertFails(batch.commit());
  });
});
