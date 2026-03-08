import { FlatList, Text, View, StyleSheet } from "react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useConcierge } from "@/lib/concierge-store";
import type { ConciergeRequest } from "@/shared/pet-types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: colors.primary + "20", text: colors.primary, label: "Active" },
    in_progress: { bg: colors.warning + "20", text: colors.warning, label: "In Progress" },
    resolved: { bg: colors.success + "20", text: colors.success, label: "Resolved" },
    cancelled: { bg: colors.muted + "20", text: colors.muted, label: "Cancelled" },
  };
  const c = config[status] || config.active;

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function RequestCard({
  request,
  colors,
  onPress,
}: {
  request: ConciergeRequest;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const isActive = request.status === "active" || request.status === "in_progress";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isActive ? colors.primary + "40" : colors.border,
          borderLeftColor: isActive ? colors.primary : colors.border,
          borderLeftWidth: isActive ? 3 : 1,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {request.petName ? (
            <View style={[styles.petTag, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="pawprint.fill" size={12} color={colors.primary} />
              <Text style={[styles.petTagText, { color: colors.primary }]}>{request.petName}</Text>
            </View>
          ) : null}
          <StatusBadge status={request.status} colors={colors} />
        </View>
        <Text style={[styles.cardTime, { color: colors.muted }]}>
          {formatDate(request.updatedAt || request.createdAt)}
        </Text>
      </View>

      <Text
        style={[styles.cardPreview, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {request.preview || "No message"}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.messageCount}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={14} color={colors.muted} />
          <Text style={[styles.messageCountText, { color: colors.muted }]}>
            {request.messageCount || 0} {(request.messageCount || 0) === 1 ? "message" : "messages"}
          </Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.emptyContainer}>
      <IconSymbol name="bubble.left.and.bubble.right.fill" size={48} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Requests Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Need help with your pet? Tap the + button to send a concierge request.
      </Text>
    </View>
  );
}

export default function RequestsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state } = useConcierge();

  const sortedRequests = [...state.requests].sort((a, b) => {
    // Active/in_progress first, then by date
    const aActive = a.status === "active" || a.status === "in_progress" ? 1 : 0;
    const bActive = b.status === "active" || b.status === "in_progress" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Requests</Text>
      </View>

      <FlatList
        data={sortedRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            colors={colors}
            onPress={() => router.push(`/request-thread/${item.id}` as any)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          sortedRequests.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyState colors={colors} />}
      />

      {/* FAB - New Request */}
      <Pressable
        onPress={() => router.push("/new-request")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <IconSymbol name="plus.message.fill" size={24} color="#FFFFFF" />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  petTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  petTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: 12,
  },
  cardPreview: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messageCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  messageCountText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
