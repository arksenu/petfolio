import { Text, View, TouchableOpacity, StyleSheet, Platform, Alert, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { usePetStore } from "@/lib/pet-store";

export default function AccountScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { clearAllData } = usePetStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClose = () => {
    router.back();
  };

  const handleLogout = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowLogoutModal(true);
  };

  const performLogout = async (clearData: boolean) => {
    setIsLoggingOut(true);
    try {
      if (clearData) {
        await clearAllData();
      }
      await logout();
      setShowLogoutModal(false);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Sign Out</Text>
            <Text style={[styles.modalMessage, { color: colors.muted }]}>
              What would you like to do with your local data?
            </Text>

            {isLoggingOut ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.muted }]}>
                  Signing out...
                </Text>
              </View>
            ) : (
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => performLogout(false)}
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.modalButtonText}>Keep Local Data</Text>
                  <Text style={[styles.modalButtonSubtext, { color: "rgba(255,255,255,0.7)" }]}>
                    Data stays on this device
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => performLogout(true)}
                  style={[styles.modalButton, styles.modalButtonDestructive, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.modalButtonText}>Clear Local Data</Text>
                  <Text style={[styles.modalButtonSubtext, { color: "rgba(255,255,255,0.7)" }]}>
                    Remove all data from device
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowLogoutModal(false)}
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalLoading: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  modalLoadingText: {
    fontSize: 14,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonDestructive: {},
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  modalCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
