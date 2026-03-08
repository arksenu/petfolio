import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import type { VetProvider, ProviderType } from "@/shared/pet-types";
import { PROVIDER_TYPES } from "@/shared/pet-types";

export default function VetProvidersScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const router = useRouter();
  const { getPet, updatePet } = usePetStore();

  const pet = getPet(petId || "");
  const vetProviders: VetProvider[] = pet?.vetProviders || [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState("");
  const [providerType, setProviderType] = useState<ProviderType>("primary_vet");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setClinicName("");
    setProviderType("primary_vet");
    setPhone("");
    setAddress("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (vet: VetProvider) => {
    setClinicName(vet.clinicName);
    setProviderType(vet.providerType);
    setPhone(vet.phone || "");
    setAddress(vet.address || "");
    setNotes(vet.notes || "");
    setEditingId(vet.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!clinicName.trim() || !petId) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const now = new Date().toISOString();
    const provider: VetProvider = {
      id: editingId || `vet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      petId,
      clinicName: clinicName.trim(),
      providerType,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: editingId
        ? vetProviders.find((v) => v.id === editingId)?.createdAt || now
        : now,
      updatedAt: now,
    };

    const updatedProviders = editingId
      ? vetProviders.map((v) => (v.id === editingId ? provider : v))
      : [...vetProviders, provider];

    const updatedPet = { ...pet!, vetProviders: updatedProviders };
    await updatePet(updatedPet);
    resetForm();
  };

  const handleDelete = (vetId: string) => {
    const doDelete = async () => {
      const updatedProviders = vetProviders.filter((v) => v.id !== vetId);
      const updatedPet = { ...pet!, vetProviders: updatedProviders };
      await updatePet(updatedPet);
    };

    if (Platform.OS === "web") {
      if (window.confirm("Remove this vet provider?")) {
        doDelete();
      }
    } else {
      const { Alert } = require("react-native");
      Alert.alert("Remove Vet", "Remove this vet provider?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const getProviderLabel = (type: ProviderType) =>
    PROVIDER_TYPES.find((t) => t.value === type)?.label || type;

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {pet.name}'s Vets
          </Text>
          <Pressable
            onPress={() => {
              resetForm();
              setShowForm(true);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <IconSymbol name="plus" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Add/Edit Form */}
          {showForm && (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>
                {editingId ? "Edit Vet Provider" : "Add Vet Provider"}
              </Text>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Clinic Name *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="e.g. Happy Paws Veterinary"
                  placeholderTextColor={colors.muted}
                  value={clinicName}
                  onChangeText={setClinicName}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Provider Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typeChips}
                >
                  {PROVIDER_TYPES.map((type) => {
                    const isSelected = providerType === type.value;
                    return (
                      <Pressable
                        key={type.value}
                        onPress={() => setProviderType(type.value)}
                        style={({ pressed }) => [
                          styles.typeChip,
                          {
                            backgroundColor: isSelected ? colors.primary + "20" : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: isSelected ? colors.primary : colors.foreground },
                          ]}
                        >
                          {type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="e.g. (555) 123-4567"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Address</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="e.g. 123 Main St, City, State"
                  placeholderTextColor={colors.muted}
                  value={address}
                  onChangeText={setAddress}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                  placeholder="e.g. Specializes in orthopedics"
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <Pressable
                  onPress={resetForm}
                  style={({ pressed }) => [
                    styles.formButton,
                    { borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.formButtonText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={!clinicName.trim()}
                  style={({ pressed }) => [
                    styles.formButton,
                    {
                      backgroundColor: clinicName.trim() ? colors.primary : colors.muted + "40",
                      opacity: pressed && clinicName.trim() ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.formButtonText, { color: "#FFF" }]}>
                    {editingId ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Vet Provider List */}
          {vetProviders.length === 0 && !showForm ? (
            <View style={styles.emptyState}>
              <IconSymbol name="cross.case.fill" size={48} color={colors.muted + "60"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Vets Added</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Add your pet's vet to make concierge requests easier
              </Text>
              <Pressable
                onPress={() => setShowForm(true)}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.addButtonText}>Add Vet Provider</Text>
              </Pressable>
            </View>
          ) : (
            vetProviders.map((vet) => (
              <View
                key={vet.id}
                style={[styles.vetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.vetCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vetClinicName, { color: colors.foreground }]}>
                      {vet.clinicName}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: colors.primary + "15" }]}>
                      <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                        {getProviderLabel(vet.providerType)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.vetActions}>
                    <Pressable
                      onPress={() => handleEdit(vet)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                    >
                      <IconSymbol name="pencil" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(vet.id)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                    >
                      <IconSymbol name="trash.fill" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>

                {vet.phone && (
                  <View style={styles.vetDetail}>
                    <IconSymbol name="phone.fill" size={14} color={colors.muted} />
                    <Text style={[styles.vetDetailText, { color: colors.foreground }]}>{vet.phone}</Text>
                  </View>
                )}
                {vet.address && (
                  <View style={styles.vetDetail}>
                    <IconSymbol name="location.fill" size={14} color={colors.muted} />
                    <Text style={[styles.vetDetailText, { color: colors.foreground }]}>{vet.address}</Text>
                  </View>
                )}
                {vet.notes && (
                  <Text style={[styles.vetNotes, { color: colors.muted }]}>{vet.notes}</Text>
                )}
              </View>
            ))
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  typeChips: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  formButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  addButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  vetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  vetCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vetClinicName: {
    fontSize: 17,
    fontWeight: "600",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  vetActions: {
    flexDirection: "row",
    gap: 12,
  },
  vetDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  vetDetailText: {
    fontSize: 14,
  },
  vetNotes: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
