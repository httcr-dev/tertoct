"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Plan, CheckIn } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import Image from "next/image";
import { Home, List, CheckCircle, LogOut, MessageSquare, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageLoader } from "@/components/ui/PageLoader";
import { isPaymentOverdue } from "@/lib/utils/payment";
import { startOfWeek } from "@/lib/utils/date";
import {
  cancelCheckIn,
  createCheckIn,
  listenCheckinsByUser,
} from "@/services/checkinService";
import { fetchActivePlans } from "@/services/landingService";
import { getPlanById } from "@/services/plansQueryService";
import { listenActiveClasses, listenClassCountersForDate } from "@/services/classService";
import type { GymClass } from "@/lib/types";
import { getDateKeyForOffset, utcDateAtLocalTime } from "@/lib/utils/dateKey";
import { parseHHmm } from "@/lib/utils/time";
import {
  MUTATION_TOAST_MIN_MS,
  withMinDuration,
} from "@/lib/utils/withMinDuration";
import toast from "react-hot-toast";
import {
  createFeedback,
  deleteFeedback,
  listenMyFeedbacks,
  type Feedback,
} from "@/services/feedbackService";
import { CheckinTab } from "./student/CheckinTab";
import { OverviewTab } from "./student/OverviewTab";
import type { ActionStatus } from "./student/checkinTypes";
import {
  clampCheckinDateKey,
  getAllowedCheckinDateKeys,
  getDefaultCheckinDateKey,
  getTodayDateKey,
  isAllowedCheckinDateKey,
} from "@/lib/utils/checkinDate";

type StudentTab = "overview" | "checkin" | "plans" | "feedback";

export function StudentDashboard() {
  const { profile, signOutUser } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const validStudentTabs: StudentTab[] = ["overview", "checkin", "plans", "feedback"];
  const initialStudentTab = searchParams.get("tab") as StudentTab | null;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    getDefaultCheckinDateKey(),
  );
  const [classCounts, setClassCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [checkInStatus, setCheckInStatus] = useState<ActionStatus>("idle");
  const [selectedTab, setSelectedTab] = useState<StudentTab>(
    initialStudentTab && validStudentTabs.includes(initialStudentTab) ? initialStudentTab : "overview",
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<ActionStatus>("idle");
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [cancellingCheckInId, setCancellingCheckInId] = useState<string | null>(
    null,
  );
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);

  const handleTabChange = useCallback((tab: StudentTab) => {
    setSelectedTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);


  // ── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let unsubCheckins: (() => void) | undefined;
    let unsubFeedbacks: (() => void) | undefined;
    let unsubClasses: (() => void) | undefined;
    let unsubCounters: (() => void) | undefined;

    const load = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

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

      // Real-time classes listener
      unsubClasses = listenActiveClasses((next) => {
        setClasses(next);
        setSelectedClassId((prev) => prev || next[0]?.id || "");
      });

      // Load class counters for the initially selected date (today)
      const todayKey = getDateKeyForOffset(new Date(), -180);
      unsubCounters = listenClassCountersForDate(
        todayKey,
        (counts) => setClassCounts(counts),
        () => setClassCounts(new Map()),
      );

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
      } catch (error) {
        console.error("[StudentDashboard] Failed to load initial data", error);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      unsubCheckins?.();
      unsubFeedbacks?.();
      unsubClasses?.();
      unsubCounters?.();
    };
  }, [profile]);

  // ── Listen to selected date changes ─────────────────────────────────────
  useEffect(() => {
    const unsubCounters: (() => void) | undefined = listenClassCountersForDate(
      selectedDateKey,
      (counts) => setClassCounts(counts),
      () => setClassCounts(new Map()),
    );

    return () => {
      unsubCounters?.();
    };
  }, [selectedDateKey]);

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
    !paymentOverdue &&
    selectedClassId
  );

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const todayKey = useMemo(() => getTodayDateKey(), []);

  const allowedCheckinDateKeys = useMemo(() => getAllowedCheckinDateKeys(), []);

  const isSelectedDateAllowed = useMemo(
    () => isAllowedCheckinDateKey(selectedDateKey, todayKey),
    [selectedDateKey, todayKey],
  );

  const isSelectedDateToday = useMemo(
    () => selectedDateKey === todayKey,
    [selectedDateKey, todayKey],
  );

  const handleSelectedDateKeyChange = useCallback((dateKey: string) => {
    setSelectedDateKey(clampCheckinDateKey(dateKey));
  }, []);

  const selectedClassRemaining = useMemo(() => {
    if (!selectedClass) return null;
    const current = classCounts.get(selectedClass.id) ?? 0;
    return Math.max(selectedClass.capacity - current, 0);
  }, [classCounts, selectedClass]);

  const selectedClassWindowOpen = useMemo(() => {
    if (!selectedClass) return false;
    // If it's not today, we don't need to check the deadline
    if (!isSelectedDateToday) return true;
    const deadlineMinutes = parseHHmm(selectedClass.checkinDeadlineTime);
    if (deadlineMinutes == null) return false;
    const deadlineAt = utcDateAtLocalTime(selectedDateKey, deadlineMinutes, -180);
    return Date.now() <= deadlineAt.getTime();
  }, [selectedClass, selectedDateKey, isSelectedDateToday]);

  const alreadyCheckedInThisClassOnDate = useMemo(() => {
    if (!selectedClass) return false;
    return checkIns.some(
      (c) => c.classId === selectedClass.id && c.classDateKey === selectedDateKey,
    );
  }, [checkIns, selectedClass, selectedDateKey]);

  const canCheckInForClass = !!(
    canCheckIn &&
    isSelectedDateAllowed &&
    selectedClass &&
    selectedClassRemaining != null &&
    selectedClassRemaining > 0 &&
    selectedClassWindowOpen &&
    !alreadyCheckedInThisClassOnDate
  );

  // ── Check-in handler ─────────────────────────────────────────────────
  const handleCheckIn = useCallback(async () => {
    if (!profile || !plan || !canCheckIn || checkInStatus === "loading") return;
    const classId = selectedClassId;
    if (!classId) return;
    if (!canCheckInForClass || !isSelectedDateAllowed) return;

    setCheckInStatus("loading");
    try {
      const dateToSend = isSelectedDateToday ? undefined : selectedDateKey;
      await toast.promise(
        withMinDuration(
          createCheckIn(profile.id, plan.id, classId, dateToSend),
          MUTATION_TOAST_MIN_MS,
        ),
        {
          loading: "Registrando check-in...",
          success: "Check-in registrado!",
          error: (err) =>
            err instanceof Error
              ? err.message
              : "Falha no check-in, tente novamente.",
        },
      );
      setCheckInStatus("success");
      setTimeout(() => setCheckInStatus("idle"), 2600);
    } catch {
      setCheckInStatus("error");
      setTimeout(() => setCheckInStatus("idle"), 2600);
    }
  }, [
    profile,
    plan,
    canCheckIn,
    checkInStatus,
    selectedClassId,
    canCheckInForClass,
    isSelectedDateToday,
    isSelectedDateAllowed,
    selectedDateKey,
  ]);

  const handleCancelCheckIn = useCallback(async (checkIn: CheckIn) => {
    if (cancellingCheckInId) return;
    setCancellingCheckInId(checkIn.id);
    try {
      await toast.promise(
        withMinDuration(cancelCheckIn(checkIn.id), MUTATION_TOAST_MIN_MS),
        {
          loading: "Cancelando check-in...",
          success: "Check-in cancelado.",
          error: (err) =>
            err instanceof Error
              ? err.message
              : "Não foi possível cancelar o check-in.",
        },
      );
    } finally {
      setCancellingCheckInId(null);
    }
  }, [cancellingCheckInId]);

  // ── Feedback handler ───────────────────────────────────────────────
  const handleSendFeedback = useCallback(async () => {
    if (!profile || feedbackStatus === "loading") return;
    const msg = feedbackText.trim().slice(0, 64);
    if (!msg) return;

    setFeedbackStatus("loading");
    try {
      await toast.promise(
        withMinDuration(
          createFeedback({
            userId: profile.id,
            userName: profile.name ?? null,
            message: msg,
          }),
          MUTATION_TOAST_MIN_MS,
        ),
        {
          loading: "Enviando feedback...",
          success: "Feedback enviado!",
          error: "Erro ao enviar. Tente novamente.",
        },
      );
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
              priority
              sizes="40px"
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
              type="button"
              data-testid={`student-tab-${tab}`}
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
                  loading="lazy"
                  />
                )}
                Olá, {profile?.name?.split(" ")[0] ?? "aluno"}.
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                data-testid="student-logout"
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
              <OverviewTab
                isPaymentOverdue={paymentOverdue}
                plan={plan}
                currentWeekInfo={currentWeekInfo}
                checkIns={checkIns}
                classes={classes}
                cancellingCheckInId={cancellingCheckInId}
                onCancelCheckIn={(checkIn) => void handleCancelCheckIn(checkIn)}
              />
            </div>
          )}

          {selectedTab === "checkin" && (
            <CheckinTab
              currentWeekInfo={currentWeekInfo}
              plan={plan}
              paymentOverdue={paymentOverdue}
              classes={classes}
              selectedClassId={selectedClassId}
              onSelectedClassIdChange={setSelectedClassId}
              allowedDateKeys={allowedCheckinDateKeys}
              selectedDateKey={selectedDateKey}
              onSelectedDateKeyChange={handleSelectedDateKeyChange}
              classCounts={classCounts}
              isSelectedDateToday={isSelectedDateToday}
              canCheckIn={canCheckIn}
              canCheckInForClass={canCheckInForClass}
              checkInStatus={checkInStatus}
              alreadyCheckedInThisClassOnDate={alreadyCheckedInThisClassOnDate}
              selectedClassWindowOpen={selectedClassWindowOpen}
              selectedClassRemaining={selectedClassRemaining}
              onCheckIn={handleCheckIn}
            />
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
                        data-testid="student-feedback-input"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value.slice(0, 64))}
                        maxLength={64}
                        placeholder="Ex: Aula incrível hoje!"
                        disabled={feedbackStatus === "loading"}
                        className="w-full rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500/40 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        data-testid="student-feedback-submit"
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
                              type="button"
                              onClick={async () => {
                                setDeletingFeedbackId(f.id);
                                try {
                                  await toast.promise(
                                    withMinDuration(
                                      deleteFeedback(f.id),
                                      MUTATION_TOAST_MIN_MS,
                                    ),
                                    {
                                      loading: "Removendo feedback...",
                                      success: "Feedback removido",
                                      error: "Não foi possível apagar",
                                    },
                                  );
                                } finally {
                                  setDeletingFeedbackId(null);
                                }
                              }}
                              disabled={deletingFeedbackId === f.id}
                              className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:border-amber-500/20 transition cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                            >
                              {deletingFeedbackId === f.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
