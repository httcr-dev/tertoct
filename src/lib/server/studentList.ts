import {
  FieldPath,
  type DocumentSnapshot,
  type Firestore,
} from "firebase-admin/firestore";
import type { StudentSummary } from "@/lib/types";
import { getAdminFirestore } from "@/lib/auth/admin";

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;
const MAX_TOTAL_STUDENTS = 500;

export function mapStudentSummaryFromAdmin(
  doc: DocumentSnapshot,
): StudentSummary {
  const data = doc.data() ?? {};
  return {
    id: doc.id,
    name: (data.name as string | null | undefined) ?? null,
    email: (data.email as string | null | undefined) ?? null,
    phone: (data.phone as string | null | undefined) ?? null,
    photoURL: (data.photoURL as string | null | undefined) ?? null,
    planId: (data.planId as string | null | undefined) ?? null,
    weeklyCheckIns: 0,
    paymentDueDay: (data.paymentDueDay as number | null | undefined) ?? null,
    monthlyPaymentPaid:
      (data.monthlyPaymentPaid as boolean | undefined) ?? false,
    paymentValidUntil: data.paymentValidUntil ?? null,
    ...(data.active !== undefined ? { active: !!data.active } : {}),
  };
}

function encodeCursor(name: string, id: string): string {
  return Buffer.from(JSON.stringify({ name, id })).toString("base64url");
}

function decodeCursor(raw: string): { name: string; id: string } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as { name?: unknown; id?: unknown };
    if (typeof parsed.name !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    return { name: parsed.name, id: parsed.id };
  } catch {
    return null;
  }
}

export type StudentsPage = {
  students: StudentSummary[];
  nextCursor: string | null;
};

export async function listStudentsPage(
  options: { limit?: number; cursor?: string },
  db: Firestore = getAdminFirestore(),
): Promise<StudentsPage> {
  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  let query = db
    .collection("users")
    .where("role", "==", "student")
    .orderBy("name")
    .orderBy(FieldPath.documentId())
    .limit(limit);

  if (options.cursor) {
    const decoded = decodeCursor(options.cursor);
    if (!decoded) {
      throw new Error("Invalid cursor");
    }
    query = query.startAfter(decoded.name, decoded.id);
  }

  const snap = await query.get();
  const students = snap.docs.map(mapStudentSummaryFromAdmin);
  const last = snap.docs[snap.docs.length - 1];
  const nextCursor =
    snap.docs.length === limit && last
      ? encodeCursor(String(last.data().name ?? ""), last.id)
      : null;

  return { students, nextCursor };
}

/** Loads all students for coach dashboards (paginated server-side). */
export async function listAllStudents(
  db: Firestore = getAdminFirestore(),
): Promise<StudentSummary[]> {
  const all: StudentSummary[] = [];
  let cursor: string | undefined;

  do {
    const page = await listStudentsPage({ limit: DEFAULT_PAGE_SIZE, cursor }, db);
    all.push(...page.students);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && all.length < MAX_TOTAL_STUDENTS);

  return all;
}
