import { useState, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import {
  calculateAge,
  formatDate,
  getVaccinationStatus,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  PetDocument,
  Vaccination,
  Reminder,
  Medication,
  MEDICATION_FREQUENCIES,
} from "@/shared/pet-types";

type TabType = "records" | "vaccinations" | "reminders" | "medications";

export default function PetProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const {
    getPet,
    getDocumentsForPet,
    getVaccinationsForPet,
    getRemindersForPet,
    getMedicationsForPet,
    deletePet,
    deleteDocument,
    deleteVaccination,
    deleteReminder,
    toggleReminder,
    deleteMedication,
    logDose,
  } = usePetStore();

  const [activeTab, setActiveTab] = useState<TabType>("records");
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | "all">("all");

  const pet = getPet(id || "");
  const documents = getDocumentsForPet(id || "");
  const vaccinations = getVaccinationsForPet(id || "");
  const reminders = getRemindersForPet(id || "");
  const medications = getMedicationsForPet(id || "");

  const filteredDocuments = useMemo(() => {
    if (selectedCategory === "all") return documents;
    return documents.filter((d) => d.category === selectedCategory);
  }, [documents, selectedCategory]);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/edit-pet/${id}` as any);
  };

  const handleShare = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/share/${id}` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete ${pet.name}? This will also delete all their records, vaccinations, and reminders.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePet(pet.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleAddDocument = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/add-document/${id}` as any);
  };

  const handleAddVaccination = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/add-vaccination/${id}` as any);
  };

  const handleAddReminder = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/add-reminder/${id}` as any);
  };

  const handleAddMedication = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/add-medication/${id}` as any);
  };

  const handleDeleteMedication = (medId: string) => {
    Alert.alert("Delete Medication", "Are you sure you want to delete this medication?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedication(medId) },
    ]);
  };

  const handleLogDose = (medId: string, medName: string) => {
    Alert.alert(
      "Log Dose",
      `Did you give ${pet?.name} their ${medName}?`,
      [
        { text: "Skip", style: "cancel", onPress: () => logDose(medId, true) },
        { text: "Yes, Given", onPress: () => logDose(medId, false) },
      ]
    );
  };

  const getNextDoseTime = (med: Medication): string => {
    const lastDose = med.doseLog?.[med.doseLog.length - 1];
    if (!lastDose) return "No doses logged";
    
    const lastDoseDate = new Date(lastDose.takenAt);
    let nextDose = new Date(lastDoseDate);
    
    switch (med.frequency) {
      case "once_daily":
        nextDose.setDate(nextDose.getDate() + 1);
        break;
      case "twice_daily":
        nextDose.setHours(nextDose.getHours() + 12);
        break;
      case "three_times_daily":
        nextDose.setHours(nextDose.getHours() + 8);
        break;
      case "every_other_day":
        nextDose.setDate(nextDose.getDate() + 2);
        break;
      case "weekly":
        nextDose.setDate(nextDose.getDate() + 7);
        break;
      case "monthly":
        nextDose.setMonth(nextDose.getMonth() + 1);
        break;
      default:
        return "As needed";
    }
    
    const now = new Date();
    if (nextDose < now) return "Due now";
    
    const diffMs = nextDose.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `Next in ${diffDays}d`;
    } else if (diffHours > 0) {
      return `Next in ${diffHours}h ${diffMins}m`;
    } else {
      return `Next in ${diffMins}m`;
    }
  };

  const handleDeleteDocument = (docId: string) => {
    Alert.alert("Delete Document", "Are you sure you want to delete this document?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteDocument(docId) },
    ]);
  };

  const handleDeleteVaccination = (vaxId: string) => {
    Alert.alert("Delete Vaccination", "Are you sure you want to delete this vaccination record?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteVaccination(vaxId) },
    ]);
  };

  const handleDeleteReminder = (reminderId: string) => {
    Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteReminder(reminderId) },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return colors.success;
      case "expiring_soon":
        return colors.warning;
      case "expired":
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const handleViewDocument = (docId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/view-document/${docId}` as any);
  };

  const renderDocumentCard = ({ item }: { item: PetDocument }) => {
    const categoryLabel = DOCUMENT_CATEGORIES.find((c) => c.value === item.category)?.label || item.category;
    return (
      <TouchableOpacity
        onPress={() => handleViewDocument(item.id)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{categoryLabel}</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDocument(item.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.cardDate, { color: colors.muted }]}>{formatDate(item.date)}</Text>
        {item.notes && (
          <Text style={[styles.cardNotes, { color: colors.muted }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
        <View style={styles.viewHint}>
          <Text style={[styles.viewHintText, { color: colors.primary }]}>Tap to view</Text>
          <IconSymbol name="chevron.right" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderVaccinationCard = ({ item }: { item: Vaccination }) => {
    const status = getVaccinationStatus(item.expirationDate);
    const statusColor = getStatusColor(status);
    const daysUntil = item.expirationDate 
      ? Math.ceil((new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.vaccinationHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteVaccination(item.id)}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
        <View style={styles.vaccinationDetails}>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            Given: {formatDate(item.dateAdministered)}
          </Text>
          <Text style={[styles.expirationText, { color: statusColor }]}>
            {!item.expirationDate
              ? "No expiration"
              : status === "expired"
              ? "Expired"
              : status === "expiring_soon"
              ? `Expires in ${daysUntil} days`
              : `Expires: ${formatDate(item.expirationDate)}`}
          </Text>
        </View>
        {item.veterinarian && (
          <Text style={[styles.cardNotes, { color: colors.muted }]}>{item.veterinarian}</Text>
        )}
      </View>
    );
  };

  const renderReminderCard = ({ item }: { item: Reminder }) => {
    const isPast = new Date(item.date) < new Date();
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.reminderHeader}>
            <TouchableOpacity
              onPress={() => toggleReminder(item.id)}
              style={[
                styles.checkbox,
                {
                  backgroundColor: item.isEnabled ? colors.primary : "transparent",
                  borderColor: item.isEnabled ? colors.primary : colors.border,
                },
              ]}
            >
              {item.isEnabled && <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <View style={styles.reminderContent}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.foreground, opacity: item.isEnabled ? 1 : 0.5 },
                ]}
              >
                {item.title}
              </Text>
              <Text style={[styles.cardDate, { color: isPast ? colors.error : colors.muted }]}>
                {formatDate(item.date)}
                {isPast && " (Past)"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDeleteReminder(item.id)}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMedicationCard = ({ item }: { item: Medication }) => {
    const freqLabel = MEDICATION_FREQUENCIES.find((f) => f.value === item.frequency)?.label || item.frequency;
    const nextDose = getNextDoseTime(item);
    const isDueNow = nextDose === "Due now";
    const needsRefill = item.pillsRemaining !== undefined && item.refillReminderAt !== undefined && item.pillsRemaining <= item.refillReminderAt;
    
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
              {needsRefill && (
                <View style={[styles.categoryBadge, { backgroundColor: colors.warning + "20" }]}>
                  <Text style={{ fontSize: 10, color: colors.warning, fontWeight: "600" }}>REFILL</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardDate, { color: colors.muted }]}>
              {item.dosage} · {freqLabel}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteMedication(item.id)}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <View>
            <Text style={[styles.cardDate, { color: isDueNow ? colors.warning : colors.muted }]}>
              {nextDose}
            </Text>
            {item.pillsRemaining !== undefined && (
              <Text style={[styles.cardDate, { color: needsRefill ? colors.warning : colors.muted, marginTop: 2 }]}>
                {item.pillsRemaining} pills remaining
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleLogDose(item.id, item.name)}
            style={[
              styles.logDoseButton,
              { backgroundColor: isDueNow ? colors.primary : colors.primary + "20" },
            ]}
          >
            <Text style={{ color: isDueNow ? "#FFFFFF" : colors.primary, fontWeight: "600", fontSize: 14 }}>
              Log Dose
            </Text>
          </TouchableOpacity>
        </View>
        
        {item.instructions && (
          <Text style={[styles.cardNotes, { color: colors.muted, marginTop: 8 }]}>
            {item.instructions}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = (type: string, onAdd: () => void) => (
    <View style={styles.emptyState}>
      <IconSymbol
        name={type === "records" ? "doc.fill" : type === "vaccinations" ? "heart.fill" : type === "medications" ? "pills.fill" : "bell.fill"}
        size={48}
        color={colors.muted}
      />
      <Text style={[styles.emptyText, { color: colors.muted }]}>No {type} yet</Text>
      <TouchableOpacity
        onPress={onAdd}
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.emptyButtonText}>Add {type.slice(0, -1)}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <IconSymbol name="square.and.arrow.up" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
            <IconSymbol name="pencil" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <IconSymbol name="trash.fill" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet Info */}
        <View style={styles.petInfo}>
          {pet.photoUri ? (
            <Image source={{ uri: pet.photoUri }} style={styles.petPhoto} contentFit="cover" />
          ) : (
            <View style={[styles.petPhotoPlaceholder, { backgroundColor: colors.surface }]}>
              <IconSymbol name="pawprint.fill" size={48} color={colors.muted} />
            </View>
          )}
          <Text style={[styles.petName, { color: colors.foreground }]}>{pet.name}</Text>
          <Text style={[styles.petBreed, { color: colors.muted }]}>
            {pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </Text>
          <View style={styles.petStats}>
            <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Age</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : "Unknown"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push(`/weight-history/${id}` as any);
              }}
              style={[styles.statItem, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.statLabel, { color: colors.muted }]}>Weight</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {pet.weight ? `${pet.weight} ${pet.weightUnit || 'lb'}` : "—"}
              </Text>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={12} color={colors.primary} />
            </TouchableOpacity>
            {pet.microchipNumber && (
              <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Microchip</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
                  {pet.microchipNumber}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(["records", "vaccinations", "medications", "reminders"] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.muted },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "records" && (
            <>
              {/* Category Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCategory("all")}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: selectedCategory === "all" ? colors.primary : colors.surface,
                      borderColor: selectedCategory === "all" ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: selectedCategory === "all" ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setSelectedCategory(cat.value)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor:
                          selectedCategory === cat.value ? colors.primary : colors.surface,
                        borderColor: selectedCategory === cat.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: selectedCategory === cat.value ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {filteredDocuments.length === 0 ? (
                renderEmptyState("records", handleAddDocument)
              ) : (
                <FlatList
                  data={filteredDocuments}
                  keyExtractor={(item) => item.id}
                  renderItem={renderDocumentCard}
                  scrollEnabled={false}
                  contentContainerStyle={styles.cardList}
                />
              )}
            </>
          )}

          {activeTab === "vaccinations" && (
            <>
              {vaccinations.length === 0 ? (
                renderEmptyState("vaccinations", handleAddVaccination)
              ) : (
                <FlatList
                  data={vaccinations.sort(
                    (a, b) =>
                      (a.expirationDate ? new Date(a.expirationDate).getTime() : 0) - (b.expirationDate ? new Date(b.expirationDate).getTime() : 0)
                  )}
                  keyExtractor={(item) => item.id}
                  renderItem={renderVaccinationCard}
                  scrollEnabled={false}
                  contentContainerStyle={styles.cardList}
                />
              )}
            </>
          )}

          {activeTab === "medications" && (
            <>
              {medications.length === 0 ? (
                renderEmptyState("medications", handleAddMedication)
              ) : (
                <FlatList
                  data={medications.sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                  )}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMedicationCard}
                  scrollEnabled={false}
                  contentContainerStyle={styles.cardList}
                />
              )}
            </>
          )}

          {activeTab === "reminders" && (
            <>
              {reminders.length === 0 ? (
                renderEmptyState("reminders", handleAddReminder)
              ) : (
                <FlatList
                  data={reminders.sort(
                    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                  )}
                  keyExtractor={(item) => item.id}
                  renderItem={renderReminderCard}
                  scrollEnabled={false}
                  contentContainerStyle={styles.cardList}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={
          activeTab === "records"
            ? handleAddDocument
            : activeTab === "vaccinations"
            ? handleAddVaccination
            : activeTab === "medications"
            ? handleAddMedication
            : handleAddReminder
        }
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  petInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  petPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  petPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  petName: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 16,
  },
  petBreed: {
    fontSize: 16,
    marginTop: 4,
  },
  petStats: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  statItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 80,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 13,
    marginTop: 4,
  },
  cardNotes: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  vaccinationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  vaccinationDetails: {
    marginTop: 4,
  },
  expirationText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  viewHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 4,
  },
  viewHintText: {
    fontSize: 13,
    fontWeight: "500",
  },
  logDoseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
