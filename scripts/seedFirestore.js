/**
 * Seed plans into Firestore. Credentials via Application Default Credentials:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 * or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env.
 *
 * Never commit service account JSON files (see .gitignore).
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

async function seed() {
  const target =
    process.env.FIRESTORE_EMULATOR_HOST != null
      ? "Firestore emulator"
      : `Firebase project (${process.env.FIREBASE_PROJECT_ID || "ADC default"})`;
  console.log(`🚀 Enviando planos para ${target}...`);

  const plans = [
    {
      id: "m_2x",
      name: "Turma Mensal - 2x",
      price: 250,
      classes: 2,
      desc: "2x na semana",
    },
    {
      id: "m_3x",
      name: "Turma Mensal - 3x",
      price: 300,
      classes: 3,
      desc: "3x na semana",
    },
    {
      id: "m_5x",
      name: "Turma Mensal - 5x",
      price: 400,
      classes: 5,
      desc: "5x na semana",
    },
    {
      id: "t_2x",
      name: "Turma Trimestral - 2x",
      price: 220,
      classes: 2,
      desc: "Plano trimestral",
    },
    {
      id: "t_3x",
      name: "Turma Trimestral - 3x",
      price: 275,
      classes: 3,
      desc: "Plano trimestral",
    },
    {
      id: "t_5x",
      name: "Turma Trimestral - 5x",
      price: 375,
      classes: 5,
      desc: "Plano trimestral",
    },
    {
      id: "s_2x",
      name: "Turma Semestral - 2x",
      price: 200,
      classes: 2,
      desc: "Plano semestral",
    },
    {
      id: "s_3x",
      name: "Turma Semestral - 3x",
      price: 250,
      classes: 3,
      desc: "Plano semestral",
    },
    {
      id: "s_5x",
      name: "Turma Semestral - 5x",
      price: 350,
      classes: 5,
      desc: "Plano semestral",
    },
    {
      id: "a_2x",
      name: "Turma Anual - 2x",
      price: 180,
      classes: 2,
      desc: "Plano anual",
    },
    {
      id: "a_3x",
      name: "Turma Anual - 3x",
      price: 230,
      classes: 3,
      desc: "Plano anual",
    },
    {
      id: "a_5x",
      name: "Turma Anual - 5x",
      price: 330,
      classes: 5,
      desc: "Plano anual",
    },
    {
      id: "p_ind_1x",
      name: "Personal Individual 1x",
      price: 400,
      classes: 1,
      desc: "Atendimento individual",
    },
    {
      id: "p_ind_5x_full",
      name: "Personal Individual 5x + Livre",
      price: 900,
      classes: 5,
      desc: "Individual + Turmas",
    },
    {
      id: "p_dup_5x_full",
      name: "Personal Dupla 5x + Livre",
      price: 1350,
      classes: 5,
      desc: "Valor dupla + Livre",
    },
    {
      id: "p_trio_5x_full",
      name: "Personal Trio 5x + Livre",
      price: 1700,
      classes: 5,
      desc: "Valor trio + Livre",
    },
  ];

  const batch = db.batch();

  plans.forEach((p) => {
    const ref = db.collection("plans").doc(p.id);
    batch.set(ref, {
      name: p.name,
      price: p.price,
      classesPerWeek: p.classes,
      description: p.desc,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log("✅ Planos criados com sucesso!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
