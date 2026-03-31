import {
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { planDoc, plansCol } from "@/lib/firestore/refs";

export async function createPlan(
  fields: Omit<Plan, "id">,
): Promise<void> {
  await addDoc(plansCol(), {
    name: fields.name || "Novo Plano",
    price: fields.price,
    classesPerWeek: fields.classesPerWeek,
    description: fields.description ?? "",
    active: fields.active ?? true,
    createdAt: serverTimestamp(),
  });
}

export async function updatePlan(
  planId: string,
  fields: Partial<Omit<Plan, "id">>,
): Promise<void> {
  await updateDoc(planDoc(planId), fields);
}

export async function deletePlan(planId: string): Promise<void> {
  await deleteDoc(planDoc(planId));
}

export async function togglePlanActive(plan: Plan): Promise<void> {
  await updateDoc(planDoc(plan.id), { active: !plan.active });
}
