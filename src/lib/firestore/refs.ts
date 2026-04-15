import { collection, doc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";

export const collections = {
  users: "users",
  publicProfiles: "publicProfiles",
  plans: "plans",
  checkins: "checkins",
  checkinCounters: "checkinCounters",
} as const;

export function usersCol() {
  return collection(getFirestoreDb(), collections.users);
}

export function userDoc(uid: string) {
  return doc(getFirestoreDb(), collections.users, uid);
}

export function publicProfilesCol() {
  return collection(getFirestoreDb(), collections.publicProfiles);
}

export function publicProfileDoc(uid: string) {
  return doc(getFirestoreDb(), collections.publicProfiles, uid);
}

export function plansCol() {
  return collection(getFirestoreDb(), collections.plans);
}

export function planDoc(planId: string) {
  return doc(getFirestoreDb(), collections.plans, planId);
}

export function checkinsCol() {
  return collection(getFirestoreDb(), collections.checkins);
}

export function checkinDoc(checkinId: string) {
  return doc(getFirestoreDb(), collections.checkins, checkinId);
}

export function checkinCounterDoc(counterId: string) {
  return doc(getFirestoreDb(), collections.checkinCounters, counterId);
}

