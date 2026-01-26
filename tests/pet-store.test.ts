import { describe, it, expect, vi } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      return Promise.resolve();
    }),
  },
}));

// Import types and helpers
import {
  Pet,
  PetDocument,
  Vaccination,
  Reminder,
  calculateAge,
  formatDate,
  getVaccinationStatus,
  generateId,
  SPECIES_OPTIONS,
  DOCUMENT_CATEGORIES,
  COMMON_VACCINES,
} from "../shared/pet-types";

describe("Pet Types and Helpers", () => {
  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs of consistent format", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("calculateAge", () => {
    it("should calculate age in years for older pets", () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const age = calculateAge(twoYearsAgo.toISOString());
      expect(age).toBe("2 years");
    });

    it("should calculate age in months for young pets", () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const age = calculateAge(sixMonthsAgo.toISOString());
      expect(age).toMatch(/\d+ months?/);
    });

    it("should handle 1 year correctly", () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const age = calculateAge(oneYearAgo.toISOString());
      expect(age).toBe("1 year");
    });

    it("should return months for pets less than a year old", () => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      const age = calculateAge(fiveMonthsAgo.toISOString());
      expect(age).toMatch(/months?$/);
    });
  });

  describe("formatDate", () => {
    it("should format date correctly", () => {
      // Use a specific date that won't have timezone issues
      const date = new Date(2024, 5, 15); // June 15, 2024 (month is 0-indexed)
      const formatted = formatDate(date.toISOString());
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("2024");
    });
  });

  describe("getVaccinationStatus", () => {
    it("should return expired for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const status = getVaccinationStatus(pastDate.toISOString());
      expect(status).toBe("expired");
    });

    it("should return expiring_soon for dates within 30 days", () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      const status = getVaccinationStatus(soonDate.toISOString());
      expect(status).toBe("expiring_soon");
    });

    it("should return current for dates more than 30 days away", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const status = getVaccinationStatus(futureDate.toISOString());
      expect(status).toBe("current");
    });
  });
});

describe("Pet Data Model", () => {
  it("should create a valid pet object", () => {
    const pet: Pet = {
      id: generateId(),
      name: "Buddy",
      species: "dog",
      breed: "Golden Retriever",
      dateOfBirth: new Date("2020-05-15").toISOString(),
      weight: { value: 65, unit: "lb" },
      microchipNumber: "123456789",
      photoUri: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(pet.name).toBe("Buddy");
    expect(pet.species).toBe("dog");
    expect(pet.breed).toBe("Golden Retriever");
    expect(pet.weight.value).toBe(65);
    expect(pet.weight.unit).toBe("lb");
  });

  it("should create a valid document object", () => {
    const doc: PetDocument = {
      id: generateId(),
      petId: "pet-123",
      title: "Annual Checkup",
      category: "vet_visit",
      fileUri: "file://path/to/doc.jpg",
      date: new Date().toISOString(),
      notes: "All clear",
      createdAt: new Date().toISOString(),
    };

    expect(doc.title).toBe("Annual Checkup");
    expect(doc.category).toBe("vet_visit");
    expect(doc.notes).toBe("All clear");
  });

  it("should create a valid vaccination object", () => {
    const vaccination: Vaccination = {
      id: generateId(),
      petId: "pet-123",
      vaccineName: "Rabies",
      dateAdministered: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      vetClinicName: "Happy Paws Vet",
      createdAt: new Date().toISOString(),
    };

    expect(vaccination.vaccineName).toBe("Rabies");
    expect(vaccination.vetClinicName).toBe("Happy Paws Vet");
  });

  it("should create a valid reminder object", () => {
    const reminder: Reminder = {
      id: generateId(),
      petId: "pet-123",
      title: "Vet Appointment",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };

    expect(reminder.title).toBe("Vet Appointment");
    expect(reminder.isEnabled).toBe(true);
  });
});

describe("Species Options", () => {
  it("should have all expected species", () => {
    const expectedSpecies = ["dog", "cat", "bird", "rabbit", "other"];
    const speciesValues = SPECIES_OPTIONS.map((s) => s.value);
    expectedSpecies.forEach((species) => {
      expect(speciesValues).toContain(species);
    });
  });

  it("should have labels for all species", () => {
    SPECIES_OPTIONS.forEach((option) => {
      expect(option.label).toBeTruthy();
      expect(option.value).toBeTruthy();
    });
  });
});

describe("Document Categories", () => {
  it("should have all expected categories", () => {
    const expectedCategories = ["vet_visit", "lab_results", "prescription", "insurance", "other"];
    const categoryValues = DOCUMENT_CATEGORIES.map((c) => c.value);
    expectedCategories.forEach((category) => {
      expect(categoryValues).toContain(category);
    });
  });

  it("should have labels for all categories", () => {
    DOCUMENT_CATEGORIES.forEach((category) => {
      expect(category.label).toBeTruthy();
      expect(category.value).toBeTruthy();
    });
  });
});

describe("Common Vaccines", () => {
  it("should have vaccines with expiration months", () => {
    expect(COMMON_VACCINES.length).toBeGreaterThan(0);
    COMMON_VACCINES.forEach((vaccine) => {
      expect(vaccine.name).toBeTruthy();
      expect(vaccine.expirationMonths).toBeGreaterThan(0);
    });
  });

  it("should include Rabies vaccine", () => {
    const rabies = COMMON_VACCINES.find((v) => v.name.includes("Rabies"));
    expect(rabies).toBeTruthy();
    expect(rabies!.expirationMonths).toBeGreaterThanOrEqual(12);
  });

  it("should have reasonable expiration periods", () => {
    COMMON_VACCINES.forEach((vaccine) => {
      expect(vaccine.expirationMonths).toBeGreaterThanOrEqual(6);
      expect(vaccine.expirationMonths).toBeLessThanOrEqual(36);
    });
  });
});
