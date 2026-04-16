"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Plan, CheckIn } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import Image from "next/image";
import { Home, List, CheckCircle, LogOut, MessageSquare, Trash2 } from "lucide-react";
import { BarChart } from "@/components/ui/BarChart";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageLoader } from "@/components/ui/PageLoader";
import { isPaymentOverdue } from "@/lib/utils/payment";
import { startOfWeek } from "@/lib/utils/date";
import { createCheckIn, listenCheckinsByUser } from "@/services/checkinService";
import { fetchActivePlans } from "@/services/landingService";
import { getPlanById } from "@/services/plansQueryService";
import {
  createFeedback,
  deleteFeedback,
  listenMyFeedbacks,
  type Feedback,
} from "@/services/feedbackService";

type StudentTab = "overview" | "checkin" | "plans" | "feedback";
type ActionStatus = "idle" | "loading" | "success" | "error";

export function StudentDashboard() {
  const { profile, signOutUser } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const validStudentTabs: StudentTab[] = ["overview", "checkin", "plans", "feedback"];
  const initialStudentTab = searchParams.get("tab") as StudentTab | null;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInStatus, setCheckInStatus] = useState<ActionStatus>("idle");
  const [selectedTab, setSelectedTab] = useState<StudentTab>(
    initialStudentTab && validStudentTabs.includes(initialStudentTab) ? initialStudentTab : "overview",
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<ActionStatus>("idle");
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);

  const handleTabChange = useCallback((tab: StudentTab) => {
    setSelectedTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);


  // ── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let unsubCheckins: (() => void) | undefined;
    let unsubFeedbacks: (() => void) | undefined;

    const load = async () => {
      if (!profile) return;

      const tasks: Promise<void>[] = [];

      // Load current student plan
      if (profile.planId) {
        tasks.push(
          (async () => {
            const current = await getPlanById(profile.planId as string);
            setPlan(current);
          })(),
        );
      }

      // Real-time check-ins listener
      unsubCheckins = listenCheckinsByUser(profile.id, setCheckIns);

      // My feedbacks listener
      unsubFeedbacks = listenMyFeedbacks(profile.id, setMyFeedbacks);

      // Fetch all active plans
      tasks.push(
        (async () => {
          const next = await fetchActivePlans();
          setPlans(next.sort((a, b) => a.name.localeCompare(b.name)));
        })(),
      );

      try {
        await Promise.all(tasks);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      unsubCheckins?.();
      unsubFeedbacks?.();
    };
  }, [profile]);

  // ── Derived state ────────────────────────────────────────────────────
  const currentWeekInfo = useMemo(() => {
    if (!plan || !profile) return null;
    const weekStartTime = startOfWeek(new Date()).getTime();
    const weekCheckIns = checkIns.filter(
      (c) => c.createdAt.getTime() >= weekStartTime,
    );

    return {
      count: weekCheckIns.length,
      allowed: plan.classesPerWeek,
      remaining: Math.max(plan.classesPerWeek - weekCheckIns.length, 0),
    };
  }, [checkIns, plan, profile]);

  const paymentOverdue = useMemo(() => isPaymentOverdue(profile), [profile]);

  const hasActivePlan = !!(plan && plan.active);

  const canCheckIn = !!(
    plan &&
    currentWeekInfo &&
    currentWeekInfo.remaining > 0 &&
    plan.active &&
    !paymentOverdue
  );

  // ── Check-in handler ─────────────────────────────────────────────────
  const handleCheckIn = useCallback(async () => {
    if (!profile || !plan || !canCheckIn || checkInStatus === "loading") return;

    setCheckInStatus("loading");
    try {
      await createCheckIn(profile.id, plan.id);
      setCheckInStatus("success");
      setTimeout(() => setCheckInStatus("idle"), 2600);
    } catch {
      setCheckInStatus("error");
      setTimeout(() => setCheckInStatus("idle"), 2600);
    }
  }, [profile, plan, canCheckIn, checkInStatus]);

  // ── Feedback handler ───────────────────────────────────────────────
  const handleSendFeedback = useCallback(async () => {
    if (!profile || feedbackStatus === "loading") return;
    const msg = feedbackText.trim().slice(0, 64);
    if (!msg) return;

    setFeedbackStatus("loading");
    try {
      await createFeedback({
        userId: profile.id,
        userName: profile.name ?? null,
        message: msg,
      });
      setFeedbackText("");
      setFeedbackStatus("success");
      setTimeout(() => setFeedbackStatus("idle"), 2600);
    } catch {
      setFeedbackStatus("error");
      setTimeout(() => setFeedbackStatus("idle"), 2600);
    }
  }, [profile, feedbackText, feedbackStatus]);

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return <PageLoader message="Carregando seus dados de treino..." fullScreen={false} />;
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-transparent text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-800/40 bg-black/40 backdrop-blur-2xl p-6 lg:flex flex-col hidden md:flex">
        <div className="mb-10 px-2 mt-2">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-academy.png"
              alt="TertoCT Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-semibold text-zinc-100 tracking-wide text-lg">
              TertoCT
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">
          {(
            [
              { tab: "overview", icon: Home, label: "Início" },
              { tab: "checkin", icon: CheckCircle, label: "Check-in" },
              { tab: "plans", icon: List, label: "Planos" },
              { tab: "feedback", icon: MessageSquare, label: "Feedback" },
            ] as const
          ).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                selectedTab === tab
                  ? "bg-zinc-800/60 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-zinc-800/60 bg-black/90 backdrop-blur-xl px-2 py-2">
        {(
          [
            { tab: "overview" as const, icon: <Home className="h-5 w-5" />, label: "Início" },
            { tab: "checkin" as const, icon: <CheckCircle className="h-5 w-5" />, label: "Check-in" },
            { tab: "plans" as const, icon: <List className="h-5 w-5" />, label: "Planos" },
            { tab: "feedback" as const, icon: <MessageSquare className="h-5 w-5" />, label: "Feedback" },
          ]
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${selectedTab === tab ? "text-amber-500" : "text-zinc-500"}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 px-4 md:px-8 py-6 pb-20 md:pb-6 overflow-y-auto">
        <div className="flex flex-col gap-8 pb-8 max-w-5xl mx-auto">
          <header className="flex items-center justify-between border-b border-zinc-800/40 pb-6 pt-2 backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-1">
                {selectedTab === "overview" && "Visão Geral"}
                {selectedTab === "checkin" && "Check-in semanal"}
                {selectedTab === "plans" && "Planos disponíveis"}
                {selectedTab === "feedback" && "Seu feedback"}
              </p>
              <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-3">
                {profile?.photoURL && (
                  <Image
                    src={profile.photoURL}
                    alt={profile.name || ""}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover border border-zinc-700/50 shadow-sm shadow-amber-500/20 block"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                )}
                Olá, {profile?.name?.split(" ")[0] ?? "aluno"}.
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={signOutUser}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </header>

          {selectedTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!hasActivePlan && (
                <div className="rounded-2xl border border-zinc-700/40 bg-zinc-900/40 p-4 flex items-center gap-4 backdrop-blur-sm">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800/60 text-zinc-300 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Perfil inativo (sem plano ativo)
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Você ainda não tem um plano ativo associado. Fale com seu professor para ativar seu plano e liberar o check-in.
                    </p>
                  </div>
                </div>
              )}
              {/* Payment Overdue Banner */}
              {paymentOverdue && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-4 backdrop-blur-sm">
                  <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-400">
                      Mensalidade Pendente
                    </p>
                    <p className="text-xs text-red-400/70 mt-0.5">
                      Seu check-in está bloqueado. Procure seu professor para
                      regularizar o pagamento.
                    </p>
                  </div>
                </div>
              )}
              <section className="grid gap-6 md:grid-cols-2">
                {/* Current Plan Card */}
                <div className="rounded-3xl border border-amber-500/20 bg-zinc-900/30 p-6 backdrop-blur-md gold-glow">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                      Seu Plano
                    </h3>
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                      <List className="h-5 w-5" />
                    </div>
                  </div>
                  {plan ? (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                        {plan.name}
                        {!plan.active && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            INATIVO
                          </span>
                        )}
                      </p>
                      <p className="text-zinc-400 text-sm">
                        {plan.classesPerWeek} aulas por semana
                      </p>
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic text-sm">
                      Nenhum plano ativo.
                    </p>
                  )}
                </div>

                {/* Weekly Status Card */}
                <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                      Status da Semana
                    </h3>
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  {currentWeekInfo ? (
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-3xl font-bold text-zinc-100">
                          {currentWeekInfo.count}/{currentWeekInfo.allowed}
                        </p>
                        <p className="text-zinc-400 text-sm">
                          Aulas realizadas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-emerald-400">
                          {currentWeekInfo.remaining}
                        </p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          Restantes
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 italic text-sm">
                      Sem dados semanais.
                    </p>
                  )}
                </div>
              </section>

              {/* Activity Chart */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Sua Atividade (14 dias)
                </h3>
                <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-inner shadow-amber-500/5">
                  <BarChart dataItems={checkIns} ds={14} />
                </div>
              </section>

              {/* Recent History */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Atividade Recente
                </h3>
                <div className="rounded-3xl border border-zinc-800/50 bg-zinc-900/20 divide-y divide-zinc-800/40 overflow-hidden">
                  {checkIns.slice(0, 5).map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200 capitalize">
                            {checkIn.createdAt.toLocaleDateString("pt-BR", {
                              weekday: "long",
                            })}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {checkIn.createdAt.toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-mono text-amber-500/80">
                        {checkIn.createdAt.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                  {checkIns.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <p className="text-zinc-500 text-sm">
                        Nenhuma atividade registrada.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {selectedTab === "checkin" && (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full max-w-lg space-y-8 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-zinc-100">
                    Pronto para o treino?
                  </h2>
                  <p className="text-zinc-400">
                    Confirme sua presença na aula de hoje abaixo.
                  </p>
                </div>

                <div className="p-8 rounded-[40px] bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {currentWeekInfo && (
                    <div className="relative z-10 space-y-6">
                      <div className="flex justify-center gap-4">
                        <div className="px-4 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            Disponíveis
                          </p>
                          <p className="text-2xl font-bold text-emerald-400">
                            {currentWeekInfo.remaining}
                          </p>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                            Total Semanal
                          </p>
                          <p className="text-2xl font-bold text-zinc-300">
                            {currentWeekInfo.allowed}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleCheckIn}
                        disabled={!canCheckIn || checkInStatus === "loading"}
                        className={`w-full py-6 rounded-[30px] text-lg font-bold transition-all transform active:scale-95 shadow-2xl ${
                          canCheckIn && checkInStatus !== "loading"
                            ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20 cursor-pointer"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {checkInStatus === "loading" ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </span>
                        ) : !plan ? (
                          "Aguardando Plano"
                        ) : !plan.active ? (
                          "Plano Inativo"
                        ) : paymentOverdue ? (
                          "Mensalidade Pendente"
                        ) : canCheckIn ? (
                          "REALIZAR CHECK-IN"
                        ) : (
                          "Limite atingido"
                        )}
                      </button>

                      <div className="flex justify-center">
                        <StatusBadge
                          status={checkInStatus}
                          successMessage="Check-in realizado!"
                          errorMessage="Falha no check-in, tente novamente."
                        />
                      </div>

                      {!canCheckIn && checkInStatus === "idle" && (
                        <p className="text-red-400/80 text-xs font-medium bg-red-500/5 py-2 rounded-full border border-red-500/10">
                          {paymentOverdue
                            ? "Mensalidade pendente. Procure seu professor para regularizar."
                            : !plan
                              ? "Seu perfil não possui um plano associado."
                              : !plan.active
                                ? "Este plano está desativado pela administração."
                                : currentWeekInfo &&
                                    currentWeekInfo.remaining <= 0
                                  ? "Você atingiu o limite de check-ins para esta semana."
                                  : "Não é possível fazer check-in no momento."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedTab === "plans" && (
            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-3xl p-6 border transition-all ${
                    p.id === plan?.id
                      ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5"
                      : "bg-zinc-900/40 border-zinc-800/60"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-100">
                        {p.name}
                      </h3>
                      <p className="text-zinc-400 text-sm mt-1">
                        {p.classesPerWeek} aulas semanais
                      </p>
                    </div>
                    {p.id === plan?.id && (
                      <span className="bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                        Atual
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-zinc-100">
                      R$ {p.price.toFixed(2)}
                    </span>
                    <span className="text-zinc-500 text-xs">/mês</span>
                  </div>
                  {p.description && (
                    <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedTab === "feedback" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!hasActivePlan ? (
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-6">
                  <p className="text-sm font-semibold text-zinc-200">
                    Feedback disponível apenas com plano ativo.
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Assim que seu plano estiver ativo, você poderá enviar mensagens curtas para aparecerem no mural público.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-zinc-100">
                      Enviar feedback (até 64 caracteres)
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value.slice(0, 64))}
                        maxLength={64}
                        placeholder="Ex: Aula incrível hoje!"
                        disabled={feedbackStatus === "loading"}
                        className="w-full rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500/40 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendFeedback}
                        disabled={feedbackStatus === "loading" || !feedbackText.trim()}
                        className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {feedbackStatus === "loading" ? (
                          <>
                            <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar"
                        )}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-[11px] text-zinc-500">
                        {feedbackText.trim().length}/64
                      </p>
                      <StatusBadge
                        status={feedbackStatus}
                        successMessage="Feedback enviado!"
                        errorMessage="Erro ao enviar. Tente novamente."
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800/60">
                      <p className="text-sm font-semibold text-zinc-100">
                        Seus feedbacks
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Você pode apagar apenas os seus.
                      </p>
                    </div>
                    <div className="divide-y divide-zinc-800/40">
                      {myFeedbacks.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                          <p className="text-sm text-zinc-500">
                            Nenhum feedback enviado ainda.
                          </p>
                        </div>
                      ) : (
                        myFeedbacks.map((f) => (
                          <div
                            key={f.id}
                            className="px-6 py-4 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-zinc-100 break-words">
                                {f.message}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                await deleteFeedback(f.id);
                              }}
                              className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:border-amber-500/20 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                              Apagar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
