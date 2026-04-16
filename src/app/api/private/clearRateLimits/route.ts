import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";

/**
 * DEV-only endpoint to clear all rate limit counters from Firestore.
 * Protected by a secret token in the RATE_LIMIT_CLEAR_SECRET env var.
 *
 * Usage: DELETE /api/private/clearRateLimits
 *   Authorization: Bearer <RATE_LIMIT_CLEAR_SECRET>
 *
 * This endpoint is intentionally NOT exposed in production unless the secret is set.
 */
export async function DELETE(req: Request) {
  const secret = process.env.RATE_LIMIT_CLEAR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  const col = db.collection("_rateLimits");
  const snap = await col.get();

  if (snap.empty) {
    return NextResponse.json({ deleted: 0 });
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return NextResponse.json({ deleted: snap.size });
}
