import { unstable_cache } from "next/cache";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { getAdminFirestore } from "@/lib/auth/admin";
import { mapPlan } from "@/lib/firestore/mappers";
import type { Plan } from "@/lib/types";
import type { CoachCardData } from "@/services/landingService";

async function loadPlansAndCoaches(): Promise<{
  plans: Plan[];
  coaches: CoachCardData[];
}> {
  const db = getAdminFirestore();
  const [planSnap, coachSnap] = await Promise.all([
    db.collection("plans").where("active", "==", true).get(),
    db.collection("publicProfiles").where("role", "in", ["coach", "admin"]).get(),
  ]);

  const plans = planSnap.docs
    .map((d) => mapPlan(d as unknown as QueryDocumentSnapshot<DocumentData>))
    .sort((a, b) => a.classesPerWeek - b.classesPerWeek);

  const coaches: CoachCardData[] = [];
  coachSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active !== false) {
      coaches.push({
        id: docSnap.id,
        name: (data.name as string | null | undefined) ?? null,
        bio: (data.bio as string | null | undefined) ?? undefined,
        photoURL: (data.photoURL as string | null | undefined) ?? undefined,
      });
    }
  });

  return { plans, coaches };
}

export const getCachedLandingPlansAndCoaches = unstable_cache(
  loadPlansAndCoaches,
  ["landing-plans-coaches-v1"],
  { revalidate: 300 },
);
