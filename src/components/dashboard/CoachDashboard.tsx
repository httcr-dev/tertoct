"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import type { Plan, StudentSummary, CheckIn } from "@/lib/types";
import { useAuth } from "../auth/AuthProvider";
import { Home, List, Users, CheckCircle } from "lucide-react";
import { OverviewTab } from "./coach/OverviewTab";
import { PlansTab } from "./coach/PlansTab";
import { ProfessorsTab } from "./coach/ProfessorsTab";
import { StudentsTab } from "./coach/StudentsTab";
import { CheckinsTab } from "./coach/CheckinsTab";
import { CheckinHistoryModal } from "./coach/CheckinHistoryModal";



export function CoachDashboard() {
  const { profile, signOutUser } = useAuth();
  const db = getFirestoreDb();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("all");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingFields, setEditingFields] = useState<Partial<Plan>>({});
  const editPlanRef = useRef<HTMLDivElement>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] =
    useState<StudentSummary | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<Array<any>>([]);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "plans" | "professors" | "students" | "checkins"
  >("overview");
  const [professors, setProfessors] = useState<StudentSummary[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [selectedStudentIdForCheckins, setSelectedStudentIdForCheckins] =
    useState<string>("all");
  const [checkinCounts, setCheckinCounts] = useState<Map<string, number>>(
    new Map(),
  );

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
            paymentDueDay: data.paymentDueDay ?? null,
            monthlyPaymentPaid: data.monthlyPaymentPaid ?? false,
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

    // Real-time listener for weekly check-ins
    const checkInsRef = collection(db, "checkins");
    const weekStart = startOfWeek(new Date());
    const unsubWeekly = onSnapshot(
      query(
        checkInsRef,
        where("createdAt", ">=", Timestamp.fromDate(weekStart)),
      ),
      (snap) => {
        const counts = new Map<string, number>();
        snap.forEach((d) => {
          const uid = d.data().userId;
          counts.set(uid, (counts.get(uid) ?? 0) + 1);
        });
        setCheckinCounts(counts);
      },
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
    return students.map((s) => ({
      ...s,
      weeklyCheckIns: checkinCounts.get(s.id) ?? 0,
    }));
  }, [students, checkinCounts]);

  const professorsWithCounts = useMemo(() => {
    return professors.map((p) => ({
      ...p,
      weeklyCheckIns: checkinCounts.get(p.id) ?? 0,
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
    setTimeout(() => {
      editPlanRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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
    setTimeout(() => {
      editPlanRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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

  const handleSetPaymentDay = async (studentId: string, day: number | null) => {
    const ref = doc(db, "users", studentId);
    if (day === null) {
      await updateDoc(ref, {
        paymentDueDay: deleteField(),
        monthlyPaymentPaid: deleteField(),
      });
    } else {
      await updateDoc(ref, { paymentDueDay: day });
    }
  };

  const handleTogglePayment = async (student: StudentSummary) => {
    const ref = doc(db, "users", student.id);
    await updateDoc(ref, {
      monthlyPaymentPaid: !student.monthlyPaymentPaid,
    });
  };

  const handleNavigateToCoaches = () => {
    // navigate to students section
    setSelectedTab("students");
  };

  return (
    <div className="flex min-h-screen bg-transparent text-zinc-50 selection:bg-amber-500/30">
      {/* Sidebar - hidden on mobile */}
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-zinc-800/60 bg-black/90 backdrop-blur-xl px-2 py-2">
        {[
          {
            tab: "overview" as const,
            icon: <Home className="h-5 w-5" />,
            label: "Início",
          },
          {
            tab: "plans" as const,
            icon: <List className="h-5 w-5" />,
            label: "Planos",
          },
          {
            tab: "students" as const,
            icon: <Users className="h-5 w-5" />,
            label: "Alunos",
          },
          {
            tab: "checkins" as const,
            icon: <CheckCircle className="h-5 w-5" />,
            label: "Check-ins",
          },
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
