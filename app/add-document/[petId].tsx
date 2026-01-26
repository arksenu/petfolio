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
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DatePickerModal } from "@/components/date-picker-modal";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { DocumentCategory, DOCUMENT_CATEGORIES } from "@/shared/pet-types";

// File type detection helper
function getFileType(uri: string, mimeType?: string): "image" | "pdf" | "document" {
  const lowerUri = uri.toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();
  
  if (lowerMime.includes("pdf") || lowerUri.endsWith(".pdf")) {
    return "pdf";
  }
  if (lowerMime.includes("image") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(lowerUri)) {
    return "image";
  }
  return "document";
}

export default function AddDocumentScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { addDocument, getPet } = usePetStore();

  const pet = getPet(petId || "");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("vet_visit");
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [fileUri, setFileUri] = useState<string | undefined>();
  const [fileType, setFileType] = useState<"image" | "pdf" | "document">("image");
  const [fileName, setFileName] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pet) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Pet not found</Text>
      </ScreenContainer>
    );
  }

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your camera to capture documents.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setFileUri(result.assets[0].uri);
      setFileType("image");
      setFileName(undefined);
    }
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setFileUri(result.assets[0].uri);
      setFileType("image");
      setFileName(undefined);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setFileUri(asset.uri);
        setFileType(getFileType(asset.uri, asset.mimeType || undefined));
        setFileName(asset.name);
        
        // Auto-fill title from filename if empty
        if (!title && asset.name) {
          const nameWithoutExt = asset.name.replace(/\.[^/.]+$/, "");
          setTitle(nameWithoutExt);
        }
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Required Field", "Please enter a document title.");
      return;
    }

    if (!fileUri) {
      Alert.alert("Required Field", "Please capture or upload a document.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    try {
      await addDocument({
        petId: petId || "",
        title: title.trim(),
        category,
        fileUri,
        fileType,
        fileName,
        date: date.toISOString(),
        notes: notes.trim() || undefined,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to add document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const clearFile = () => {
    setFileUri(undefined);
    setFileName(undefined);
    setFileType("image");
  };

  const renderFilePreview = () => {
    if (!fileUri) return null;

    if (fileType === "image") {
      return (
        <View style={styles.previewContainer}>
          <Image source={{ uri: fileUri }} style={styles.preview} contentFit="contain" />
          <TouchableOpacity
            onPress={clearFile}
            style={[styles.removeButton, { backgroundColor: colors.error }]}
          >
            <IconSymbol name="xmark" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    // PDF or document preview
    return (
      <View style={[styles.documentPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.documentIconContainer, { backgroundColor: fileType === "pdf" ? "#E74C3C20" : colors.primary + "20" }]}>
          <IconSymbol 
            name={fileType === "pdf" ? "doc.fill" : "doc.text.fill"} 
            size={40} 
            color={fileType === "pdf" ? "#E74C3C" : colors.primary} 
          />
        </View>
        <View style={styles.documentInfo}>
          <Text style={[styles.documentName, { color: colors.foreground }]} numberOfLines={2}>
            {fileName || "Document"}
          </Text>
          <Text style={[styles.documentType, { color: colors.muted }]}>
            {fileType === "pdf" ? "PDF Document" : "Document File"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={clearFile}
          style={[styles.removeDocButton, { backgroundColor: colors.error + "20" }]}
        >
          <IconSymbol name="xmark" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    );
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Document</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Document Capture Section */}
          <View style={styles.captureSection}>
            {fileUri ? (
              renderFilePreview()
            ) : (
              <View style={styles.captureButtons}>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  style={[styles.captureButton, { backgroundColor: colors.primary }]}
                >
                  <IconSymbol name="camera.fill" size={32} color="#FFFFFF" />
                  <Text style={styles.captureButtonText}>Capture Document</Text>
                </TouchableOpacity>
                
                <View style={styles.uploadRow}>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={[styles.halfButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <IconSymbol name="photo.fill" size={22} color={colors.primary} />
                    <Text style={[styles.halfButtonText, { color: colors.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handlePickDocument}
                    style={[styles.halfButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <IconSymbol name="doc.fill" size={22} color={colors.primary} />
                    <Text style={[styles.halfButtonText, { color: colors.primary }]}>Files</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.supportedFormats, { color: colors.muted }]}>
                  Supported: Images, PDF, Word documents
                </Text>
              </View>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Title */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Document Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Annual Checkup Results"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
              <View style={styles.categoryContainer}>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: category === cat.value ? colors.primary : colors.surface,
                        borderColor: category === cat.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: category === cat.value ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Document Date</Text>
              <DatePickerModal
                value={date}
                onChange={setDate}
                maximumDate={new Date()}
                label="Document Date"
              />
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any additional notes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
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
            <Text style={styles.saveButtonText}>{isSubmitting ? "Saving..." : "Save Document"}</Text>
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
  captureSection: {
    marginBottom: 24,
  },
  captureButtons: {
    gap: 12,
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 16,
    gap: 12,
  },
  captureButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  halfButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  supportedFormats: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  previewContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 250,
    borderRadius: 16,
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  documentPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  documentIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: "500",
  },
  documentType: {
    fontSize: 13,
    marginTop: 2,
  },
  removeDocButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
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
