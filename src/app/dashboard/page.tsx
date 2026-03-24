"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CoachDashboard } from "@/components/dashboard/CoachDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  const role = useMemo(() => profile?.role ?? null, [profile]);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/");
    }
  }, [loading, profile, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-100">
        <p className="text-sm text-zinc-400">Carregando seu painel...</p>
      </div>
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
