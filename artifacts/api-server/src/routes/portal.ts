import "../types/session";
import { Router } from "express";
import { db } from "@workspace/db";
import {
  residentsTable, unitsTable, buildingsTable, issuesTable, issueCommentsTable,
  paymentsTable, announcementsTable, visitorsTable
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireResident } from "../middleware/requireResident";
import { z } from "zod";

export const portalRouter = Router();

// All portal routes require resident session
portalRouter.use(requireResident);

// GET /api/portal/home — resident's home dashboard
portalRouter.get("/home", async (req, res) => {
  const residentId = req.session.residentId!;
  const unitId = req.session.unitId!;
  const buildingId = req.session.buildingId!;

  const [resident] = await db.select().from(residentsTable).where(eq(residentsTable.id, residentId));
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, unitId));
  const [building] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, buildingId));

  const myIssues = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.residentId, residentId)))
    .orderBy(desc(issuesTable.createdAt)).limit(5);

  const myPayments = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.residentId, residentId)))
    .orderBy(desc(paymentsTable.createdAt)).limit(3);

  const announcements = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.buildingId, buildingId))
    .orderBy(desc(announcementsTable.createdAt)).limit(3);

  const overduePayments = myPayments.filter(p => p.status === "overdue");
  const pendingPayments = myPayments.filter(p => p.status === "pending");
  const openIssues = myIssues.filter(i => i.status === "open" || i.status === "in_progress");

  res.json({
    resident: { name: `${resident.firstName} ${resident.lastName}`, email: resident.email, isOwner: resident.isOwner },
    unit: { unitNumber: unit.unitNumber, floor: unit.floor, bedrooms: unit.bedrooms, monthlyRent: unit.monthlyRent },
    building: { name: building.name, neighbourhood: building.neighbourhood, caretakerName: building.caretakerName, caretakerPhone: building.caretakerPhone },
    stats: {
      openIssues: openIssues.length,
      overduePayments: overduePayments.length,
      pendingPayments: pendingPayments.length,
    },
    recentIssues: myIssues,
    recentPayments: myPayments,
    announcements,
  });
});

// GET /api/portal/issues — resident's own issues
portalRouter.get("/issues", async (req, res) => {
  const residentId = req.session.residentId!;
  const issues = await db.select().from(issuesTable)
    .where(eq(issuesTable.residentId, residentId))
    .orderBy(desc(issuesTable.createdAt));
  res.json(issues);
});

// POST /api/portal/issues — create issue as resident
portalRouter.post("/issues", async (req, res) => {
  const CreateBody = z.object({
    title: z.string().min(5),
    description: z.string().optional(),
    category: z.enum(["noise", "maintenance", "parking", "visitor", "utility", "security", "other"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    evidenceUrl: z.string().url().optional(),
    evidenceType: z.enum(["photo", "audio", "video", "document"]).optional(),
  });
  const body = CreateBody.parse(req.body);

  const [issue] = await db.insert(issuesTable).values({
    ...body,
    buildingId: req.session.buildingId!,
    unitId: req.session.unitId!,
    residentId: req.session.residentId!,
    status: "open",
  }).returning();
  res.status(201).json(issue);
});

// GET /api/portal/payments — resident's payments
portalRouter.get("/payments", async (req, res) => {
  const residentId = req.session.residentId!;
  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.residentId, residentId))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(payments);
});

// GET /api/portal/announcements — building announcements for resident
portalRouter.get("/announcements", async (req, res) => {
  const buildingId = req.session.buildingId!;
  const announcements = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.buildingId, buildingId))
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(announcements);
});

// GET /api/portal/visitors — resident's pre-cleared visitors
portalRouter.get("/visitors", async (req, res) => {
  const residentId = req.session.residentId!;
  const visitors = await db.select().from(visitorsTable)
    .where(eq(visitorsTable.residentId, residentId))
    .orderBy(desc(visitorsTable.createdAt));
  res.json(visitors);
});

// POST /api/portal/visitors — pre-clear a visitor
portalRouter.post("/visitors", async (req, res) => {
  const CreateBody = z.object({
    visitorName: z.string().min(2),
    visitorPhone: z.string().optional(),
    visitorIdNumber: z.string().optional(),
    purpose: z.string().optional(),
    expectedDate: z.string(),
    expectedTime: z.string().optional(),
  });
  const body = CreateBody.parse(req.body);

  const [visitor] = await db.insert(visitorsTable).values({
    ...body,
    buildingId: req.session.buildingId!,
    unitId: req.session.unitId!,
    residentId: req.session.residentId!,
    status: "pending",
  }).returning();
  res.status(201).json(visitor);
});
