import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Pet sync routes
  pets: router({
    // Get all user's pets
    list: protectedProcedure.query(({ ctx }) => {
      return db.getUserPets(ctx.user.id);
    }),

    // Upsert a pet (create or update)
    upsert: protectedProcedure
      .input(z.object({
        localId: z.string(),
        name: z.string().min(1).max(255),
        species: z.string().min(1).max(64),
        breed: z.string().max(255).nullable().optional(),
        dateOfBirth: z.date().nullable().optional(),
        weight: z.string().nullable().optional(), // Decimal as string
        weightUnit: z.string().max(10).optional(),
        photoUri: z.string().nullable().optional(),
        microchipNumber: z.string().max(64).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.upsertPet(ctx.user.id, input);
      }),

    // Delete a pet
    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.deletePet(ctx.user.id, input.localId);
      }),
  }),

  // Document routes
  documents: router({
    // Get documents for a pet or all user documents
    list: protectedProcedure
      .input(z.object({ petLocalId: z.string().optional() }).optional())
      .query(({ ctx, input }) => {
        return db.getPetDocuments(ctx.user.id, input?.petLocalId);
      }),

    // Upsert a document
    upsert: protectedProcedure
      .input(z.object({
        petLocalId: z.string(),
        localId: z.string(),
        title: z.string().min(1).max(255),
        category: z.string().min(1).max(64),
        date: z.date(),
        fileUri: z.string().nullable().optional(),
        fileType: z.string().max(32).optional(),
        fileName: z.string().max(255).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { petLocalId, ...data } = input;
        return db.upsertDocument(ctx.user.id, petLocalId, data);
      }),

    // Delete a document
    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.deleteDocument(ctx.user.id, input.localId);
      }),

    // Search documents
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(({ ctx, input }) => {
        return db.searchDocuments(ctx.user.id, input.query);
      }),
  }),

  // Vaccination routes
  vaccinations: router({
    list: protectedProcedure
      .input(z.object({ petLocalId: z.string() }))
      .query(({ ctx, input }) => {
        return db.getPetVaccinations(ctx.user.id, input.petLocalId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        petLocalId: z.string(),
        localId: z.string(),
        name: z.string().min(1).max(255),
        dateAdministered: z.date(),
        expirationDate: z.date().nullable().optional(),
        veterinarian: z.string().max(255).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { petLocalId, ...data } = input;
        return db.upsertVaccination(ctx.user.id, petLocalId, data);
      }),

    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.deleteVaccination(ctx.user.id, input.localId);
      }),
  }),

  // Reminder routes
  reminders: router({
    list: protectedProcedure
      .input(z.object({ petLocalId: z.string() }))
      .query(({ ctx, input }) => {
        return db.getPetReminders(ctx.user.id, input.petLocalId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        petLocalId: z.string(),
        localId: z.string(),
        title: z.string().min(1).max(255),
        date: z.date(),
        time: z.string().max(10).nullable().optional(),
        isEnabled: z.boolean().optional(),
        notificationId: z.string().max(64).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { petLocalId, ...data } = input;
        return db.upsertReminder(ctx.user.id, petLocalId, data);
      }),

    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.deleteReminder(ctx.user.id, input.localId);
      }),
  }),

  // Weight history routes
  weight: router({
    list: protectedProcedure
      .input(z.object({ petLocalId: z.string() }))
      .query(({ ctx, input }) => {
        return db.getPetWeightHistory(ctx.user.id, input.petLocalId);
      }),

    add: protectedProcedure
      .input(z.object({
        petLocalId: z.string(),
        localId: z.string(),
        weight: z.string(), // Decimal as string
        weightUnit: z.string().max(10),
        date: z.date(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { petLocalId, ...data } = input;
        return db.addWeightEntry(ctx.user.id, petLocalId, data);
      }),

    delete: protectedProcedure
      .input(z.object({ localId: z.string() }))
      .mutation(({ ctx, input }) => {
        return db.deleteWeightEntry(ctx.user.id, input.localId);
      }),
  }),

  // File upload endpoint
  files: router({
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.string().min(1).max(100),
        base64Data: z.string(), // Base64 encoded file data
      }))
      .mutation(async ({ ctx, input }) => {
        const { fileName, fileType, base64Data } = input;
        
        // Generate a unique key with user ID and random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now();
        const extension = fileName.split('.').pop() || 'bin';
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `user-${ctx.user.id}/documents/${timestamp}-${randomSuffix}-${safeFileName}`;
        
        // Decode base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, fileType);
        
        return { url, key: fileKey };
      }),
  }),

  // Full sync endpoint - get all user data at once
  sync: router({
    getData: protectedProcedure.query(({ ctx }) => {
      return db.getUserSyncData(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
