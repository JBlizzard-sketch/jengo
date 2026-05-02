import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";
import { residentsTable } from "./residents";

export const issueCategoryEnum = pgEnum("issue_category", [
  "noise", "maintenance", "parking", "visitor", "utility", "security", "other"
]);
export const issuePriorityEnum = pgEnum("issue_priority", ["low", "medium", "high", "urgent"]);
export const issueStatusEnum = pgEnum("issue_status", ["open", "in_progress", "resolved", "closed"]);
export const evidenceTypeEnum = pgEnum("evidence_type", ["photo", "audio", "video", "document"]);

export const issuesTable = pgTable("issues", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  unitId: integer("unit_id").references(() => unitsTable.id),
  residentId: integer("resident_id").references(() => residentsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  category: issueCategoryEnum("category").notNull(),
  priority: issuePriorityEnum("priority").notNull(),
  status: issueStatusEnum("status").notNull().default("open"),
  evidenceUrl: text("evidence_url"),
  evidenceType: evidenceTypeEnum("evidence_type"),
  assignedTo: text("assigned_to"),
  resolutionNote: text("resolution_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const issueCommentsTable = pgTable("issue_comments", {
  id: serial("id").primaryKey(),
  issueId: integer("issue_id").references(() => issuesTable.id).notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIssueSchema = createInsertSchema(issuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIssueCommentSchema = createInsertSchema(issueCommentsTable).omit({ id: true, createdAt: true });
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issuesTable.$inferSelect;
export type IssueComment = typeof issueCommentsTable.$inferSelect;
