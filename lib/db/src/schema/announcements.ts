import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { buildingsTable } from "./buildings";

export const announcementCategoryEnum = pgEnum("announcement_category", [
  "general", "maintenance", "utility", "emergency", "event", "agm"
]);

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildingsTable.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: announcementCategoryEnum("category").notNull(),
  isPinned: boolean("is_pinned").default(false),
  authorName: text("author_name"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcementsTable.$inferSelect;
