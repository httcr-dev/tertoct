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
