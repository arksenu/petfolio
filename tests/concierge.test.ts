import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock expo-haptics
vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

// Mock expo-notifications
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  scheduleNotificationAsync: vi.fn().mockResolvedValue("mock-id"),
  cancelScheduledNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
  getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: "mock-token" }),
  SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily" },
}));

// Test concierge types
import type {
  ConciergeRequest,
  ConciergeMessage,
  VetProvider,
  ProviderType,
} from "../shared/pet-types";

describe("Concierge Types", () => {
  it("should create a valid ConciergeRequest", () => {
    const request: ConciergeRequest = {
      id: "req_123",
      petId: "pet_1",
      status: "pending",
      preview: "Schedule a vet appointment for Draco",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(request.id).toBe("req_123");
    expect(request.status).toBe("pending");
    expect(request.preview).toBe("Schedule a vet appointment for Draco");
  });

  it("should support all request statuses", () => {
    const statuses: ConciergeRequest["status"][] = [
      "active",
      "pending",
      "in_progress",
      "resolved",
    ];

    statuses.forEach((status) => {
      const request: ConciergeRequest = {
        id: `req_${status}`,
        status,
        preview: "Test request",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(request.status).toBe(status);
    });
  });

  it("should create a valid ConciergeMessage", () => {
    const message: ConciergeMessage = {
      id: "msg_123",
      requestId: "req_123",
      senderType: "user",
      messageType: "text",
      content: "I need to schedule a vet appointment",
      createdAt: new Date().toISOString(),
    };

    expect(message.senderType).toBe("user");
    expect(message.messageType).toBe("text");
    expect(message.content).toBe("I need to schedule a vet appointment");
  });

  it("should support voice messages", () => {
    const message: ConciergeMessage = {
      id: "msg_voice_1",
      requestId: "req_123",
      senderType: "user",
      messageType: "voice",
      content: "Transcribed voice message content",
      audioUrl: "file:///path/to/audio.m4a",
      audioDuration: 5.2,
      createdAt: new Date().toISOString(),
    };

    expect(message.messageType).toBe("voice");
    expect(message.audioUrl).toBeDefined();
    expect(message.audioDuration).toBe(5.2);
  });

  it("should create a valid VetProvider", () => {
    const provider: VetProvider = {
      id: "vet_123",
      petId: "pet_1",
      clinicName: "Happy Paws Veterinary",
      phone: "(555) 123-4567",
      address: "123 Main St",
      providerType: "primary_vet",
      notes: "Specializes in orthopedics",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(provider.clinicName).toBe("Happy Paws Veterinary");
    expect(provider.providerType).toBe("primary_vet");
  });

  it("should support all provider types", () => {
    const types: ProviderType[] = [
      "primary_vet",
      "specialist",
      "emergency",
      "groomer",
      "boarding",
      "other",
    ];

    types.forEach((type) => {
      const provider: VetProvider = {
        id: `vet_${type}`,
        petId: "pet_1",
        clinicName: `${type} clinic`,
        providerType: type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(provider.providerType).toBe(type);
    });
  });
});

// Note: Concierge notification functions (showConciergeNotification, getExpoPushToken)
// are tested implicitly via the notifications.test.ts suite and cannot be dynamically
// imported in vitest due to expo-notifications SSR transform issues.
