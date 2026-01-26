import { eq, and, like, or, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  pets, InsertPet, Pet,
  petDocuments, InsertPetDocument, PetDocument,
  vaccinations, InsertVaccination, Vaccination,
  reminders, InsertReminder, Reminder,
  weightHistory, InsertWeightHistory, WeightHistory,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== PET FUNCTIONS ====================

export async function getUserPets(userId: number): Promise<Pet[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(pets).where(eq(pets.userId, userId));
}

export async function getPetByLocalId(userId: number, localId: string): Promise<Pet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(pets)
    .where(and(eq(pets.userId, userId), eq(pets.localId, localId)))
    .limit(1);
  
  return result[0];
}

export async function upsertPet(userId: number, data: Omit<InsertPet, 'userId'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getPetByLocalId(userId, data.localId);
  
  if (existing) {
    await db.update(pets)
      .set({ ...data, userId })
      .where(eq(pets.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(pets).values({ ...data, userId });
    return Number(result[0].insertId);
  }
}

export async function deletePet(userId: number, localId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pet = await getPetByLocalId(userId, localId);
  if (!pet) return;
  
  // Delete all related records
  await db.delete(petDocuments).where(eq(petDocuments.petId, pet.id));
  await db.delete(vaccinations).where(eq(vaccinations.petId, pet.id));
  await db.delete(reminders).where(eq(reminders.petId, pet.id));
  await db.delete(weightHistory).where(eq(weightHistory.petId, pet.id));
  await db.delete(pets).where(eq(pets.id, pet.id));
}

// ==================== DOCUMENT FUNCTIONS ====================

export async function getPetDocuments(userId: number, petLocalId?: string): Promise<PetDocument[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (petLocalId) {
    const pet = await getPetByLocalId(userId, petLocalId);
    if (!pet) return [];
    return db.select().from(petDocuments).where(eq(petDocuments.petId, pet.id));
  }
  
  return db.select().from(petDocuments).where(eq(petDocuments.userId, userId));
}

export async function upsertDocument(userId: number, petLocalId: string, data: Omit<InsertPetDocument, 'userId' | 'petId'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) throw new Error("Pet not found");
  
  const existing = await db.select().from(petDocuments)
    .where(and(eq(petDocuments.userId, userId), eq(petDocuments.localId, data.localId)))
    .limit(1);
  
  if (existing[0]) {
    await db.update(petDocuments)
      .set({ ...data, userId, petId: pet.id })
      .where(eq(petDocuments.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(petDocuments).values({ ...data, userId, petId: pet.id });
    return Number(result[0].insertId);
  }
}

export async function deleteDocument(userId: number, localId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(petDocuments)
    .where(and(eq(petDocuments.userId, userId), eq(petDocuments.localId, localId)));
}

export async function searchDocuments(userId: number, query: string): Promise<(PetDocument & { petName: string })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${query}%`;
  
  const results = await db.select({
    document: petDocuments,
    petName: pets.name,
  })
  .from(petDocuments)
  .innerJoin(pets, eq(petDocuments.petId, pets.id))
  .where(and(
    eq(petDocuments.userId, userId),
    or(
      like(petDocuments.title, searchPattern),
      like(petDocuments.category, searchPattern),
      like(petDocuments.notes, searchPattern)
    )
  ))
  .orderBy(desc(petDocuments.date));
  
  return results.map(r => ({ ...r.document, petName: r.petName }));
}

// ==================== VACCINATION FUNCTIONS ====================

export async function getPetVaccinations(userId: number, petLocalId: string): Promise<Vaccination[]> {
  const db = await getDb();
  if (!db) return [];
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) return [];
  
  return db.select().from(vaccinations).where(eq(vaccinations.petId, pet.id));
}

export async function upsertVaccination(userId: number, petLocalId: string, data: Omit<InsertVaccination, 'userId' | 'petId'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) throw new Error("Pet not found");
  
  const existing = await db.select().from(vaccinations)
    .where(and(eq(vaccinations.userId, userId), eq(vaccinations.localId, data.localId)))
    .limit(1);
  
  if (existing[0]) {
    await db.update(vaccinations)
      .set({ ...data, userId, petId: pet.id })
      .where(eq(vaccinations.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(vaccinations).values({ ...data, userId, petId: pet.id });
    return Number(result[0].insertId);
  }
}

export async function deleteVaccination(userId: number, localId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vaccinations)
    .where(and(eq(vaccinations.userId, userId), eq(vaccinations.localId, localId)));
}

// ==================== REMINDER FUNCTIONS ====================

export async function getPetReminders(userId: number, petLocalId: string): Promise<Reminder[]> {
  const db = await getDb();
  if (!db) return [];
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) return [];
  
  return db.select().from(reminders).where(eq(reminders.petId, pet.id));
}

export async function upsertReminder(userId: number, petLocalId: string, data: Omit<InsertReminder, 'userId' | 'petId'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) throw new Error("Pet not found");
  
  const existing = await db.select().from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.localId, data.localId)))
    .limit(1);
  
  if (existing[0]) {
    await db.update(reminders)
      .set({ ...data, userId, petId: pet.id })
      .where(eq(reminders.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(reminders).values({ ...data, userId, petId: pet.id });
    return Number(result[0].insertId);
  }
}

export async function deleteReminder(userId: number, localId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.localId, localId)));
}

// ==================== WEIGHT HISTORY FUNCTIONS ====================

export async function getPetWeightHistory(userId: number, petLocalId: string): Promise<WeightHistory[]> {
  const db = await getDb();
  if (!db) return [];
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) return [];
  
  return db.select().from(weightHistory)
    .where(eq(weightHistory.petId, pet.id))
    .orderBy(desc(weightHistory.date));
}

export async function addWeightEntry(userId: number, petLocalId: string, data: Omit<InsertWeightHistory, 'userId' | 'petId'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pet = await getPetByLocalId(userId, petLocalId);
  if (!pet) throw new Error("Pet not found");
  
  // Check if entry with same localId exists
  const existing = await db.select().from(weightHistory)
    .where(and(eq(weightHistory.userId, userId), eq(weightHistory.localId, data.localId)))
    .limit(1);
  
  if (existing[0]) {
    return existing[0].id;
  }
  
  const result = await db.insert(weightHistory).values({ ...data, userId, petId: pet.id });
  return Number(result[0].insertId);
}

export async function deleteWeightEntry(userId: number, localId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(weightHistory)
    .where(and(eq(weightHistory.userId, userId), eq(weightHistory.localId, localId)));
}

// ==================== SYNC FUNCTIONS ====================

export interface SyncData {
  pets: Pet[];
  documents: PetDocument[];
  vaccinations: Vaccination[];
  reminders: Reminder[];
  weightHistory: WeightHistory[];
}

export async function getUserSyncData(userId: number): Promise<SyncData> {
  const db = await getDb();
  if (!db) {
    return { pets: [], documents: [], vaccinations: [], reminders: [], weightHistory: [] };
  }
  
  const [userPets, userDocs, userVax, userReminders, userWeight] = await Promise.all([
    db.select().from(pets).where(eq(pets.userId, userId)),
    db.select().from(petDocuments).where(eq(petDocuments.userId, userId)),
    db.select().from(vaccinations).where(eq(vaccinations.userId, userId)),
    db.select().from(reminders).where(eq(reminders.userId, userId)),
    db.select().from(weightHistory).where(eq(weightHistory.userId, userId)),
  ]);
  
  return {
    pets: userPets,
    documents: userDocs,
    vaccinations: userVax,
    reminders: userReminders,
    weightHistory: userWeight,
  };
}
