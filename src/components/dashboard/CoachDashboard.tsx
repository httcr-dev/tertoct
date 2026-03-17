"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  deleteField,
  addDoc,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Plan } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Home, List, Users, CheckCircle } from "lucide-react";

interface StudentSummary {
  id: string;
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  planId?: string | null;
  weeklyCheckIns: number;
  active?: boolean;
}

export function CoachDashboard() {
  const { profile, signOutUser } = useAuth();
  const db = getFirestoreDb();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("all");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFields, setEditingFields] = useState<Partial<Plan>>({});
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState<StudentSummary | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<Array<any>>([]);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "plans" | "professors" | "students" | "checkins"
  >("overview");
  const [professors, setProfessors] = useState<StudentSummary[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [selectedStudentIdForCheckins, setSelectedStudentIdForCheckins] = useState<string>("all");
  const [checkinCounts, setCheckinCounts] = useState<Map<string, number>>(new Map());

  // Helpers
  function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const updateWeeklyCheckIns = (
    studentsList: StudentSummary[],
    counts: Map<string, number>,
  ) => {
    return studentsList.map((s) => {
      const weeklyCheckIns = counts.get(s.id) ?? 0;
      return {
        ...s,
        weeklyCheckIns,
      };
    });
  };

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
      const d =
        item.createdAt && item.createdAt.toDate
          ? item.createdAt.toDate()
          : item.createdAt
            ? new Date((item.createdAt.seconds || item.createdAt) * 1000)
            : null;
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
                {/* Background hit area */}
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
                
                {/* Tooltip implementation inside SVG */}
                {isHovered && (
                  <g transform={`translate(${x + barWidth / 2}, ${y - 12})`}>
                    <rect
                      x="-25"
                      y="-24"
                      width="50"
                      height="20"
                      rx="6"
                      fill="#18181b"
                      stroke="#3f3f46"
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#f4f4f5"
                      y="-10"
                    >
                      {c} {c === 1 ? 'check-in' : 'check-ins'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  useEffect(() => {


    const plansRef = collection(db, "plans");
    const unsubPlans = onSnapshot(
      query(plansRef, orderBy("name", "asc")),
      (snap) => {

        const next: Plan[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          next.push({
            id: docSnap.id,
            name: data.name,
            price: data.price,
            classesPerWeek: data.classesPerWeek,
            description: data.description,
            active: data.active ?? true,
          });
        });
        setPlans(next);
      },
      (error) => {
        console.error("Error loading plans:", error);
      },
    );

    const usersRef = collection(db, "users");
    const unsubStudents = onSnapshot(
      query(usersRef, where("role", "==", "student")),
      (snap) => {
        const next: StudentSummary[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          next.push({
            id: docSnap.id,
            name: data.name ?? null,
            email: data.email ?? null,
            photoURL: data.photoURL ?? null,
            planId: data.planId ?? null,
            weeklyCheckIns: 0,
            ...(data.active !== undefined ? { active: !!data.active } : {}),
          });
        });
        setStudents(next);
      }
    );

    const unsubProfessors = onSnapshot(
      query(usersRef, where("role", "==", "coach")),
      (snap) => {
        const next: StudentSummary[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          next.push({
            id: docSnap.id,
            name: data.name ?? null,
            email: data.email ?? null,
            photoURL: data.photoURL ?? null,
            weeklyCheckIns: 0,
            ...(data.active !== undefined ? { active: !!data.active } : {}),
          });
        });
        setProfessors(next);
      }
    );

    // Real-time listener for weekly check-ins
    const checkInsRef = collection(db, "checkins");
    const weekStart = startOfWeek(new Date());
    const unsubWeekly = onSnapshot(
      query(checkInsRef, where("createdAt", ">=", Timestamp.fromDate(weekStart))),
      (snap) => {
        const counts = new Map<string, number>();
        snap.forEach((d) => {
          const uid = d.data().userId;
          counts.set(uid, (counts.get(uid) ?? 0) + 1);
        });
        setCheckinCounts(counts);
      }
    );

    return () => {
      unsubPlans();
      unsubStudents();
      unsubProfessors();
      unsubWeekly();
    };
  }, [db]);

  // Derived lists with real-time check-in counts
  const studentsWithCounts = useMemo(() => {
    return students.map(s => ({
      ...s,
      weeklyCheckIns: checkinCounts.get(s.id) ?? 0
    }));
  }, [students, checkinCounts]);

  const professorsWithCounts = useMemo(() => {
    return professors.map(p => ({
      ...p,
      weeklyCheckIns: checkinCounts.get(p.id) ?? 0
    }));
  }, [professors, checkinCounts]);

  // load recent checkins for overview/chart
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const daysBack = 14;
        const since = new Date();
        since.setDate(since.getDate() - daysBack);
        const checkInsRef = collection(db, "checkins");
        const q = query(
          checkInsRef,
          where("createdAt", ">=", Timestamp.fromDate(since)),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setRecentCheckins(list);
      } catch (err) {
        setRecentCheckins([]);
      }
    };

    loadRecent().catch(() => {});
  }, [db]);

  const handleEditPlanClick = (plan: Plan) => {
    setEditingPlan(plan);
    setEditingFields({
      name: plan.name,
      price: plan.price,
      classesPerWeek: plan.classesPerWeek,
      description: plan.description,
      active: plan.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreatePlan = async () => {
    // Generate a temporary ID for the UI
    const tempId = `new_plan_${Date.now()}`;
    const newPlan: Plan = {
      id: tempId,
      name: "",
      price: 0,
      classesPerWeek: 1,
      description: "",
      active: true,
    };
    setEditingPlan(newPlan);
    setEditingFields({
      name: "",
      price: 0,
      classesPerWeek: 1,
      description: "",
      active: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveEditPlan = async () => {
    if (!editingPlan) return;
    try {
      const isNew = editingPlan.id.startsWith("new_plan_");
      
      const payload = {
        name: editingFields.name || editingPlan.name || "Novo Plano",
        price: editingFields.price ?? editingPlan.price,
        classesPerWeek:
          editingFields.classesPerWeek ?? editingPlan.classesPerWeek,
        description: editingFields.description ?? editingPlan.description,
        active: editingFields.active ?? editingPlan.active,
      };

      if (isNew) {
        const plansRef = collection(db, "plans");
        await addDoc(plansRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        const ref = doc(db, "plans", editingPlan.id);
        await updateDoc(ref, payload);
      }
      
      setEditingPlan(null);
      setEditingFields({});
    } catch (err) {
      console.error("Failed to save plan", err);
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (
      !window.confirm(
        "Tem certeza que deseja deletar este plano? Esta ação é irreversível.",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "plans", plan.id));
      if (editingPlan?.id === plan.id) {
        setEditingPlan(null);
      }
    } catch (err) {
      console.error("Failed to delete plan", err);
    }
  };

  const toggleStudentActive = async (student: StudentSummary) => {
    try {
      const ref = doc(db, "users", student.id);
      await updateDoc(ref, { active: !(student as any).active });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                ...((s as any).active !== undefined
                  ? { active: !(s as any).active }
                  : {}),
              }
            : s,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle student active", err);
    }
  };

  const viewCheckins = async (student: StudentSummary) => {
    setSelectedStudentForHistory(student);
    setCheckinModalOpen(true);
    try {
      const checkInsRef = collection(db, "checkins");
      const q = query(
        checkInsRef,
        where("userId", "==", student.id),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const history: Array<any> = [];
      snap.forEach((d) => {
        const data = d.data();
        history.push({ id: d.id, ...data });
      });
      setCheckinHistory(history);
    } catch (err) {
      console.error("Failed to fetch check-in history", err);
      setCheckinHistory([]);
    }
  };

  const closeCheckinsModal = () => {
    setCheckinModalOpen(false);
    setSelectedStudentForHistory(null);
    setCheckinHistory([]);
  };

  useEffect(() => {
    const loadWeeklyCheckIns = async () => {
      const weekStart = startOfWeek(new Date());
      const checkInsRef = collection(db, "checkins");
      const q = query(
        checkInsRef,
        where("createdAt", ">=", Timestamp.fromDate(weekStart)),
      );
      const snap = await getDocs(q);

      const counts = new Map<string, number>();
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId as string;
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      });

      setStudents((prev) => updateWeeklyCheckIns(prev, counts));
    };

    loadWeeklyCheckIns().catch((error) => {
      console.error("Failed to load weekly check-ins", error);
    });
  }, [db]);

  const filteredStudents = useMemo(() => {
    if (selectedPlanId === "all") return studentsWithCounts;
    return studentsWithCounts.filter((s) => s.planId === selectedPlanId);
  }, [studentsWithCounts, selectedPlanId]);

  const handleTogglePlanActive = async (plan: Plan) => {
    const ref = doc(db, "plans", plan.id);
    await updateDoc(ref, { active: !plan.active });
  };

  const handleAssignPlan = async (studentId: string, planId: string | null) => {
    const ref = doc(db, "users", studentId);
    await updateDoc(ref, {
      planId: planId || deleteField(),
    });
  };

  const handleNavigateToCoaches = () => {
    // navigate to students section
    setSelectedTab("students");
  };

  return (
    <div className="flex min-h-screen bg-transparent text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-800/40 bg-black/20 backdrop-blur-xl p-6 lg:flex flex-col">
        <div className="mb-10 px-2 mt-2">
          <div className="flex items-center gap-3">
            <img src="/logo-academy.png" alt="TertoCT Logo" className="h-10 w-10 object-contain" />
            <span className="font-semibold text-zinc-100 tracking-wide text-lg">TertoCT</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5 flex-1">
          <button
            onClick={() => setSelectedTab("overview")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === "overview" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Home className="h-[18px] w-[18px]" strokeWidth={2} />
            Visão Geral
          </button>
          <button
            onClick={() => setSelectedTab("plans")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === "plans" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <List className="h-[18px] w-[18px]" strokeWidth={2} />
            Planos
          </button>
          <button
            onClick={() => setSelectedTab("professors")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === "professors" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Users className="h-[18px] w-[18px]" strokeWidth={2} />
            Professores
          </button>
          <button
            onClick={() => setSelectedTab("students")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === "students" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Users className="h-[18px] w-[18px]" strokeWidth={2} />
            Alunos
          </button>
          <button
            onClick={() => setSelectedTab("checkins")}
            className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === "checkins" ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <CheckCircle className="h-[18px] w-[18px]" strokeWidth={2} />
            Check-Ins
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-6">
        <div className="flex min-h-screen flex-col gap-8 pb-8 max-w-6xl mx-auto">
          <header className="flex items-center justify-between border-b border-zinc-800/50 pb-6 pt-2">
            <div>
              <h1 className="text-xl font-bold text-zinc-100">
            {selectedTab === "overview" && "Visão Geral"}
            {selectedTab === "plans" && "Planos"}
            {selectedTab === "professors" && "Professores"}
            {selectedTab === "students" && "Alunos"}
            {selectedTab === "checkins" && "Check-Ins"}
          </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-semibold overflow-hidden border border-zinc-700/50 shadow-sm shadow-amber-500/10 shrink-0">
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt={profile.name || ""} 
                      className="w-full h-full object-cover block"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    profile?.name ? profile.name.charAt(0).toUpperCase() : "C"
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-zinc-200">{profile?.name ?? "Coach"}</p>
                </div>
              </div>
              <div className="h-4 w-px bg-zinc-800" />
              <button
                onClick={signOutUser}
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          </header>

          {selectedTab === "overview" && (
            <section className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Total de Alunos</p>
                </div>
                <p className="text-3xl font-semibold text-zinc-100">
                  {students.length}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <List className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Planos Ativos</p>
                </div>
                <p className="text-3xl font-semibold text-zinc-100">
                  {plans.filter((p) => p.active).length}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Check-ins (7 dias)</p>
                </div>
                <p className="text-3xl font-semibold text-zinc-100">
                  {
                    recentCheckins.filter((c) => {
                      const d =
                        c.createdAt && c.createdAt.toDate
                          ? c.createdAt.toDate()
                          : c.createdAt
                            ? new Date(
                                (c.createdAt.seconds || c.createdAt) * 1000,
                              )
                            : null;
                      if (!d) return false;
                      const days =
                        (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
                      return days <= 7;
                    }).length
                  }
                </p>
              </div>

              <div className="col-span-3 mt-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <h3 className="text-sm font-medium text-zinc-200">
                  Atividade de Check-ins (14 dias)
                </h3>
                <div className="mt-6">
                  <BarChart dataItems={recentCheckins} ds={14} />
                </div>
              </div>
            </section>
          )}

          {selectedTab === "plans" && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">
                    Planos e Preços
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Gerencie os planos disponíveis e o limite de check-ins semanais.
                  </p>
                </div>
                <button
                  onClick={handleCreatePlan}
                  className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
                >
                  Criar Novo Plano
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 flex flex-col relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                      {!plan.active && (
                        <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border border-zinc-700/50 rounded-full px-2 py-0.5">
                          Inativo
                        </div>
                      )}
                      <h3 className="text-xl font-semibold text-zinc-100">{plan.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-zinc-50">R$ {plan.price.toFixed(0)}</span>
                        <span className="text-sm text-zinc-400">/ mês</span>
                      </div>
                      <div className="mt-6 flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="text-sm text-zinc-300">{plan.classesPerWeek}x check-ins por semana</span>
                        </div>
                        {plan.description && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-zinc-300">{plan.description}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-8 pt-6 border-t border-zinc-800/60 flex gap-3">
                        <button
                          onClick={() => handleEditPlanClick(plan)}
                          className="flex-1 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleTogglePlanActive(plan)}
                          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
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
                  <div className="col-span-3 text-center py-12 border border-zinc-800/50 rounded-2xl border-dashed">
                    <p className="text-zinc-500">Nenhum plano criado ainda.</p>
                  </div>
                )}
              </div>

              {/* Edit Plan Panel */}
              {editingPlan && (
                <div className="mt-8 rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-6 max-w-3xl">
                  <h3 className="text-lg font-semibold text-amber-500 mb-5">
                    Editando plano: <span className="text-zinc-100">{editingPlan.name}</span>
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do plano</label>
                      <input
                        className="w-full rounded-lg bg-black/50 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
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
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preço Mensal (R$)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg bg-black/50 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
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
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Check-ins por semana</label>
                      <input
                        type="number"
                        className="w-full rounded-lg bg-black/50 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
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
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Descrição/Benefícios</label>
                      <input
                        className="w-full rounded-lg bg-black/50 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
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
                  <div className="mt-6 flex gap-3 justify-end border-t border-zinc-800/60 pt-6">
                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setEditingFields({});
                      }}
                      className="rounded-full border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    {!editingPlan?.id.startsWith("new_plan_") && (
                      <button
                        onClick={() => handleDeletePlan(editingPlan!)}
                        className="rounded-full border border-red-500/30 text-red-400 bg-red-500/10 px-6 py-2.5 text-sm font-medium hover:bg-red-500/20 transition-colors mr-auto cursor-pointer"
                      >
                        Excluir
                      </button>
                    )}
                    <button
                      onClick={handleSaveEditPlan}
                      className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
                    >
                      {editingPlan?.id.startsWith("new_plan_") ? "Salvar Novo Plano" : "Salvar Alterações"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {selectedTab === "professors" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">Professores</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Gerencie o acesso e o status dos professores da academia.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
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
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {professors.map((professor) => (
                      <tr key={professor.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700/50 overflow-hidden shrink-0 shadow-sm shadow-amber-500/10">
                              {professor.photoURL ? (
                                <img 
                                  src={professor.photoURL} 
                                  alt={professor.name || ""} 
                                  className="w-full h-full object-cover block"
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
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
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
        )}

        {selectedTab === "students" && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">
                    Alunos e Planos
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Atribua planos e acompanhe quem está treinando.
                  </p>
                </div>
                <select
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="all">Filtro: Todos os planos</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3">
                {filteredStudents.map((student) => {
                  const currentPlan = student.planId ? plans.find((p) => p.id === student.planId) : null;
                  return (
                    <div
                      key={student.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 gap-4 hover:border-zinc-700 transition-colors"
                    >
                      <div 
                        className="flex items-center gap-4 cursor-pointer flex-1"
                        onClick={() => viewCheckins(student)}
                      >
                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-medium shrink-0 overflow-hidden border border-zinc-700/50">
                          {student.photoURL ? (
                            <img 
                              src={student.photoURL} 
                              alt={student.name || ""} 
                              className="w-full h-full object-cover block"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            student.name ? student.name.charAt(0).toUpperCase() : "U"
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                            {student.name ?? "Aluno sem nome"}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {student.email ?? "sem e-mail"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 justify-between sm:justify-start">
                        <div className="text-right hidden sm:block">
                          <p className={`text-xs font-medium ${currentPlan ? "text-emerald-400" : "text-zinc-500"}`}>
                            {currentPlan ? currentPlan.name : "Sem plano"}
                          </p>
                          <p className="text-[11px] text-amber-500 mt-0.5">
                            {student.weeklyCheckIns} check-in{student.weeklyCheckIns === 1 ? "" : "s"} hoje/semana
                          </p>
                        </div>
                        <select
                          className="rounded-lg border border-zinc-700 bg-black/50 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                          value={student.planId ?? ""}
                          onChange={(e) =>
                            handleAssignPlan(student.id, e.target.value || null)
                          }
                        >
                          <option value="">Sem plano</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-12 border border-zinc-800/50 rounded-xl border-dashed">
                    <p className="text-sm text-zinc-500">Nenhum aluno encontrado.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {selectedTab === "checkins" && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">
                    Histórico de Check-Ins
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Acompanhe os check-ins recentes filtrados por aluno.
                  </p>
                </div>
                <select
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors backdrop-blur-md cursor-pointer"
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
                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {selectedStudentIdForCheckins === "all" 
                    ? "Atividade Geral (14 dias)" 
                    : `Atividade de ${studentsWithCounts.find(s => s.id === selectedStudentIdForCheckins)?.name || "Aluno"} (14 dias)`}
                </h3>
                <div className="mt-4">
                  <BarChart 
                    dataItems={selectedStudentIdForCheckins === "all" 
                      ? recentCheckins 
                      : recentCheckins.filter(c => c.userId === selectedStudentIdForCheckins)} 
                    ds={14} 
                  />
                </div>
              </div>

              <div className="grid gap-3">
                {recentCheckins
                  .filter(c => selectedStudentIdForCheckins === "all" || c.userId === selectedStudentIdForCheckins)
                  .length > 0 ? (
                  recentCheckins
                    .filter(c => selectedStudentIdForCheckins === "all" || c.userId === selectedStudentIdForCheckins)
                    .map((c) => {
                    const student = students.find((s) => s.id === c.userId);
                    const plan = plans.find((p) => p.id === c.planId);
                    const date = c.createdAt && c.createdAt.toDate
                      ? c.createdAt.toDate()
                      : c.createdAt
                        ? new Date((c.createdAt.seconds || c.createdAt) * 1000)
                        : null;
                        
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 hover:bg-zinc-800/20 transition-all hover:border-amber-500/20 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-medium shrink-0 border border-amber-500/20 group-hover:scale-110 transition-transform overflow-hidden shadow-sm shadow-amber-500/20">
                            {student?.photoURL ? (
                              <img 
                                src={student.photoURL} 
                                alt={student.name || ""} 
                                className="w-full h-full object-cover block"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              student?.name ? student.name.charAt(0).toUpperCase() : "U"
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                              {student?.name ?? "Aluno sem nome"}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {plan?.name ?? "Sem plano"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-emerald-400 mb-0.5 font-medium">Realizado</p>
                          <p className="text-xs text-zinc-500">
                            {date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 border border-zinc-800/50 rounded-xl border-dashed">
                    <p className="text-sm text-zinc-500">Nenhum check-in encontrado para este filtro.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Check-in history modal */}
          {checkinModalOpen && selectedStudentForHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-medium shrink-0 border border-amber-500/20 overflow-hidden shadow-sm shadow-amber-500/20">
                      {selectedStudentForHistory.photoURL ? (
                        <img 
                          src={selectedStudentForHistory.photoURL} 
                          alt={selectedStudentForHistory.name || ""} 
                          className="w-full h-full object-cover block"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        selectedStudentForHistory.name ? selectedStudentForHistory.name.charAt(0).toUpperCase() : "U"
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-lg">
                        {selectedStudentForHistory.name}
                      </h3>
                      <p className="text-xs text-zinc-400">Histórico de Check-ins</p>
                    </div>
                  </div>
                  <button
                    onClick={closeCheckinsModal}
                    className="rounded-full bg-zinc-900 h-8 w-8 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors cursor-pointer"
                  >
                    <span className="sr-only">Fechar</span>
                    ✕
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-auto">
                  <div className="space-y-3">
                  {checkinHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-500">
                        Nenhum check-in registrado.
                      </p>
                    </div>
                  )}
                  {checkinHistory.map((c) => {
                    const date = c.createdAt && c.createdAt.toDate
                      ? c.createdAt.toDate()
                      : c.createdAt
                        ? new Date((c.createdAt.seconds || c.createdAt) * 1000)
                        : null;
                    const planName = c.planId ? (plans.find((p) => p.id === c.planId)?.name ?? "Plano") : "Sem plano";
                    
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {planName}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {c.notes || "Check-in realizado"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-emerald-400 mb-0.5 font-medium">Realizado</p>
                          <p className="text-xs text-zinc-500">
                            {date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
