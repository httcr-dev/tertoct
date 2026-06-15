import type { Plan } from "@/lib/types";
import { parseApiErrorMessage } from "@/lib/utils/parseApiError";

export class PlanInUseError extends Error {
  constructor() {
    super("Não é possível excluir este plano: há alunos vinculados.");
    this.name = "PlanInUseError";
  }
}

export async function createPlan(
  fields: Omit<Plan, "id">,
): Promise<void> {
  const response = await fetch("/api/private/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: fields.name || "Novo Plano",
      price: fields.price,
      classesPerWeek: fields.classesPerWeek,
      description: fields.description ?? "",
      active: fields.active ?? true,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao criar plano"));
  }
}

export async function updatePlan(
  planId: string,
  fields: Partial<Omit<Plan, "id">>,
): Promise<void> {
  const response = await fetch(`/api/private/plans/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao atualizar plano"));
  }
}

export async function deletePlan(planId: string): Promise<void> {
  const response = await fetch(`/api/private/plans/${planId}`, {
    method: "DELETE",
  });
  if (response.status === 409) {
    throw new PlanInUseError();
  }
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao excluir plano"));
  }
}

export async function togglePlanActive(plan: Plan): Promise<void> {
  const response = await fetch(`/api/private/plans/${plan.id}/toggle`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao alternar plano"));
  }
}
