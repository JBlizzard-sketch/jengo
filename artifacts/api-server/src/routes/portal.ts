import "../types/session";
import { Router, type Request, type Response } from "express";
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
portalRouter.get("/home", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const unitId = req.session.unitId!;
  const buildingId = req.session.buildingId!;

  const [resident] = await db.select().from(residentsTable).where(eq(residentsTable.id, residentId));
  const [unit] = await db.select().from(unitsTable).where(eq(unitsTable.id, unitId));
  const [building] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, buildingId));

  const myIssues = await db.select().from(issuesTable)
    .where(eq(issuesTable.residentId, residentId))
    .orderBy(desc(issuesTable.createdAt)).limit(5);

  const myPayments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.residentId, residentId))
    .orderBy(desc(paymentsTable.createdAt)).limit(3);

  const announcements = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.buildingId, buildingId))
    .orderBy(desc(announcementsTable.createdAt)).limit(3);

  const overduePayments = myPayments.filter(p => p.status === "overdue");
  const pendingPayments = myPayments.filter(p => p.status === "pending");
  const openIssues = myIssues.filter(i => i.status === "open" || i.status === "in_progress");

  res.json({
    resident: { name: `${resident.firstName} ${resident.lastName}`, phone: resident.phone, email: resident.email, isOwner: resident.isOwner },
    unit: { unitNumber: unit.unitNumber, floor: unit.floor, bedrooms: unit.bedrooms, monthlyRent: unit.monthlyRent, leaseEndDate: unit.leaseEndDate },
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
portalRouter.get("/issues", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const issues = await db.select().from(issuesTable)
    .where(eq(issuesTable.residentId, residentId))
    .orderBy(desc(issuesTable.createdAt));
  res.json(issues);
});

// GET /api/portal/issues/:id — single issue + comments (must own it)
portalRouter.get("/issues/:id", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const id = Number(req.params.id);

  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, id), eq(issuesTable.residentId, residentId)));

  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  const comments = await db.select().from(issueCommentsTable)
    .where(eq(issueCommentsTable.issueId, id))
    .orderBy(issueCommentsTable.createdAt);

  res.json({ issue, comments });
});

// POST /api/portal/issues — create issue as resident
portalRouter.post("/issues", async (req: Request, res: Response): Promise<void> => {
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

// POST /api/portal/issues/:id/comments — resident adds a comment
portalRouter.post("/issues/:id/comments", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const id = Number(req.params.id);

  // Verify ownership
  const [issue] = await db.select().from(issuesTable)
    .where(and(eq(issuesTable.id, id), eq(issuesTable.residentId, residentId)));

  if (!issue) {
    res.status(404).json({ error: "Issue not found" });
    return;
  }

  const Body = z.object({ content: z.string().min(1).max(2000) });
  const { content } = Body.parse(req.body);

  const [comment] = await db.insert(issueCommentsTable).values({
    issueId: id,
    authorName: req.session.residentName ?? "Resident",
    authorRole: "resident",
    content,
  }).returning();

  res.status(201).json(comment);
});

// GET /api/portal/payments — resident's payments
portalRouter.get("/payments", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.residentId, residentId))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(payments);
});

// POST /api/portal/payments/:id/submit-mpesa — resident submits M-Pesa ref for verification
portalRouter.post("/payments/:id/submit-mpesa", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const id = Number(req.params.id);

  const [payment] = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.id, id), eq(paymentsTable.residentId, residentId)));

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  if (payment.status === "paid" || payment.status === "waived") {
    res.status(400).json({ error: "Payment is already settled" });
    return;
  }

  const Body = z.object({
    mpesaRef: z.string().min(5).max(30),
    paidDate: z.string().optional(),
  });
  const { mpesaRef, paidDate } = Body.parse(req.body);

  const [updated] = await db.update(paymentsTable)
    .set({
      mpesaRef,
      paymentMethod: "mpesa",
      paidDate: paidDate ?? new Date().toISOString().split("T")[0],
      status: "pending", // Management still needs to verify
    })
    .where(eq(paymentsTable.id, id))
    .returning();

  res.json(updated);
});

// GET /api/portal/announcements — building announcements for resident
portalRouter.get("/announcements", async (req: Request, res: Response): Promise<void> => {
  const buildingId = req.session.buildingId!;
  const announcements = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.buildingId, buildingId))
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(announcements);
});

// GET /api/portal/visitors — resident's pre-cleared visitors
portalRouter.get("/visitors", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const visitors = await db.select().from(visitorsTable)
    .where(eq(visitorsTable.residentId, residentId))
    .orderBy(desc(visitorsTable.createdAt));
  res.json(visitors);
});

// PATCH /api/portal/profile — resident updates own phone and email
portalRouter.patch("/profile", async (req: Request, res: Response): Promise<void> => {
  const residentId = req.session.residentId!;
  const Body = z.object({
    phone: z.string().min(8).max(20).optional(),
    email: z.string().email().optional(),
  }).refine(d => d.phone !== undefined || d.email !== undefined, {
    message: "At least one field required",
  });
  const body = Body.parse(req.body);
  const [updated] = await db.update(residentsTable)
    .set({ ...(body.phone ? { phone: body.phone } : {}), ...(body.email ? { email: body.email } : {}) })
    .where(eq(residentsTable.id, residentId))
    .returning();
  res.json({ name: `${updated.firstName} ${updated.lastName}`, phone: updated.phone, email: updated.email });
});

// POST /api/portal/visitors — pre-clear a visitor
portalRouter.post("/visitors", async (req: Request, res: Response): Promise<void> => {
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
