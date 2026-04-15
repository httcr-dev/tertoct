"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoachDashboard } from "@/components/dashboard/CoachDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { PageLoader } from "@/components/ui/PageLoader";

export default function DashboardPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading } = useAuth();

  const role = useMemo(() => profile?.role ?? null, [profile]);

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/");
    }
  }, [loading, firebaseUser, router]);

  if (loading) {
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
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      {role === "coach" || role === "admin" ? (
        <CoachDashboard />
      ) : (
        <StudentDashboard />
      )}
    </div>
  );
}
