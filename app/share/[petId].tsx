import { useState, useMemo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { formatDate, calculateAge, getVaccinationStatus } from "@/shared/pet-types";

type ShareDuration = "24h" | "7d" | "30d";

const DURATION_OPTIONS: { value: ShareDuration; label: string }[] = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export default function ShareProfileScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { getPet, getDocumentsForPet, getVaccinationsForPet } = usePetStore();

  const pet = getPet(petId || "");
  const documents = getDocumentsForPet(petId || "");
  const vaccinations = getVaccinationsForPet(petId || "");

  const [selectedDuration, setSelectedDuration] = useState<ShareDuration>("24h");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate a mock shareable link (in production, this would be a real backend call)
  const generateShareLink = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a mock link with expiration info encoded
    const expirationMs = selectedDuration === "24h" ? 86400000 : selectedDuration === "7d" ? 604800000 : 2592000000;
    const expiresAt = Date.now() + expirationMs;
    const mockToken = Math.random().toString(36).substring(2, 15);
    const link = `https://petfolio.app/share/${petId}?token=${mockToken}&expires=${expiresAt}`;
    
    setGeneratedLink(link);
    setIsGenerating(false);
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    await Clipboard.setStringAsync(generatedLink);
    Alert.alert("Copied!", "Link copied to clipboard");
  };

  const handleShareLink = async () => {
    if (!generatedLink) return;
    
    try {
      await Share.share({
        message: `Check out ${pet?.name}'s health records: ${generatedLink}`,
        url: generatedLink,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleExportPDF = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert("Export PDF", "PDF export will be available in a future update. This feature will generate a complete PDF of your pet's health records.");
  };

  const handleClose = () => {
    router.back();
  };

  // Generate summary stats
  const summaryStats = useMemo(() => {
    const currentVaccinations = vaccinations.filter(v => getVaccinationStatus(v.expirationDate) === "current").length;
    const expiringVaccinations = vaccinations.filter(v => getVaccinationStatus(v.expirationDate) === "expiring_soon").length;
    const expiredVaccinations = vaccinations.filter(v => getVaccinationStatus(v.expirationDate) === "expired").length;
    
    return {
      totalDocuments: documents.length,
      totalVaccinations: vaccinations.length,
      currentVaccinations,
      expiringVaccinations,
      expiredVaccinations,
    };
  }, [documents, vaccinations]);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Share {pet.name}'s Profile</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Profile Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{summaryStats.totalDocuments}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Documents</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{summaryStats.currentVaccinations}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Current Vaccines</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>{summaryStats.expiringVaccinations}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Expiring Soon</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.error }]}>{summaryStats.expiredVaccinations}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Expired</Text>
            </View>
          </View>
        </View>

        {/* Share Link Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Generate Shareable Link</Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Create a temporary link to share {pet.name}'s profile with vets, boarders, or pet sitters.
          </Text>

          {/* Duration Selector */}
          <View style={styles.durationContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Link Duration</Text>
            <View style={styles.durationOptions}>
              {DURATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setSelectedDuration(option.value);
                    setGeneratedLink(null);
                  }}
                  style={[
                    styles.durationOption,
                    {
                      backgroundColor: selectedDuration === option.value ? colors.primary : colors.surface,
                      borderColor: selectedDuration === option.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: selectedDuration === option.value ? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Button */}
          {!generatedLink ? (
            <TouchableOpacity
              onPress={generateShareLink}
              disabled={isGenerating}
              style={[styles.generateButton, { backgroundColor: colors.primary, opacity: isGenerating ? 0.7 : 1 }]}
            >
              <IconSymbol name="link" size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>
                {isGenerating ? "Generating..." : "Generate Link"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.linkContainer}>
              <View style={[styles.linkBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={2}>
                  {generatedLink}
                </Text>
              </View>
              <View style={styles.linkActions}>
                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={[styles.linkAction, { backgroundColor: colors.primary }]}
                >
                  <IconSymbol name="doc.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.linkActionText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShareLink}
                  style={[styles.linkAction, { backgroundColor: colors.primary }]}
                >
                  <IconSymbol name="square.and.arrow.up" size={18} color="#FFFFFF" />
                  <Text style={styles.linkActionText}>Share</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setGeneratedLink(null)}
                style={styles.regenerateButton}
              >
                <Text style={[styles.regenerateText, { color: colors.primary }]}>Generate New Link</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* QR Code Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>QR Code</Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Show this QR code for quick in-person sharing.
          </Text>
          <View style={[styles.qrPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="qrcode" size={80} color={colors.muted} />
            <Text style={[styles.qrText, { color: colors.muted }]}>
              {generatedLink ? "QR Code Ready" : "Generate a link first"}
            </Text>
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Export Records</Text>
          <Text style={[styles.sectionDescription, { color: colors.muted }]}>
            Download a complete PDF of all records and vaccinations.
          </Text>
          <TouchableOpacity
            onPress={handleExportPDF}
            style={[styles.exportButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
            <View style={styles.exportContent}>
              <Text style={[styles.exportTitle, { color: colors.foreground }]}>Export as PDF</Text>
              <Text style={[styles.exportSubtitle, { color: colors.muted }]}>
                Includes all documents and vaccination records
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Privacy Note */}
        <View style={[styles.privacyNote, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
          <IconSymbol name="lock.fill" size={20} color={colors.warning} />
          <Text style={[styles.privacyText, { color: colors.foreground }]}>
            Shared links provide read-only access to {pet.name}'s profile. Recipients cannot modify any data.
          </Text>
        </View>
      </ScrollView>
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
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryItem: {
    width: "45%",
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationOptions: {
    flexDirection: "row",
    gap: 8,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  durationText: {
    fontSize: 14,
    fontWeight: "500",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkContainer: {
    gap: 12,
  },
  linkBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkActions: {
    flexDirection: "row",
    gap: 12,
  },
  linkAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  linkActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  regenerateButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  regenerateText: {
    fontSize: 14,
    fontWeight: "500",
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  qrText: {
    fontSize: 14,
    marginTop: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  exportSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 40,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
