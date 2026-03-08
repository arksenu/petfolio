import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useConcierge } from "@/lib/concierge-store";
import { usePetStore } from "@/lib/pet-store";

type InputMode = "text" | "voice";

export default function NewRequestScreen() {
  const colors = useColors();
  const router = useRouter();
  const { createRequest } = useConcierge();
  const { state: petState } = usePetStore();

  const [message, setMessage] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("text");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pets: Array<{ id: string; name: string }> = petState.pets || [];
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const request = createRequest(
      selectedPetId || undefined,
      selectedPet?.name || undefined,
      trimmed,
      "text"
    );

    router.dismiss();
    setTimeout(() => {
      router.push(`/request-thread/${request.id}` as any);
    }, 300);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recordingDuration > 0) {
      const voiceMessage = `[Voice message - ${recordingDuration}s]`;
      const request = createRequest(
        selectedPetId || undefined,
        selectedPet?.name || undefined,
        voiceMessage,
        "voice"
      );

      router.dismiss();
      setTimeout(() => {
        router.push(`/request-thread/${request.id}` as any);
      }, 300);
    }
    setRecordingDuration(0);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.dismiss()}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Request</Text>
          {inputMode === "text" ? (
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: message.trim() ? colors.primary : colors.muted + "40",
                  opacity: pressed && message.trim() ? 0.8 : 1,
                },
              ]}
              disabled={!message.trim()}
            >
              <Text style={[styles.sendText, { color: message.trim() ? "#FFF" : colors.muted }]}>
                Send
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pet Selection */}
          {pets.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                RELATED PET (OPTIONAL)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.petChips}
              >
                {pets.map((pet: { id: string; name: string }) => {
                  const isSelected = selectedPetId === pet.id;
                  return (
                    <Pressable
                      key={pet.id}
                      onPress={() => setSelectedPetId(isSelected ? null : pet.id)}
                      style={({ pressed }) => [
                        styles.petChip,
                        {
                          backgroundColor: isSelected ? colors.primary + "20" : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <IconSymbol
                        name="pawprint.fill"
                        size={14}
                        color={isSelected ? colors.primary : colors.muted}
                      />
                      <Text
                        style={[
                          styles.petChipText,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {pet.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Input Mode Toggle */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>INPUT METHOD</Text>
            <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setInputMode("text")}
                style={({ pressed }) => [
                  styles.modeOption,
                  {
                    backgroundColor: inputMode === "text" ? colors.primary : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name="pencil"
                  size={18}
                  color={inputMode === "text" ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: inputMode === "text" ? "#FFFFFF" : colors.muted },
                  ]}
                >
                  Type
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setInputMode("voice")}
                style={({ pressed }) => [
                  styles.modeOption,
                  {
                    backgroundColor: inputMode === "voice" ? colors.primary : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <IconSymbol
                  name="mic.fill"
                  size={18}
                  color={inputMode === "voice" ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: inputMode === "voice" ? "#FFFFFF" : colors.muted },
                  ]}
                >
                  Voice
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Text Input Mode */}
          {inputMode === "text" && (
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>YOUR REQUEST</Text>
                <TextInput
                  style={[
                    styles.messageInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Describe what you need help with..."
                  placeholderTextColor={colors.muted}
                  multiline
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  autoFocus
                />
              </View>

              {/* Suggestions */}
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUGGESTIONS</Text>
                {[
                  "Schedule a vet appointment",
                  "Refill medication prescription",
                  "Find a pet sitter for this weekend",
                  "Get vaccination records sent to new vet",
                ].map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => setMessage(suggestion)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.foreground }]}>
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Voice Input Mode */}
          {inputMode === "voice" && (
            <View style={styles.voiceSection}>
              {!isRecording ? (
                <>
                  <View style={styles.voicePrompt}>
                    <IconSymbol name="mic.fill" size={48} color={colors.muted + "60"} />
                    <Text style={[styles.voicePromptText, { color: colors.muted }]}>
                      Tap the button below to record your request
                    </Text>
                    <Text style={[styles.voiceHint, { color: colors.muted + "80" }]}>
                      Describe what you need — we'll transcribe it for you
                    </Text>
                  </View>
                  <Pressable
                    onPress={startRecording}
                    style={({ pressed }) => [
                      styles.recordButton,
                      {
                        backgroundColor: colors.error,
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <IconSymbol name="mic.fill" size={32} color="#FFFFFF" />
                    <Text style={styles.recordButtonText}>Start Recording</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.recordingContainer}>
                    <Animated.View
                      style={[
                        styles.recordingPulse,
                        {
                          backgroundColor: colors.error + "20",
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    >
                      <View style={[styles.recordingDotLarge, { backgroundColor: colors.error }]} />
                    </Animated.View>
                    <Text style={[styles.recordingDuration, { color: colors.foreground }]}>
                      {formatDuration(recordingDuration)}
                    </Text>
                    <Text style={[styles.recordingLabel, { color: colors.error }]}>
                      Recording...
                    </Text>
                  </View>
                  <View style={styles.recordingActions}>
                    <Pressable
                      onPress={cancelRecording}
                      style={({ pressed }) => [
                        styles.recordActionButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <IconSymbol name="xmark" size={20} color={colors.muted} />
                      <Text style={[styles.recordActionText, { color: colors.muted }]}>
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={stopRecording}
                      style={({ pressed }) => [
                        styles.recordActionButton,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <IconSymbol name="stop.fill" size={20} color="#FFFFFF" />
                      <Text style={[styles.recordActionText, { color: "#FFFFFF" }]}>
                        Send
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  sendText: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  petChips: {
    flexDirection: "row",
    gap: 8,
  },
  petChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  petChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  modeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    margin: 3,
  },
  modeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  messageInput: {
    minHeight: 120,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 15,
  },
  voiceSection: {
    alignItems: "center",
    paddingTop: 32,
    gap: 32,
  },
  voicePrompt: {
    alignItems: "center",
    gap: 12,
  },
  voicePromptText: {
    fontSize: 17,
    fontWeight: "500",
    textAlign: "center",
  },
  voiceHint: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  recordingContainer: {
    alignItems: "center",
    gap: 16,
  },
  recordingPulse: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingDotLarge: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  recordingDuration: {
    fontSize: 40,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
  },
  recordingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  recordingActions: {
    flexDirection: "row",
    gap: 16,
  },
  recordActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  recordActionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
