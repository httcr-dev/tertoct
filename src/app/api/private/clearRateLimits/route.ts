import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { getPrivateRouteContextFromRequest, requireRole } from "@/lib/auth/privateRoute";

/**
 * DEV-only endpoint to clear all rate limit counters from Firestore.
 * Requires admin session + Bearer secret (RATE_LIMIT_CLEAR_SECRET).
 *
 * Usage: DELETE /api/private/clearRateLimits
 *   Authorization: Bearer <RATE_LIMIT_CLEAR_SECRET>
 */
export async function DELETE(req: Request) {
  const secret = process.env.RATE_LIMIT_CLEAR_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const auth = await getPrivateRouteContextFromRequest(req);
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["admin"]);
  if (forbidden) return forbidden;

  const bearer = req.headers.get("authorization");
  if (!bearer || bearer !== `Bearer ${secret}`) {
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
