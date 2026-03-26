import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Plan } from "@/lib/types";

const PLANS_COLLECTION = "plans";

function plansRef() {
  return collection(getFirestoreDb(), PLANS_COLLECTION);
}

function planDocRef(planId: string) {
  return doc(getFirestoreDb(), PLANS_COLLECTION, planId);
}

export async function createPlan(
  fields: Omit<Plan, "id">,
): Promise<void> {
  await addDoc(plansRef(), {
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
  await updateDoc(planDocRef(planId), fields);
}

export async function deletePlan(planId: string): Promise<void> {
  await deleteDoc(planDocRef(planId));
}

export async function togglePlanActive(plan: Plan): Promise<void> {
  await updateDoc(planDocRef(plan.id), { active: !plan.active });
}
