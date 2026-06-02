"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoachDashboard } from "@/components/dashboard/CoachDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { PageLoader } from "@/components/ui/PageLoader";

export default function DashboardPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading, authPending } = useAuth();
  const sessionLoading = loading || authPending;

  const role = useMemo(() => profile?.role ?? null, [profile]);

  useEffect(() => {
    if (!sessionLoading && !firebaseUser) {
      router.replace("/");
    }
  }, [sessionLoading, firebaseUser, router]);

  if (sessionLoading) {
    return <PageLoader message="Carregando seu painel..." fullScreen={false} />;
  }

  if (firebaseUser && !profile) {
    return (
      <PageLoader
        message="Sincronizando seu perfil..."
        fullScreen={false}
      />
    );
  }

  if (!profile) {
    return (
      <PageLoader
        message="Sincronizando seu perfil..."
        fullScreen={false}
      />
    );
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-shell-atmosphere" aria-hidden />
      {role === "coach" || role === "admin" ? (
        <CoachDashboard />
      ) : (
        <StudentDashboard />
      )}
    </div>
  );
}
