import { NextResponse } from "next/server";
import { getPrivateRouteContext, requireRole } from "@/lib/auth/privateRoute";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import {
  aggregateCheckinCountsSince,
  getDefaultCoachCountsSince,
} from "@/lib/server/checkinCounts";
import { captureServerError } from "@/lib/observability/serverObservability";

export const runtime = "nodejs";

const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;

function parseDaysParam(raw: string | null): number {
  if (!raw) return DEFAULT_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_DAYS;
  return Math.min(parsed, MAX_DAYS);
}

export async function GET(req: Request) {
  const auth = await getPrivateRouteContext();
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(
    req,
    auth.context.session.uid,
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const days = parseDaysParam(url.searchParams.get("days"));
  const since =
    days === DEFAULT_DAYS
      ? getDefaultCoachCountsSince()
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const counts = await aggregateCheckinCountsSince(since);
    return NextResponse.json({ counts, days });
  } catch (error) {
    captureServerError(error, {
      route: "/api/private/checkins/counts",
      action: "aggregate-counts",
      uid: auth.context.session.uid,
      errorCode: "COUNTS_AGGREGATE_FAILED",
    });
    return NextResponse.json(
      { error: "Failed to load check-in counts" },
      { status: 500 },
    );
  }
}
