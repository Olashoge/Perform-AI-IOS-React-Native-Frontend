import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import jwt from "jsonwebtoken";
import { getDayData, getWeekData, getWeeklySummary, toggleCompletion } from "./schedule-service";

interface JwtPayload {
  userId?: string;
  id?: string;
  sub?: string;
  email?: string;
}

function extractUserId(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userId = decoded.userId || decoded.id || decoded.sub || "anonymous";
    (req as any).userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token decode failed" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/weekly-summary", extractUserId, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const weekStart = req.query.weekStart as string | undefined;
      const summary = await getWeeklySummary(userId, weekStart);
      res.json(summary);
    } catch (err) {
      console.error("[weekly-summary] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/week-data", extractUserId, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const weekStart = req.query.weekStart as string | undefined;
      const data = await getWeekData(userId, weekStart);
      res.json(data);
    } catch (err) {
      console.error("[week-data] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/day-data/:date", extractUserId, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }
      const data = await getDayData(userId, date);
      res.json(data);
    } catch (err) {
      console.error("[day-data] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/meals/:id", extractUserId, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { completed } = req.body;
      if (typeof completed !== "boolean") {
        return res.status(400).json({ error: "completed must be a boolean" });
      }
      const result = await toggleCompletion(userId, id, "meal", completed);
      res.json(result);
    } catch (err) {
      console.error("[meals patch] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/workouts/:id", extractUserId, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { completed } = req.body;
      if (typeof completed !== "boolean") {
        return res.status(400).json({ error: "completed must be a boolean" });
      }
      const result = await toggleCompletion(userId, id, "workout", completed);
      res.json(result);
    } catch (err) {
      console.error("[workouts patch] Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
