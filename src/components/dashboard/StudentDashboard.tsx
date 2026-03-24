"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  serverTimestamp,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Plan, CheckIn } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Home, List, Users, CheckCircle, LogOut } from "lucide-react";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function BarChart({ dataItems, ds = 14 }: { dataItems: any[]; ds?: number }) {
  // compute counts per day for last `days`
  const counts: number[] = Array.from({ length: ds }, () => 0);
  const now = new Date();
  
  // Day labels
  const days: string[] = [];
  for (let i = 0; i < ds; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (ds - 1 - i));
    days.push(d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }));
  }

  for (const item of dataItems) {
    const d = item.createdAt;
    if (!d) continue;
    const diff = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff >= 0 && diff < ds) {
      counts[ds - 1 - diff]++;
    }
  }

  const max = Math.max(...counts, 3);
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barSpacing = 8;
  const rawBarWidth = chartWidth / ds;
  const barWidth = rawBarWidth - barSpacing;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="relative group/chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="mt-4 overflow-visible"
      >
        {/* Y-axis Grid Lines */}
        {[0, 0.5, 1].map((p, i) => (
          <g key={i} className="opacity-20 text-zinc-600">
            <line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - p)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - p)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={padding.top + chartHeight * (1 - p) + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              className="font-medium"
            >
              {Math.round(max * p)}
            </text>
          </g>
        ))}

        {/* X-axis Labels */}
        {days.map((day, i) => (
          (i % (ds > 7 ? 2 : 1) === 0 || i === ds - 1) && (
            <text
              key={i}
              x={padding.left + i * rawBarWidth + barWidth / 2}
              y={height - 15}
              textAnchor="middle"
              fontSize="10"
              fill="#71717a"
              className="font-medium"
            >
              {i === ds - 1 ? "Hoje" : day}
            </text>
          )
        ))}

        {/* Bars */}
        {counts.map((c, i) => {
          const h = (c / max) * chartHeight;
          const x = padding.left + i * rawBarWidth;
          const y = padding.top + chartHeight - h;
          const isHovered = hoveredIndex === i;

          return (
            <g 
              key={i} 
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-default"
            >
              <rect
                x={x}
                y={padding.top}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={6}
                fill={isHovered ? "#f59e0b" : "#c29b62"}
                className="transition-all duration-300"
                style={{
                  filter: isHovered ? "drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))" : "none"
                }}
              />
              {isHovered && (
                <g transform={`translate(${x + barWidth / 2}, ${y - 12})`}>
                  <rect x="-25" y="-24" width="50" height="20" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                  <text textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f4f4f5" y="-10">{c} {c === 1 ? 'aula' : 'aulas'}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function StudentDashboard() {
  const { profile, signOutUser } = useAuth();
  const db = getFirestoreDb();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [professors, setProfessors] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "checkin" | "plans" | "professors"
  >("overview");

  useEffect(() => {
    let unsubCheckins: (() => void) | undefined;

    const load = async () => {
      if (!profile) return;

      const tasks: Promise<void>[] = [];

      if ((profile as any).planId) {
        tasks.push(
          (async () => {
            const ref = doc(db, "plans", (profile as any).planId as string);
            const snap = await getDoc(ref);
            if (snap.exists()) {
              const data = snap.data() as DocumentData;
              setPlan({
                id: snap.id,
                name: data.name,
                price: data.price,
                classesPerWeek: data.classesPerWeek,
                description: data.description,
                active: data.active ?? true,
              });
            }
          })(),
        );
      }

      const checkInsRef = collection(db, "checkins");
      const qCheckins = query(
        checkInsRef,
        where("userId", "==", profile.id)
      );

      unsubCheckins = onSnapshot(qCheckins, (snap) => {
        const next: CheckIn[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData;
          const createdAt = data.createdAt as Timestamp | undefined;
          next.push({
            id: docSnap.id,
            userId: data.userId,
            planId: data.planId,
            createdAt: createdAt?.toDate() ?? new Date(),
          });
        });
        next.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setCheckIns(next);
      }, (error) => {
        console.error("Error fetching checkins:", error);
      });

      // Fetch all active plans
      tasks.push(
        (async () => {
          const plansRef = collection(db, "plans");
          const q = query(plansRef); 
          const snap = await getDocs(q);
          const next: Plan[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.active !== false) {
              next.push({
                id: docSnap.id,
                name: data.name,
                price: data.price,
                classesPerWeek: data.classesPerWeek,
                description: data.description,
                active: true,
              });
            }
          });
          setPlans(next.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
        })(),
      );

      // Fetch all active professors
      tasks.push(
        (async () => {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("role", "==", "coach"));
          const snap = await getDocs(q);
          const next: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.active !== false) {
              next.push({ id: docSnap.id, ...data });
            }
          });

          setProfessors(next);
        })(),
      );

      try {
        await Promise.all(tasks);

      } catch (err) {
        // failed to load constants
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      if (unsubCheckins) unsubCheckins();
    };
  }, [db, profile]);

  const currentWeekInfo = useMemo(() => {
    if (!plan || !profile) return null;
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekStartTime = weekStart.getTime();
    const weekCheckIns = checkIns.filter((c) => {
      const d = c.createdAt;
      return d.getTime() >= weekStartTime;
    });

    return {
      weekStart,
      count: weekCheckIns.length,
      allowed: plan.classesPerWeek,
      remaining: Math.max(plan.classesPerWeek - weekCheckIns.length, 0),
    };
  }, [checkIns, plan, profile]);

  // Payment overdue check
  const isPaymentOverdue = useMemo(() => {
    if (!profile) return false;
    const dueDay = (profile as any).paymentDueDay;
    const isPaid = (profile as any).monthlyPaymentPaid;
    if (dueDay == null) return false; // No due day set, no restriction
    if (isPaid) return false; // Already paid
    const currentDay = new Date().getDate();
    return currentDay > dueDay;
  }, [profile]);

  const canCheckIn = !!(
    plan &&
    currentWeekInfo &&
    currentWeekInfo.remaining > 0 &&
    plan.active &&
    !isPaymentOverdue
  );

  const handleCheckIn = async () => {
    if (!profile || !plan || !currentWeekInfo || !canCheckIn || creating) {
      return;
    }

    setCreating(true);
    try {
      const checkInsRef = collection(db, "checkins");
      const now = new Date();
      await addDoc(checkInsRef, {
        userId: profile.id,
        planId: plan.id,
        createdAt: serverTimestamp(),
      });

      setCheckIns((prev) => [
        {
          id: `local-${now.getTime()}`,
          userId: profile.id,
          planId: plan.id,
          createdAt: now,
        },
        ...prev,
      ]);
    } finally {
      setCreating(false);
    }
  };



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-100">
        <p className="text-sm text-zinc-400">
          Carregando seus dados de treino...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-800/40 bg-black/40 backdrop-blur-2xl p-6 lg:flex flex-col hidden md:flex">
        <div className="mb-10 px-2 mt-2">
          <div className="flex items-center gap-3">
            <img
              src="/logo-academy.png"
              alt="TertoCT Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="font-semibold text-zinc-100 tracking-wide text-lg">
              TertoCT
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">
          <button
            onClick={() => setSelectedTab("overview")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              selectedTab === "overview"
                ? "bg-zinc-800/60 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={2} />
            Início
          </button>
          <button
            onClick={() => setSelectedTab("checkin")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              selectedTab === "checkin"
                ? "bg-zinc-800/60 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CheckCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            Check-in
          </button>
          <button
            onClick={() => setSelectedTab("plans")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              selectedTab === "plans"
                ? "bg-zinc-800/60 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <List className="h-[18px] w-[18px]" strokeWidth={2} />
            Planos
          </button>
          <button
            onClick={() => setSelectedTab("professors")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              selectedTab === "professors"
                ? "bg-zinc-800/60 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="h-[18px] w-[18px]" strokeWidth={2} />
            Professores
          </button>
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-zinc-800/60 bg-black/90 backdrop-blur-xl px-2 py-2">
        {[
          { tab: "overview" as const, icon: <Home className="h-5 w-5" />, label: "Início" },
          { tab: "checkin" as const, icon: <CheckCircle className="h-5 w-5" />, label: "Check-in" },
          { tab: "plans" as const, icon: <List className="h-5 w-5" />, label: "Planos" },
          { tab: "professors" as const, icon: <Users className="h-5 w-5" />, label: "Profs" },
        ].map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
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
                {selectedTab === "professors" && "Nossos professores"}
              </p>
              <h1 className="text-xl font-bold text-zinc-50 flex items-center gap-3">
                {profile?.photoURL && (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.name || ""} 
                    className="h-8 w-8 rounded-full object-cover border border-zinc-700/50 shadow-sm shadow-amber-500/20 block" 
                    referrerPolicy="no-referrer"
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
              {/* Payment Overdue Banner */}
              {isPaymentOverdue && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-4 backdrop-blur-sm">
                  <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-400">Mensalidade Pendente</p>
                    <p className="text-xs text-red-400/70 mt-0.5">Seu check-in está bloqueado. Procure seu professor para regularizar o pagamento.</p>
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
                        <p className="text-zinc-400 text-sm">Aulas realizadas</p>
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
                        disabled={!canCheckIn || creating}
                        className={`w-full py-6 rounded-[30px] text-lg font-bold transition-all transform active:scale-95 shadow-2xl ${
                          canCheckIn && !creating
                            ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20 cursor-pointer"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {creating ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </span>
                        ) : !plan ? (
                          "Aguardando Plano"
                        ) : !plan.active ? (
                          "Plano Inativo"
                        ) : isPaymentOverdue ? (
                          "Mensalidade Pendente"
                        ) : canCheckIn ? (
                          "REALIZAR CHECK-IN"
                        ) : (
                          "Limite atingido"
                        )}
                      </button>

                      {!canCheckIn && (
                        <p className="text-red-400/80 text-xs font-medium bg-red-500/5 py-2 rounded-full border border-red-500/10">
                          {isPaymentOverdue ? "Mensalidade pendente. Procure seu professor para regularizar." :
                           !plan ? "Seu perfil não possui um plano associado." : 
                           !plan.active ? "Este plano está desativado pela administração." :
                           currentWeekInfo && currentWeekInfo.remaining <= 0 ? "Você atingiu o limite de check-ins para esta semana." :
                           "Não é possível fazer check-in no momento."}
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

          {selectedTab === "professors" && (
            <div className="grid gap-6 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {professors.map((prof) => (
                <div
                  key={prof.id}
                  className="rounded-3xl bg-zinc-900/40 border border-zinc-800/60 p-6 flex flex-col items-center text-center group hover:border-amber-500/20 transition-all"
                >
                  <div className="h-20 w-20 rounded-[28px] bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-500 mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden shadow-lg shadow-amber-500/5">
                    {prof.photoURL ? (
                      <img 
                        src={prof.photoURL} 
                        alt={prof.name || ""} 
                        className="w-full h-full object-cover block"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Users className="h-10 w-10" />
                    )}
                  </div>
                  <h3 className="font-bold text-zinc-100 text-lg">
                    {prof.name || "Professor"}
                  </h3>
                  <p className="text-xs text-amber-500/80 mt-1 uppercase tracking-widest font-bold">
                    Coach Certificado
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-800/50 w-full">
                    <p className="text-xs text-zinc-500 italic">
                      Disponível para treinos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

