import { getLandingPlansAndCoaches } from "@/lib/server/cachedLandingData";
import { HomeClient } from "./HomeClient";

export default async function Page() {
  let initialPlans: Awaited<ReturnType<typeof getLandingPlansAndCoaches>>["plans"] =
    [];
  let initialCoaches: Awaited<
    ReturnType<typeof getLandingPlansAndCoaches>
  >["coaches"] = [];

  try {
    const data = await getLandingPlansAndCoaches();
    initialPlans = data.plans;
    initialCoaches = data.coaches;
  } catch (err) {
    console.error("[page] Failed to load cached landing data", err);
  }

  return (
    <HomeClient initialPlans={initialPlans} initialCoaches={initialCoaches} />
  );
}
