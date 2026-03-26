"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import type { Plan, StudentSummary } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Home, List, Users, CheckCircle } from "lucide-react";
import { OverviewTab } from "./coach/OverviewTab";
import { PlansTab } from "./coach/PlansTab";
import { ProfessorsTab } from "./coach/ProfessorsTab";
import { StudentsTab } from "./coach/StudentsTab";
import { CheckinsTab } from "./coach/CheckinsTab";
import { CheckinHistoryModal } from "./coach/CheckinHistoryModal";
import {
  createPlan,
  updatePlan,
  deletePlan as deletePlanService,
  togglePlanActive,
} from "@/services/planService";
import {
  assignPlan,
  setPaymentDay,
  togglePayment,
  toggleUserActive,
} from "@/services/userService";
import { fetchCheckinsByUser } from "@/services/checkinService";

type CoachTab = "overview" | "plans" | "professors" | "students" | "checkins";

export function CoachDashboard() {
  const { profile, signOutUser } = useAuth();
  const db = getFirestoreDb();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFields, setEditingFields] = useState<Partial<Plan>>({});
  const editPlanRef = useRef<HTMLDivElement>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState<StudentSummary | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<Array<any>>([]);
  const [selectedTab, setSelectedTab] = useState<CoachTab>("overview");
  const [professors, setProfessors] = useState<StudentSummary[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [selectedStudentIdForCheckins, setSelectedStudentIdForCheckins] =
    useState("all");
  const [checkinCounts, setCheckinCounts] = useState<Map<string, number>>(
    new Map(),
  );

  // ── Real-time listeners ──────────────────────────────────────────────
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
      (error) => console.error("Error loading plans:", error),
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
            paymentDueDay: data.paymentDueDay ?? null,
            monthlyPaymentPaid: data.monthlyPaymentPaid ?? false,
            paymentValidUntil: data.paymentValidUntil ?? null,
            ...(data.active !== undefined ? { active: !!data.active } : {}),
          });
        });
        setStudents(next);
      },
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
      },
    );

    // Monthly check-in counts (last 30 days)
    const checkInsRef = collection(db, "checkins");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const unsubMonthly = onSnapshot(
      query(
        checkInsRef,
        where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
      ),
      (snap) => {
        const counts = new Map<string, number>();
        snap.forEach((d) => {
          const uid = d.data().userId;
          if (uid) counts.set(uid, (counts.get(uid) ?? 0) + 1);
        });
        setCheckinCounts(counts);
      },
    );

    return () => {
      unsubPlans();
      unsubStudents();
      unsubProfessors();
      unsubMonthly();
    };
  }, [db]);

  // ── Derived data ─────────────────────────────────────────────────────
  const studentsWithCounts = useMemo(
    () =>
      students.map((s) => ({
        ...s,
        weeklyCheckIns: checkinCounts.get(s.id) ?? 0,
      })),
    [students, checkinCounts],
  );

  const professorsWithCounts = useMemo(
    () =>
      professors.map((p) => ({
        ...p,
        weeklyCheckIns: checkinCounts.get(p.id) ?? 0,
      })),
    [professors, checkinCounts],
  );

  // Recent checkins for overview chart
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - 14);
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
      } catch {
        setRecentCheckins([]);
      }
    };
    loadRecent();
  }, [db]);

  // ── Plan handlers (delegated to service) ─────────────────────────────
  const scrollToEditPanel = useCallback(() => {
    setTimeout(() => {
      editPlanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleEditPlanClick = useCallback(
    (plan: Plan) => {
      setEditingPlan(plan);
      setEditingFields({
        name: plan.name,
        price: plan.price,
        classesPerWeek: plan.classesPerWeek,
        description: plan.description,
        active: plan.active,
      });
      scrollToEditPanel();
    },
    [scrollToEditPanel],
  );

  const handleCreatePlan = useCallback(() => {
    const tempId = `new_plan_${Date.now()}`;
    setEditingPlan({
      id: tempId,
      name: "",
      price: 0,
      classesPerWeek: 1,
      description: "",
      active: true,
    });
    setEditingFields({
      name: "",
      price: 0,
      classesPerWeek: 1,
      description: "",
      active: true,
    });
    scrollToEditPanel();
  }, [scrollToEditPanel]);

  const handleSaveEditPlan = useCallback(async () => {
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
        await createPlan(payload);
      } else {
        await updatePlan(editingPlan.id, payload);
      }
      setEditingPlan(null);
      setEditingFields({});
    } catch (err) {
      console.error("Failed to save plan", err);
    }
  }, [editingPlan, editingFields]);

  const handleDeletePlan = useCallback(
    async (plan: Plan) => {
      if (
        !window.confirm(
          "Tem certeza que deseja deletar este plano? Esta ação é irreversível.",
        )
      )
        return;
      try {
        await deletePlanService(plan.id);
        if (editingPlan?.id === plan.id) setEditingPlan(null);
      } catch (err) {
        console.error("Failed to delete plan", err);
      }
    },
    [editingPlan],
  );

  const handleTogglePlanActive = useCallback(async (plan: Plan) => {
    await togglePlanActive(plan);
  }, []);

  // ── Student handlers (delegated to service) ──────────────────────────
  const handleAssignPlan = useCallback(
    async (studentId: string, planId: string | null) => {
      await assignPlan(studentId, planId);
    },
    [],
  );

  const handleSetPaymentDay = useCallback(
    async (studentId: string, day: number | null) => {
      await setPaymentDay(studentId, day);
    },
    [],
  );

  const handleTogglePayment = useCallback(
    async (student: StudentSummary) => {
      await togglePayment(student);
    },
    [],
  );

  const toggleStudentActive = useCallback(
    async (student: StudentSummary) => {
      try {
        await toggleUserActive(student.id, student.active !== false);
      } catch (err) {
        console.error("Failed to toggle student active", err);
      }
    },
    [],
  );

  // ── Check-in history modal ───────────────────────────────────────────
  const viewCheckins = useCallback(async (student: StudentSummary) => {
    setSelectedStudentForHistory(student);
    setCheckinModalOpen(true);
    try {
      const history = await fetchCheckinsByUser(student.id);
      setCheckinHistory(history);
    } catch (err) {
      console.error("Failed to fetch check-in history", err);
      setCheckinHistory([]);
    }
  }, []);

  const closeCheckinsModal = useCallback(() => {
    setCheckinModalOpen(false);
    setSelectedStudentForHistory(null);
    setCheckinHistory([]);
  }, []);

  // ── Filtered students ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let list = studentsWithCounts;

    if (selectedPlanId !== "all") {
      list = list.filter((s) => s.planId === selectedPlanId);
    }

    if (paymentFilter !== "all") {
      const now = new Date();
      list = list.filter((s) => {
        const hasDueDay = s.paymentDueDay != null;
        if (paymentFilter === "none") return !hasDueDay;
        if (!hasDueDay) return false;

        let isPaid = false;
        if (s.paymentValidUntil) {
          isPaid = now.getTime() <= s.paymentValidUntil.toDate().getTime();
        } else {
          isPaid = !!s.monthlyPaymentPaid || now.getDate() <= s.paymentDueDay!;
        }

        if (paymentFilter === "pending") return !isPaid;

        if (isPaid) {
          if (!s.paymentValidUntil) return paymentFilter === "active";
          const validUntil = s.paymentValidUntil.toDate();
          const isNextMonth =
            validUntil.getMonth() !== now.getMonth() ||
            validUntil.getFullYear() !== now.getFullYear();
          if (paymentFilter === "paid") return isNextMonth;
          if (paymentFilter === "active") return !isNextMonth;
        }
        return false;
      });
    }

    return list;
  }, [studentsWithCounts, selectedPlanId, paymentFilter]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-transparent text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-800/40 bg-black/20 backdrop-blur-xl p-6 hidden md:flex flex-col">
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
          {(
            [
              { tab: "overview", icon: Home, label: "Visão Geral" },
              { tab: "plans", icon: List, label: "Planos" },
              { tab: "professors", icon: Users, label: "Professores" },
              { tab: "students", icon: Users, label: "Alunos" },
              { tab: "checkins", icon: CheckCircle, label: "Check-Ins" },
            ] as const
          ).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex items-center gap-3 w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${selectedTab === tab ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
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
            { tab: "overview", icon: <Home className="h-5 w-5" />, label: "Início" },
            { tab: "plans", icon: <List className="h-5 w-5" />, label: "Planos" },
            { tab: "students", icon: <Users className="h-5 w-5" />, label: "Alunos" },
            { tab: "checkins", icon: <CheckCircle className="h-5 w-5" />, label: "Check-ins" },
          ] as const
        ).map(({ tab, icon, label }) => (
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
      <main className="flex-1 px-4 md:px-8 py-6 pb-20 md:pb-6">
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
                  ) : profile?.name ? (
                    profile.name.charAt(0).toUpperCase()
                  ) : (
                    "C"
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-zinc-200">
                    {profile?.name ?? "Coach"}
                  </p>
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
            <OverviewTab
              students={students}
              plans={plans}
              recentCheckins={recentCheckins}
            />
          )}

          {selectedTab === "plans" && (
            <PlansTab
              plans={plans}
              handleEditPlanClick={handleEditPlanClick}
              handleCreatePlan={handleCreatePlan}
              handleTogglePlanActive={handleTogglePlanActive}
              editingPlan={editingPlan}
              editingFields={editingFields}
              setEditingFields={setEditingFields}
              handleSaveEditPlan={handleSaveEditPlan}
              handleDeletePlan={handleDeletePlan}
              setEditingPlan={setEditingPlan}
              editPlanRef={editPlanRef}
            />
          )}

          {selectedTab === "professors" && (
            <ProfessorsTab
              professors={professors}
              toggleStudentActive={toggleStudentActive}
            />
          )}

          {selectedTab === "students" && (
            <StudentsTab
              filteredStudents={filteredStudents}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              plans={plans}
              viewCheckins={viewCheckins}
              handleAssignPlan={handleAssignPlan}
              handleSetPaymentDay={handleSetPaymentDay}
              handleTogglePayment={handleTogglePayment}
            />
          )}

          {selectedTab === "checkins" && (
            <CheckinsTab
              recentCheckins={recentCheckins}
              selectedStudentIdForCheckins={selectedStudentIdForCheckins}
              setSelectedStudentIdForCheckins={setSelectedStudentIdForCheckins}
              studentsWithCounts={studentsWithCounts}
              plans={plans}
            />
          )}

          <CheckinHistoryModal
            isOpen={checkinModalOpen}
            onClose={closeCheckinsModal}
            student={selectedStudentForHistory}
            history={checkinHistory}
            plans={plans}
          />
        </div>
      </main>
    </div>
  );
}
