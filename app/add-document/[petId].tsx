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
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CustomDatePicker } from "@/components/custom-date-picker";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
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

// Get MIME type from file extension
function getMimeType(uri: string, fileType: "image" | "pdf" | "document"): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  
  if (fileType === "pdf") return "application/pdf";
  if (fileType === "image") {
    switch (ext) {
      case "png": return "image/png";
      case "gif": return "image/gif";
      case "webp": return "image/webp";
      case "heic": return "image/heic";
      case "heif": return "image/heif";
      default: return "image/jpeg";
    }
  }
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

export default function AddDocumentScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const colors = useColors();
  const { addDocument, getPet } = usePetStore();
  const { isAuthenticated } = useAuth();
  const uploadFileMutation = trpc.files.upload.useMutation();

  const pet = getPet(petId || "");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("vet_visit");
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [fileUri, setFileUri] = useState<string | undefined>();
  const [fileType, setFileType] = useState<"image" | "pdf" | "document">("image");
  const [fileName, setFileName] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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

  // Upload file to server and return the URL
  const uploadFileToServer = async (localUri: string): Promise<string> => {
    try {
      setUploadProgress("Reading file...");
      
      // Read file as base64
      let base64Data: string;
      
      if (Platform.OS === "web") {
        // For web, fetch the blob and convert to base64
        const response = await fetch(localUri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1] || result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For native, use FileSystem
        base64Data = await FileSystem.readAsStringAsync(localUri, {
          encoding: "base64",
        });
      }
      
      setUploadProgress("Uploading to cloud...");
      
      // Generate filename
      const ext = localUri.split('.').pop() || (fileType === "pdf" ? "pdf" : "jpg");
      const uploadFileName = fileName || `document-${Date.now()}.${ext}`;
      const mimeType = getMimeType(localUri, fileType);
      
      // Upload to server
      const result = await uploadFileMutation.mutateAsync({
        fileName: uploadFileName,
        fileType: mimeType,
        base64Data,
      });
      
      setUploadProgress(null);
      return result.url;
    } catch (error) {
      setUploadProgress(null);
      console.error("Upload error:", error);
      throw error;
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
      let finalFileUri = fileUri;
      
      // If user is authenticated, upload to server for cloud storage
      if (isAuthenticated) {
        try {
          finalFileUri = await uploadFileToServer(fileUri);
          console.log("File uploaded to server:", finalFileUri);
        } catch (uploadError) {
          console.error("Server upload failed, using local URI:", uploadError);
          // Fall back to local URI if upload fails
          Alert.alert(
            "Upload Notice",
            "Could not upload to cloud. Document will be saved locally only.",
            [{ text: "OK" }]
          );
        }
      }
      
      await addDocument({
        petId: petId || "",
        title: title.trim(),
        category,
        fileUri: finalFileUri,
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

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Document</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting || !title.trim() || !fileUri}
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              (isSubmitting || !title.trim() || !fileUri) && styles.saveButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Upload Progress */}
          {uploadProgress && (
            <View style={[styles.progressBanner, { backgroundColor: colors.primary + "20" }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.primary }]}>{uploadProgress}</Text>
            </View>
          )}

          {/* Cloud Storage Notice */}
          {isAuthenticated && (
            <View style={[styles.cloudNotice, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
              <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
              <Text style={[styles.cloudNoticeText, { color: colors.foreground }]}>
                Documents will be uploaded to cloud for sync across devices
              </Text>
            </View>
          )}

          {/* Document Capture/Upload */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Document</Text>
            
            {fileUri ? (
              <View style={styles.previewContainer}>
                {fileType === "image" ? (
                  <Image
                    source={{ uri: fileUri }}
                    style={styles.previewImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.filePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <IconSymbol
                      name={fileType === "pdf" ? "doc.fill" : "doc.fill"}
                      size={40}
                      color={colors.primary}
                    />
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>
                      {fileName || "Document"}
                    </Text>
                    <Text style={[styles.fileTypeLabel, { color: colors.muted }]}>
                      {fileType.toUpperCase()}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={clearFile}
                  style={[styles.clearButton, { backgroundColor: colors.error }]}
                >
                  <IconSymbol name="xmark" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadOptions}>
                <TouchableOpacity
                  onPress={handleTakePhoto}
                  style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <IconSymbol name="camera.fill" size={24} color={colors.primary} />
                  <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>Camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <IconSymbol name="photo.fill" size={24} color={colors.primary} />
                  <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>Gallery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handlePickDocument}
                  style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <IconSymbol name="doc.fill" size={24} color={colors.primary} />
                  <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>Files</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Title <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter document title"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryContainer}>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: category === cat.value ? colors.primary : colors.surface,
                        borderColor: category === cat.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: category === cat.value ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Date</Text>
            <CustomDatePicker
              value={date}
              onChange={setDate}
              label="Document Date"
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this document..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          {/* Spacer for keyboard */}
          <View style={{ height: 40 }} />
        </ScrollView>
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
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cloudNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  cloudNoticeText: {
    fontSize: 13,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  uploadOptions: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  previewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  filePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  fileTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  clearButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
  },
});
