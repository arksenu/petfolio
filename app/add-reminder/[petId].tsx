import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DatePickerModal, TimePickerModal } from "@/components/date-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";

const QUICK_REMINDERS = [
  { label: "Vet Appointment", icon: "heart.fill" as const },
  { label: "Medication", icon: "doc.fill" as const },
  { label: "Grooming", icon: "pawprint.fill" as const },
  { label: "Flea/Tick Treatment", icon: "exclamationmark.circle.fill" as const },
  { label: "Heartworm Prevention", icon: "heart.fill" as const },
  { label: "Weight Check", icon: "calendar" as const },
];

export default function AddReminderScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { addReminder, getPet } = usePetStore();

  const pet = getPet(petId || "");

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  const handleQuickReminder = (label: string) => {
    setTitle(label);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDateChange = (newDate: Date) => {
    const updated = new Date(newDate);
    updated.setHours(date.getHours(), date.getMinutes());
    setDate(updated);
  };

  const handleTimeChange = (newDate: Date) => {
    const updated = new Date(date);
    updated.setHours(newDate.getHours(), newDate.getMinutes());
    setDate(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required Field", "Please enter a reminder title.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    try {
      await addReminder({
        petId: petId || "",
        title: title.trim(),
        date: date.toISOString(),
        isEnabled: true,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to add reminder. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Reminder</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Quick Reminders */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Quick Add</Text>
              <View style={styles.quickContainer}>
                {QUICK_REMINDERS.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    onPress={() => handleQuickReminder(item.label)}
                    style={[
                      styles.quickOption,
                      {
                        backgroundColor: title === item.label ? colors.primary : colors.surface,
                        borderColor: title === item.label ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <IconSymbol
                      name={item.icon}
                      size={16}
                      color={title === item.label ? "#FFFFFF" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.quickText,
                        { color: title === item.label ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Reminder Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Annual checkup"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Date</Text>
              <DatePickerModal
                value={date}
                onChange={handleDateChange}
                minimumDate={new Date()}
                label="Reminder Date"
              />
            </View>

            {/* Time */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Time</Text>
              <TimePickerModal
                value={date}
                onChange={handleTimeChange}
                label="Reminder Time"
              />
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                You'll receive a push notification at the scheduled time. Make sure notifications are enabled for this app.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          >
            <Text style={styles.saveButtonText}>{isSubmitting ? "Saving..." : "Save Reminder"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    gap: 24,
    paddingBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  quickContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  quickText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
