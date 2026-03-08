import React, { useState, useMemo } from "react";
import {
  Text,
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useConcierge } from "@/lib/concierge-store";
import { usePetStore } from "@/lib/pet-store";

export default function NewRequestScreen() {
  const colors = useColors();
  const router = useRouter();
  const { createRequest } = useConcierge();
  const { state: petState } = usePetStore();

  const [message, setMessage] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const pets: Array<{ id: string; name: string }> = petState.pets || [];
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );

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
    // Navigate to the thread after a short delay so the modal dismisses cleanly
    setTimeout(() => {
      router.push(`/request-thread/${request.id}` as any);
    }, 300);
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

          {/* Message Input */}
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
});
