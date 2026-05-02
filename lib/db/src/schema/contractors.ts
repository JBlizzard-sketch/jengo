import { pgTable, serial, text, integer, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { issuesTable } from "./issues";

export const contractorTradeEnum = pgEnum("contractor_trade", [
  "plumbing", "electrical", "carpentry", "painting", "cleaning",
  "security", "landscaping", "general", "other"
]);

export const jobStatusEnum = pgEnum("job_status", [
  "quoted", "approved", "in_progress", "completed", "disputed"
]);

export const contractorsTable = pgTable("contractors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  trade: contractorTradeEnum("trade").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  rating: numeric("rating", { precision: 3, scale: 1 }),
  totalJobs: integer("total_jobs").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  contractorId: integer("contractor_id").references(() => contractorsTable.id).notNull(),
  issueId: integer("issue_id").references(() => issuesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: jobStatusEnum("status").notNull().default("quoted"),
  quotedAmount: numeric("quoted_amount", { precision: 12, scale: 2 }),
  finalAmount: numeric("final_amount", { precision: 12, scale: 2 }),
  scheduledDate: date("scheduled_date"),
  completedDate: date("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContractorSchema = createInsertSchema(contractorsTable).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractorsTable.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
