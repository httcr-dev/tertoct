"use client";

import { Users, List, CheckCircle } from "lucide-react";
import { BarChart } from "@/components/ui/BarChart";
import { StudentSummary, Plan, CheckIn } from "@/lib/types";
import { toDate } from "@/lib/utils/date";

interface OverviewTabProps {
  students: StudentSummary[];
  plans: Plan[];
  recentCheckins: CheckIn[];
}

export function OverviewTab({
  students,
  plans,
  recentCheckins,
}: OverviewTabProps) {
  const now = new Date();
  const activePlansCount = plans.filter((p) => p.active).length;
  const recentCheckinsCount = recentCheckins.filter((c) => {
    const d = toDate(c.createdAt) ?? c.createdAt;
    if (!d) return false;
    const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 7;
  }).length;

  return (
    <section className="grid gap-5 md:grid-cols-3">
      <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total de Alunos</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">{students.length}</p>
      </div>
      <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
            <List className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Planos Ativos</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">
          {activePlansCount}
        </p>
      </div>
      <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
            <CheckCircle className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Check-ins (7 dias)</p>
        </div>
        <p className="text-3xl font-semibold text-zinc-100">
          {recentCheckinsCount}
        </p>
      </div>

      <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 md:col-span-3">
        <h3 className="whitespace-nowrap text-sm font-medium text-zinc-200">
          Atividade de Check-ins (14 dias)
        </h3>
        <div className="mt-6 min-w-[500px]">
          <BarChart dataItems={recentCheckins} ds={14} />
        </div>
      </div>
    </section>
  );
}
