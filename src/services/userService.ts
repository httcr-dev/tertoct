import type { StudentSummary } from "@/lib/types";
import { parseApiErrorMessage } from "@/lib/utils/parseApiError";

export async function assignPlan(
  studentId: string,
  planId: string | null,
): Promise<void> {
  const response = await fetch(`/api/private/users/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "assign-plan", planId }),
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao atribuir plano"));
  }
}

export async function setPaymentDay(
  studentId: string,
  day: number | null,
): Promise<void> {
  const response = await fetch(`/api/private/users/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "set-payment-day", day }),
  });
  if (!response.ok) {
    throw new Error(
      await parseApiErrorMessage(response, "Falha ao atualizar dia de pagamento"),
    );
  }
}

export async function togglePayment(student: StudentSummary): Promise<void> {
  const response = await fetch(`/api/private/users/${student.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle-payment" }),
  });
  if (!response.ok) {
    throw new Error(
      await parseApiErrorMessage(response, "Falha ao alternar pagamento"),
    );
  }
}

export async function toggleUserActive(
  userId: string,
): Promise<void> {
  const response = await fetch(`/api/private/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle-active" }),
  });
  if (!response.ok) {
    throw new Error(
      await parseApiErrorMessage(response, "Falha ao alternar status do aluno"),
    );
  }
}

export async function updateUserPhone(
  userId: string,
  phone: string | null,
): Promise<void> {
  const response = await fetch(`/api/private/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update-phone", phone }),
  });
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response, "Falha ao atualizar telefone"));
  }
}
