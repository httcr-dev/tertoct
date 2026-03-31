/**
 * Daily notifier (run via cron/GitHub Actions/Cloud Scheduler).
 *
 * Goal:
 * - If a student's payment is going to expire tomorrow, send a single message to the gym WhatsApp number.
 * - Skip students without an active plan (planId missing or plan inactive) or inactive users.
 *
 * This script uses firebase-admin (server-side). It supports emulator usage by setting
 * FIRESTORE_EMULATOR_HOST, same style as scripts/seedFirestore.js.
 *
 * Required env:
 * - FIREBASE_PROJECT_ID (optional; default: tertoct-local)
 * - FIRESTORE_EMULATOR_HOST (optional)
 * - NOTIFY_TO_WHATSAPP (e.g. "554499771761")  // gym number (no +)
 *
 * Optional env:
 * - DRY_RUN=1 (default) to avoid sending
 * - TZ=America/Sao_Paulo (recommended)
 * - WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_NUMBER_ID (Meta WhatsApp Cloud API)
 */

const admin = require("firebase-admin");

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "tertoct-local";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || null;

// Default: dry-run (safe)
const DRY_RUN = process.env.DRY_RUN !== "0";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDate(value) {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatPtBr(d) {
  return d.toLocaleDateString("pt-BR", { timeZone: process.env.TZ || "America/Sao_Paulo" });
}

async function sendWhatsAppMessageCloudApi(text) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.NOTIFY_TO_WHATSAPP;

  if (!to) throw new Error("Missing NOTIFY_TO_WHATSAPP");

  if (!token || !phoneNumberId) {
    // No credentials: keep as dry-run by design
    console.log("[notify] Missing WHATSAPP_CLOUD_TOKEN/WHATSAPP_PHONE_NUMBER_ID (skipping send).");
    return;
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WhatsApp API error: ${res.status} ${body}`);
  }
}

async function main() {
  if (EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
    admin.initializeApp({ projectId: PROJECT_ID });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(svc),
      projectId: PROJECT_ID,
    });
  } else {
    admin.initializeApp({ projectId: PROJECT_ID });
    console.log(
      "[notify] No FIRESTORE_EMULATOR_HOST and no FIREBASE_SERVICE_ACCOUNT_JSON. " +
        "This will require Application Default Credentials.",
    );
  }
  const db = admin.firestore();

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(today, 1));
  const dayAfterTomorrow = startOfDay(addDays(today, 2));

  // Fetch active plans once
  const plansSnap = await db.collection("plans").get();
  const plansById = new Map();
  plansSnap.forEach((d) => plansById.set(d.id, d.data()));

  // Students only
  const usersSnap = await db.collection("users").where("role", "==", "student").get();

  const expiring = [];

  usersSnap.forEach((doc) => {
    const u = doc.data() || {};
    const userId = doc.id;

    if (u.active === false) return;
    if (!u.planId) return;

    const plan = plansById.get(u.planId);
    if (!plan || plan.active === false) return;

    const validUntil = toDate(u.paymentValidUntil);
    if (!validUntil) return;

    const v = startOfDay(validUntil);
    if (v.getTime() >= tomorrow.getTime() && v.getTime() < dayAfterTomorrow.getTime()) {
      expiring.push({
        userId,
        name: u.name || null,
        email: u.email || null,
        planId: u.planId,
        planName: plan.name || u.planId,
        validUntil,
      });
    }
  });

  if (expiring.length === 0) {
    console.log("[notify] No expiring plans for tomorrow.");
    return;
  }

  const lines = expiring.map((x) => {
    const who = x.name || x.email || x.userId;
    return `- ${who} | Plano: ${x.planName} | Vence: ${formatPtBr(x.validUntil)}`;
  });

  const text =
    `Planos vencendo amanhã (${formatPtBr(tomorrow)}). ` +
    `Para não bloquear o check-in, regularize o pagamento:\n\n` +
    lines.join("\n");

  if (DRY_RUN) {
    console.log("[notify][dry-run] Would send message:\n" + text);
    return;
  }

  await sendWhatsAppMessageCloudApi(text);
  console.log(`[notify] Sent WhatsApp message for ${expiring.length} student(s).`);
}

main().catch((err) => {
  console.error("[notify] Failed:", err?.message || err);
  process.exit(1);
});

