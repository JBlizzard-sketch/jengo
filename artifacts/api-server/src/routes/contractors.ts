import { Router } from "express";
import { db } from "@workspace/db";
import { contractorsTable, jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateContractorBody, CreateJobBody, UpdateJobBody, ListJobsQueryParams,
} from "@workspace/api-zod";

export const contractorsRouter = Router();
export const jobsRouter = Router();

contractorsRouter.get("/", async (req, res) => {
  const contractors = await db.select().from(contractorsTable).orderBy(contractorsTable.name);
  res.json(contractors.map(c => ({
    ...c,
    rating: c.rating ? Number(c.rating) : null,
  })));
});

contractorsRouter.post("/", async (req, res) => {
  const body = CreateContractorBody.parse(req.body);
  const [contractor] = await db.insert(contractorsTable).values({
    name: body.name,
    company: body.company ?? null,
    trade: body.trade as any,
    phone: body.phone,
    email: body.email ?? null,
  }).returning();
  res.status(201).json({ ...contractor, rating: contractor.rating ? Number(contractor.rating) : null });
});

contractorsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [contractor] = await db.select().from(contractorsTable).where(eq(contractorsTable.id, id));
  if (!contractor) return res.status(404).json({ message: "Not found" });
  res.json({ ...contractor, rating: contractor.rating ? Number(contractor.rating) : null });
});

jobsRouter.get("/", async (req, res) => {
  const query = ListJobsQueryParams.parse(req.query);
  const conditions = [];
  if (query.buildingId) conditions.push(eq(jobsTable.buildingId, query.buildingId));
  if (query.contractorId) conditions.push(eq(jobsTable.contractorId, query.contractorId));
  if (query.status) conditions.push(eq(jobsTable.status, query.status as any));
  const jobs = conditions.length > 0
    ? await db.select().from(jobsTable).where(and(...conditions)).orderBy(jobsTable.createdAt)
    : await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  res.json(jobs.map(j => ({
    ...j,
    quotedAmount: j.quotedAmount ? Number(j.quotedAmount) : null,
    finalAmount: j.finalAmount ? Number(j.finalAmount) : null,
  })));
});

jobsRouter.post("/", async (req, res) => {
  const body = CreateJobBody.parse(req.body);
  const [job] = await db.insert(jobsTable).values({
    buildingId: body.buildingId,
    contractorId: body.contractorId,
    issueId: body.issueId ?? null,
    title: body.title,
    description: body.description ?? null,
    quotedAmount: body.quotedAmount?.toString() ?? null,
    scheduledDate: body.scheduledDate ?? null,
    status: "quoted",
  }).returning();
  res.status(201).json({ ...job, quotedAmount: job.quotedAmount ? Number(job.quotedAmount) : null, finalAmount: null });
});

jobsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) return res.status(404).json({ message: "Not found" });
  res.json({ ...job, quotedAmount: job.quotedAmount ? Number(job.quotedAmount) : null, finalAmount: job.finalAmount ? Number(job.finalAmount) : null });
});

jobsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateJobBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.finalAmount !== undefined) updates.finalAmount = body.finalAmount?.toString();
  if (body.completedDate !== undefined) updates.completedDate = body.completedDate;
  if (body.notes !== undefined) updates.notes = body.notes;
  const [job] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, id)).returning();
  if (!job) return res.status(404).json({ message: "Not found" });
  res.json({ ...job, quotedAmount: job.quotedAmount ? Number(job.quotedAmount) : null, finalAmount: job.finalAmount ? Number(job.finalAmount) : null });
});
