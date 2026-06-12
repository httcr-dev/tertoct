import { getAdminFirestore } from "@/lib/auth/admin";
import type { CheckIn } from "@/lib/types";

const CHECKIN_LIST_CAP = 500;

type RawCheckinDoc = {
  userId?: string;
  planId?: string;
  classId?: string | null;
  classDateKey?: string | null;
  className?: string | null;
  classStartTime?: string | null;
  createdAt?: { toDate?: () => Date };
};

function mapAdminCheckin(
  id: string,
  data: RawCheckinDoc,
): CheckIn {
  return {
    id,
    userId: data.userId ?? "",
    planId: data.planId ?? "",
    classId: data.classId ?? null,
    classDateKey: data.classDateKey ?? null,
    className: data.className ?? null,
    classStartTime: data.classStartTime ?? null,
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
  };
}

/** Coach dashboard: check-ins since `since`, optionally filtered by classDateKey. */
export async function listCheckinsSince(
  since: Date,
  options?: { classDateKeys?: string[] },
): Promise<CheckIn[]> {
  const snap = await getAdminFirestore()
    .collection("checkins")
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(CHECKIN_LIST_CAP)
    .get();

  const keys =
    options?.classDateKeys && options.classDateKeys.length > 0
      ? new Set(options.classDateKeys)
      : null;

  const items: CheckIn[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as RawCheckinDoc;
    if (keys && (!data.classDateKey || !keys.has(data.classDateKey))) {
      continue;
    }
    items.push(mapAdminCheckin(doc.id, data));
  }

  return items;
}
