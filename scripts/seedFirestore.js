// Seed script for Firestore emulator
// Usage: start emulator then run `npm run seed` (or `node scripts/seedFirestore.js`)

const admin = require("firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "tertoct-local";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";

// If running against emulator, ensure env var is set (this script will set default)
process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

async function seed() {
  console.log("Seeding Firestore (emulator) with sample data...");

  // Plans
  const plans = [
    {
      id: "plan_basic",
      name: "Plano Essencial",
      price: 120,
      classesPerWeek: 2,
      description: "Plano para iniciantes",
      active: true,
    },
    {
      id: "plan_pro",
      name: "Plano Pro",
      price: 220,
      classesPerWeek: 4,
      description: "Plano para treinos intensos",
      active: true,
    },
  ];

  for (const p of plans) {
    await db.collection("plans").doc(p.id).set({
      name: p.name,
      price: p.price,
      classesPerWeek: p.classesPerWeek,
      description: p.description,
      active: p.active,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Users: admin, coach, two students
  const users = [
    {
      id: "admin_1",
      name: "Admin Terto",
      email: "admin@tertoct.local",
      role: "admin",
      active: true,
    },
    {
      id: "coach_1",
      name: "Carlos Oliveira",
      email: "coach@tertoct.local",
      role: "coach",
      active: true,
    },
    {
      id: "student_1",
      name: "Heitor Carvalho",
      email: "heitor@tertoct.local",
      role: "student",
      planId: "plan_basic",
      active: true,
    },
    {
      id: "student_2",
      name: "João Silva",
      email: "joao@tertoct.local",
      role: "student",
      planId: null,
      active: true,
    },
  ];

  for (const u of users) {
    await db
      .collection("users")
      .doc(u.id)
      .set({
        name: u.name,
        email: u.email,
        role: u.role,
        planId: u.planId || null,
        active: u.active,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  // Check-ins sample for student_1
  const checkins = [
    {
      id: "c1",
      userId: "student_1",
      planId: "plan_basic",
      notes: "Treino de pernas",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      id: "c2",
      userId: "student_1",
      planId: "plan_basic",
      notes: "Treino de boxe",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  for (const c of checkins) {
    await db.collection("checkins").doc(c.id).set({
      userId: c.userId,
      planId: c.planId,
      notes: c.notes,
      createdAt: c.createdAt,
    });
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Error seeding data:", err);
  process.exit(1);
});
