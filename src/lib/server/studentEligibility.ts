import { getAdminFirestore } from "@/lib/auth/admin";

export type StudentEligibilityResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Mirrors Firestore feedback rules: active student with an active plan. */
export async function assertActiveStudentWithPlan(
  uid: string,
): Promise<StudentEligibilityResult> {
  const db = getAdminFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return { ok: false, error: "Usuário não encontrado.", status: 400 };
  }

  const user = userSnap.data() ?? {};
  if (user.active === false) {
    return {
      ok: false,
      error:
        "Conta desativada. Entre em contato com a recepção para reativar seu acesso.",
      status: 403,
    };
  }

  const planId = user.planId;
  if (typeof planId !== "string" || planId.length === 0) {
    return {
      ok: false,
      error: "Plano inativo ou não atribuído.",
      status: 403,
    };
  }

  const planSnap = await db.collection("plans").doc(planId).get();
  if (!planSnap.exists || planSnap.data()?.active !== true) {
    return {
      ok: false,
      error: "Plano inativo ou não atribuído.",
      status: 403,
    };
  }

  return { ok: true };
}
