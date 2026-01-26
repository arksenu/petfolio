import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import Pdf from "react-native-pdf";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PdfViewerProps {
  uri: string;
  onError?: () => void;
  onShare?: () => void;
}

export function PdfViewer({ uri, onError, onShare }: PdfViewerProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.errorIconContainer, { backgroundColor: colors.error + "20" }]}>
          <IconSymbol name="exclamationmark.circle.fill" size={48} color={colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Unable to Load PDF
        </Text>
        <Text style={[styles.errorMessage, { color: colors.muted }]}>
          The PDF couldn't be displayed. Try sharing it to view in another app.
        </Text>
        {onShare && (
          <TouchableOpacity
            onPress={onShare}
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
          >
            <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
            <Text style={styles.errorButtonText}>Share PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading indicator */}
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading PDF...
          </Text>
        </View>
      )}

      {/* PDF Viewer */}
      <Pdf
        source={{ uri, cache: true }}
        style={[styles.pdf, { backgroundColor: colors.background }]}
        onLoadComplete={(numberOfPages) => {
          setLoading(false);
          setPageCount(numberOfPages);
        }}
        onPageChanged={(page) => {
          setCurrentPage(page);
        }}
        onError={(err) => {
          console.log("PDF Error:", err);
          setLoading(false);
          setError(true);
          onError?.();
        }}
        enablePaging={false}
        horizontal={false}
        fitPolicy={0}
        spacing={8}
        enableAntialiasing={true}
        enableAnnotationRendering={true}
        trustAllCerts={false}
      />

      {/* Page indicator */}
      {!loading && pageCount > 1 && (
        <View style={[styles.pageIndicator, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Text style={styles.pageIndicatorText}>
            {currentPage} / {pageCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: SCREEN_WIDTH,
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
  pageIndicator: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageIndicatorText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
});
