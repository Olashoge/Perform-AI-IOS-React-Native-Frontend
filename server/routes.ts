import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

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

export async function registerRoutes(app: Express): Promise<Server> {
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
