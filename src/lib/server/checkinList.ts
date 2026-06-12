import { getAdminFirestore } from "@/lib/auth/admin";
import type { CheckIn } from "@/lib/types";

const CHECKIN_LIST_CAP = 500;
const CLASS_DATE_KEY_IN_MAX = 10;

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

function mapSnapshotDocs(
  docs: Array<{ id: string; data: () => RawCheckinDoc }>,
): CheckIn[] {
  return docs.map((doc) => mapAdminCheckin(doc.id, doc.data() as RawCheckinDoc));
}

/** Coach dashboard: check-ins since `since`, optionally filtered by classDateKey. */
export async function listCheckinsSince(
  since: Date,
  options?: { classDateKeys?: string[] },
): Promise<CheckIn[]> {
  const classDateKeys = options?.classDateKeys?.filter((key) =>
    /^\d{4}-\d{2}-\d{2}$/.test(key),
  );

  if (
    classDateKeys &&
    classDateKeys.length > 0 &&
    classDateKeys.length <= CLASS_DATE_KEY_IN_MAX
  ) {
    const snap = await getAdminFirestore()
      .collection("checkins")
      .where("classDateKey", "in", classDateKeys)
      .orderBy("createdAt", "desc")
      .limit(CHECKIN_LIST_CAP)
      .get();
    return mapSnapshotDocs(snap.docs);
  }

  const snap = await getAdminFirestore()
    .collection("checkins")
    .where("createdAt", ">=", since)
    .orderBy("createdAt", "desc")
    .limit(CHECKIN_LIST_CAP)
    .get();

  return mapSnapshotDocs(snap.docs);
}
