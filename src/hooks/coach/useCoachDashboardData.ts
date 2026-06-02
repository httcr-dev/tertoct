"use client";

import { useEffect, useState } from "react";
import type { CheckIn, GymClass, Plan, StudentSummary } from "@/lib/types";
import { getWeekStart } from "@/lib/utils/weekFilters";
import {
  fetchRecentCheckinsSince,
  listenCheckinCountsSince,
  listenCoaches,
  listenPlans,
  listenStudents,
} from "@/services/dashboardService";
import { listenActiveClasses } from "@/services/classService";

export type CoachBootstrapState = {
  plans: boolean;
  classes: boolean;
  students: boolean;
  checkins: boolean;
  recent: boolean;
};

const emptyBootstrap: CoachBootstrapState = {
  plans: false,
  classes: false,
  students: false,
  checkins: false,
  recent: false,
};

type UseCoachDashboardDataOptions = {
  loadProfessors: boolean;
};

export function useCoachDashboardData(options: UseCoachDashboardDataOptions) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [professors, setProfessors] = useState<StudentSummary[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([]);
  const [checkinCounts, setCheckinCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [bootstrap, setBootstrap] = useState<CoachBootstrapState>(emptyBootstrap);
  const [professorsLoaded, setProfessorsLoaded] = useState(false);

  useEffect(() => {
    const markLoaded = (key: keyof CoachBootstrapState) => {
      setBootstrap((prev) => ({ ...prev, [key]: true }));
    };
    const emptyOnPermissionError = <T,>(
      setter: (value: T) => void,
      emptyValue: T,
      key: keyof CoachBootstrapState,
    ) => {
      setter(emptyValue);
      markLoaded(key);
    };

    const unsubPlans = listenPlans(
      (next) => {
        setPlans(next);
        markLoaded("plans");
      },
      () => emptyOnPermissionError(setPlans, [], "plans"),
    );
    const unsubClasses = listenActiveClasses(
      (next) => {
        setClasses(next);
        markLoaded("classes");
      },
      () => {
        setClasses([]);
        markLoaded("classes");
      },
    );
    const unsubStudents = listenStudents(
      (next) => {
        setStudents(next);
        markLoaded("students");
      },
      () => emptyOnPermissionError(setStudents, [], "students"),
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const unsubMonthly = listenCheckinCountsSince(
      thirtyDaysAgo,
      (counts) => {
        setCheckinCounts(counts);
        markLoaded("checkins");
      },
      () => emptyOnPermissionError(setCheckinCounts, new Map(), "checkins"),
    );

    return () => {
      unsubPlans();
      unsubClasses();
      unsubStudents();
      unsubMonthly();
    };
  }, []);

  useEffect(() => {
    if (!options.loadProfessors) return;

    const unsubProfessors = listenCoaches(
      (next) => {
        setProfessors(next);
        setProfessorsLoaded(true);
      },
      () => {
        setProfessors([]);
        setProfessorsLoaded(true);
      },
    );

    return () => unsubProfessors();
  }, [options.loadProfessors]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const since = getWeekStart();
        setRecentCheckins(await fetchRecentCheckinsSince(since));
      } catch {
        setRecentCheckins([]);
      } finally {
        setBootstrap((prev) => ({ ...prev, recent: true }));
      }
    };
    void loadRecent();
  }, []);

  const isBootstrapping = !Object.values(bootstrap).every(Boolean);

  return {
    plans,
    classes,
    students,
    professors,
    recentCheckins,
    checkinCounts,
    isBootstrapping,
    professorsLoaded,
  };
}
