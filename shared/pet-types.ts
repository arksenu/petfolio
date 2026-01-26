// Petfolio Data Types

export type Species = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type WeightUnit = 'kg' | 'lb';
export type DocumentCategory = 'vet_visit' | 'lab_results' | 'prescription' | 'insurance' | 'other';
export type VaccinationStatus = 'current' | 'expiring_soon' | 'expired';

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  dateOfBirth?: string; // ISO date string
  weight?: number;
  weightUnit?: WeightUnit;
  microchipNumber?: string;
  photoUri?: string;
  createdAt: string;
  updatedAt: string;
}

export type FileType = 'image' | 'pdf' | 'document';

export interface PetDocument {
  id: string;
  petId: string;
  title: string;
  category: DocumentCategory;
  fileUri: string;
  fileType?: FileType; // Type of file (image, pdf, document)
  fileName?: string; // Original file name for documents
  date: string; // ISO date string
  notes?: string;
  createdAt: string;
}

export interface Vaccination {
  id: string;
  petId: string;
  name: string;
  dateAdministered: string; // ISO date string
  expirationDate?: string; // ISO date string
  veterinarian?: string;
  notes?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  petId: string;
  title: string;
  date: string; // ISO date string
  time?: string; // Time string like "09:00"
  isEnabled: boolean;
  notificationId?: string;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  petId: string;
  weight: number;
  weightUnit: WeightUnit;
  date: string; // ISO date string
  notes?: string;
  createdAt: string;
}

// Common vaccine types with default expiration periods (in months)
export const COMMON_VACCINES: { name: string; expirationMonths: number }[] = [
  { name: 'Rabies (1 year)', expirationMonths: 12 },
  { name: 'Rabies (3 year)', expirationMonths: 36 },
  { name: 'DHPP', expirationMonths: 12 },
  { name: 'Bordetella', expirationMonths: 6 },
  { name: 'Leptospirosis', expirationMonths: 12 },
  { name: 'Lyme', expirationMonths: 12 },
  { name: 'Canine Influenza', expirationMonths: 12 },
  { name: 'FVRCP', expirationMonths: 12 },
  { name: 'FeLV', expirationMonths: 12 },
];

export const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
];

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

// Helper function to calculate vaccination status
export function getVaccinationStatus(expirationDate?: string): VaccinationStatus {
  if (!expirationDate) return 'current';
  
  const now = new Date();
  const expDate = new Date(expirationDate);
  const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) {
    return 'expired';
  } else if (daysUntilExpiration <= 30) {
    return 'expiring_soon';
  }
  return 'current';
}

// Helper function to format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper function to calculate age from date of birth
export function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Also adjust if day hasn't passed yet this month
  if (now.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  if (years < 1) {
    const totalMonths = Math.max(1, months);
    return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
  }
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
