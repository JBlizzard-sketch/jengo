import { Router } from "express";
import { db } from "@workspace/db";
import { visitorsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import {
  CreateVisitorBody, UpdateVisitorBody,
  ListVisitorsQueryParams, GetTodayVisitorsQueryParams,
} from "@workspace/api-zod";

export const visitorsRouter = Router();

visitorsRouter.get("/today", async (req, res) => {
  const query = GetTodayVisitorsQueryParams.parse(req.query);
  const today = new Date().toISOString().split("T")[0];
  const visitors = await db.select().from(visitorsTable)
    .where(and(eq(visitorsTable.buildingId, query.buildingId), eq(visitorsTable.expectedDate, today)));

  const expected = visitors.length;
  const checkedIn = visitors.filter(v => v.status === "checked_in").length;
  const checkedOut = visitors.filter(v => v.status === "checked_out").length;
  const pending = visitors.filter(v => v.status === "pending" || v.status === "approved").length;
  const denied = visitors.filter(v => v.status === "denied").length;

  res.json({ expected, checkedIn, checkedOut, pending, denied, visitors });
});

visitorsRouter.get("/", async (req, res) => {
  const query = ListVisitorsQueryParams.parse(req.query);
  const conditions = [];
  if (query.buildingId) conditions.push(eq(visitorsTable.buildingId, query.buildingId));
  if (query.status) conditions.push(eq(visitorsTable.status, query.status as any));
  if (query.date) conditions.push(eq(visitorsTable.expectedDate, query.date));
  const visitors = conditions.length > 0
    ? await db.select().from(visitorsTable).where(and(...conditions)).orderBy(visitorsTable.expectedDate)
    : await db.select().from(visitorsTable).orderBy(visitorsTable.expectedDate);
  res.json(visitors);
});

visitorsRouter.post("/", async (req, res) => {
  const body = CreateVisitorBody.parse(req.body);
  const [visitor] = await db.insert(visitorsTable).values({
    buildingId: body.buildingId,
    unitId: body.unitId ?? null,
    residentId: body.residentId ?? null,
    visitorName: body.visitorName,
    visitorPhone: body.visitorPhone ?? null,
    visitorIdNumber: body.visitorIdNumber ?? null,
    purpose: body.purpose ?? null,
    expectedDate: body.expectedDate,
    expectedTime: body.expectedTime ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(visitor);
});

visitorsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [visitor] = await db.select().from(visitorsTable).where(eq(visitorsTable.id, id));
  if (!visitor) return res.status(404).json({ message: "Not found" });
  res.json(visitor);
});

visitorsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateVisitorBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.securityNote !== undefined) updates.securityNote = body.securityNote;
  if (body.checkInTime !== undefined) updates.checkInTime = body.checkInTime ? new Date(body.checkInTime as any) : null;
  if (body.checkOutTime !== undefined) updates.checkOutTime = body.checkOutTime ? new Date(body.checkOutTime as any) : null;
  const [visitor] = await db.update(visitorsTable).set(updates).where(eq(visitorsTable.id, id)).returning();
  if (!visitor) return res.status(404).json({ message: "Not found" });
  res.json(visitor);
});
