import { NextResponse } from "next/server";
import { enforcePrivateApiRateLimit } from "@/lib/auth/privateApiRateLimit";
import { getPrivateRouteContextFromRequest, requireRole } from "@/lib/auth/privateRoute";
import { listStudentsPage } from "@/lib/server/studentList";
import { captureServerError } from "@/lib/observability/serverObservability";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

function parseLimitParam(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
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
  const limit = parseLimitParam(url.searchParams.get("limit"));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  try {
    const page = await listStudentsPage({ limit, cursor });
    return NextResponse.json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Invalid cursor") {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    captureServerError(error, {
      route: "/api/private/users/students",
      action: "list-students",
      uid: auth.context.session.uid,
      errorCode: "STUDENTS_LIST_FAILED",
    });
    return NextResponse.json(
      { error: "Failed to load students" },
      { status: 500 },
    );
  }
}
