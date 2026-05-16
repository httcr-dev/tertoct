"use client";

import React from "react";
import { CheckCircle } from "lucide-react";
import type { GymClass } from "@/lib/types";

function maskTime(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

interface ClassesTabProps {
  classes: GymClass[];
  handleEditClassClick: (gymClass: GymClass) => void;
  handleCreateClass: () => void;
  handleToggleClassActive: (gymClass: GymClass) => Promise<void>;
  editingClass: GymClass | null;
  editingFields: Partial<GymClass>;
  setEditingFields: React.Dispatch<React.SetStateAction<Partial<GymClass>>>;
  handleSaveEditClass: () => Promise<void>;
  handleDeleteClass: (gymClass: GymClass) => Promise<void>;
  setEditingClass: (gymClass: GymClass | null) => void;
  editClassRef: React.RefObject<HTMLDivElement | null>;
}

export function ClassesTab({
  classes,
  handleEditClassClick,
  handleCreateClass,
  handleToggleClassActive,
  editingClass,
  editingFields,
  setEditingFields,
  handleSaveEditClass,
  handleDeleteClass,
  setEditingClass,
  editClassRef,
}: ClassesTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50 sm:text-xl">
            Turmas
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Gerencie horários, limite de check-in e capacidade por turma.
          </p>
        </div>
        <button
          onClick={handleCreateClass}
          className="w-full cursor-pointer rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400 sm:w-auto"
        >
          Criar Nova Turma
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.length > 0 ? (
          classes.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors hover:border-amber-500/30 sm:p-6"
            >
              {!c.active && (
                <div className="absolute right-4 top-4 rounded-full border border-zinc-700/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Inativa
                </div>
              )}
              <h3 className="pr-16 text-lg font-semibold text-zinc-100 sm:text-xl">
                {c.name}
              </h3>
              <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Início: {c.startTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Check-in até: {c.checkinDeadlineTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Capacidade: {c.capacity}</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-zinc-800/60 pt-6">
                <button
                  onClick={() => handleEditClassClick(c)}
                  className="cursor-pointer rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                >
                  Editar
                </button>
                <button
                  onClick={() => void handleToggleClassActive(c)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    c.active
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  }`}
                >
                  {c.active ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-dashed border-zinc-800/50 py-12 text-center">
            <p className="text-zinc-500">Nenhuma turma criada ainda.</p>
          </div>
        )}
      </div>

      {editingClass && (
        <div
          ref={editClassRef}
          className="mt-8 max-w-3xl rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-6"
        >
          <h3 className="mb-5 text-lg font-semibold text-amber-500">
            Editando turma:{" "}
            <span className="text-zinc-100">{editingClass.name}</span>
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nome
              </label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.name ?? ""}
                onChange={(e) =>
                  setEditingFields((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Ex: Turma 07:00"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Horário de início (HH:mm)
              </label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.startTime ?? ""}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    startTime: maskTime(e.target.value),
                  }))
                }
                placeholder="07:00"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Check-in até (HH:mm)
              </label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.checkinDeadlineTime ?? ""}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    checkinDeadlineTime: maskTime(e.target.value),
                  }))
                }
                placeholder="06:30"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Capacidade
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={
                  editingFields.capacity === undefined
                    ? ""
                    : String(editingFields.capacity)
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setEditingFields((s) => {
                      const next = { ...s };
                      delete next.capacity;
                      return next;
                    });
                    return;
                  }
                  const digits = raw.replace(/\D/g, "");
                  if (digits === "") {
                    setEditingFields((s) => {
                      const next = { ...s };
                      delete next.capacity;
                      return next;
                    });
                    return;
                  }
                  setEditingFields((s) => ({
                    ...s,
                    capacity: Number(digits),
                  }));
                }}
                placeholder="20"
              />
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-zinc-500">
                Fuso horário padrão: São Paulo (UTC-3).
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-end gap-3 border-t border-zinc-800/60 pt-6 sm:flex-row">
            {!editingClass?.id.startsWith("new_class_") && (
              <button
                onClick={() => handleDeleteClass(editingClass)}
                className="order-3 w-full cursor-pointer rounded-full border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 sm:order-1 sm:mr-auto sm:w-auto"
              >
                Desativar turma
              </button>
            )}
            <button
              onClick={() => {
                setEditingClass(null);
                setEditingFields({});
              }}
              className="order-2 w-full cursor-pointer rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 sm:order-2 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEditClass}
              className="order-1 w-full cursor-pointer rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400 sm:order-3 sm:w-auto"
            >
              {editingClass?.id.startsWith("new_class_")
                ? "Salvar Nova Turma"
                : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
