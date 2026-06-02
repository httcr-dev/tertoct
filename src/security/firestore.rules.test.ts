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

  it("denies student direct check-in write (mutations via API only)", async () => {
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
      await setDoc(doc(adminDb, "classes", "class_1"), {
        active: true,
        name: "Turma 07:00",
        startTime: "07:00",
        checkinDeadlineTime: "06:30",
        capacity: 20,
        utcOffsetMinutes: -180,
        createdBy: "coach_1",
      });
      await setDoc(
        doc(adminDb, "checkins", "student_1_class_1_2026-04-15"),
        {
          userId: "student_1",
          planId: "plan_1",
          classId: "class_1",
          classDateKey: "2026-04-15",
          weekKey: "2026-04-14",
        },
      );
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "checkinCounters", "student_1_2026-04-14"), {
      userId: "student_1",
      weekKey: "2026-04-14",
      count: 1,
    });
    batch.set(doc(db, "checkins", "student_1_class_1_2026-04-16"), {
      userId: "student_1",
      planId: "plan_1",
      classId: "class_1",
      classDateKey: "2026-04-16",
      weekKey: "2026-04-14",
    });

    await assertFails(batch.commit());
  });

  it("allows student to read own check-in", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "student_1"), {
        role: "student",
        active: true,
      });
      await setDoc(doc(context.firestore(), "checkins", "student_1_class_1_2026-04-15"), {
        userId: "student_1",
        planId: "plan_1",
        classId: "class_1",
        classDateKey: "2026-04-15",
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertSucceeds(
      getDoc(doc(db, "checkins", "student_1_class_1_2026-04-15")),
    );
  });

  it("allows coach to read student check-in", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "coach_1"), { role: "coach", name: "Coach" });
      await setDoc(doc(adminDb, "checkins", "student_1_class_1_2026-04-15"), {
        userId: "student_1",
        planId: "plan_1",
        classId: "class_1",
        classDateKey: "2026-04-15",
      });
    });

    const db = testEnv.authenticatedContext("coach_1").firestore();
    await assertSucceeds(
      getDoc(doc(db, "checkins", "student_1_class_1_2026-04-15")),
    );
  });

  it("denies student reading another student's check-in", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "student_1"), {
        role: "student",
        active: true,
      });
      await setDoc(doc(context.firestore(), "users", "student_2"), {
        role: "student",
        active: true,
      });
      await setDoc(doc(context.firestore(), "checkins", "student_2_class_1_2026-04-15"), {
        userId: "student_2",
        planId: "plan_1",
        classId: "class_1",
        classDateKey: "2026-04-15",
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertFails(
      getDoc(doc(db, "checkins", "student_2_class_1_2026-04-15")),
    );
  });

  it("denies student direct class write", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "student_1"), {
        role: "student",
        active: true,
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertFails(
      setDoc(doc(db, "classes", "class_hack"), {
        active: true,
        name: "Fake",
        startTime: "07:00",
        checkinDeadlineTime: "06:30",
        capacity: 999,
      }),
    );
  });

  it("allows signed-in student to read classes", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "student_1"), {
        role: "student",
        name: "Student",
        active: true,
        planId: "plan_1",
        monthlyPaymentPaid: true,
      });
      await setDoc(doc(context.firestore(), "classes", "class_1"), {
        active: true,
        name: "Turma 07:00",
        startTime: "07:00",
        checkinDeadlineTime: "06:30",
        capacity: 20,
        utcOffsetMinutes: -180,
        createdBy: "coach_1",
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertSucceeds(getDoc(doc(db, "classes", "class_1")));
  });

  it("allows signed-in student to read classCheckinCounters", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "users", "student_1"), {
        role: "student",
        name: "Student",
        active: true,
        planId: "plan_1",
        monthlyPaymentPaid: true,
      });
      await setDoc(doc(adminDb, "classCheckinCounters", "class_1_2026-04-15"), {
        classId: "class_1",
        classDateKey: "2026-04-15",
        count: 10,
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertSucceeds(
      getDoc(doc(db, "classCheckinCounters", "class_1_2026-04-15")),
    );
  });

  it("denies student direct classCheckinCounter write", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "student_1"), {
        role: "student",
        active: true,
      });
    });

    const db = testEnv.authenticatedContext("student_1").firestore();
    await assertFails(
      setDoc(doc(db, "classCheckinCounters", "class_1_2026-04-15"), {
        classId: "class_1",
        classDateKey: "2026-04-15",
        count: 0,
      }),
    );
  });
});
