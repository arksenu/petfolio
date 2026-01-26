import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface PdfViewerProps {
  uri: string;
  onError?: () => void;
  onShare?: () => void;
}

// Web fallback - PDF viewing not supported on web
export function PdfViewer({ uri, onShare }: PdfViewerProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: "#E74C3C20" }]}>
        <IconSymbol name="doc.fill" size={64} color="#E74C3C" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        PDF Document
      </Text>
      <Text style={[styles.message, { color: colors.muted }]}>
        PDF viewing is available on mobile devices.
      </Text>
      {onShare && (
        <TouchableOpacity
          onPress={onShare}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <IconSymbol name="square.and.arrow.up" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Download PDF</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
