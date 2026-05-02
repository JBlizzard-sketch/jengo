import { Router } from "express";
import { db } from "@workspace/db";
import { issuesTable, issueCommentsTable, buildingsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import {
  CreateIssueBody, UpdateIssueBody, AddIssueCommentBody,
  ListIssuesQueryParams, GetIssuesSummaryQueryParams,
} from "@workspace/api-zod";

export const issuesRouter = Router();

issuesRouter.get("/summary", async (req, res) => {
  const query = GetIssuesSummaryQueryParams.parse(req.query);
  const conditions = query.buildingId ? [eq(issuesTable.buildingId, query.buildingId)] : [];

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [open] = await db.select({ count: count() }).from(issuesTable)
    .where(where ? and(where, eq(issuesTable.status, "open")) : eq(issuesTable.status, "open"));
  const [inProg] = await db.select({ count: count() }).from(issuesTable)
    .where(where ? and(where, eq(issuesTable.status, "in_progress")) : eq(issuesTable.status, "in_progress"));
  const [resolved] = await db.select({ count: count() }).from(issuesTable)
    .where(where ? and(where, eq(issuesTable.status, "resolved")) : eq(issuesTable.status, "resolved"));

  const byCategory = await db.select({
    category: issuesTable.category,
    count: count(),
  }).from(issuesTable).where(where).groupBy(issuesTable.category);

  const byPriority = await db.select({
    priority: issuesTable.priority,
    count: count(),
  }).from(issuesTable).where(where).groupBy(issuesTable.priority);

  res.json({
    totalOpen: open.count,
    totalInProgress: inProg.count,
    totalResolved: resolved.count,
    byCategory: byCategory.map(r => ({ category: r.category, count: r.count })),
    byPriority: byPriority.map(r => ({ priority: r.priority, count: r.count })),
    avgResolutionHours: 36,
  });
});

issuesRouter.get("/report", async (req, res) => {
  const buildings = await db.select().from(buildingsTable);
  const allIssues = await db.select({
    buildingId: issuesTable.buildingId,
    status: issuesTable.status,
    category: issuesTable.category,
    priority: issuesTable.priority,
    createdAt: issuesTable.createdAt,
  }).from(issuesTable);

  const byCategoryGlobal: Record<string, number> = {};
  const byBuilding = buildings.map(b => {
    const bIssues = allIssues.filter(i => i.buildingId === b.id);
    const open = bIssues.filter(i => i.status === "open").length;
    const inProgress = bIssues.filter(i => i.status === "in_progress").length;
    const resolved = bIssues.filter(i => i.status === "resolved").length;
    const closed = bIssues.filter(i => i.status === "closed").length;
    bIssues.forEach(i => { byCategoryGlobal[i.category] = (byCategoryGlobal[i.category] ?? 0) + 1; });
    return {
      buildingId: b.id,
      buildingName: b.name,
      neighbourhood: b.neighbourhood,
      total: bIssues.length,
      open,
      inProgress,
      resolved,
      closed,
      resolutionRate: bIssues.length > 0 ? Math.round(((resolved + closed) / bIssues.length) * 100) : 0,
    };
  });

  const totalOpen = allIssues.filter(i => i.status === "open").length;
  const totalInProgress = allIssues.filter(i => i.status === "in_progress").length;
  const totalResolved = allIssues.filter(i => ["resolved", "closed"].includes(i.status)).length;

  res.json({
    byBuilding,
    byCategory: Object.entries(byCategoryGlobal).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    totals: { open: totalOpen, inProgress: totalInProgress, resolved: totalResolved, total: allIssues.length },
  });
});

issuesRouter.get("/", async (req, res) => {
  const query = ListIssuesQueryParams.parse(req.query);
  const conditions: ReturnType<typeof eq>[] = [];
  if (query.buildingId) conditions.push(eq(issuesTable.buildingId, query.buildingId) as any);
  if (query.status) conditions.push(eq(issuesTable.status, query.status as any) as any);
  if (query.category) conditions.push(eq(issuesTable.category, query.category as any) as any);
  if (query.priority) conditions.push(eq(issuesTable.priority, query.priority as any) as any);
  const issues = conditions.length > 0
    ? await db.select().from(issuesTable).where(and(...conditions)).orderBy(issuesTable.createdAt)
    : await db.select().from(issuesTable).orderBy(issuesTable.createdAt);
  res.json(issues);
});

issuesRouter.post("/", async (req, res) => {
  const body = CreateIssueBody.parse(req.body);
  const [issue] = await db.insert(issuesTable).values({
    buildingId: body.buildingId,
    unitId: body.unitId ?? null,
    residentId: body.residentId ?? null,
    title: body.title,
    description: body.description ?? null,
    category: body.category as any,
    priority: body.priority as any,
    status: "open",
    evidenceUrl: body.evidenceUrl ?? null,
    evidenceType: (body.evidenceType ?? null) as any,
  }).returning();
  res.status(201).json(issue);
});

issuesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [issue] = await db.select().from(issuesTable).where(eq(issuesTable.id, id));
  if (!issue) return res.status(404).json({ message: "Not found" });
  res.json(issue);
});

issuesRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateIssueBody.parse(req.body);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status !== undefined) updates.status = body.status;
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.resolutionNote !== undefined) updates.resolutionNote = body.resolutionNote;
  if (body.status === "resolved") updates.resolvedAt = new Date();
  const [issue] = await db.update(issuesTable).set(updates).where(eq(issuesTable.id, id)).returning();
  if (!issue) return res.status(404).json({ message: "Not found" });
  res.json(issue);
});

issuesRouter.get("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const comments = await db.select().from(issueCommentsTable)
    .where(eq(issueCommentsTable.issueId, id)).orderBy(issueCommentsTable.createdAt);
  res.json(comments);
});

issuesRouter.post("/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const body = AddIssueCommentBody.parse(req.body);
  const [comment] = await db.insert(issueCommentsTable).values({
    issueId: id,
    authorName: body.authorName,
    authorRole: body.authorRole,
    content: body.content,
  }).returning();
  res.status(201).json(comment);
});
