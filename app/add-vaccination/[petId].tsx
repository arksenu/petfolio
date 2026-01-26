import { useState, useEffect } from "react";
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
import { CustomDatePicker } from "@/components/custom-date-picker";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { COMMON_VACCINES } from "@/shared/pet-types";

export default function AddVaccinationScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { addVaccination, getPet } = usePetStore();

  const pet = getPet(petId || "");

  const [vaccineName, setVaccineName] = useState("");
  const [customVaccine, setCustomVaccine] = useState("");
  const [dateAdministered, setDateAdministered] = useState(new Date());
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [vetClinicName, setVetClinicName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate expiration date based on vaccine type
  useEffect(() => {
    if (vaccineName && vaccineName !== "custom") {
      const vaccine = COMMON_VACCINES.find((v) => v.name === vaccineName);
      if (vaccine) {
        const newExpiration = new Date(dateAdministered);
        newExpiration.setMonth(newExpiration.getMonth() + vaccine.expirationMonths);
        setExpirationDate(newExpiration);
      }
    }
  }, [vaccineName, dateAdministered]);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  const handleSave = async () => {
    const finalVaccineName = vaccineName === "custom" ? customVaccine.trim() : vaccineName;

    if (!finalVaccineName) {
      Alert.alert("Required Field", "Please select or enter a vaccine name.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    try {
      await addVaccination({
        petId: petId || "",
        vaccineName: finalVaccineName,
        dateAdministered: dateAdministered.toISOString(),
        expirationDate: expirationDate.toISOString(),
        vetClinicName: vetClinicName.trim() || undefined,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to add vaccination. Please try again.");
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Vaccination</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Vaccine Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Vaccine Name *</Text>
              <View style={styles.vaccineContainer}>
                {COMMON_VACCINES.map((vaccine) => (
                  <TouchableOpacity
                    key={vaccine.name}
                    onPress={() => setVaccineName(vaccine.name)}
                    style={[
                      styles.vaccineOption,
                      {
                        backgroundColor: vaccineName === vaccine.name ? colors.primary : colors.surface,
                        borderColor: vaccineName === vaccine.name ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.vaccineText,
                        { color: vaccineName === vaccine.name ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {vaccine.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setVaccineName("custom")}
                  style={[
                    styles.vaccineOption,
                    {
                      backgroundColor: vaccineName === "custom" ? colors.primary : colors.surface,
                      borderColor: vaccineName === "custom" ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.vaccineText,
                      { color: vaccineName === "custom" ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    + Custom
                  </Text>
                </TouchableOpacity>
              </View>
              {vaccineName === "custom" && (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, marginTop: 12 }]}
                  value={customVaccine}
                  onChangeText={setCustomVaccine}
                  placeholder="Enter vaccine name"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                />
              )}
            </View>

            {/* Date Administered */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Date Administered</Text>
              <CustomDatePicker
                value={dateAdministered}
                onChange={setDateAdministered}
                maximumDate={new Date()}
                label="Date Administered"
              />
            </View>

            {/* Expiration Date */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Expiration Date</Text>
                {vaccineName && vaccineName !== "custom" && (
                  <Text style={[styles.autoLabel, { color: colors.primary }]}>Auto-calculated</Text>
                )}
              </View>
              <CustomDatePicker
                value={expirationDate}
                onChange={setExpirationDate}
                minimumDate={dateAdministered}
                label="Expiration Date"
              />
              <Text style={[styles.hint, { color: colors.muted }]}>
                You can adjust the expiration date manually if needed.
              </Text>
            </View>

            {/* Vet/Clinic Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Vet/Clinic Name (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={vetClinicName}
                onChangeText={setVetClinicName}
                placeholder="e.g., Happy Paws Veterinary"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                You'll receive reminders 7 days and 1 day before this vaccination expires.
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
            <Text style={styles.saveButtonText}>{isSubmitting ? "Saving..." : "Save Vaccination"}</Text>
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  autoLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  vaccineContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vaccineOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  vaccineText: {
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
