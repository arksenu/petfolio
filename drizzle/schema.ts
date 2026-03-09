import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Pet table - stores pet profiles
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(), // Client-side UUID for sync
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 64 }).notNull(),
  breed: varchar("breed", { length: 255 }),
  dateOfBirth: timestamp("dateOfBirth"),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lb"),
  photoUri: text("photoUri"),
  microchipNumber: varchar("microchipNumber", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

// Pet documents table - stores medical records, lab results, etc.
export const petDocuments = mysqlTable("petDocuments", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  petId: int("petId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  date: timestamp("date").notNull(),
  fileUri: text("fileUri"),
  fileType: varchar("fileType", { length: 32 }).default("image"),
  fileName: varchar("fileName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PetDocument = typeof petDocuments.$inferSelect;
export type InsertPetDocument = typeof petDocuments.$inferInsert;

// Vaccinations table
export const vaccinations = mysqlTable("vaccinations", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  petId: int("petId").notNull(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dateAdministered: timestamp("dateAdministered").notNull(),
  expirationDate: timestamp("expirationDate"),
  veterinarian: varchar("veterinarian", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vaccination = typeof vaccinations.$inferSelect;
export type InsertVaccination = typeof vaccinations.$inferInsert;

// Reminders table
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  petId: int("petId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  time: varchar("time", { length: 10 }),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  notificationId: varchar("notificationId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

// Weight history table - for tracking pet weight over time
export const weightHistory = mysqlTable("weightHistory", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  petId: int("petId").notNull(),
  userId: int("userId").notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lb").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeightHistory = typeof weightHistory.$inferSelect;
export type InsertWeightHistory = typeof weightHistory.$inferInsert;

// Concierge requests table
export const conciergeRequests = mysqlTable("conciergeRequests", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  petLocalId: varchar("petLocalId", { length: 64 }),
  petName: varchar("petName", { length: 255 }),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  preview: text("preview"),
  messageCount: int("messageCount").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConciergeRequest = typeof conciergeRequests.$inferSelect;
export type InsertConciergeRequest = typeof conciergeRequests.$inferInsert;

// Concierge messages table
export const conciergeMessages = mysqlTable("conciergeMessages", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  requestId: int("requestId").notNull(),
  userId: int("userId").notNull(),
  senderType: varchar("senderType", { length: 32 }).default("user").notNull(),
  messageType: varchar("messageType", { length: 32 }).default("text").notNull(),
  content: text("content").notNull(),
  audioUrl: text("audioUrl"),
  audioDuration: int("audioDuration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConciergeMessage = typeof conciergeMessages.$inferSelect;
export type InsertConciergeMessage = typeof conciergeMessages.$inferInsert;

// Vet providers table
export const vetProviders = mysqlTable("vetProviders", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  petLocalId: varchar("petLocalId", { length: 64 }).notNull(),
  clinicName: varchar("clinicName", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  providerType: varchar("providerType", { length: 32 }).default("primary_vet").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VetProvider = typeof vetProviders.$inferSelect;
export type InsertVetProvider = typeof vetProviders.$inferInsert;

// Medications table
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  localId: varchar("localId", { length: 64 }).notNull(),
  petId: int("petId").notNull(),
  userId: int("userId").notNull(),
  petLocalId: varchar("petLocalId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 255 }).notNull(),
  frequency: varchar("frequency", { length: 64 }).notNull(),
  instructions: text("instructions"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isOngoing: boolean("isOngoing").default(true).notNull(),
  pillsRemaining: int("pillsRemaining"),
  pillsPerRefill: int("pillsPerRefill"),
  refillReminderAt: int("refillReminderAt"),
  doseLog: json("doseLog").$type<Array<{ id: string; medicationId: string; takenAt: string; skipped?: boolean; notes?: string }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicationRow = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;
