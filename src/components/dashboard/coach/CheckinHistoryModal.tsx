"use client";

import { StudentSummary, Plan } from "@/lib/types";

interface CheckinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentSummary | null;
  history: any[];
  plans: Plan[];
}

export function CheckinHistoryModal({
  isOpen,
  onClose,
  student,
  history,
  plans,
}: CheckinHistoryModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-500/20 bg-amber-500/10 font-medium text-amber-500 shadow-sm shadow-amber-500/20">
              {student.photoURL ? (
                <img
                  src={student.photoURL}
                  alt={student.name || ""}
                  className="block h-full w-full object-cover"
                  referrerPolicy="no-referrer"
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
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
          >
            <span className="sr-only">Fechar</span>✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-6">
          <div className="space-y-3">
            {history.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhum check-in registrado.
                </p>
              </div>
            )}
            {history.map((c) => {
              const date =
                c.createdAt && c.createdAt.toDate
                  ? c.createdAt.toDate()
                  : c.createdAt
                    ? new Date((c.createdAt.seconds || c.createdAt) * 1000)
                    : null;
              const planName = c.planId
                ? (plans.find((p) => p.id === c.planId)?.name ?? "Plano")
                : "Sem plano";

              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {planName}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {c.notes || "Check-in realizado"}
                    </p>
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
