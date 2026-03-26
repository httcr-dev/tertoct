import {
  doc,
  updateDoc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { StudentSummary } from "@/lib/types";

const USERS_COLLECTION = "users";

function userDocRef(userId: string) {
  return doc(getFirestoreDb(), USERS_COLLECTION, userId);
}

export async function assignPlan(
  studentId: string,
  planId: string | null,
): Promise<void> {
  await updateDoc(userDocRef(studentId), {
    planId: planId || deleteField(),
  });
}

export async function setPaymentDay(
  studentId: string,
  day: number | null,
): Promise<void> {
  if (day === null) {
    await updateDoc(userDocRef(studentId), {
      paymentDueDay: deleteField(),
      monthlyPaymentPaid: deleteField(),
    });
  } else {
    await updateDoc(userDocRef(studentId), { paymentDueDay: day });
  }
}

export async function togglePayment(student: StudentSummary): Promise<void> {
  const ref = userDocRef(student.id);
  const now = new Date();

  let isPaid = false;
  if (student.paymentValidUntil) {
    isPaid = now.getTime() <= student.paymentValidUntil.toDate().getTime();
  } else {
    isPaid = student.monthlyPaymentPaid || false;
  }

  if (isPaid) {
    await updateDoc(ref, {
      monthlyPaymentPaid: false,
      paymentValidUntil: deleteField(),
    });
  } else {
    let targetMonth = now.getMonth() + 1;
    let targetYear = now.getFullYear();
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const dueDay = student.paymentDueDay || 10;
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(dueDay, lastDay);
    const validUntil = new Date(targetYear, targetMonth, day, 23, 59, 59, 999);

    await updateDoc(ref, {
      monthlyPaymentPaid: true,
      paymentValidUntil: Timestamp.fromDate(validUntil),
    });
  }
}

export async function toggleUserActive(
  userId: string,
  currentlyActive: boolean,
): Promise<void> {
  await updateDoc(userDocRef(userId), { active: !currentlyActive });
}
