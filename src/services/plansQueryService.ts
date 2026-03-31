import { getDoc } from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { planDoc } from "@/lib/firestore/refs";
import { mapPlan } from "@/lib/firestore/mappers";

export async function getPlanById(planId: string): Promise<Plan | null> {
  const snap = await getDoc(planDoc(planId));
  if (!snap.exists()) return null;
  return mapPlan(snap);
}

