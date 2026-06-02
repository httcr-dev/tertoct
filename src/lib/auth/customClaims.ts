import type { AppUserRole } from "@/lib/types";
import { getAdminAuth, getAdminFirestore } from "@/lib/auth/admin";

function claimsForRole(role: AppUserRole): Record<string, boolean | string> {
  const claims: Record<string, boolean | string> = {
    role,
    admin: false,
    coach: false,
    student: false,
  };
  if (role === "admin") claims.admin = true;
  if (role === "coach") claims.coach = true;
  if (role === "student") claims.student = true;
  return claims;
}

/** Writes Firebase Auth custom claims from the authoritative Firestore `users` doc. */
export async function syncCustomClaimsFromFirestore(
  uid: string,
): Promise<AppUserRole | null> {
  const snap = await getAdminFirestore().collection("users").doc(uid).get();
  if (!snap.exists) return null;

  const role = snap.data()?.role;
  if (role !== "admin" && role !== "coach" && role !== "student") {
    return null;
  }

  await getAdminAuth().setCustomUserClaims(uid, claimsForRole(role));
  return role;
}
