type StartDay = "sunday" | "monday";

export function getWeekStartUTC(offset: number = 0, refDate?: string, startDay: StartDay = "monday"): string {
  const d = refDate ? new Date(refDate + "T12:00:00Z") : new Date();
  const utcDay = d.getUTCDay();

  let diff: number;
  if (startDay === "monday") {
    diff = utcDay === 0 ? -6 : 1 - utcDay;
  } else {
    diff = -utcDay;
  }

  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff + offset * 7));
  return start.toISOString().split("T")[0];
}

export function getWeekEndUTC(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

export function computeWeekStartForDate(dateStr: string, startDay: StartDay = "monday"): string {
  return getWeekStartUTC(0, dateStr, startDay);
}

export function getWeekStartForDay(offset: number = 0, refDate?: string, startDay: StartDay = "monday"): string {
  return getWeekStartUTC(offset, refDate, startDay);
}
