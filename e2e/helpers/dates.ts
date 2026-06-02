/** Monday 00:00 local time for the week containing `date`. */
export function startOfWeekMonday(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Week key used by check-in counters (ISO date of Monday). */
export function currentWeekIsoKey(date = new Date()): string {
  return startOfWeekMonday(date).toISOString().slice(0, 10);
}

/** Mon–Fri date keys (YYYY-MM-DD) for the current work week. */
export function workWeekDateKeys(date = new Date()): string[] {
  const monday = startOfWeekMonday(date);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateKey(d);
  });
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD for a date offset from today (local timezone). */
export function dateKeyFromToday(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Next Mon–Fri on or after `dayOffset` days from today. */
export function nextWeekdayDateKeyFromToday(dayOffset = 1): string {
  for (let i = dayOffset; i < 14; i++) {
    const key = dateKeyFromToday(i);
    const date = new Date(
      Number(key.slice(0, 4)),
      Number(key.slice(5, 7)) - 1,
      Number(key.slice(8, 10)),
    );
    const weekday = date.getDay();
    if (weekday >= 1 && weekday <= 5) {
      return key;
    }
  }
  throw new Error("No upcoming weekday within 14 days");
}
