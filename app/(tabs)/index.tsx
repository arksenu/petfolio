import { Text, View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePetStore } from "@/lib/pet-store";
import { useColors } from "@/hooks/use-colors";
import { Pet, getVaccinationStatus, calculateAge, formatDate } from "@/shared/pet-types";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, getVaccinationsForPet, getRemindersForPet } = usePetStore();
  const { pets, isLoading } = state;

  const handleAddPet = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/add-pet");
  };

  const handleSearch = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/search");
  };

  const handlePetPress = (petId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/pet/${petId}` as any);
  };

  const getNextReminder = (petId: string): string | null => {
    const vaccinations = getVaccinationsForPet(petId);
    const reminders = getRemindersForPet(petId);
    
    // Check for expiring vaccinations
    const expiringVax = vaccinations
      .filter((v) => {
        const status = getVaccinationStatus(v.expirationDate);
        return status === 'expiring_soon' || status === 'expired';
      })
      .sort((a, b) => (a.expirationDate ? new Date(a.expirationDate).getTime() : 0) - (b.expirationDate ? new Date(b.expirationDate).getTime() : 0))[0];

    if (expiringVax) {
      const status = getVaccinationStatus(expiringVax.expirationDate);
      if (status === 'expired') {
        return `${expiringVax.name} expired`;
      }
      return `${expiringVax.name} expiring ${expiringVax.expirationDate ? formatDate(expiringVax.expirationDate) : ''}`;
    }

    // Check for upcoming reminders
    const upcomingReminder = reminders
      .filter((r) => r.isEnabled && new Date(r.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (upcomingReminder) {
      return `${upcomingReminder.title} on ${formatDate(upcomingReminder.date)}`;
    }

    return null;
  };

  const renderPetCard = ({ item }: { item: Pet }) => {
    const nextReminder = getNextReminder(item.id);
    const hasWarning = nextReminder?.includes('expired') || nextReminder?.includes('expiring');

    return (
      <TouchableOpacity
        onPress={() => handlePetPress(item.id)}
        style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={styles.petCardContent}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.petPhoto} contentFit="cover" />
          ) : (
            <View style={[styles.petPhotoPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol name="pawprint.fill" size={32} color={colors.muted} />
            </View>
          )}
          <View style={styles.petInfo}>
            <Text style={[styles.petName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.petDetails, { color: colors.muted }]}>
              {item.species.charAt(0).toUpperCase() + item.species.slice(1)}
              {item.breed ? ` · ${item.breed}` : ""}
            </Text>
            <Text style={[styles.petAge, { color: colors.muted }]}>
              {item.dateOfBirth ? calculateAge(item.dateOfBirth) : 'Unknown age'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.muted} />
        </View>
        {nextReminder && (
          <View
            style={[
              styles.reminderBadge,
              { backgroundColor: hasWarning ? colors.warning + "20" : colors.primary + "20" },
            ]}
          >
            <IconSymbol
              name={hasWarning ? "exclamationmark.circle.fill" : "bell.fill"}
              size={14}
              color={hasWarning ? colors.warning : colors.primary}
            />
            <Text
              style={[
                styles.reminderText,
                { color: hasWarning ? colors.warning : colors.primary },
              ]}
              numberOfLines={1}
            >
              {nextReminder}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <IconSymbol name="pawprint.fill" size={64} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No pets yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Add your first pet to start tracking their health records
      </Text>
      <TouchableOpacity
        onPress={handleAddPet}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>Add Your First Pet</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Pets</Text>
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <IconSymbol name="magnifyingglass" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {pets.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={renderPetCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {pets.length > 0 && (
        <TouchableOpacity
          onPress={handleAddPet}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  petCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  petCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  petPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  petPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  petInfo: {
    flex: 1,
    marginLeft: 16,
  },
  petName: {
    fontSize: 18,
    fontWeight: "600",
  },
  petDetails: {
    fontSize: 14,
    marginTop: 2,
  },
  petAge: {
    fontSize: 13,
    marginTop: 2,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
});
