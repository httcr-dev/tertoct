import { getCachedLandingPlansAndCoaches } from "@/lib/server/cachedLandingData";
import { HomeClient } from "./HomeClient";

export default async function Page() {
  let initialPlans: Awaited<
    ReturnType<typeof getCachedLandingPlansAndCoaches>
  >["plans"] = [];
  let initialCoaches: Awaited<
    ReturnType<typeof getCachedLandingPlansAndCoaches>
  >["coaches"] = [];

  try {
    const data = await getCachedLandingPlansAndCoaches();
    initialPlans = data.plans;
    initialCoaches = data.coaches;
  } catch (err) {
    console.error("[page] Failed to load cached landing data", err);
  }

  return (
    <HomeClient initialPlans={initialPlans} initialCoaches={initialCoaches} />
  );
}
