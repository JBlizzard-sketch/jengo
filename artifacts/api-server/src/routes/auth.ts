import "../types/session";
import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { residentsTable, unitsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const authRouter = Router();

const LoginBody = z.object({
  email: z.string().email(),
  unitNumber: z.string().min(1),
});

// POST /api/auth/login — resident logs in by email + unit number
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Email and unit number required" });
    return;
  }
  const { email, unitNumber } = parse.data;

  // Find the unit by number (search across all buildings)
  const units = await db.select().from(unitsTable).where(eq(unitsTable.unitNumber, unitNumber));
  if (!units.length) {
    res.status(401).json({ error: "No matching resident found. Check your email and unit number." });
    return;
  }

  // Find resident matching email + unit
  const residents = await db.select().from(residentsTable)
    .where(and(eq(residentsTable.email, email), eq(residentsTable.status, "active")));

  const unitIds = units.map(u => u.id);
  const resident = residents.find(r => unitIds.includes(r.unitId));
  if (!resident) {
    res.status(401).json({ error: "No matching resident found. Check your email and unit number." });
    return;
  }

  const unit = units.find(u => u.id === resident.unitId)!;

  req.session.residentId = resident.id;
  req.session.residentEmail = resident.email ?? email;
  req.session.residentName = `${resident.firstName} ${resident.lastName}`;
  req.session.buildingId = resident.buildingId;
  req.session.unitId = resident.unitId;

  req.log.info({ residentId: resident.id }, "Resident login");

  res.json({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    email: resident.email,
    unitNumber: unit.unitNumber,
    buildingId: resident.buildingId,
    unitId: resident.unitId,
    isOwner: resident.isOwner,
  });
});

// POST /api/auth/logout
authRouter.post("/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me — returns current session resident
authRouter.get("/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.session?.residentId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [resident] = await db.select().from(residentsTable)
    .where(eq(residentsTable.id, req.session.residentId));

  if (!resident) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, resident.unitId));

  res.json({
    id: resident.id,
    name: `${resident.firstName} ${resident.lastName}`,
    email: resident.email,
    unitNumber: unit?.unitNumber,
    buildingId: resident.buildingId,
    unitId: resident.unitId,
    isOwner: resident.isOwner,
  });
});
