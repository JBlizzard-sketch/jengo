import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateAnnouncementBody, UpdateAnnouncementBody, ListAnnouncementsQueryParams,
} from "@workspace/api-zod";

export const announcementsRouter = Router();

announcementsRouter.get("/", async (req, res) => {
  const query = ListAnnouncementsQueryParams.parse(req.query);
  const conditions = [];
  if (query.buildingId) conditions.push(eq(announcementsTable.buildingId, query.buildingId));
  if (query.pinned !== undefined) conditions.push(eq(announcementsTable.isPinned, query.pinned));
  const announcements = conditions.length > 0
    ? await db.select().from(announcementsTable).where(and(...conditions)).orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt))
    : await db.select().from(announcementsTable).orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(announcements);
});

announcementsRouter.post("/", async (req, res) => {
  const body = CreateAnnouncementBody.parse(req.body);
  const [ann] = await db.insert(announcementsTable).values({
    buildingId: body.buildingId,
    title: body.title,
    content: body.content,
    category: body.category as any,
    isPinned: body.isPinned ?? false,
    authorName: body.authorName ?? null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt as any) : null,
  }).returning();
  res.status(201).json(ann);
});

announcementsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [ann] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!ann) return res.status(404).json({ message: "Not found" });
  res.json(ann);
});

announcementsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateAnnouncementBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.isPinned !== undefined) updates.isPinned = body.isPinned;
  if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt as any) : null;
  const [ann] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
  if (!ann) return res.status(404).json({ message: "Not found" });
  res.json(ann);
});

announcementsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.status(204).send();
});
