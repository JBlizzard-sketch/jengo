import { pgTable, serial, text, integer, boolean, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";
import { unitsTable } from "./units";

export const residentStatusEnum = pgEnum("resident_status", ["active", "inactive", "moved_out"]);

export const residentsTable = pgTable("residents", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => unitsTable.id).notNull(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  moveInDate: date("move_in_date"),
  isOwner: boolean("is_owner").default(false),
  status: residentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResidentSchema = createInsertSchema(residentsTable).omit({ id: true, createdAt: true });
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Resident = typeof residentsTable.$inferSelect;
