import { pgTable, serial, text, integer, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";

export const maintenanceCategoryEnum = pgEnum("maintenance_category", [
  "electrical", "plumbing", "fire_safety", "hvac", "cleaning", "structural", "security", "landscaping", "other",
]);

export const maintenanceFrequencyEnum = pgEnum("maintenance_frequency", [
  "weekly", "monthly", "quarterly", "biannual", "annual", "one_time",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "pending", "overdue", "done",
]);

export const maintenanceScheduleTable = pgTable("maintenance_schedule", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: maintenanceCategoryEnum("category").notNull(),
  frequency: maintenanceFrequencyEnum("frequency").notNull(),
  lastDoneDate: date("last_done_date"),
  nextDueDate: date("next_due_date").notNull(),
  assignedTo: text("assigned_to"),
  status: maintenanceStatusEnum("status").notNull().default("pending"),
  completionNotes: text("completion_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceScheduleSchema = createInsertSchema(maintenanceScheduleTable).omit({ id: true, createdAt: true });
export type InsertMaintenanceSchedule = z.infer<typeof insertMaintenanceScheduleSchema>;
export type MaintenanceSchedule = typeof maintenanceScheduleTable.$inferSelect;
