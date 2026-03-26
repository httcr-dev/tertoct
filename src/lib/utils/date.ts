/**
 * Returns the Monday (start) of the week containing the given date.
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a Firestore-like timestamp (with toDate()) or a raw seconds-based
 * object into a JS Date. Returns null if parsing fails.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const v = value as Record<string, unknown>;
  if (typeof v.toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v.seconds === "number") {
    return new Date(v.seconds * 1000);
  }
  return null;
}
