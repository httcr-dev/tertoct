"use client";

import { useMemo, useState } from "react";
import type { Plan, StudentSummary } from "@/lib/types";
import { MessageCircle, Save } from "lucide-react";

interface ExpirationsTabProps {
  students: StudentSummary[];
  plans: Plan[];
  updateUserPhone: (userId: string, phone: string | null) => Promise<void>;
}

type ProcessedStudent = StudentSummary & {
  dueDate: Date | null;
  diffDays: number;
  status: "due_tomorrow" | "expired" | "active" | "no_date";
  currentPhone: string;
};

export function ExpirationsTab({
  students,
  plans,
  updateUserPhone,
}: ExpirationsTabProps) {
  const [selectedPlanId, setSelectedPlanId] = useState("all");
  const [expirationFilter, setExpirationFilter] = useState("all");
  const [savingPhoneId, setSavingPhoneId] = useState<string | null>(null);

  // Local state to manage phone inputs before saving
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({});

  const handlePhoneChange = (id: string, val: string) => {
    const onlyNumbers = val.replace(/\D/g, "");
    setPhoneInputs((prev) => ({ ...prev, [id]: onlyNumbers }));
  };

  const handleSavePhone = async (id: string) => {
    if (savingPhoneId) return;
    setSavingPhoneId(id);
    try {
      const student = students.find((s) => s.id === id);
      const phoneValue = phoneInputs[id] !== undefined ? phoneInputs[id] : (student?.phone || "");
      const phone = phoneValue.trim() || null;
      await updateUserPhone(id, phone);
      // Optional: show a success toast here
    } catch (error) {
      console.error("Failed to save phone", error);
    } finally {
      setSavingPhoneId(null);
    }
  };

  // Helper to calculate effective due date
  const getEffectiveDueDate = (student: StudentSummary): Date | null => {
    const now = new Date();
    if (student.paymentValidUntil) {
      const d = student.paymentValidUntil.toDate();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    if (!student.paymentDueDay) return null;

    let targetMonth = now.getMonth();
    let targetYear = now.getFullYear();

    if (student.monthlyPaymentPaid) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const day = Math.min(student.paymentDueDay, lastDayOfMonth);
    return new Date(targetYear, targetMonth, day);
  };

  const processedStudents = useMemo(() => {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return students
      .filter((s) => s.active !== false && s.paymentDueDay) // Only active students with due days
      .map((s) => {
        const dueDate = getEffectiveDueDate(s);
        let diffDays = 0;
        let status: "due_tomorrow" | "expired" | "active" | "no_date" = "no_date";

        if (dueDate) {
          diffDays = Math.round(
            (dueDate.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays < 0) {
            status = "expired";
          } else if (diffDays === 1) {
            status = "due_tomorrow";
          } else {
            status = "active";
          }
        }

        // Initialize phone input if not yet in state
        const currentPhone = phoneInputs[s.id] !== undefined ? phoneInputs[s.id] : (s.phone || "");

        return {
          ...s,
          dueDate,
          diffDays,
          status,
          currentPhone,
        };
      })
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }, [students, phoneInputs]);

  const filteredStudents = useMemo(() => {
    let list = processedStudents;

    if (selectedPlanId !== "all") {
      list = list.filter((s) => s.planId === selectedPlanId);
    }

    if (expirationFilter !== "all") {
      list = list.filter((s) => s.status === expirationFilter);
    }

    return list;
  }, [processedStudents, selectedPlanId, expirationFilter]);

  const sendWhatsApp = (student: ProcessedStudent) => {
    const rawPhone = student.phone || student.currentPhone;
    if (!rawPhone) return;

    // Clean up phone to leave only numbers
    let phoneNum = rawPhone.replace(/\D/g, "");
    // If no country code, prepend 55 (Brazil)
    if (phoneNum.length <= 11) {
      phoneNum = `55${phoneNum}`;
    }

    const planName = plans.find((p) => p.id === student.planId)?.name || "seu plano";
    let message = `Olá ${student.name?.split(" ")[0] || "Aluno"}, lembrando que a mensalidade do ${planName} `;

    if (student.status === "due_tomorrow") {
      message += "vence amanhã!";
    } else if (student.status === "expired") {
      message += "está vencida. Por favor, regularize sua situação.";
    } else if (student.dueDate) {
      const dateStr = student.dueDate.toLocaleDateString("pt-BR");
      message += `vence no dia ${dateStr}.`;
    }

    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-zinc-100">
          Gerenciar Vencimentos
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={expirationFilter}
            onChange={(e) => setExpirationFilter(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">Status de Vencimento</option>
            <option value="due_tomorrow">Vence Amanhã</option>
            <option value="expired">Vencidos</option>
            <option value="active">Em dia</option>
          </select>
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">Todos os Planos</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-zinc-800/50 p-8 text-center text-zinc-500">
            Nenhum aluno encontrado para esse filtro.
          </div>
        ) : (
          filteredStudents.map((student) => {
            const plan = plans.find((p) => p.id === student.planId);
            const isDueTomorrow = student.status === "due_tomorrow";
            const isExpired = student.status === "expired";
            
            let statusClasses = "text-zinc-400";
            if (isExpired) statusClasses = "text-red-400 bg-red-400/10 px-2 py-0.5 rounded";
            else if (isDueTomorrow) statusClasses = "text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded font-medium";

            return (
              <div
                key={student.id}
                className={`relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border p-4 shadow-sm transition-colors ${
                  isDueTomorrow 
                    ? "border-amber-500/50 bg-amber-500/5" 
                    : "border-zinc-800/40 bg-zinc-900/40"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-zinc-100">
                    {student.name || "Sem Nome"}
                  </h3>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      {plan?.name || "Sem plano"}
                    </span>
                    <span className={statusClasses}>
                      {student.dueDate
                        ? student.dueDate.toLocaleDateString("pt-BR")
                        : "Sem data"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder="Telefone (ex: 11999999999)"
                      value={student.currentPhone}
                      onChange={(e) => handlePhoneChange(student.id, e.target.value)}
                      className="w-full flex-1 rounded-md border border-zinc-700 bg-black/50 px-3 py-1.5 text-sm text-zinc-200 focus:border-amber-500 outline-none placeholder:text-zinc-600"
                    />
                    <button
                      onClick={() => handleSavePhone(student.id)}
                      disabled={savingPhoneId === student.id || student.currentPhone === (student.phone || "")}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50 transition-colors"
                      title="Salvar Telefone"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => sendWhatsApp(student)}
                    disabled={!student.phone && !student.currentPhone}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366]/10 text-[#25D366] py-2 text-sm font-medium hover:bg-[#25D366]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Cobrar no WhatsApp
                  </button>
                </div>
                
                {isDueTomorrow && (
                  <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden">
                    <div className="absolute top-4 -right-5 w-20 rotate-45 bg-amber-500/90 py-0.5 text-center text-[8px] font-bold text-black uppercase tracking-wider backdrop-blur-sm">
                      Amanhã
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
