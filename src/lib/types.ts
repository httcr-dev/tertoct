import type { Timestamp } from "firebase/firestore";

export type DateLikeTimestamp = Timestamp | { toDate: () => Date } | Date | string;

export type AppUserRole = "admin" | "coach" | "student";

export interface AppUserProfile {
  id: string;
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  role: AppUserRole;
  planId?: string | null;
  active: boolean;
  createdAt?: Date | null;
  paymentDueDay?: number | null;
  monthlyPaymentPaid?: boolean;
  phone?: string | null;
  paymentValidUntil?: DateLikeTimestamp | null;
}

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
  phone?: string | null;
  paymentValidUntil?: DateLikeTimestamp | null;
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
  phone?: string | null;
  paymentValidUntil?: Timestamp | null;
}
