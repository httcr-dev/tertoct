"use client";

import { CheckCircle } from "lucide-react";
import { Plan } from "@/lib/types";
import React from "react";

interface PlansTabProps {
  plans: Plan[];
  handleEditPlanClick: (plan: Plan) => void;
  handleCreatePlan: () => void;
  handleTogglePlanActive: (plan: Plan) => void;
  editingPlan: Plan | null;
  editingFields: Partial<Plan>;
  setEditingFields: React.Dispatch<React.SetStateAction<Partial<Plan>>>;
  handleSaveEditPlan: () => Promise<void>;
  handleDeletePlan: (plan: Plan) => Promise<void>;
  setEditingPlan: (plan: Plan | null) => void;
  editPlanRef: React.RefObject<HTMLDivElement | null>;
}

export function PlansTab({
  plans,
  handleEditPlanClick,
  handleCreatePlan,
  handleTogglePlanActive,
  editingPlan,
  editingFields,
  setEditingFields,
  handleSaveEditPlan,
  handleDeletePlan,
  setEditingPlan,
  editPlanRef,
}: PlansTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">
            Planos e valores
          </h2>
          <p className="text-sm text-zinc-400">
            Gerencie os planos disponíveis e o limite de check-ins semanais.
          </p>
        </div>
        <button
          onClick={handleCreatePlan}
          className="cursor-pointer rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400"
        >
          Criar Novo Plano
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.length > 0 ? (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-amber-500/30"
            >
              {!plan.active && (
                <div className="absolute right-4 top-4 rounded-full border border-zinc-700/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Inativo
                </div>
              )}
              <h3 className="text-xl font-semibold text-zinc-100">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-50">
                  R$ {plan.price.toFixed(0)}
                </span>
                <span className="text-sm text-zinc-400">/ mês</span>
              </div>
              <div className="mt-6 flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-sm text-zinc-300">
                    {plan.classesPerWeek}x check-ins por semana
                  </span>
                </div>
                {plan.description && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-sm text-zinc-300">
                      {plan.description}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-3 border-t border-zinc-800/60 pt-6">
                <button
                  onClick={() => handleEditPlanClick(plan)}
                  className="flex-1 cursor-pointer rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleTogglePlanActive(plan)}
                  className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    plan.active
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  }`}
                >
                  {plan.active ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-dashed border-zinc-800/50 py-12 text-center">
            <p className="text-zinc-500">Nenhum plano criado ainda.</p>
          </div>
        )}
      </div>

      {/* Edit Plan Panel */}
      {editingPlan && (
        <div
          ref={editPlanRef}
          className="mt-8 max-w-3xl rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-6"
        >
          <h3 className="mb-5 text-lg font-semibold text-amber-500">
            Editando plano:{" "}
            <span className="text-zinc-100">{editingPlan.name}</span>
          </h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Nome do plano
              </label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.name ?? ""}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    name: e.target.value,
                  }))
                }
                placeholder="Nome do plano"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Preço Mensal (R$)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.price ?? 0}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    price: Number(e.target.value),
                  }))
                }
                placeholder="Preço"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Check-ins por semana
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.classesPerWeek ?? 0}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    classesPerWeek: Number(e.target.value),
                  }))
                }
                placeholder="Aulas por semana"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Descrição/Benefícios
              </label>
              <input
                className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-2.5 text-sm text-zinc-200 transition-colors focus:border-amber-500/50 focus:outline-none"
                value={editingFields.description ?? ""}
                onChange={(e) =>
                  setEditingFields((s) => ({
                    ...s,
                    description: e.target.value,
                  }))
                }
                placeholder="Descrição"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col justify-end gap-3 border-t border-zinc-800/60 pt-6 sm:flex-row">
            {!editingPlan?.id.startsWith("new_plan_") && (
              <button
                onClick={() => handleDeletePlan(editingPlan!)}
                className="order-3 w-full cursor-pointer rounded-full border border-red-500/30 bg-red-500/10 px-6 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 sm:order-1 sm:mr-auto sm:w-auto"
              >
                Excluir
              </button>
            )}
            <button
              onClick={() => {
                setEditingPlan(null);
                setEditingFields({});
              }}
              className="order-2 w-full cursor-pointer rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 sm:order-2 sm:w-auto"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEditPlan}
              className="order-1 w-full cursor-pointer rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-colors hover:bg-amber-400 sm:order-3 sm:w-auto"
            >
              {editingPlan?.id.startsWith("new_plan_")
                ? "Salvar Novo Plano"
                : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
