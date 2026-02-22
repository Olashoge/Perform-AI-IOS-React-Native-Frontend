export function getWeekStartUTC(offset: number = 0, refDate?: string): string {
  const d = refDate ? new Date(refDate + "T12:00:00Z") : new Date();
  const utcDay = d.getUTCDay();
  const diff = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff + offset * 7));
  return monday.toISOString().split("T")[0];
}

export function getWeekEndUTC(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

export function computeWeekStartForDate(dateStr: string): string {
  return getWeekStartUTC(0, dateStr);
}
