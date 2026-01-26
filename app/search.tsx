import { useState, useMemo } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { formatDate, DOCUMENT_CATEGORIES, PetDocument } from "@/shared/pet-types";

interface SearchResult extends PetDocument {
  petName: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, getDocumentsForPet, getPet } = usePetStore();
  const { pets } = state;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get all documents across all pets
  const allDocuments = useMemo(() => {
    const docs: SearchResult[] = [];
    pets.forEach((pet) => {
      const petDocs = getDocumentsForPet(pet.id);
      petDocs.forEach((doc) => {
        docs.push({
          ...doc,
          petName: pet.name,
        });
      });
    });
    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pets, getDocumentsForPet]);

  // Filter documents based on search query and category
  const filteredDocuments = useMemo(() => {
    let results = allDocuments;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.petName.toLowerCase().includes(query) ||
          (doc.notes && doc.notes.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      results = results.filter((doc) => doc.category === selectedCategory);
    }

    return results;
  }, [allDocuments, searchQuery, selectedCategory]);

  const handleBack = () => {
    router.back();
  };

  const handleViewDocument = (docId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/view-document/${docId}` as any);
  };

  const handleCategoryPress = (category: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const renderDocumentCard = ({ item }: { item: SearchResult }) => {
    const categoryLabel =
      DOCUMENT_CATEGORIES.find((c) => c.value === item.category)?.label || item.category;

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
          <Text style={[styles.petBadge, { color: colors.muted }]}>{item.petName}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.cardDate, { color: colors.muted }]}>{formatDate(item.date)}</Text>
        {item.notes && (
          <Text style={[styles.cardNotes, { color: colors.muted }]} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search Documents</Text>
        <View style={styles.backButton} />
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by title, pet name, or notes..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <FlatList
        horizontal
        data={DOCUMENT_CATEGORIES}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleCategoryPress(item.value)}
            style={[
              styles.categoryPill,
              {
                backgroundColor: selectedCategory === item.value ? colors.primary : colors.surface,
                borderColor: selectedCategory === item.value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryPillText,
                { color: selectedCategory === item.value ? "#FFFFFF" : colors.foreground },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results */}
      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        renderItem={renderDocumentCard}
        contentContainerStyle={styles.resultsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="doc.fill" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {searchQuery || selectedCategory
                ? "No documents found"
                : "Start typing to search documents"}
            </Text>
          </View>
        }
      />
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultsList: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  petBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
  },
  cardNotes: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
