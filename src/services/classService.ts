import {
  getDocs,
  onSnapshot,
  query,
  type QuerySnapshot,
  where,
  type Unsubscribe,
  type DocumentData,
} from "firebase/firestore";
import type { GymClass } from "@/lib/types";
import { classesCol, classCheckinCountersCol } from "@/lib/firestore/refs";
import { mapGymClass } from "@/lib/firestore/mappers";

export function listenActiveClasses(
  onData: (classes: GymClass[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    // Avoid composite index requirement by sorting client-side.
    query(classesCol(), where("active", "==", true)),
    (snap) => {
      const next = snap.docs.map(mapGymClass);
      next.sort((a, b) => a.startTime.localeCompare(b.startTime));
      onData(next);
    },
    onError,
  );
}

export interface ClassCheckinCounter {
  id: string; // classId_dateKey
  classId: string;
  classDateKey: string; // YYYY-MM-DD
  count: number;
}

export async function fetchClassCountersForDate(
  dateKey: string,
): Promise<Map<string, number>> {
  const snap = (await getDocs(
    query(classCheckinCountersCol(), where("classDateKey", "==", dateKey)),
  )) as QuerySnapshot<DocumentData>;

  const counts = new Map<string, number>();
  snap.forEach((d) => {
    const data = (d.data() ?? {}) as { classId?: unknown; count?: unknown };
    const classId = typeof data.classId === "string" ? data.classId : "";
    const count = typeof data.count === "number" ? data.count : 0;
    if (classId) counts.set(classId, count);
  });
  return counts;
}

export function listenClassCountersForDate(
  dateKey: string,
  onData: (counts: Map<string, number>) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    query(classCheckinCountersCol(), where("classDateKey", "==", dateKey)),
    (snap) => {
      const counts = new Map<string, number>();
      snap.forEach((d) => {
        const data = (d.data() ?? {}) as { classId?: unknown; count?: unknown };
        const classId = typeof data.classId === "string" ? data.classId : "";
        const count = typeof data.count === "number" ? data.count : 0;
        if (classId) counts.set(classId, count);
      });
      onData(counts);
    },
    onError,
  );
}

export async function createGymClass(payload: Omit<GymClass, "id" | "createdBy" | "createdAt"> & { createdBy?: never; createdAt?: never }): Promise<void> {
  const response = await fetch("/api/private/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create class");
  }
}

export async function updateGymClass(classId: string, fields: Partial<Omit<GymClass, "id" | "createdBy" | "createdAt">>): Promise<void> {
  const response = await fetch(`/api/private/classes/${classId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!response.ok) {
    throw new Error("Failed to update class");
  }
}

export async function deleteGymClass(classId: string): Promise<void> {
  const response = await fetch(`/api/private/classes/${classId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete class");
  }
}

