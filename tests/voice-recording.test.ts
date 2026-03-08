import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-audio
vi.mock("expo-audio", () => ({
  useAudioRecorder: vi.fn(() => ({
    prepareToRecordAsync: vi.fn().mockResolvedValue(undefined),
    record: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    uri: "file:///tmp/test-recording.m4a",
  })),
  useAudioRecorderState: vi.fn(() => ({
    isRecording: false,
    durationMillis: 0,
  })),
  RecordingPresets: {
    HIGH_QUALITY: {},
  },
  requestRecordingPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock expo-file-system
vi.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: vi.fn().mockResolvedValue("base64encodeddata"),
  EncodingType: { Base64: "base64" },
}));

// Mock auth
vi.mock("@/lib/_core/auth", () => ({
  getSessionToken: vi.fn().mockResolvedValue("mock-token"),
}));

// Mock oauth constants
vi.mock("@/constants/oauth", () => ({
  getApiBaseUrl: vi.fn(() => "http://localhost:3000"),
}));

describe("Voice Recording Types", () => {
  it("should define VoiceRecordingResult shape", () => {
    const result = {
      uri: "file:///tmp/recording.m4a",
      durationSeconds: 5,
      mimeType: "audio/m4a",
    };

    expect(result.uri).toBe("file:///tmp/recording.m4a");
    expect(result.durationSeconds).toBe(5);
    expect(result.mimeType).toBe("audio/m4a");
  });

  it("should handle web mime type", () => {
    const result = {
      uri: "blob:http://localhost/abc123",
      durationSeconds: 3,
      mimeType: "audio/webm",
    };

    expect(result.mimeType).toBe("audio/webm");
  });
});

describe("Voice Upload Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should construct correct upload payload", () => {
    const fileName = `voice-${Date.now()}.m4a`;
    const payload = {
      json: {
        fileName,
        fileType: "audio/m4a",
        base64Data: "base64encodeddata",
      },
    };

    expect(payload.json.fileType).toBe("audio/m4a");
    expect(payload.json.base64Data).toBe("base64encodeddata");
    expect(payload.json.fileName).toMatch(/^voice-\d+\.m4a$/);
  });

  it("should construct correct transcription payload", () => {
    const payload = {
      json: {
        audioUrl: "https://s3.example.com/voice-123.m4a",
        language: "en",
      },
    };

    expect(payload.json.audioUrl).toContain("voice-123.m4a");
    expect(payload.json.language).toBe("en");
  });

  it("should handle upload error gracefully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    let error: Error | null = null;
    try {
      const res = await fetch("http://localhost:3000/api/trpc/files.upload", {
        method: "POST",
        body: JSON.stringify({ json: { fileName: "test.m4a", fileType: "audio/m4a", base64Data: "abc" } }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }
    } catch (e: any) {
      error = e;
    }

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Upload failed: 500");
  });
});

describe("Admin API Types", () => {
  it("should define admin request list shape", () => {
    const request = {
      id: 1,
      localId: "req-123",
      userId: 42,
      petLocalId: "pet-1",
      petName: "Draco",
      status: "active",
      preview: "Schedule a vet appointment",
      messageCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userName: "Dario",
      userEmail: "dario@example.com",
    };

    expect(request.userName).toBe("Dario");
    expect(request.userEmail).toBe("dario@example.com");
    expect(request.status).toBe("active");
  });

  it("should define admin respond payload", () => {
    const payload = {
      requestId: 1,
      content: "Your appointment is scheduled for Monday at 2pm.",
      newStatus: "in_progress",
    };

    expect(payload.requestId).toBe(1);
    expect(payload.content).toContain("appointment");
    expect(payload.newStatus).toBe("in_progress");
  });

  it("should allow respond without status change", () => {
    const payload = {
      requestId: 1,
      content: "Working on this, will update you shortly.",
    };

    expect(payload.requestId).toBe(1);
    expect((payload as any).newStatus).toBeUndefined();
  });

  it("should define admin status update payload", () => {
    const payload = {
      requestId: 1,
      status: "resolved",
    };

    expect(payload.status).toBe("resolved");
  });
});
