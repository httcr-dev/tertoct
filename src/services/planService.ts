import {
  addDoc,
  deleteDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Plan } from "@/lib/types";
import { planDoc, plansCol, usersCol } from "@/lib/firestore/refs";

export class PlanInUseError extends Error {
  constructor() {
    super("Não é possível excluir este plano: há alunos vinculados.");
    this.name = "PlanInUseError";
  }
}

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
  const linkedUsers = await getDocs(
    query(usersCol(), where("planId", "==", planId), limit(1)),
  );
  if (!linkedUsers.empty) {
    throw new PlanInUseError();
  }
  await deleteDoc(planDoc(planId));
}

export async function togglePlanActive(plan: Plan): Promise<void> {
  await updateDoc(planDoc(plan.id), { active: !plan.active });
}
