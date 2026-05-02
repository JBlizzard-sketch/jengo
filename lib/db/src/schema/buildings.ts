import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const neighbourhoodEnum = pgEnum("neighbourhood", [
  "kilimani", "westlands", "south_b", "lavington", "parklands", "karen", "langata", "other"
]);

export const buildingsTable = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  neighbourhood: neighbourhoodEnum("neighbourhood").notNull(),
  totalUnits: integer("total_units").notNull(),
  managementCompany: text("management_company"),
  caretakerName: text("caretaker_name"),
  caretakerPhone: text("caretaker_phone"),
  serviceChargeAmount: numeric("service_charge_amount", { precision: 12, scale: 2 }),
  reputationScore: numeric("reputation_score", { precision: 4, scale: 1 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBuildingSchema = createInsertSchema(buildingsTable).omit({ id: true, createdAt: true });
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildingsTable.$inferSelect;
