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
import { WebView } from "react-native-webview";

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
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);

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

  // Get PDF viewer URL - use Google Docs viewer for remote PDFs
  const getPdfViewerUrl = () => {
    const fileUri = document.fileUri;
    
    // For local files, we need to use a different approach
    // Check if it's a local file (starts with file:// or content://)
    if (fileUri.startsWith("file://") || fileUri.startsWith("content://")) {
      // For local files, return the URI directly - WebView can handle some local files
      return fileUri;
    }
    
    // For remote URLs, use Google Docs viewer
    const encodedUrl = encodeURIComponent(fileUri);
    return `https://docs.google.com/gview?embedded=true&url=${encodedUrl}`;
  };

  // Render PDF viewer with WebView
  const renderPdfViewer = () => {
    const viewerUrl = getPdfViewerUrl();
    const isLocalFile = document.fileUri.startsWith("file://") || document.fileUri.startsWith("content://");
    
    return (
      <View style={styles.pdfContainer}>
        {/* Loading indicator */}
        {pdfLoading && (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Loading document...
            </Text>
          </View>
        )}
        
        {/* Error state */}
        {pdfError && (
          <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.errorIconContainer, { backgroundColor: colors.error + "20" }]}>
              <IconSymbol name="exclamationmark.circle.fill" size={48} color={colors.error} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>
              Unable to Load Document
            </Text>
            <Text style={[styles.errorMessage, { color: colors.muted }]}>
              {isLocalFile 
                ? "Local PDF files cannot be previewed in-app. Use the share button to open in another app."
                : "The document couldn't be loaded. Please try again or share to another app."}
            </Text>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.errorButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <Text style={styles.errorButtonText}>Share Document</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* WebView for PDF */}
        {!pdfError && (
          <WebView
            source={{ uri: viewerUrl }}
            style={[styles.webView, pdfLoading && styles.hidden]}
            onLoadStart={() => {
              setPdfLoading(true);
              setPdfError(false);
            }}
            onLoadEnd={() => setPdfLoading(false)}
            onError={() => {
              setPdfLoading(false);
              setPdfError(true);
            }}
            onHttpError={() => {
              setPdfLoading(false);
              setPdfError(true);
            }}
            scalesPageToFit
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            allowsInlineMediaPlayback
          />
        )}
      </View>
    );
  };

  // Render document placeholder (for non-PDF documents like Word)
  const renderDocumentPlaceholder = () => {
    return (
      <View style={styles.pdfContainer}>
        <View style={[styles.placeholderContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.placeholderIconContainer, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="doc.text.fill" size={64} color={colors.primary} />
          </View>
          <Text style={[styles.placeholderFileName, { color: colors.foreground }]}>
            {document.fileName || document.title}
          </Text>
          <Text style={[styles.placeholderFileType, { color: colors.muted }]}>
            Document File
          </Text>
          
          <View style={styles.placeholderActions}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.placeholderButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
              <Text style={styles.placeholderButtonText}>Share to Open</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.placeholderHint, { color: colors.muted }]}>
            This document type requires an external app to view. Tap "Share to Open" to choose an app.
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

  const renderContent = () => {
    if (isPdf) {
      return renderPdfViewer();
    } else if (isDocument) {
      return renderDocumentPlaceholder();
    } else {
      return renderImageViewer();
    }
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
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <IconSymbol name="square.and.arrow.up" size={22} color={isPdf || isDocument ? colors.foreground : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {renderContent()}

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
  pdfContainer: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 110 : 90,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  placeholderContainer: {
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
  },
  pdfFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  pdfNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
