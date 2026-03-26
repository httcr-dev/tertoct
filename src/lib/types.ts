import type { Timestamp } from "firebase/firestore";
import type { AppUserRole } from "./firebase";

export interface Plan {
  id: string;
  name: string;
  price: number;
  classesPerWeek: number;
  description?: string;
  active: boolean;
}

export interface UserDocument {
  name: string | null;
  email: string | null;
  role: AppUserRole;
  planId?: string | null;
  active: boolean;
  createdAt: Timestamp;
  paymentDueDay?: number | null;
  monthlyPaymentPaid?: boolean;
  paymentValidUntil?: Timestamp | null;
}

export interface CheckIn {
  id: string;
  userId: string;
  planId: string;
  createdAt: Date;
}

export interface StudentSummary {
  id: string;
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  planId?: string | null;
  weeklyCheckIns: number;
  active?: boolean;
  paymentDueDay?: number | null;
  monthlyPaymentPaid?: boolean;
  paymentValidUntil?: Timestamp | null;
}
