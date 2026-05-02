import { Router } from "express";
import { db } from "@workspace/db";
import {
  buildingsTable, residentsTable, unitsTable, issuesTable,
  paymentsTable, visitorsTable, jobsTable, announcementsTable,
} from "@workspace/db";
import { count, eq, and, desc } from "drizzle-orm";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", async (req, res) => {
  const [totalBuildings] = await db.select({ count: count() }).from(buildingsTable);
  const [totalResidents] = await db.select({ count: count() }).from(residentsTable).where(eq(residentsTable.status, "active"));
  const [totalUnits] = await db.select({ count: count() }).from(unitsTable);
  const [openIssues] = await db.select({ count: count() }).from(issuesTable).where(eq(issuesTable.status, "open"));
  const [overduePayments] = await db.select({ count: count() }).from(paymentsTable).where(eq(paymentsTable.status, "overdue"));
  const [activeJobs] = await db.select({ count: count() }).from(jobsTable).where(eq(jobsTable.status, "in_progress"));

  const today = new Date().toISOString().split("T")[0];
  const [visitorsToday] = await db.select({ count: count() }).from(visitorsTable).where(eq(visitorsTable.expectedDate, today));

  const allPayments = await db.select().from(paymentsTable);
  const collected = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const total = allPayments.reduce((s, p) => s + Number(p.amount), 0);
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0;

  const resolvedIssues = await db.select({ count: count() }).from(issuesTable).where(eq(issuesTable.status, "resolved"));
  const allIssues = await db.select({ count: count() }).from(issuesTable);
  const issueResolutionRate = allIssues[0].count > 0
    ? Math.round((resolvedIssues[0].count / allIssues[0].count) * 100)
    : 0;

  res.json({
    totalBuildings: totalBuildings.count,
    totalResidents: totalResidents.count,
    totalUnits: totalUnits.count,
    openIssues: openIssues.count,
    overduePayments: overduePayments.count,
    activeJobs: activeJobs.count,
    visitorsToday: visitorsToday.count,
    collectionRateThisMonth: collectionRate,
    issueResolutionRate,
    avgResponseTimeHours: 28,
  });
});

dashboardRouter.get("/activity", async (req, res) => {
  const limit = Number(req.query.limit) || 20;

  const recentIssues = await db.select({
    id: issuesTable.id,
    title: issuesTable.title,
    status: issuesTable.status,
    createdAt: issuesTable.createdAt,
    buildingId: issuesTable.buildingId,
  }).from(issuesTable).orderBy(desc(issuesTable.createdAt)).limit(10);

  const recentPayments = await db.select({
    id: paymentsTable.id,
    description: paymentsTable.description,
    status: paymentsTable.status,
    createdAt: paymentsTable.createdAt,
    buildingId: paymentsTable.buildingId,
  }).from(paymentsTable).where(eq(paymentsTable.status, "paid")).orderBy(desc(paymentsTable.createdAt)).limit(5);

  const recentAnnouncements = await db.select({
    id: announcementsTable.id,
    title: announcementsTable.title,
    createdAt: announcementsTable.createdAt,
    buildingId: announcementsTable.buildingId,
  }).from(announcementsTable).orderBy(desc(announcementsTable.createdAt)).limit(5);

  const buildings = await db.select({ id: buildingsTable.id, name: buildingsTable.name }).from(buildingsTable);
  const buildingMap = Object.fromEntries(buildings.map(b => [b.id, b.name]));

  const activities = [
    ...recentIssues.map((i, idx) => ({
      id: idx + 1,
      type: i.status === "resolved" ? "issue_resolved" : "issue_created",
      title: i.status === "resolved" ? `Issue resolved: ${i.title}` : `New issue: ${i.title}`,
      description: i.title,
      buildingName: buildingMap[i.buildingId] ?? "Unknown Building",
      timestamp: i.createdAt,
    })),
    ...recentPayments.map((p, idx) => ({
      id: idx + 100,
      type: "payment_received",
      title: `Payment received: ${p.description}`,
      description: p.description,
      buildingName: buildingMap[p.buildingId] ?? "Unknown Building",
      timestamp: p.createdAt,
    })),
    ...recentAnnouncements.map((a, idx) => ({
      id: idx + 200,
      type: "announcement_posted",
      title: `Announcement: ${a.title}`,
      description: a.title,
      buildingName: buildingMap[a.buildingId] ?? "Unknown Building",
      timestamp: a.createdAt,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);

  res.json(activities);
});

dashboardRouter.get("/building-scores", async (req, res) => {
  const buildings = await db.select().from(buildingsTable);

  const scores = await Promise.all(buildings.map(async b => {
    const [openIssues] = await db.select({ count: count() }).from(issuesTable)
      .where(and(eq(issuesTable.buildingId, b.id), eq(issuesTable.status, "open")));
    const [totalIssues] = await db.select({ count: count() }).from(issuesTable)
      .where(eq(issuesTable.buildingId, b.id));
    const [residents] = await db.select({ count: count() }).from(residentsTable)
      .where(eq(residentsTable.buildingId, b.id));
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.buildingId, b.id));
    const paidCount = payments.filter(p => p.status === "paid").length;
    const paymentRate = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 100;
    const resolutionRate = totalIssues.count > 0
      ? Math.round(((totalIssues.count - openIssues.count) / totalIssues.count) * 100)
      : 100;
    const score = Math.round((paymentRate * 0.4 + resolutionRate * 0.6));

    return {
      buildingId: b.id,
      buildingName: b.name,
      neighbourhood: b.neighbourhood,
      reputationScore: score / 10,
      issueResolutionRate: resolutionRate,
      paymentCollectionRate: paymentRate,
      avgResponseTimeHours: 24,
      totalResidents: residents.count,
    };
  }));

  res.json(scores);
});
