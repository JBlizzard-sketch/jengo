import { Router } from "express";
import { db } from "@workspace/db";
import { buildingsTable, unitsTable, residentsTable, issuesTable, paymentsTable, visitorsTable, jobsTable } from "@workspace/db";
import { eq, count, sql, and, avg } from "drizzle-orm";
import {
  CreateBuildingBody,
  UpdateBuildingBody,
} from "@workspace/api-zod";

export const buildingsRouter = Router();

buildingsRouter.get("/", async (req, res) => {
  const buildings = await db.select().from(buildingsTable).orderBy(buildingsTable.name);
  res.json(buildings.map(b => ({
    ...b,
    serviceChargeAmount: b.serviceChargeAmount ? Number(b.serviceChargeAmount) : null,
    reputationScore: b.reputationScore ? Number(b.reputationScore) : null,
  })));
});

buildingsRouter.post("/", async (req, res) => {
  const body = CreateBuildingBody.parse(req.body);
  const [building] = await db.insert(buildingsTable).values({
    name: body.name,
    address: body.address,
    neighbourhood: body.neighbourhood as any,
    totalUnits: body.totalUnits,
    managementCompany: body.managementCompany ?? null,
    caretakerName: body.caretakerName ?? null,
    caretakerPhone: body.caretakerPhone ?? null,
    serviceChargeAmount: body.serviceChargeAmount?.toString() ?? null,
  }).returning();
  res.status(201).json({
    ...building,
    serviceChargeAmount: building.serviceChargeAmount ? Number(building.serviceChargeAmount) : null,
    reputationScore: building.reputationScore ? Number(building.reputationScore) : null,
  });
});

buildingsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [building] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));
  if (!building) return res.status(404).json({ message: "Not found" });
  res.json({
    ...building,
    serviceChargeAmount: building.serviceChargeAmount ? Number(building.serviceChargeAmount) : null,
    reputationScore: building.reputationScore ? Number(building.reputationScore) : null,
  });
});

buildingsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateBuildingBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.address !== undefined) updates.address = body.address;
  if (body.caretakerName !== undefined) updates.caretakerName = body.caretakerName;
  if (body.caretakerPhone !== undefined) updates.caretakerPhone = body.caretakerPhone;
  if (body.serviceChargeAmount !== undefined) updates.serviceChargeAmount = body.serviceChargeAmount?.toString();
  const [building] = await db.update(buildingsTable).set(updates).where(eq(buildingsTable.id, id)).returning();
  if (!building) return res.status(404).json({ message: "Not found" });
  res.json({
    ...building,
    serviceChargeAmount: building.serviceChargeAmount ? Number(building.serviceChargeAmount) : null,
    reputationScore: building.reputationScore ? Number(building.reputationScore) : null,
  });
});

buildingsRouter.get("/:id/stats", async (req, res) => {
  const id = Number(req.params.id);

  const [openIssues] = await db.select({ count: count() }).from(issuesTable)
    .where(and(eq(issuesTable.buildingId, id), eq(issuesTable.status, "open")));
  const [inProgressIssues] = await db.select({ count: count() }).from(issuesTable)
    .where(and(eq(issuesTable.buildingId, id), eq(issuesTable.status, "in_progress")));
  const [overduePayments] = await db.select({ count: count() }).from(paymentsTable)
    .where(and(eq(paymentsTable.buildingId, id), eq(paymentsTable.status, "overdue")));
  const [totalUnits] = await db.select({ count: count() }).from(unitsTable).where(eq(unitsTable.buildingId, id));
  const [occupiedUnits] = await db.select({ count: count() }).from(unitsTable)
    .where(and(eq(unitsTable.buildingId, id), eq(unitsTable.status, "occupied")));
  const [activeJobs] = await db.select({ count: count() }).from(jobsTable)
    .where(and(eq(jobsTable.buildingId, id), eq(jobsTable.status, "in_progress")));
  const [pendingVisitors] = await db.select({ count: count() }).from(visitorsTable)
    .where(and(eq(visitorsTable.buildingId, id), eq(visitorsTable.status, "pending")));

  const total = totalUnits.count || 1;
  const occupied = occupiedUnits.count || 0;

  res.json({
    buildingId: id,
    openIssues: openIssues.count,
    inProgressIssues: inProgressIssues.count,
    overduePayments: overduePayments.count,
    occupancyRate: Math.round((occupied / total) * 100),
    avgResponseTimeHours: 24,
    activeContractors: activeJobs.count,
    pendingVisitors: pendingVisitors.count,
  });
});
