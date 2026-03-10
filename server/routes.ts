import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import https from "node:https";
import { db } from "./db";
import { completions, planSchedules } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

function getGitCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function getDbIdentifierHash(): string {
  const dbUrl = process.env.DATABASE_URL || "none";
  if (dbUrl === "none") return "no-db-configured";
  return createHash("sha256").update(dbUrl).digest("hex").slice(0, 12);
}

function getWeekStartISO(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();
  const utcDay = d.getUTCDay();
  const diff = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday.toISOString().split("T")[0];
}

function getWeekEndISO(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

function extractUserId(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.userId || payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

const EXTERNAL_BACKEND = "https://mealplanai.replit.app";

function proxyToExternal(req: any, res: any) {
  const targetUrl = new URL(req.originalUrl, EXTERNAL_BACKEND);
  const options: https.RequestOptions = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
      let body = "";
      proxyRes.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      proxyRes.on("end", () => {
        console.error(`Proxy ${req.method} ${req.originalUrl} => ${proxyRes.statusCode}: ${body}`);
        res.status(proxyRes.statusCode || 500);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "access-control-allow-origin") {
            res.setHeader(key, value as string);
          }
        });
        res.end(body);
      });
      return;
    }
    res.status(proxyRes.statusCode || 500);
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "access-control-allow-origin") {
        res.setHeader(key, value as string);
      }
    });
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({ error: "Backend proxy error", message: err.message });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

function proxyAndTransform(req: any, res: any, transform: (data: any, userId: string) => Promise<any>) {
  const userId = extractUserId(req);
  const targetUrl = new URL(req.originalUrl, EXTERNAL_BACKEND);
  const options: https.RequestOptions = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let body = "";
    proxyRes.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    proxyRes.on("end", async () => {
      try {
        const data = JSON.parse(body);
        const transformed = userId ? await transform(data, userId) : data;
        res.status(proxyRes.statusCode || 200).json(transformed);
      } catch {
        res.status(proxyRes.statusCode || 200);
        res.end(body);
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({ error: "Backend proxy error", message: err.message });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
}

async function getCompletionsForUser(userId: string, idPrefix?: string): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  try {
    let rows;
    if (idPrefix) {
      rows = await db.select().from(completions).where(
        and(eq(completions.userId, userId), like(completions.id, `${idPrefix}%`))
      );
    } else {
      rows = await db.select().from(completions).where(eq(completions.userId, userId));
    }
    for (const row of rows) {
      map.set(row.id, row.completed);
    }
  } catch (err) {
    console.error("Error fetching completions:", err);
  }
  return map;
}

async function getLocalSchedulesForUser(userId: string): Promise<Map<string, { startDate: string | null; planType: string }>> {
  const map = new Map();
  try {
    const rows = await db.select().from(planSchedules).where(eq(planSchedules.userId, userId));
    for (const row of rows) {
      map.set(row.planId, { startDate: row.startDate, planType: row.planType });
    }
  } catch (err) {
    console.error("Error fetching local schedules:", err);
  }
  return map;
}

function fetchExternalPlan(planType: "meal" | "workout", planId: string, authHeader: string): Promise<any> {
  const path = planType === "meal" ? `/api/plan/${planId}` : `/api/workout/${planId}`;
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(path, EXTERNAL_BACKEND);
    const options: https.RequestOptions = {
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    };
    const req = https.request(options, (proxyRes) => {
      let body = "";
      proxyRes.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      proxyRes.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

function getDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeDatesForPlan(startDate: string, numDays: number): string[] {
  const dates: string[] = [];
  const sd = new Date(startDate + "T12:00:00Z");
  for (let i = 0; i < numDays; i++) {
    const d = new Date(sd);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(getDateStr(d));
  }
  return dates;
}

function getDayIndex(startDate: string, targetDate: string): number {
  const sd = new Date(startDate + "T12:00:00Z");
  const td = new Date(targetDate + "T12:00:00Z");
  return Math.round((td.getTime() - sd.getTime()) / (24 * 60 * 60 * 1000));
}

async function getPlanDuration(planType: "meal" | "workout", planId: string, authHeader: string, cache: Map<string, any>): Promise<number> {
  try {
    if (!cache.has(planId)) {
      const planData = await fetchExternalPlan(planType, planId, authHeader);
      if (planData) cache.set(planId, planData);
    }
    const planData = cache.get(planId);
    if (!planData) return 7;
    const pj = planData.planJson ? (typeof planData.planJson === "string" ? JSON.parse(planData.planJson) : planData.planJson) : null;
    const days = pj?.days || planData?.days || [];
    return Array.isArray(days) && days.length > 0 ? days.length : 7;
  } catch {
    return 7;
  }
}

function applyCompletionsToDay(day: any, completionMap: Map<string, boolean>, date: string): any {
  if (!day) return day;
  if (completionMap.size === 0) return { ...day, date: day.date || date };

  if (Array.isArray(day.meals)) {
    const meals = day.meals.map((m: any, i: number) => {
      const id = m.id || `meal-${date}-${i}`;
      const hasLocal = completionMap.has(id);
      return { ...m, id, completed: hasLocal ? completionMap.get(id) : (m.completed ?? false) };
    });
    const workouts = Array.isArray(day.workouts) ? day.workouts.map((w: any, i: number) => {
      const id = w.id || `workout-${date}-${i}`;
      const hasLocal = completionMap.has(id);
      return { ...w, id, completed: hasLocal ? completionMap.get(id) : (w.completed ?? false) };
    }) : (day.workouts ?? []);
    return { ...day, date: day.date || date, meals, workouts };
  }

  return { ...day, date: day.date || date };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.post("/api/auth/token-login", proxyToExternal);
  app.post("/api/auth/signup", proxyToExternal);
  app.post("/api/auth/refresh", proxyToExternal);
  app.post("/api/auth/change-password", proxyToExternal);
  app.post("/api/auth/forgot-password", proxyToExternal);

  app.delete("/api/me", async (req: any, res: any) => {
    const authHeader = req.headers.authorization || "";
    if (!authHeader) {
      return res.status(401).json({ success: false, code: "AUTH_REQUIRED", message: "Your session expired. Please log in again." });
    }

    try {
      const targetUrl = new URL("/api/me", EXTERNAL_BACKEND);

      const extRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const options: https.RequestOptions = {
          hostname: targetUrl.hostname,
          port: 443,
          path: targetUrl.pathname,
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        };

        const extReq = https.request(options, (r) => {
          let data = "";
          r.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          r.on("end", () => resolve({ status: r.statusCode || 500, body: data }));
        });

        extReq.on("error", (err) => reject(err));
        extReq.end();
      });

      console.log(`[DELETE /api/me] External returned ${extRes.status}: ${extRes.body}`);

      if (extRes.status === 200) {
        const userId = extractUserId(req);
        if (userId) {
          try {
            await db.delete(completions).where(eq(completions.userId, userId));
            console.log(`[DELETE] Cleaned up local completions for user ${userId}`);
          } catch (err) {
            console.error("Error cleaning up local completions:", err);
          }
        }
      }

      res.status(extRes.status);
      try {
        res.json(JSON.parse(extRes.body));
      } catch {
        res.json({ success: false, code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." });
      }
    } catch (err) {
      console.error("Error calling external delete:", err);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Unable to reach the server. Please try again." });
    }
  });

  app.get("/api/weekly-summary", (req, res) => {
    proxyAndTransform(req, res, async (data, userId) => {
      const completionMap = await getCompletionsForUser(userId);
      if (completionMap.size === 0) return data;

      let mealsCompleted = data.mealsCompleted ?? 0;
      let workoutsCompleted = data.workoutsCompleted ?? 0;
      const mealsTotal = data.mealsTotal ?? 0;
      const workoutsTotal = data.workoutsTotal ?? 0;

      for (const [id, completed] of completionMap) {
        if (id.startsWith("meal-")) {
          if (completed) mealsCompleted = Math.min(mealsCompleted + 1, mealsTotal);
        } else if (id.startsWith("workout-")) {
          if (completed) workoutsCompleted = Math.min(workoutsCompleted + 1, workoutsTotal);
        }
      }

      const total = mealsTotal + workoutsTotal;
      const done = mealsCompleted + workoutsCompleted;
      const score = total > 0 ? Math.round((done / total) * 100) : 0;

      return { ...data, score, mealsCompleted, workoutsCompleted };
    });
  });

  app.get("/api/week-data", (req, res) => {
    proxyAndTransform(req, res, async (data, userId) => {
      const completionMap = await getCompletionsForUser(userId);
      const localSchedules = await getLocalSchedulesForUser(userId);

      const rawArr = data?.weekData ?? data?.days ?? data;
      if (!Array.isArray(rawArr)) return data;

      const weekStart = req.query.weekStart as string || rawArr[0]?.date;
      const weekDates = new Set<string>();
      if (weekStart) {
        const ws = new Date(weekStart + "T12:00:00Z");
        for (let i = 0; i < 7; i++) {
          const d = new Date(ws);
          d.setUTCDate(d.getUTCDate() + i);
          weekDates.add(getDateStr(d));
        }
      }

      let transformed = rawArr.map((day: any) => {
        const date = day?.date ?? "unknown";
        return applyCompletionsToDay(day, completionMap, date);
      });

      if (localSchedules.size > 0) {
        const dayMap = new Map<string, any>();
        for (const day of transformed) {
          dayMap.set(day.date, { ...day });
        }

        const affectedPlanIds = new Set<string>();
        for (const day of transformed) {
          const pIds = day.planIds || [];
          const wPlanId = day.workoutPlanId;
          for (const pid of pIds) {
            if (localSchedules.has(pid)) affectedPlanIds.add(pid);
          }
          if (wPlanId && localSchedules.has(wPlanId)) affectedPlanIds.add(wPlanId);
        }

        for (const [planId, schedule] of localSchedules) {
          if (schedule.startDate) {
            const planDates = computeDatesForPlan(schedule.startDate, 14);
            for (const pd of planDates) {
              if (weekDates.has(pd)) affectedPlanIds.add(planId);
            }
          }
        }

        if (affectedPlanIds.size > 0) {
          const planCache = new Map<string, any>();

          for (const day of dayMap.values()) {
            const pIds = [...(day.planIds || [])];
            let removedMealPlan = false;
            for (const pid of pIds) {
              if (!localSchedules.has(pid)) continue;
              const sched = localSchedules.get(pid)!;
              const planDuration = await getPlanDuration(sched.planType as "meal" | "workout", pid, req.headers.authorization || "", planCache);
              const localDates = sched.startDate ? computeDatesForPlan(sched.startDate, planDuration) : [];
              if (!localDates.includes(day.date)) {
                if (sched.planType === "meal") {
                  day.planIds = (day.planIds || []).filter((id: string) => id !== pid);
                  removedMealPlan = true;
                }
              }
            }
            if (removedMealPlan && (day.planIds || []).length === 0) {
              day.meals = day.meals && typeof day.meals === "object" && !Array.isArray(day.meals) ? {} : [];
              day.mealSlots = [];
            }

            const wPlanId = day.workoutPlanId;
            if (wPlanId && localSchedules.has(wPlanId)) {
              const sched = localSchedules.get(wPlanId)!;
              const planDuration = await getPlanDuration("workout", wPlanId, req.headers.authorization || "", planCache);
              const localDates = sched.startDate ? computeDatesForPlan(sched.startDate, planDuration) : [];
              if (!localDates.includes(day.date)) {
                day.workout = null;
                day.workoutPlanId = null;
                day.isWorkoutDay = false;
              }
            }
          }

          for (const planId of affectedPlanIds) {
            const sched = localSchedules.get(planId);
            if (!sched || !sched.startDate) continue;

            if (!planCache.has(planId)) {
              const planData = await fetchExternalPlan(
                sched.planType as "meal" | "workout",
                planId,
                req.headers.authorization || ""
              );
              if (planData) planCache.set(planId, planData);
            }
            const planData = planCache.get(planId);
            if (!planData) continue;

            let pj: any = null;
            try {
              pj = planData.planJson ? (typeof planData.planJson === "string" ? JSON.parse(planData.planJson) : planData.planJson) : null;
            } catch { pj = null; }
            const days = pj?.days || planData?.days || [];
            const planDuration = Array.isArray(days) && days.length > 0 ? days.length : 7;
            const localDates = computeDatesForPlan(sched.startDate, planDuration);
            const datesInWeek = localDates.filter((d) => weekDates.has(d));
            if (datesInWeek.length === 0) continue;

            for (const targetDate of datesInWeek) {
              const dayIdx = getDayIndex(sched.startDate, targetDate);
              if (dayIdx < 0 || dayIdx >= days.length) continue;
              const planDay = days[dayIdx];
              if (!planDay) continue;

              let dayEntry = dayMap.get(targetDate);
              if (!dayEntry) {
                dayEntry = { date: targetDate, meals: {}, planIds: [], workout: null, workoutPlanId: null, isWorkoutDay: false, dailyMeal: null, dailyWorkout: null, hasDailyMeal: false, hasDailyWorkout: false, completions: [] };
                dayMap.set(targetDate, dayEntry);
              }

              if (sched.planType === "meal") {
                if (!dayEntry.planIds.includes(planId)) dayEntry.planIds.push(planId);
                const mealSlots = planDay.mealSlots || Object.keys(planDay.meals || {});
                if (planDay.meals) {
                  dayEntry.meals = typeof dayEntry.meals === "object" && !Array.isArray(dayEntry.meals)
                    ? { ...dayEntry.meals, ...planDay.meals }
                    : planDay.meals;
                }
                if (mealSlots.length > 0) {
                  dayEntry.mealSlots = [...new Set([...(dayEntry.mealSlots || []), ...mealSlots])];
                }
              } else if (sched.planType === "workout") {
                dayEntry.workoutPlanId = planId;
                if (planDay.isWorkoutDay !== false) {
                  dayEntry.isWorkoutDay = true;
                  dayEntry.workout = planDay.workout || planDay.session || planDay;
                } else {
                  dayEntry.isWorkoutDay = false;
                  dayEntry.workout = null;
                }
              }
            }
          }
        }

        transformed = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }

      if (data?.weekData) return { ...data, weekData: transformed };
      if (data?.days) return { ...data, days: transformed };
      return transformed;
    });
  });

  app.get("/api/day-data/:date", (req, res) => {
    const date = req.params.date;
    proxyAndTransform(req, res, async (data, userId) => {
      const completionMap = await getCompletionsForUser(userId, `meal-${date}`);
      const workoutMap = await getCompletionsForUser(userId, `workout-${date}`);
      for (const [k, v] of workoutMap) completionMap.set(k, v);
      let dayData = applyCompletionsToDay(data, completionMap, date);

      const localSchedules = await getLocalSchedulesForUser(userId);
      if (localSchedules.size > 0) {
        const dayPlanCache = new Map<string, any>();
        const pIds = [...(dayData.planIds || [])];
        let removedMealPlanFromDay = false;
        for (const pid of pIds) {
          if (!localSchedules.has(pid)) continue;
          const sched = localSchedules.get(pid)!;
          const planDuration = await getPlanDuration(sched.planType as "meal" | "workout", pid, req.headers.authorization || "", dayPlanCache);
          const localDates = sched.startDate ? computeDatesForPlan(sched.startDate, planDuration) : [];
          if (!localDates.includes(date)) {
            if (sched.planType === "meal") {
              dayData = { ...dayData, planIds: (dayData.planIds || []).filter((id: string) => id !== pid) };
              removedMealPlanFromDay = true;
            }
          }
        }
        if (removedMealPlanFromDay && (dayData.planIds || []).length === 0) {
          dayData = { ...dayData, meals: typeof dayData.meals === "object" && !Array.isArray(dayData.meals) ? {} : [], mealSlots: [] };
        }
        const wPlanId = dayData.workoutPlanId;
        if (wPlanId && localSchedules.has(wPlanId)) {
          const sched = localSchedules.get(wPlanId)!;
          const planDuration = await getPlanDuration("workout", wPlanId, req.headers.authorization || "", dayPlanCache);
          const localDates = sched.startDate ? computeDatesForPlan(sched.startDate, planDuration) : [];
          if (!localDates.includes(date)) {
            dayData = { ...dayData, workout: null, workoutPlanId: null, isWorkoutDay: false };
          }
        }

        for (const [planId, sched] of localSchedules) {
          if (!sched.startDate) continue;
          if (!dayPlanCache.has(planId)) {
            const pd = await fetchExternalPlan(sched.planType as "meal" | "workout", planId, req.headers.authorization || "");
            if (pd) dayPlanCache.set(planId, pd);
          }
          const planData = dayPlanCache.get(planId);
          if (!planData) continue;
          let pj: any = null;
          try {
            pj = planData.planJson ? (typeof planData.planJson === "string" ? JSON.parse(planData.planJson) : planData.planJson) : null;
          } catch { pj = null; }
          const days = pj?.days || planData?.days || [];
          const planDuration = Array.isArray(days) && days.length > 0 ? days.length : 7;
          const localDates = computeDatesForPlan(sched.startDate, planDuration);
          if (!localDates.includes(date)) continue;
          const dayIdx = getDayIndex(sched.startDate, date);
          const planDay = days[dayIdx];
          if (!planDay) continue;

          if (sched.planType === "meal") {
            if (!(dayData.planIds || []).includes(planId)) {
              dayData = { ...dayData, planIds: [...(dayData.planIds || []), planId] };
            }
            if (planDay.meals) {
              dayData.meals = typeof dayData.meals === "object" && !Array.isArray(dayData.meals)
                ? { ...dayData.meals, ...planDay.meals } : planDay.meals;
            }
            const mealSlots = planDay.mealSlots || Object.keys(planDay.meals || {});
            if (mealSlots.length > 0) {
              dayData.mealSlots = [...new Set([...(dayData.mealSlots || []), ...mealSlots])];
            }
          } else if (sched.planType === "workout") {
            dayData.workoutPlanId = planId;
            if (planDay.isWorkoutDay !== false) {
              dayData.isWorkoutDay = true;
              dayData.workout = planDay.workout || planDay.session || planDay;
            }
          }
        }
      }

      return dayData;
    });
  });

  app.patch("/api/meals/:id", async (req, res) => {
    const userId = extractUserId(req);
    const id = req.params.id;
    const { completed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const existing = await db.select().from(completions).where(eq(completions.id, id));
      if (existing.length > 0) {
        await db.update(completions).set({ completed: !!completed }).where(eq(completions.id, id));
      } else {
        await db.insert(completions).values({ id, userId, itemType: "meal", completed: !!completed });
      }
      console.log(`[PATCH] meal ${id} -> completed=${completed} for user ${userId}`);
      res.json({ id, completed: !!completed, itemType: "meal" });
    } catch (err: any) {
      console.error("Error saving meal completion:", err);
      res.status(500).json({ error: "Failed to save completion" });
    }
  });

  app.patch("/api/workouts/:id", async (req, res) => {
    const userId = extractUserId(req);
    const id = req.params.id;
    const { completed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const existing = await db.select().from(completions).where(eq(completions.id, id));
      if (existing.length > 0) {
        await db.update(completions).set({ completed: !!completed }).where(eq(completions.id, id));
      } else {
        await db.insert(completions).values({ id, userId, itemType: "workout", completed: !!completed });
      }
      console.log(`[PATCH] workout ${id} -> completed=${completed} for user ${userId}`);
      res.json({ id, completed: !!completed, itemType: "workout" });
    } catch (err: any) {
      console.error("Error saving workout completion:", err);
      res.status(500).json({ error: "Failed to save completion" });
    }
  });

  app.post("/api/completions/toggle", proxyToExternal);

  app.get("/api/profile", proxyToExternal);
  app.post("/api/profile", proxyToExternal);
  app.put("/api/profile", proxyToExternal);
  app.patch("/api/profile", proxyToExternal);

  app.get("/api/preferences", proxyToExternal);
  app.get("/api/preferences/exercise", proxyToExternal);
  app.post("/api/preferences/exercise", proxyToExternal);
  app.post("/api/preferences/meal", proxyToExternal);
  app.delete("/api/preferences/meal/:id", proxyToExternal);
  app.delete("/api/preferences/ingredient/:id", proxyToExternal);
  app.delete("/api/preferences/exercise/:id", proxyToExternal);
  app.delete("/api/preferences/exercise/key/:key", proxyToExternal);
  app.post("/api/feedback/meal", proxyToExternal);
  app.post("/api/ingredient-proposals/:id/resolve", proxyToExternal);

  app.get("/api/availability", proxyToExternal);
  app.post("/api/performance/apply-recovery-week", proxyToExternal);
  app.post("/api/goal-plans/generate", (req: any, res: any) => {
    console.log("[Goal Plan] POST /api/goal-plans/generate payload:", JSON.stringify(req.body, null, 2));
    const targetUrl = new URL(req.originalUrl, EXTERNAL_BACKEND);
    const bodyStr = JSON.stringify(req.body);
    const options: https.RequestOptions = {
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname + targetUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      let responseBody = "";
      proxyRes.on("data", (chunk: any) => { responseBody += chunk; });
      proxyRes.on("end", () => {
        console.log(`[Goal Plan] Response ${proxyRes.statusCode}:`, responseBody.substring(0, 500));
        res.status(proxyRes.statusCode || 500);
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "access-control-allow-origin") {
            res.setHeader(key, value as string);
          }
        });
        res.send(responseBody);
      });
    });
    proxyReq.on("error", (err) => {
      console.error("[Goal Plan] Proxy error:", err.message);
      res.status(502).json({ error: "Backend proxy error", message: err.message });
    });
    proxyReq.write(bodyStr);
    proxyReq.end();
  });
  app.get("/api/goal-plans/:id/generation-status", proxyToExternal);
  app.get("/api/goal-plans", proxyToExternal);
  app.get("/api/goal-plans/:id", proxyToExternal);
  app.patch("/api/goal-plans/:id", proxyToExternal);
  app.delete("/api/goal-plans/:id", proxyToExternal);
  app.get("/api/plans", proxyToExternal);
  app.post("/api/plan", proxyToExternal);
  app.get("/api/plan/:id", proxyToExternal);
  app.get("/api/plan/:id/status", proxyToExternal);
  app.patch("/api/plans/:id/schedule", async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const planId = req.params.id;
    const { startDate } = req.body;
    try {
      if (startDate === null || startDate === undefined) {
        await db.delete(planSchedules).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        console.log(`[Schedule] Unscheduled meal plan ${planId} for user ${userId}`);
      } else {
        const existing = await db.select().from(planSchedules).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        if (existing.length > 0) {
          await db.update(planSchedules).set({ startDate }).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        } else {
          await db.insert(planSchedules).values({ planId, userId, planType: "meal", startDate });
        }
        console.log(`[Schedule] Scheduled meal plan ${planId} to ${startDate} for user ${userId}`);
      }
      res.json({ success: true, planId, startDate: startDate || null });
    } catch (err: any) {
      console.error("Error updating meal plan schedule:", err);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.patch("/api/plans/:id", proxyToExternal);
  app.delete("/api/plans/:id", proxyToExternal);
  app.get("/api/workouts", proxyToExternal);
  app.post("/api/workout", proxyToExternal);
  app.get("/api/workout/:id", proxyToExternal);
  app.get("/api/workout/:id/status", proxyToExternal);

  app.patch("/api/workouts/:id/schedule", async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const planId = req.params.id;
    const { startDate } = req.body;
    try {
      if (startDate === null || startDate === undefined) {
        await db.delete(planSchedules).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        console.log(`[Schedule] Unscheduled workout plan ${planId} for user ${userId}`);
      } else {
        const existing = await db.select().from(planSchedules).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        if (existing.length > 0) {
          await db.update(planSchedules).set({ startDate }).where(and(eq(planSchedules.planId, planId), eq(planSchedules.userId, userId)));
        } else {
          await db.insert(planSchedules).values({ planId, userId, planType: "workout", startDate });
        }
        console.log(`[Schedule] Scheduled workout plan ${planId} to ${startDate} for user ${userId}`);
      }
      res.json({ success: true, planId, startDate: startDate || null });
    } catch (err: any) {
      console.error("Error updating workout plan schedule:", err);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/workouts/:id", proxyToExternal);
  app.post("/api/workout/:id/swap", proxyToExternal);
  app.post("/api/workout/:id/regenerate-session", proxyToExternal);
  app.get("/api/calendar/occupied-dates", proxyToExternal);

  app.post("/api/daily-meals", proxyToExternal);
  app.post("/api/daily-meal", proxyToExternal);
  app.get("/api/daily-meals/:date", proxyToExternal);
  app.get("/api/daily-meal/:date", proxyToExternal);
  app.post("/api/daily-workouts", proxyToExternal);
  app.post("/api/daily-workout", proxyToExternal);
  app.get("/api/daily-workouts/:date", proxyToExternal);
  app.get("/api/daily-workout/:date", proxyToExternal);
  app.get("/api/daily-coverage", proxyToExternal);

  app.get("/api/allowance/current", proxyToExternal);

  app.get("/api/plan/:id/grocery", proxyToExternal);
  app.post("/api/plan/:id/grocery/owned", proxyToExternal);
  app.post("/api/plan/:id/grocery/regenerate", proxyToExternal);

  app.post("/api/plan/:id/swap", proxyToExternal);
  app.post("/api/plan/:id/regenerate-day", proxyToExternal);

  app.get("/api/local/plan-schedules", async (req, res) => {
    const userId = extractUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const schedules = await db.select().from(planSchedules).where(eq(planSchedules.userId, userId));
      const map: Record<string, string | null> = {};
      for (const s of schedules) {
        map[s.planId] = s.startDate;
      }
      res.json(map);
    } catch (err: any) {
      console.error("Error fetching plan schedules:", err);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.get("/api/meta", (_req, res) => {
    const commitHash = getGitCommitHash();
    const dbHash = getDbIdentifierHash();

    res.json({
      environmentName: process.env.NODE_ENV || "development",
      dbNameOrIdentifierHash: dbHash,
      serverTimeISO: new Date().toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      gitCommitHash: commitHash,
    });
  });

  app.get("/api/week-bounds", (req, res) => {
    const refDate = typeof req.query.date === "string" ? req.query.date : undefined;
    const weekStart = getWeekStartISO(refDate);
    const weekEnd = getWeekEndISO(weekStart);

    res.json({
      weekStart,
      weekEnd,
      rule: "ISO 8601: Monday-based, UTC",
      referenceDate: refDate || new Date().toISOString().split("T")[0],
      serverTimeISO: new Date().toISOString(),
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
