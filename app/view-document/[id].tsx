import { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Share,
  Alert,
  Linking,
  ScrollView,
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

  const handleOpenExternal = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const supported = await Linking.canOpenURL(document.fileUri);
      if (supported) {
        await Linking.openURL(document.fileUri);
      } else {
        Alert.alert("Error", "Cannot open this file type. Try sharing it to another app.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open document.");
    }
  };

  // Render PDF or document view
  const renderPdfOrDocumentView = () => {
    return (
      <View style={styles.pdfContainer}>
        <View style={[styles.pdfPlaceholder, { backgroundColor: colors.surface }]}>
          <View style={[styles.pdfIconContainer, { backgroundColor: isPdf ? "#E74C3C20" : colors.primary + "20" }]}>
            <IconSymbol 
              name={isPdf ? "doc.fill" : "doc.text.fill"} 
              size={64} 
              color={isPdf ? "#E74C3C" : colors.primary} 
            />
          </View>
          <Text style={[styles.pdfFileName, { color: colors.foreground }]}>
            {document.fileName || document.title}
          </Text>
          <Text style={[styles.pdfFileType, { color: colors.muted }]}>
            {isPdf ? "PDF Document" : "Document File"}
          </Text>
          
          <View style={styles.pdfActions}>
            <TouchableOpacity
              onPress={handleOpenExternal}
              style={[styles.pdfActionButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="arrow.up.right.square" size={20} color="#FFFFFF" />
              <Text style={styles.pdfActionText}>Open in External App</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.pdfActionButtonSecondary, { borderColor: colors.border }]}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
              <Text style={[styles.pdfActionTextSecondary, { color: colors.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.pdfHint, { color: colors.muted }]}>
            Tap "Open in External App" to view the full document in your device's default viewer
          </Text>
        </View>
      </View>
    );
  };

  // Render image viewer
  const renderImageViewer = () => {
    return (
      <GestureDetector gesture={composedGesture}>
        <View style={styles.imageContainer}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={{ uri: document.fileUri }}
              style={styles.image}
              contentFit="contain"
            />
          </Animated.View>
        </View>
      </GestureDetector>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: isPdf || isDocument ? colors.background : "#000000" }]}>
        {/* Header */}
        {showControls && (
          <View style={[
            styles.header, 
            { backgroundColor: isPdf || isDocument ? colors.surface : "rgba(0,0,0,0.7)" }
          ]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <IconSymbol name="xmark" size={24} color={isPdf || isDocument ? colors.foreground : "#FFFFFF"} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text 
                style={[styles.headerTitle, { color: isPdf || isDocument ? colors.foreground : "#FFFFFF" }]} 
                numberOfLines={1}
              >
                {document.title}
              </Text>
              <Text style={[styles.headerSubtitle, { color: isPdf || isDocument ? colors.muted : "rgba(255,255,255,0.7)" }]}>
                {pet?.name} • {formatDate(document.date)}
              </Text>
            </View>
            {!isPdf && !isDocument && (
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <IconSymbol name="square.and.arrow.up" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {(isPdf || isDocument) && <View style={styles.headerButton} />}
          </View>
        )}

        {/* Content */}
        {isPdf || isDocument ? renderPdfOrDocumentView() : renderImageViewer()}

        {/* Footer Info - only for images */}
        {showControls && !isPdf && !isDocument && (
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

        {/* Footer for PDF/Document */}
        {(isPdf || isDocument) && document.notes && (
          <View style={[styles.pdfFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.notesLabel, { color: colors.muted }]}>Notes</Text>
            <Text style={[styles.pdfNotesText, { color: colors.foreground }]}>{document.notes}</Text>
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
    paddingHorizontal: 8,
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
    height: SCREEN_HEIGHT * 0.7,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  notesText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  hintText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
  },
  // PDF/Document styles
  pdfContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pdfPlaceholder: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  pdfIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pdfFileName: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  pdfFileType: {
    fontSize: 14,
    marginBottom: 32,
  },
  pdfActions: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  pdfActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  pdfActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pdfActionButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  pdfActionTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  pdfHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  pdfFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  pdfNotesText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
