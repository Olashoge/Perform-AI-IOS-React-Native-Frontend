import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import https from "node:https";
import { db } from "./db";
import { completions } from "@shared/schema";
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
  app.post("/api/auth/refresh", proxyToExternal);

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
      if (completionMap.size === 0) return data;

      const rawArr = data?.weekData ?? data?.days ?? data;
      if (!Array.isArray(rawArr)) return data;

      const transformed = rawArr.map((day: any) => {
        const date = day?.date ?? "unknown";
        return applyCompletionsToDay(day, completionMap, date);
      });

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
      return applyCompletionsToDay(data, completionMap, date);
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
  app.delete("/api/plans/:id", proxyToExternal);
  app.get("/api/workouts", proxyToExternal);
  app.post("/api/workout", proxyToExternal);
  app.get("/api/workout/:id", proxyToExternal);
  app.get("/api/workout/:id/status", proxyToExternal);
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
