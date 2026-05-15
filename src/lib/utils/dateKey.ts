export function getDateKeyForOffset(date: Date, utcOffsetMinutes: number): string {
  // Shift by offset and read in UTC fields to avoid host timezone.
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function utcDateAtLocalTime(
  dateKey: string,
  localMinutes: number,
  utcOffsetMinutes: number,
): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const baseUtc = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
  // local = utc + offset  =>  utc = local - offset
  return new Date(baseUtc + (localMinutes - utcOffsetMinutes) * 60_000);
}

