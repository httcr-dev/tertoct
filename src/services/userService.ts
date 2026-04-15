import type { StudentSummary } from "@/lib/types";

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
    throw new Error("Failed to assign plan");
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
    throw new Error("Failed to update payment day");
  }
}

export async function togglePayment(student: StudentSummary): Promise<void> {
  const response = await fetch(`/api/private/users/${student.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle-payment" }),
  });
  if (!response.ok) {
    throw new Error("Failed to toggle payment");
  }
}

export async function toggleUserActive(
  userId: string,
  currentlyActive: boolean,
): Promise<void> {
  const response = await fetch(`/api/private/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "toggle-active", currentlyActive }),
  });
  if (!response.ok) {
    throw new Error("Failed to toggle user active");
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
    throw new Error("Failed to update phone");
  }
}
