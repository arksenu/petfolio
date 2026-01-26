import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePetStore } from "@/lib/pet-store";
import { formatDate, DOCUMENT_CATEGORIES } from "@/shared/pet-types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ViewDocumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { getDocument, getPet } = usePetStore();

  const document = getDocument(id || "");
  const pet = document ? getPet(document.petId) : null;

  const [showControls, setShowControls] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Pinch-to-zoom and pan values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const singleTapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(toggleControls)();
    });

  const composedGesture = Gesture.Exclusive(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
    singleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!document) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={{ color: colors.muted }}>Document not found</Text>
      </ScreenContainer>
    );
  }

  const categoryLabel = DOCUMENT_CATEGORIES.find((c) => c.value === document.category)?.label || document.category;
  const fileType = document.fileType || "image";
  const isPdf = fileType === "pdf";
  const isDocument = fileType === "document";
  
  // Check if it's a viewable image type
  const isImage = !isPdf && !isDocument;

  const handleClose = () => {
    router.back();
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await Share.share({
        message: `${document.title} - ${pet?.name || "Pet"}'s ${categoryLabel}`,
        url: document.fileUri,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share document.");
    }
  };

  // Render PDF/Document placeholder with share option
  const renderPdfOrDocumentView = () => {
    const iconName = isPdf ? "doc.fill" : "doc.text.fill";
    const iconColor = isPdf ? "#E74C3C" : colors.primary;
    const fileTypeLabel = isPdf ? "PDF Document" : "Document File";
    
    return (
      <View style={styles.placeholderContainer}>
        <View style={[styles.placeholderContent, { backgroundColor: colors.background }]}>
          <View style={[styles.placeholderIconContainer, { backgroundColor: iconColor + "20" }]}>
            <IconSymbol name={iconName} size={64} color={iconColor} />
          </View>
          <Text style={[styles.placeholderFileName, { color: colors.foreground }]}>
            {document.fileName || document.title}
          </Text>
          <Text style={[styles.placeholderFileType, { color: colors.muted }]}>
            {fileTypeLabel}
          </Text>
          
          <View style={styles.placeholderActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.placeholderButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <Text style={styles.placeholderButtonText}>Open with...</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.placeholderHint, { color: colors.muted }]}>
            Tap "Open with..." to view this document in your preferred app (Files, PDF viewer, etc.)
          </Text>
          
          {/* Document info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Category</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{categoryLabel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDate(document.date)}</Text>
            </View>
            {document.notes && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Notes</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={3}>{document.notes}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render image viewer
  const renderImageViewer = () => {
    return (
      <GestureDetector gesture={composedGesture}>
        <View style={styles.imageContainer}>
          {/* Loading indicator */}
          {imageLoading && (
            <View style={[styles.loadingOverlay, { backgroundColor: "#000000" }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: "#FFFFFF" }]}>
                Loading image...
              </Text>
            </View>
          )}
          
          {/* Error state */}
          {imageError && (
            <View style={[styles.errorOverlay, { backgroundColor: "#000000" }]}>
              <View style={[styles.errorIconContainer, { backgroundColor: colors.error + "20" }]}>
                <IconSymbol name="exclamationmark.circle.fill" size={48} color={colors.error} />
              </View>
              <Text style={[styles.errorTitle, { color: "#FFFFFF" }]}>
                Unable to Load Image
              </Text>
              <Text style={[styles.errorMessage, { color: "rgba(255,255,255,0.7)" }]}>
                The image couldn't be loaded. Try sharing it to view in another app.
              </Text>
              <TouchableOpacity
                onPress={handleShare}
                style={[styles.errorButton, { backgroundColor: colors.primary }]}
              >
                <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
                <Text style={styles.errorButtonText}>Share Image</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={{ uri: document.fileUri }}
              style={styles.image}
              contentFit="contain"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </Animated.View>
        </View>
      </GestureDetector>
    );
  };

  const renderContent = () => {
    if (isPdf || isDocument) {
      return renderPdfOrDocumentView();
    } else {
      return renderImageViewer();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: isImage ? "#000000" : colors.background }]}>
        {/* Header */}
        {showControls && (
          <View style={[
            styles.header, 
            { backgroundColor: isImage ? "rgba(0,0,0,0.7)" : colors.surface }
          ]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <IconSymbol name="xmark" size={24} color={isImage ? "#FFFFFF" : colors.foreground} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text 
                style={[styles.headerTitle, { color: isImage ? "#FFFFFF" : colors.foreground }]} 
                numberOfLines={1}
              >
                {document.title}
              </Text>
              <Text style={[styles.headerSubtitle, { color: isImage ? "rgba(255,255,255,0.7)" : colors.muted }]}>
                {pet?.name} • {formatDate(document.date)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <IconSymbol name="square.and.arrow.up" size={22} color={isImage ? "#FFFFFF" : colors.foreground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {renderContent()}

        {/* Footer Info - only for images */}
        {showControls && isImage && !imageError && (
          <View style={[styles.footer, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
            {document.notes && (
              <Text style={styles.notesText} numberOfLines={2}>
                {document.notes}
              </Text>
            )}
            <Text style={styles.hintText}>
              Pinch to zoom • Double-tap to toggle zoom • Tap to show/hide controls
            </Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    padding: 32,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  notesText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  hintText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  placeholderContainer: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 110 : 90,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  placeholderIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  placeholderFileName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  placeholderFileType: {
    fontSize: 14,
    marginBottom: 24,
  },
  placeholderActions: {
    marginBottom: 16,
  },
  placeholderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  placeholderButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 24,
  },
  infoCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 20,
  },
});
