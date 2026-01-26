import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: vi.fn().mockResolvedValue("notification-id-123"),
  cancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
}));

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("Notification Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have default notification settings", async () => {
    const { getNotificationSettings } = await import("../lib/notifications");
    const settings = await getNotificationSettings();
    
    expect(settings).toEqual({
      enabled: true,
      reminderNotifications: true,
      vaccinationWarnings: true,
      vaccinationWarningDays: 7,
    });
  });

  it("should request notification permissions", async () => {
    const { requestNotificationPermissions } = await import("../lib/notifications");
    const granted = await requestNotificationPermissions();
    
    expect(granted).toBe(true);
  });
});

describe("Reminder Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not schedule notification for past dates", async () => {
    const { scheduleReminderNotification } = await import("../lib/notifications");
    
    const pastReminder = {
      id: "reminder-1",
      petId: "pet-1",
      title: "Vet Appointment",
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };
    
    const result = await scheduleReminderNotification(pastReminder, "Buddy");
    expect(result).toBeNull();
  });

  it("should schedule notification for future dates", async () => {
    const Notifications = await import("expo-notifications");
    const { scheduleReminderNotification } = await import("../lib/notifications");
    
    const futureReminder = {
      id: "reminder-2",
      petId: "pet-1",
      title: "Grooming",
      date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };
    
    const result = await scheduleReminderNotification(futureReminder, "Buddy");
    expect(result).toBe("notification-id-123");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

describe("Vaccination Warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should schedule multiple warnings for upcoming vaccination expiration", async () => {
    const Notifications = await import("expo-notifications");
    const { scheduleVaccinationWarnings } = await import("../lib/notifications");
    
    // Vaccination expiring in 14 days
    const vaccination = {
      id: "vax-1",
      petId: "pet-1",
      name: "Rabies",
      dateAdministered: new Date(Date.now() - 86400000 * 351).toISOString(), // ~351 days ago
      expirationDate: new Date(Date.now() + 86400000 * 14).toISOString(), // 14 days from now
      createdAt: new Date().toISOString(),
    };
    
    const result = await scheduleVaccinationWarnings(vaccination, "Buddy");
    
    // Should schedule 7-day warning, 1-day warning, and expiration day notification
    expect(result.length).toBeGreaterThan(0);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it("should not schedule warnings for already expired vaccinations", async () => {
    const { scheduleVaccinationWarnings } = await import("../lib/notifications");
    
    // Already expired vaccination
    const expiredVaccination = {
      id: "vax-2",
      petId: "pet-1",
      name: "Distemper",
      dateAdministered: new Date(Date.now() - 86400000 * 400).toISOString(),
      expirationDate: new Date(Date.now() - 86400000 * 35).toISOString(), // Expired 35 days ago
      createdAt: new Date().toISOString(),
    };
    
    const result = await scheduleVaccinationWarnings(expiredVaccination, "Buddy");
    expect(result).toEqual([]);
  });
});

describe("Cancel Notifications", () => {
  it("should cancel reminder notifications", async () => {
    const Notifications = await import("expo-notifications");
    const { cancelReminderNotifications } = await import("../lib/notifications");
    
    await cancelReminderNotifications("reminder-1");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("reminder-reminder-1");
  });

  it("should cancel all vaccination notifications", async () => {
    const Notifications = await import("expo-notifications");
    const { cancelVaccinationNotifications } = await import("../lib/notifications");
    
    await cancelVaccinationNotifications("vax-1");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });
});
