import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface PDFViewerProps {
  uri: string;
  onError?: () => void;
}

export function PDFViewer({ uri, onError }: PDFViewerProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Check if it's a remote URL (http/https)
  const isRemoteUrl = uri.startsWith("http://") || uri.startsWith("https://");

  // For local files, we can't display them in WebView reliably
  // Show a fallback with option to open externally
  if (!isRemoteUrl) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.fallbackContainer, { backgroundColor: colors.surface }]}>
          <IconSymbol name="doc.fill" size={64} color={colors.muted} />
          <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>
            PDF Document
          </Text>
          <Text style={[styles.fallbackText, { color: colors.muted }]}>
            This PDF is stored locally on your device.
          </Text>
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Try to open with system viewer
              Linking.openURL(uri).catch(() => {
                if (onError) onError();
              });
            }}
          >
            <IconSymbol name="arrow.up.forward" size={20} color="#fff" />
            <Text style={styles.openButtonText}>Open in External App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // For remote URLs, use Google Docs Viewer (works on all platforms)
  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.fallbackContainer, { backgroundColor: colors.surface }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={64} color={colors.error} />
          <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>
            Unable to Load PDF
          </Text>
          <Text style={[styles.fallbackText, { color: colors.muted }]}>
            The PDF could not be displayed. Try opening it externally.
          </Text>
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL(uri)}
          >
            <IconSymbol name="arrow.up.forward" size={20} color="#fff" />
            <Text style={styles.openButtonText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading PDF...
          </Text>
        </View>
      )}
      <WebView
        source={{ uri: googleDocsUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        onHttpError={() => {
          setLoading(false);
          setError(true);
        }}
        startInLoadingState={false}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        // Allow scrolling and zooming
        scrollEnabled={true}
        bounces={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    margin: 16,
    borderRadius: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
