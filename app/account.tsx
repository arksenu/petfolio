import { Text, View, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

export default function AccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const handleClose = () => {
    router.back();
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your local data will remain on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Account</Text>
          <View style={styles.closeButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Account</Text>
          <View style={styles.closeButton} />
        </View>
        <View style={styles.notLoggedIn}>
          <IconSymbol name="person.fill" size={64} color={colors.muted} />
          <Text style={[styles.notLoggedInTitle, { color: colors.foreground }]}>
            Not Signed In
          </Text>
          <Text style={[styles.notLoggedInText, { color: colors.muted }]}>
            Sign in to sync your pet data across devices
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={[styles.signInButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Account</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={styles.content}>
        {/* User Info */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user.name || "User"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.muted }]}>
              {user.email || "No email"}
            </Text>
          </View>
        </View>

        {/* Sync Status */}
        <View style={[styles.syncCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
          <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
          <View style={styles.syncInfo}>
            <Text style={[styles.syncTitle, { color: colors.foreground }]}>Sync Enabled</Text>
            <Text style={[styles.syncText, { color: colors.muted }]}>
              Your pet data is synced to the cloud
            </Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ACCOUNT DETAILS</Text>
          
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>User ID</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{user.id}</Text>
          </View>
          
          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Login Method</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {user.loginMethod || "OAuth"}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Last Sign In</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {user.lastSignedIn
                ? new Date(user.lastSignedIn).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Unknown"}
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.error }]}
        >
          <IconSymbol name="xmark" size={18} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notLoggedIn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  notLoggedInText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  syncCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  syncInfo: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  syncText: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
