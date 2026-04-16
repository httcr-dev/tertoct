"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CheckIn, Plan, StudentSummary } from "@/lib/types";
import { filterStudents } from "@/lib/utils/studentFilter";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthProvider";

import { Home, List, Users, CheckCircle, Bell } from "lucide-react";
import { OverviewTab } from "./coach/OverviewTab";
import { PlansTab } from "./coach/PlansTab";
import { ProfessorsTab } from "./coach/ProfessorsTab";
import { StudentsTab } from "./coach/StudentsTab";
import { CheckinsTab } from "./coach/CheckinsTab";
import { ExpirationsTab } from "./coach/ExpirationsTab";
import { CheckinHistoryModal } from "./coach/CheckinHistoryModal";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  createPlan,
  updatePlan,
  deletePlan as deletePlanService,
  PlanInUseError,
  togglePlanActive,
} from "@/services/planService";
import {
  assignPlan,
  setPaymentDay,
  togglePayment,
  toggleUserActive,
  updateUserPhone,
} from "@/services/userService";
import { fetchCheckinsByUser } from "@/services/checkinService";
import {
  fetchRecentCheckinsSince,
  listenCheckinCountsSince,
  listenCoaches,
  listenPlans,
  listenStudents,
} from "@/services/dashboardService";

type CoachTab = "overview" | "plans" | "professors" | "students" | "checkins" | "expirations";

export function CoachDashboard() {
  const { profile, signOutUser } = useAuth();

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
  const [checkinHistory, setCheckinHistory] = useState<CheckIn[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs: CoachTab[] = ["overview", "plans", "professors", "students", "checkins", "expirations"];
  const initialTab = (searchParams.get("tab") as CoachTab | null);
  const [selectedTab, setSelectedTab] = useState<CoachTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "overview",
  );
  const [professors, setProfessors] = useState<StudentSummary[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([]);
  const [selectedStudentIdForCheckins, setSelectedStudentIdForCheckins] =
    useState("all");
  const [checkinCounts, setCheckinCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [initialDataLoaded, setInitialDataLoaded] = useState({
    plans: false,
    students: false,
    coaches: false,
    checkins: false,
    recent: false,
  });

  const handleTabChange = useCallback((tab: CoachTab) => {
    setSelectedTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);

  // ── Real-time listeners ──────────────────────────────────────────────
  useEffect(() => {
    const unsubPlans = listenPlans((next) => {
      setPlans(next);
      setInitialDataLoaded((prev) => ({ ...prev, plans: true }));
    });
    const unsubStudents = listenStudents((next) => {
      setStudents(next);
      setInitialDataLoaded((prev) => ({ ...prev, students: true }));
    });
    const unsubProfessors = listenCoaches((next) => {
      setProfessors(next);
      setInitialDataLoaded((prev) => ({ ...prev, coaches: true }));
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const unsubMonthly = listenCheckinCountsSince(thirtyDaysAgo, (counts) => {
      setCheckinCounts(counts);
      setInitialDataLoaded((prev) => ({ ...prev, checkins: true }));
    });

    return () => {
      unsubPlans();
      unsubStudents();
      unsubProfessors();
      unsubMonthly();
    };
  }, []);

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
        setRecentCheckins(await fetchRecentCheckinsSince(since));
      } catch {
        setRecentCheckins([]);
      } finally {
        setInitialDataLoaded((prev) => ({ ...prev, recent: true }));
      }
    };
    loadRecent();
  }, []);

  const isBootstrapping = useMemo(
    () => !Object.values(initialDataLoaded).every(Boolean),
    [initialDataLoaded],
  );

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

      const action = isNew ? createPlan(payload) : updatePlan(editingPlan.id, payload);
      
      await toast.promise(action, {
        loading: "Salvando plano...",
        success: "Plano salvo com sucesso!",
        error: "Erro ao salvar plano",
      });

      setEditingPlan(null);
      setEditingFields({});
    } catch (err) {
      console.error("Failed to save plan");
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
        await toast.promise(deletePlanService(plan.id), {
          loading: "Deletando plano...",
          success: "Plano deletado!",
          error: "Erro ao deletar plano",
        });
        if (editingPlan?.id === plan.id) setEditingPlan(null);
      } catch (err) {
        if (err instanceof PlanInUseError) {
          toast.error(err.message);
          return;
        }
        console.error("Failed to delete plan");
      }
    },
    [editingPlan],
  );

  const handleTogglePlanActive = useCallback(async (plan: Plan) => {
    await toast.promise(togglePlanActive(plan), {
      loading: "Alterando status do plano...",
      success: "Status alterado com sucesso!",
      error: "Erro ao alterar status",
    });
  }, []);

  // ── Student handlers (delegated to service) ──────────────────────────
  const handleAssignPlan = useCallback(
    async (studentId: string, planId: string | null) => {
      await toast.promise(assignPlan(studentId, planId), {
        loading: "Atribuindo plano...",
        success: "Plano atribuído!",
        error: "Erro ao atribuir plano",
      });
    },
    [],
  );

  const handleSetPaymentDay = useCallback(
    async (studentId: string, day: number | null) => {
      await toast.promise(setPaymentDay(studentId, day), {
        loading: "Atualizando data de pagamento...",
        success: "Data atualizada!",
        error: "Erro ao atualizar data",
      });
    },
    [],
  );

  const handleTogglePayment = useCallback(
    async (student: StudentSummary) => {
      await toast.promise(togglePayment(student), {
        loading: "Alterando pagamento...",
        success: "Pagamento atualizado!",
        error: "Erro ao atualizar pagamento",
      });
    },
    [],
  );

  const toggleStudentActive = useCallback(
    async (student: StudentSummary) => {
      try {
        await toast.promise(toggleUserActive(student.id), {
          loading: "Alterando status...",
          success: "Status alterado com sucesso!",
          error: "Erro ao alterar status",
        });
      } catch (err) {
        console.error("Failed to toggle student active");
      }
    },
    [],
  );


  // ── Check-in history modal ───────────────────────────────────────────
  const viewCheckins = useCallback(async (student: StudentSummary) => {
    setSelectedStudentForHistory(student);
    setCheckinModalOpen(true);
    try {
      const history = await fetchCheckinsByUser(student.id, { lastDays: 15 });
      setCheckinHistory(history);
    } catch (err) {
      console.error("Failed to fetch check-in history");
      setCheckinHistory([]);
    }
  }, []);

  const closeCheckinsModal = useCallback(() => {
    setCheckinModalOpen(false);
    setSelectedStudentForHistory(null);
    setCheckinHistory([]);
  }, []);

  // ── Filtered students ────────────────────────────────────────────────
  const filteredStudents = useMemo(
    () => filterStudents(studentsWithCounts, { selectedPlanId, paymentFilter }),
    [studentsWithCounts, selectedPlanId, paymentFilter],
  );

  // ── Render ───────────────────────────────────────────────────────────
  if (isBootstrapping) {
    return <PageLoader message="Carregando dados do painel..." fullScreen={false} />;
  }

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
              { tab: "expirations", icon: Bell, label: "Vencimentos" },
            ] as const
          ).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
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
            { tab: "expirations", icon: <Bell className="h-5 w-5" />, label: "Cobranças" },
          ] as const
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
                {selectedTab === "expirations" && "Vencimentos"}
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

          {selectedTab === "expirations" && (
            <ExpirationsTab
              students={students}
              plans={plans}
              updateUserPhone={updateUserPhone}
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
