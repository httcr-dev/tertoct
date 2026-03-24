"use client";

import { BarChart } from "@/components/ui/BarChart";
import { StudentSummary, Plan, CheckIn } from "@/lib/types";

interface CheckinsTabProps {
  recentCheckins: CheckIn[];
  selectedStudentIdForCheckins: string;
  setSelectedStudentIdForCheckins: (id: string) => void;
  studentsWithCounts: StudentSummary[];
  plans: Plan[];
}

export function CheckinsTab({
  recentCheckins,
  selectedStudentIdForCheckins,
  setSelectedStudentIdForCheckins,
  studentsWithCounts,
  plans,
}: CheckinsTabProps) {
  const filteredCheckins = recentCheckins.filter(
    (c) =>
      selectedStudentIdForCheckins === "all" ||
      c.userId === selectedStudentIdForCheckins,
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">
            Histórico de Check-Ins
          </h2>
          <p className="text-sm text-zinc-400">
            Acompanhe os check-ins recentes filtrados por aluno.
          </p>
        </div>
        <select
          className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none backdrop-blur-md"
          value={selectedStudentIdForCheckins}
          onChange={(e) => setSelectedStudentIdForCheckins(e.target.value)}
        >
          <option value="all">Todos os Alunos</option>
          {studentsWithCounts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.email}
            </option>
          ))}
        </select>
      </div>

      {/* User-specific activity chart */}
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          {selectedStudentIdForCheckins === "all"
            ? "Atividade Geral (14 dias)"
            : `Atividade de ${
                studentsWithCounts.find(
                  (s) => s.id === selectedStudentIdForCheckins,
                )?.name || "Aluno"
              } (14 dias)`}
        </h3>
        <div className="mt-4">
          <BarChart dataItems={filteredCheckins} ds={14} />
        </div>
      </div>

      <div className="grid gap-3">
        {filteredCheckins.length > 0 ? (
          filteredCheckins.map((c) => {
            const student = studentsWithCounts.find((s) => s.id === c.userId);
            const plan = plans.find((p) => p.id === c.planId);
            const date =
              c.createdAt && c.createdAt.toDate
                ? c.createdAt.toDate()
                : c.createdAt
                  ? new Date((c.createdAt.seconds || c.createdAt) * 1000)
                  : null;

            return (
              <div
                key={c.id}
                className="group flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 transition-all hover:border-amber-500/20 hover:bg-zinc-800/20"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/20 bg-amber-500/10 font-medium text-amber-500 shadow-sm shadow-amber-500/20 transition-transform group-hover:scale-110">
                    {student?.photoURL ? (
                      <img
                        src={student.photoURL}
                        alt={student.name || ""}
                        className="block h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : student?.name ? (
                      student.name.charAt(0).toUpperCase()
                    ) : (
                      "U"
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100 transition-colors group-hover:text-amber-400">
                      {student?.name ?? "Aluno sem nome"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {plan?.name ?? "Sem plano"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mb-0.5 text-sm font-medium text-emerald-400">
                    Realizado
                  </p>
                  <p className="text-xs text-zinc-500">
                    {date
                      ? date.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800/50 py-12 text-center">
            <p className="text-sm text-zinc-500">
              Nenhum check-in encontrado para este filtro.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
