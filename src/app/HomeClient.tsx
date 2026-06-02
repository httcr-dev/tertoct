"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import type { Plan } from "@/lib/types";
import { PlansSection } from "@/components/landing/PlansSection";
import { CoachesSection } from "@/components/landing/CoachesSection";
import { FeedbackWall } from "@/components/landing/FeedbackWall";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingContact } from "@/components/landing/LandingContact";
import { LandingDivider } from "@/components/landing/LandingDivider";
import type { CoachCardData } from "@/services/landingService";

export function HomeClient({
  initialPlans,
  initialCoaches,
}: {
  initialPlans: Plan[];
  initialCoaches: CoachCardData[];
}) {
  const router = useRouter();
  const { firebaseUser, authError, signInWithGoogle, loading, authPending, authReady } =
    useAuth();

  const sessionLoading = !authReady || loading || authPending;

  useEffect(() => {
    if (authReady && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [authReady, firebaseUser, router]);

  if (sessionLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-black font-sans text-zinc-50">
        <PageLoader message="Carregando..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black font-sans text-zinc-50">
      {firebaseUser && <PageLoader message="Redirecionando..." />}

      {!firebaseUser && (
        <>
          <LandingBackground />

          <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-6 pt-3 sm:px-4 sm:pb-8 sm:pt-4 lg:px-8">
            <LandingHeader onSignIn={signInWithGoogle} />

            <LandingHero onSignIn={signInWithGoogle} authError={authError} />

            <LandingDivider className="mb-2 opacity-80 sm:mb-4" />

            <PlansSection plans={initialPlans} loadingLandingData={false} />

            <LandingDivider className="my-6 opacity-60 sm:my-8" />

            <CoachesSection coaches={initialCoaches} />

            <LandingDivider className="my-6 opacity-60 sm:my-8" />

            <FeedbackWall />

            <LandingContact />
          </main>
        </>
      )}
    </div>
  );
}
