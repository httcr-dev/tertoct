/**
 * Utilities for handling week-based filters (Monday to Friday)
 */

import { startOfWeek } from "@/lib/utils/date";

/**
 * Gets the start of the current business week (Monday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date);
}

/**
 * Gets the end of the current business week (Friday)
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday (Monday + 4 days)
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Gets all business days (Monday to Friday) for the current week
 */
export function getWeekDays(date: Date = new Date()): Date[] {
  const weekStart = getWeekStart(date);
  const days: Date[] = [];
  
  for (let i = 0; i < 5; i++) { // Monday to Friday
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  
  return days;
}

/**
 * Formats a date to YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Gets all date keys for the business week (Monday to Friday)
 */
export function getWeekDateKeys(date: Date = new Date()): string[] {
  return getWeekDays(date).map(formatDateKey);
}

/**
 * Checks if a date is within the current business week
 */
export function isInCurrentWeek(date: Date): boolean {
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return date >= weekStart && date <= weekEnd;
}

/**
 * Checks if a dateKey (YYYY-MM-DD) is within the current business week
 */
export function isDateKeyInCurrentWeek(dateKey: string): boolean {
  const currentWeekKeys = getWeekDateKeys();
  return currentWeekKeys.includes(dateKey);
}