"use client";

import Image from "next/image";
import { useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CheckIn, Plan, StudentSummary } from "@/lib/types";
import { filterStudents } from "@/lib/utils/studentFilter";
import {
  MUTATION_TOAST_MIN_MS,
  withMinDuration,
} from "@/lib/utils/withMinDuration";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthProvider";

import { Home, List, Users, CheckCircle, Bell, CalendarClock } from "lucide-react";
import { OverviewTab } from "./coach/OverviewTab";
import { PlansTab } from "./coach/PlansTab";
import { ClassesTab } from "./coach/ClassesTab";
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
  createGymClass,
  updateGymClass,
  deleteGymClass,
} from "@/services/classService";
import type { GymClass } from "@/lib/types";
import { useCoachDashboardData } from "@/hooks/coach/useCoachDashboardData";

type CoachTab =
  | "overview"
  | "plans"
  | "classes"
  | "professors"
  | "students"
  | "checkins"
  | "expirations";

export function CoachDashboard() {
  const { profile, signOutUser } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFields, setEditingFields] = useState<Partial<Plan>>({});
  const editPlanRef = useRef<HTMLDivElement>(null);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [editingClassFields, setEditingClassFields] = useState<
    Partial<GymClass>
  >({});
  const editClassRef = useRef<HTMLDivElement>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState<StudentSummary | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<CheckIn[]>([]);
  const [checkinHistoryLoading, setCheckinHistoryLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs: CoachTab[] = [
    "overview",
    "plans",
    "classes",
    "professors",
    "students",
    "checkins",
    "expirations",
  ];
  const initialTab = (searchParams.get("tab") as CoachTab | null);
  const [selectedTab, setSelectedTab] = useState<CoachTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "overview",
  );
  const [selectedStudentIdForCheckins, setSelectedStudentIdForCheckins] =
    useState("all");

  const tabsNeedingCheckinCounts: CoachTab[] = [
    "overview",
    "students",
    "checkins",
    "expirations",
  ];
  const tabsNeedingRecentCheckins: CoachTab[] = ["overview", "checkins"];

  const {
    plans,
    classes,
    students,
    professors,
    recentCheckins,
    checkinCounts,
    isBootstrapping,
    checkinCountsLoading,
    recentCheckinsLoading,
    professorsLoaded,
  } = useCoachDashboardData({
    loadProfessors: selectedTab === "professors",
    loadCheckinCounts: tabsNeedingCheckinCounts.includes(selectedTab),
    loadRecentCheckins: tabsNeedingRecentCheckins.includes(selectedTab),
  });

  const handleTabChange = useCallback((tab: CoachTab) => {
    setSelectedTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }, [router]);

  // ── Derived data ─────────────────────────────────────────────────────
  const studentsWithCounts = useMemo(
    () =>
      students.map((s) => ({
        ...s,
        weeklyCheckIns: checkinCounts.get(s.id) ?? 0,
      })),
    [students, checkinCounts],
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

  // ── Class handlers ───────────────────────────────────────────────────
  const scrollToEditClassPanel = useCallback(() => {
    setTimeout(() => {
      editClassRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, []);

  const handleEditClassClick = useCallback(
    (gymClass: GymClass) => {
      setEditingClass(gymClass);
      setEditingClassFields({
        name: gymClass.name,
        startTime: gymClass.startTime,
        checkinDeadlineTime: gymClass.checkinDeadlineTime,
        capacity: gymClass.capacity,
        utcOffsetMinutes: gymClass.utcOffsetMinutes,
        active: gymClass.active,
      });
      scrollToEditClassPanel();
    },
    [scrollToEditClassPanel],
  );

  const handleCreateClass = useCallback(() => {
    const tempId = `new_class_${Date.now()}`;
    setEditingClass({
      id: tempId,
      name: "",
      startTime: "07:00",
      checkinDeadlineTime: "06:30",
      capacity: 20,
      utcOffsetMinutes: -180,
      active: true,
      createdBy: profile?.id ?? "unknown",
      createdAt: null,
    });
    setEditingClassFields({
      name: "",
      startTime: "07:00",
      checkinDeadlineTime: "06:30",
      capacity: 20,
      utcOffsetMinutes: -180,
      active: true,
    });
    scrollToEditClassPanel();
  }, [profile?.id, scrollToEditClassPanel]);

  const handleSaveEditClass = useCallback(async () => {
    if (!editingClass) return;
    const isNew = editingClass.id.startsWith("new_class_");

    const payload = {
      name: (editingClassFields.name || editingClass.name || "Turma").trim(),
      startTime: String(
        editingClassFields.startTime ?? editingClass.startTime ?? "07:00",
      ),
      checkinDeadlineTime: String(
        editingClassFields.checkinDeadlineTime ??
          editingClass.checkinDeadlineTime ??
          "06:30",
      ),
      capacity: Number(editingClassFields.capacity ?? editingClass.capacity ?? 20),
      utcOffsetMinutes: -180,
      active: Boolean(editingClassFields.active ?? editingClass.active ?? true),
    };

    try {
      const action = isNew
        ? createGymClass(payload)
        : updateGymClass(editingClass.id, payload);

      await toast.promise(withMinDuration(action, MUTATION_TOAST_MIN_MS), {
        loading: "Salvando turma...",
        success: "Turma salva com sucesso!",
        error: "Erro ao salvar turma",
      });

      setEditingClass(null);
      setEditingClassFields({});
    } catch {
      console.error("Failed to save class");
    }
  }, [editingClass, editingClassFields]);

  const handleDeleteClass = useCallback(async (gymClass: GymClass) => {
    if (!window.confirm("Desativar esta turma?")) return;
    await toast.promise(
      withMinDuration(deleteGymClass(gymClass.id), MUTATION_TOAST_MIN_MS),
      {
        loading: "Desativando turma...",
        success: "Turma desativada!",
        error: "Erro ao desativar turma",
      },
    );
    if (editingClass?.id === gymClass.id) setEditingClass(null);
  }, [editingClass]);

  const handleToggleClassActive = useCallback(async (gymClass: GymClass) => {
    await toast.promise(
      withMinDuration(
        updateGymClass(gymClass.id, { active: !gymClass.active }),
        MUTATION_TOAST_MIN_MS,
      ),
      {
        loading: "Alterando status da turma...",
        success: "Status alterado!",
        error: "Erro ao alterar status",
      },
    );
  }, []);

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
      
      await toast.promise(withMinDuration(action, MUTATION_TOAST_MIN_MS), {
        loading: "Salvando plano...",
        success: "Plano salvo com sucesso!",
        error: "Erro ao salvar plano",
      });

      setEditingPlan(null);
      setEditingFields({});
    } catch {
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
        await toast.promise(
          withMinDuration(deletePlanService(plan.id), MUTATION_TOAST_MIN_MS),
          {
            loading: "Deletando plano...",
            success: "Plano deletado!",
            error: "Erro ao deletar plano",
          },
        );
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
    await toast.promise(
      withMinDuration(togglePlanActive(plan), MUTATION_TOAST_MIN_MS),
      {
        loading: "Alterando status do plano...",
        success: "Status alterado com sucesso!",
        error: "Erro ao alterar status",
      },
    );
  }, []);

  // ── Student handlers (delegated to service) ──────────────────────────
  const handleAssignPlan = useCallback(
    async (studentId: string, planId: string | null) => {
      await toast.promise(
        withMinDuration(assignPlan(studentId, planId), MUTATION_TOAST_MIN_MS),
        {
          loading: "Atribuindo plano...",
          success: "Plano atribuído!",
          error: "Erro ao atribuir plano",
        },
      );
    },
    [],
  );

  const handleSetPaymentDay = useCallback(
    async (studentId: string, day: number | null) => {
      await toast.promise(
        withMinDuration(setPaymentDay(studentId, day), MUTATION_TOAST_MIN_MS),
        {
          loading: "Atualizando data de pagamento...",
          success: "Data atualizada!",
          error: "Erro ao atualizar data",
        },
      );
    },
    [],
  );

  const handleTogglePayment = useCallback(
    async (student: StudentSummary) => {
      await toast.promise(
        withMinDuration(togglePayment(student), MUTATION_TOAST_MIN_MS),
        {
          loading: "Alterando pagamento...",
          success: "Pagamento atualizado!",
          error: "Erro ao atualizar pagamento",
        },
      );
    },
    [],
  );

  const toggleStudentActive = useCallback(
    async (student: StudentSummary) => {
      try {
        await toast.promise(
          withMinDuration(toggleUserActive(student.id), MUTATION_TOAST_MIN_MS),
          {
            loading: "Alterando status...",
            success: "Status alterado com sucesso!",
            error: "Erro ao alterar status",
          },
        );
      } catch {
        console.error("Failed to toggle student active");
      }
    },
    [],
  );


  // ── Check-in history modal ───────────────────────────────────────────
  const viewCheckins = useCallback(async (student: StudentSummary) => {
    setSelectedStudentForHistory(student);
    setCheckinModalOpen(true);
    setCheckinHistory([]);
    setCheckinHistoryLoading(true);
    try {
      const history = await fetchCheckinsByUser(student.id, { lastDays: 15 });
      setCheckinHistory(history);
    } catch {
      console.error("Failed to fetch check-in history");
      setCheckinHistory([]);
    } finally {
      setCheckinHistoryLoading(false);
    }
  }, []);

  const closeCheckinsModal = useCallback(() => {
    setCheckinModalOpen(false);
    setSelectedStudentForHistory(null);
    setCheckinHistory([]);
    setCheckinHistoryLoading(false);
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
    <div className="dashboard-layout flex min-h-screen w-full overflow-x-hidden text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="dashboard-sidebar hidden w-64 flex-col p-6 md:flex">
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
              { tab: "overview", icon: Home, label: "Visão Geral" },
              { tab: "plans", icon: List, label: "Planos" },
              { tab: "classes", icon: CalendarClock, label: "Turmas" },
              { tab: "professors", icon: Users, label: "Professores" },
              { tab: "students", icon: Users, label: "Alunos" },
              { tab: "checkins", icon: CheckCircle, label: "Check-Ins" },
              { tab: "expirations", icon: Bell, label: "Vencimentos" },
            ] as const
          ).map(({ tab, icon: Icon, label }) => (
            <button
              key={tab}
              type="button"
              data-testid={`coach-tab-${tab}`}
              onClick={() => handleTabChange(tab)}
              className={`dashboard-nav-item ${selectedTab === tab ? "dashboard-nav-item-active" : ""}`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="dashboard-mobile-nav grid grid-cols-6 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        {(
          [
            { tab: "overview", icon: <Home className="h-5 w-5" />, label: "Início" },
            { tab: "plans", icon: <List className="h-5 w-5" />, label: "Planos" },
            { tab: "classes", icon: <CalendarClock className="h-5 w-5" />, label: "Turmas" },
            { tab: "students", icon: <Users className="h-5 w-5" />, label: "Alunos" },
            { tab: "checkins", icon: <CheckCircle className="h-5 w-5" />, label: "Check-ins" },
            { tab: "expirations", icon: <Bell className="h-5 w-5" />, label: "Cobranças" },
          ] as const
        ).map(({ tab, icon, label }) => (
          <button
            key={tab}
            type="button"
            data-testid={`coach-tab-${tab}`}
            onClick={() => handleTabChange(tab)}
            className={`dashboard-mobile-tab min-[380px]:text-[10px] text-[9px] px-1 py-1 ${selectedTab === tab ? "dashboard-mobile-tab-active" : ""}`}
          >
            {icon}
            <span className="w-full truncate text-center">{label}</span>
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:px-4 md:px-8 md:py-6 md:pb-6">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5 pb-8 md:min-h-screen md:gap-8">
          <header className="dashboard-header-sticky flex items-center justify-between gap-3">
            <div>
              <p className="dashboard-eyebrow hidden md:block">Painel · TertoCT</p>
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 md:text-xl">
                {selectedTab === "overview" && "Visão Geral"}
                {selectedTab === "plans" && "Planos"}
                {selectedTab === "classes" && "Turmas"}
                {selectedTab === "professors" && "Professores"}
                {selectedTab === "students" && "Alunos"}
                {selectedTab === "checkins" && "Check-Ins"}
                {selectedTab === "expirations" && "Vencimentos"}
              </h1>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/50 bg-zinc-800 text-xs font-semibold text-zinc-300 shadow-sm shadow-amber-500/10">
                  {profile?.photoURL ? (
                    <Image
                      src={profile.photoURL}
                      alt={profile.name || ""}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover block"
                      referrerPolicy="no-referrer"
                      unoptimized
                      loading="lazy"
                    />
                  ) : profile?.name ? (
                    profile.name.charAt(0).toUpperCase()
                  ) : (
                    "C"
                  )}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[140px] truncate text-sm font-medium text-zinc-200">
                    {profile?.name ?? "Coach"}
                  </p>
                </div>
              </div>
              <div className="hidden h-4 w-px bg-zinc-800 sm:block" />
              <button
                onClick={signOutUser}
                className="cursor-pointer rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm"
              >
                Sair
              </button>
            </div>
          </header>

          {selectedTab === "overview" &&
            (recentCheckinsLoading || checkinCountsLoading ? (
              <PageLoader
                message="Carregando métricas..."
                fullScreen={false}
              />
            ) : (
              <OverviewTab
                students={students}
                plans={plans}
                recentCheckins={recentCheckins}
                classes={classes}
              />
            ))}

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

          {selectedTab === "classes" && (
            <ClassesTab
              classes={classes}
              handleEditClassClick={handleEditClassClick}
              handleCreateClass={handleCreateClass}
              handleToggleClassActive={handleToggleClassActive}
              editingClass={editingClass}
              editingFields={editingClassFields}
              setEditingFields={setEditingClassFields}
              handleSaveEditClass={handleSaveEditClass}
              handleDeleteClass={handleDeleteClass}
              setEditingClass={setEditingClass}
              editClassRef={editClassRef}
            />
          )}

          {selectedTab === "professors" &&
            (!professorsLoaded ? (
              <PageLoader message="Carregando professores..." fullScreen={false} />
            ) : (
              <ProfessorsTab
                professors={professors}
                toggleStudentActive={toggleStudentActive}
              />
            ))}

          {selectedTab === "students" &&
            (checkinCountsLoading ? (
              <PageLoader
                message="Carregando alunos..."
                fullScreen={false}
              />
            ) : (
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
            ))}

          {selectedTab === "checkins" &&
            (recentCheckinsLoading || checkinCountsLoading ? (
              <PageLoader
                message="Carregando check-ins..."
                fullScreen={false}
              />
            ) : (
              <CheckinsTab
                recentCheckins={recentCheckins}
                selectedStudentIdForCheckins={selectedStudentIdForCheckins}
                setSelectedStudentIdForCheckins={setSelectedStudentIdForCheckins}
                studentsWithCounts={studentsWithCounts}
                classes={classes}
              />
            ))}

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
            historyLoading={checkinHistoryLoading}
            plans={plans}
            classes={classes}
          />
        </div>
      </main>
    </div>
  );
}
