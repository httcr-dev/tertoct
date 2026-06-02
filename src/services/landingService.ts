import { getDocs, query, where } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { mapPlan } from "@/lib/firestore/mappers";
import { plansCol } from "@/lib/firestore/refs";

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
