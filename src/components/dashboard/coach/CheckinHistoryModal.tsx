"use client";

import Image from "next/image";
import { CalendarDays, CheckCircle2, Clock, X } from "lucide-react";
import { StudentSummary, Plan, CheckIn, GymClass } from "@/lib/types";
import { toDate } from "@/lib/utils/date";

interface CheckinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentSummary | null;
  history: CheckIn[];
  /** True while fetching history from the server */
  historyLoading?: boolean;
  plans: Plan[];
  classes: GymClass[];
}

export function CheckinHistoryModal({
  isOpen,
  onClose,
  student,
  history,
  historyLoading = false,
  plans,
  classes,
}: CheckinHistoryModalProps) {
  if (!isOpen || !student) return null;

  const classesById = new Map(
    classes.map((gymClass) => [gymClass.id, gymClass]),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="animate-modal-in w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/20 bg-amber-500/10 font-medium text-amber-500 shadow-sm shadow-amber-500/20">
              {student.photoURL ? (
                <Image
                  src={student.photoURL}
                  alt={student.name || ""}
                  width={56}
                  height={56}
                  className="block h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : student.name ? (
                student.name.charAt(0).toUpperCase()
              ) : (
                "U"
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                {student.name}
              </h3>
              <p className="text-xs text-zinc-400">Histórico de Check-ins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-all hover:scale-105 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <span className="sr-only">Fechar</span>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-6">
          <div className="space-y-3">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
                <p className="text-sm text-zinc-400">Carregando histórico...</p>
              </div>
            ) : (
              <>
                {history.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-zinc-500">
                      Nenhum check-in registrado.
                    </p>
                  </div>
                )}
                {history.map((c) => {
              const date = toDate(c.createdAt);
              const gymClass = c.classId ? classesById.get(c.classId) : null;
              const className = c.className ?? gymClass?.name ?? "Sem turma";
              const classStartTime =
                c.classStartTime ?? gymClass?.startTime ?? null;
              const rawClassDate = c.classDateKey
                ? new Date(`${c.classDateKey}T00:00:00`)
                : date;
              const classDate =
                rawClassDate && !Number.isNaN(rawClassDate.getTime())
                  ? rawClassDate
                  : null;
              const planName = c.planId
                ? (plans.find((p) => p.id === c.planId)?.name ?? "Plano")
                : "Sem plano";

              return (
                <div
                  key={c.id}
                  className="group flex flex-col gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4 transition-all hover:border-amber-500/20 hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100 transition-colors group-hover:text-amber-300">
                      {className}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-[11px] font-medium text-zinc-300">
                        <CalendarDays className="h-3 w-3 text-amber-400" />
                        {classDate
                          ? classDate.toLocaleDateString("pt-BR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })
                          : "Dia não informado"}
                      </span>
                      {classStartTime && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-[11px] font-medium text-zinc-300">
                          <Clock className="h-3 w-3 text-blue-400" />
                          {classStartTime}
                        </span>
                      )}
                      <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                        {planName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
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
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
