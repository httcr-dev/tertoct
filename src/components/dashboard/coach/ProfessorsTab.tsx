"use client";

import { Users } from "lucide-react";
import { StudentSummary } from "@/lib/types";

interface ProfessorsTabProps {
  professors: StudentSummary[];
  toggleStudentActive: (professor: StudentSummary) => Promise<void>;
}

export function ProfessorsTab({
  professors,
  toggleStudentActive,
}: ProfessorsTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Professores</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie o acesso e o status dos professores da academia.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800/60 bg-zinc-800/20">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Professor
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  E-mail
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {professors.map((professor) => (
                <tr
                  key={professor.id}
                  className="transition-colors hover:bg-zinc-800/20"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-800 text-zinc-400 shadow-sm shadow-amber-500/10">
                        {professor.photoURL ? (
                          <img
                            src={professor.photoURL}
                            alt={professor.name || ""}
                            className="block h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>
                      <span className="font-medium text-zinc-200">
                        {professor.name || "Sem nome"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {professor.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        professor.active !== false
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {professor.active !== false ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleStudentActive(professor)}
                      className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                        professor.active !== false
                          ? "border border-red-500/30 text-red-400 hover:bg-red-500/10"
                          : "border border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      }`}
                    >
                      {professor.active !== false ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
