import { getDocs, query, where } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { mapPlan } from "@/lib/firestore/mappers";
import { plansCol, usersCol } from "@/lib/firestore/refs";

export interface CoachCardData {
  id: string;
  name: string | null;
  bio?: string | null;
  photoURL?: string | null;
}

export async function fetchActivePlans(): Promise<Plan[]> {
  const snap = await getDocs(query(plansCol(), where("active", "==", true)));
  const plans = snap.docs.map(mapPlan);
  plans.sort((a, b) => a.classesPerWeek - b.classesPerWeek);
  return plans;
}

export async function fetchActiveCoaches(): Promise<CoachCardData[]> {
  const snap = await getDocs(
    query(usersCol(), where("role", "in", ["coach", "admin"])),
  );

  const coaches: CoachCardData[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active !== false) {
      coaches.push({
        id: docSnap.id,
        name: (data.name as string | null | undefined) ?? null,
        bio: (data.bio as string | null | undefined) ?? undefined,
        photoURL: (data.photoURL as string | null | undefined) ?? undefined,
      });
    }
  });

  return coaches;
}

