import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface SettingsItemProps {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, danger }: SettingsItemProps) {
  const colors = useColors();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.settingsItem, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: danger ? colors.error + "20" : colors.primary + "20" }]}>
        <IconSymbol name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: danger ? colors.error : colors.foreground }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      <IconSymbol name="chevron.right" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleNotifications = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/notification-settings" as any);
  };

  const handleExportData = () => {
    Alert.alert("Export Data", "Data export will be available in a future update.");
  };

  const handleAccount = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/account" as any);
  };

  const handlePrivacy = () => {
    Alert.alert("Privacy", "Privacy settings will be available in a future update.");
  };

  const handleHelp = () => {
    Alert.alert("Help & Support", "Help and support will be available in a future update.");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete All Data",
      "Are you sure you want to delete all your pet data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Data Deleted", "All your pet data has been deleted.");
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ACCOUNT</Text>
          <SettingsItem
            icon="person.fill"
            title="Account"
            subtitle="Sign in to sync across devices"
            onPress={handleAccount}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PREFERENCES</Text>
          <SettingsItem
            icon="bell.fill"
            title="Notifications"
            subtitle="Manage reminder notifications"
            onPress={handleNotifications}
          />
          <SettingsItem
            icon="square.and.arrow.up"
            title="Export Data"
            subtitle="Download all your pet records"
            onPress={handleExportData}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>SUPPORT</Text>
          <SettingsItem
            icon="lock.fill"
            title="Privacy"
            subtitle="Privacy policy and data handling"
            onPress={handlePrivacy}
          />
          <SettingsItem
            icon="doc.text.fill"
            title="Help & Support"
            subtitle="FAQs and contact support"
            onPress={handleHelp}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>DANGER ZONE</Text>
          <SettingsItem
            icon="trash.fill"
            title="Delete All Data"
            subtitle="Permanently delete all pet records"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>Petfolio v1.0.0</Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>Made with care for pet owners</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 16,
    marginBottom: 24,
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
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
