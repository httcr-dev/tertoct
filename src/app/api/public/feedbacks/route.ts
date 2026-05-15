import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/auth/admin";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

type PublicFeedback = {
  id: string;
  userName: string | null;
  message: string;
  createdAtMs: number | null;
};

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const trusted = process.env.TRUST_PROXY_HEADERS === "true";

  if (trusted && forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  if (trusted && realIp?.trim()) return realIp.trim().slice(0, 128);
  if (realIp?.trim()) return realIp.trim().slice(0, 128);
  return "unknown-ip";
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`public-feedbacks:get:${ip}`, {
    windowMs: 60_000,
    maxRequests: 60,
    failOpen: true,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection("feedbacks")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const items: PublicFeedback[] = snap.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;
      let createdAtMs: number | null = null;
      if (createdAt && typeof createdAt.toMillis === "function") {
        createdAtMs = createdAt.toMillis();
      } else if (typeof createdAt?.seconds === "number") {
        createdAtMs = createdAt.seconds * 1000;
      }
      return {
        id: doc.id,
        userName: typeof data.userName === "string" ? data.userName : null,
        message: typeof data.message === "string" ? data.message : "",
        createdAtMs,
      };
    });

    const res = NextResponse.json({ items });
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );
    return res;
  } catch (e) {
    console.error("[public/feedbacks] GET failed", e);
    return NextResponse.json(
      { error: "Failed to load feedbacks" },
      { status: 500 },
    );
  }
}
