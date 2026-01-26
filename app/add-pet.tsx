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
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CustomDatePicker } from "@/components/custom-date-picker";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { Species, WeightUnit, SPECIES_OPTIONS } from "@/shared/pet-types";

export default function AddPetScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addPet } = usePetStore();

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lb");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library to add a pet photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your camera to take a pet photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter your pet's name.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    try {
      await addPet({
        name: name.trim(),
        species,
        breed: breed.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
        weight: parseFloat(weight) || undefined,
        weightUnit,
        microchipNumber: microchipNumber.trim() || undefined,
        photoUri,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to add pet. Please try again.");
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Pet</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo Picker */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={[styles.photoContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <IconSymbol name="camera.fill" size={40} color={colors.muted} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.muted }]}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.photoButtons}>
              <TouchableOpacity
                onPress={handleTakePhoto}
                style={[styles.photoButton, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="camera.fill" size={20} color={colors.primary} />
                <Text style={[styles.photoButtonText, { color: colors.primary }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.photoButton, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="photo.fill" size={20} color={colors.primary} />
                <Text style={[styles.photoButtonText, { color: colors.primary }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter pet's name"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            {/* Species */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Species</Text>
              <View style={styles.speciesContainer}>
                {SPECIES_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSpecies(option.value)}
                    style={[
                      styles.speciesOption,
                      {
                        backgroundColor: species === option.value ? colors.primary : colors.surface,
                        borderColor: species === option.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.speciesText,
                        { color: species === option.value ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breed */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Breed</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={breed}
                onChangeText={setBreed}
                placeholder="Enter breed (optional)"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Date of Birth</Text>
              <CustomDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                maximumDate={new Date()}
                label="Date of Birth"
              />
            </View>

            {/* Weight */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Weight</Text>
              <View style={styles.weightContainer}>
                <TextInput
                  style={[styles.weightInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <View style={styles.unitContainer}>
                  <TouchableOpacity
                    onPress={() => setWeightUnit("lb")}
                    style={[
                      styles.unitOption,
                      {
                        backgroundColor: weightUnit === "lb" ? colors.primary : colors.surface,
                        borderColor: weightUnit === "lb" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: weightUnit === "lb" ? "#FFFFFF" : colors.foreground }}>lb</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setWeightUnit("kg")}
                    style={[
                      styles.unitOption,
                      {
                        backgroundColor: weightUnit === "kg" ? colors.primary : colors.surface,
                        borderColor: weightUnit === "kg" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: weightUnit === "kg" ? "#FFFFFF" : colors.foreground }}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Microchip Number */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Microchip Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={microchipNumber}
                onChangeText={setMicrochipNumber}
                placeholder="Enter microchip number (optional)"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
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
            <Text style={styles.saveButtonText}>{isSubmitting ? "Saving..." : "Add Pet"}</Text>
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
  photoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    gap: 20,
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
  speciesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  speciesOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  speciesText: {
    fontSize: 14,
    fontWeight: "500",
  },
  weightContainer: {
    flexDirection: "row",
    gap: 12,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  unitContainer: {
    flexDirection: "row",
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
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
