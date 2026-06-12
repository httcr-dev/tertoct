import { NextResponse } from "next/server";
import { getPrivateRouteContextFromRequest, requireRole } from "@/lib/auth/privateRoute";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { listCheckinsSince } from "@/lib/server/checkinList";
import { captureServerError } from "@/lib/observability/serverObservability";

export const runtime = "nodejs";

const MAX_DAYS = 14;
const DEFAULT_DAYS = 7;

function parseSinceParam(raw: string | null, daysRaw: string | null): Date {
  if (raw) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }

  let days = DEFAULT_DAYS;
  if (daysRaw) {
    const parsed = Number.parseInt(daysRaw, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      days = Math.min(parsed, MAX_DAYS);
    }
  }

  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function parseClassDateKeys(raw: string | null): string[] | undefined {
  if (!raw) return undefined;
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
  return keys.length > 0 ? keys : undefined;
}

export async function GET(req: Request) {
  const auth = await getPrivateRouteContextFromRequest(req);
  if (!auth.ok) return auth.response;
  const forbidden = requireRole(auth.context, ["coach", "admin"]);
  if (forbidden) return forbidden;

  const rateLimited = await enforcePrivateApiRateLimit(
    req,
    auth.context.session.uid,
  );
  if (rateLimited) return rateLimited;

  const url = new URL(req.url);
  const since = parseSinceParam(
    url.searchParams.get("since"),
    url.searchParams.get("days"),
  );
  const classDateKeys = parseClassDateKeys(
    url.searchParams.get("classDateKeys"),
  );

  try {
    const checkins = await listCheckinsSince(since, { classDateKeys });
    return NextResponse.json({ checkins });
  } catch (error) {
    captureServerError(error, {
      route: "/api/private/checkins/recent",
      action: "list-checkins",
      uid: auth.context.session.uid,
      errorCode: "CHECKINS_LIST_FAILED",
    });
    return NextResponse.json(
      { error: "Failed to load check-ins" },
      { status: 500 },
    );
  }
}
