"use client";

import { useEffect, useState } from "react";
import type { CheckIn, GymClass, Plan, StudentSummary } from "@/lib/types";
import { getBusinessWeekAnchor, getWeekStart } from "@/lib/utils/weekFilters";
import {
  fetchAllStudentsForCoach,
  fetchCheckinCountsByCoach,
  fetchRecentCheckinsSince,
  getCoachCheckinCountsPollIntervalMs,
  getCoachStudentsPollIntervalMs,
  listenCoaches,
  listenPlans,
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
  loadCheckinCounts: boolean;
  loadRecentCheckins: boolean;
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

    let studentsCancelled = false;
    const loadStudents = async () => {
      try {
        const next = await fetchAllStudentsForCoach();
        if (!studentsCancelled) setStudents(next);
      } catch {
        if (!studentsCancelled) setStudents([]);
      } finally {
        if (!studentsCancelled) markLoaded("students");
      }
    };
    void loadStudents();
    const studentsInterval = window.setInterval(() => {
      void fetchAllStudentsForCoach()
        .then((next) => {
          if (!studentsCancelled) setStudents(next);
        })
        .catch(() => {
          /* keep previous students on poll failure */
        });
    }, getCoachStudentsPollIntervalMs());

    return () => {
      unsubPlans();
      unsubClasses();
      studentsCancelled = true;
      window.clearInterval(studentsInterval);
    };
  }, []);

  useEffect(() => {
    if (!options.loadCheckinCounts) return;

    let cancelled = false;
    setBootstrap((prev) =>
      prev.checkins ? prev : { ...prev, checkins: false },
    );

    const loadCounts = async () => {
      try {
        const counts = await fetchCheckinCountsByCoach(30);
        if (!cancelled) setCheckinCounts(counts);
      } catch {
        if (!cancelled) setCheckinCounts(new Map());
      } finally {
        if (!cancelled) {
          setBootstrap((prev) => ({ ...prev, checkins: true }));
        }
      }
    };
    void loadCounts();
    const countsInterval = window.setInterval(() => {
      void fetchCheckinCountsByCoach(30)
        .then((counts) => {
          if (!cancelled) setCheckinCounts(counts);
        })
        .catch(() => {
          /* keep previous counts on poll failure */
        });
    }, getCoachCheckinCountsPollIntervalMs());

    return () => {
      cancelled = true;
      window.clearInterval(countsInterval);
    };
  }, [options.loadCheckinCounts]);

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
    if (!options.loadRecentCheckins) return;

    let cancelled = false;
    setBootstrap((prev) =>
      prev.recent ? prev : { ...prev, recent: false },
    );

    const loadRecent = async () => {
      try {
        const since = getWeekStart(getBusinessWeekAnchor("previous"));
        const next = await fetchRecentCheckinsSince(since);
        if (!cancelled) setRecentCheckins(next);
      } catch {
        if (!cancelled) setRecentCheckins([]);
      } finally {
        if (!cancelled) {
          setBootstrap((prev) => ({ ...prev, recent: true }));
        }
      }
    };
    void loadRecent();

    return () => {
      cancelled = true;
    };
  }, [options.loadRecentCheckins]);

  const isBootstrapping =
    !bootstrap.plans || !bootstrap.classes || !bootstrap.students;
  const checkinCountsLoading =
    options.loadCheckinCounts && !bootstrap.checkins;
  const recentCheckinsLoading =
    options.loadRecentCheckins && !bootstrap.recent;

  return {
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
  };
}
