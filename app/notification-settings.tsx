import { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermissions,
  getAllScheduledNotifications,
} from "@/lib/notifications";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminderNotifications: true,
    vaccinationWarnings: true,
    vaccinationWarningDays: 7,
    medicationReminders: true,
    refillReminders: true,
  });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await getNotificationSettings();
      setSettings(savedSettings);

      // Check permission status
      const granted = await requestNotificationPermissions();
      setPermissionGranted(granted);

      // Get scheduled notifications count
      const scheduled = await getAllScheduledNotifications();
      setScheduledCount(scheduled.length);
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleRequestPermission = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);

    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Please enable notifications in your device settings to receive reminders.",
        [{ text: "OK" }]
      );
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (Platform.OS === "web") {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.webNotice}>
          <IconSymbol name="exclamationmark.circle.fill" size={48} color={colors.muted} />
          <Text style={[styles.webNoticeTitle, { color: colors.foreground }]}>
            Not Available on Web
          </Text>
          <Text style={[styles.webNoticeText, { color: colors.muted }]}>
            Push notifications are only available on iOS and Android devices. Please use the Expo Go
            app on your mobile device to receive notifications.
          </Text>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status */}
        {!permissionGranted && (
          <View style={[styles.permissionBanner, { backgroundColor: colors.warning + "20", borderColor: colors.warning }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={24} color={colors.warning} />
            <View style={styles.permissionContent}>
              <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
                Notifications Disabled
              </Text>
              <Text style={[styles.permissionText, { color: colors.muted }]}>
                Enable notifications to receive reminders for your pets.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRequestPermission}
              style={[styles.enableButton, { backgroundColor: colors.warning }]}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Toggle */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                Enable Notifications
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Receive push notifications for reminders and vaccination alerts
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleToggle("enabled", value)}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.enabled ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border, opacity: settings.enabled ? 1 : 0.5 }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>NOTIFICATION TYPES</Text>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Reminders</Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Vet appointments, medications, grooming, etc.
              </Text>
            </View>
            <Switch
              value={settings.reminderNotifications}
              onValueChange={(value) => handleToggle("reminderNotifications", value)}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.reminderNotifications ? colors.primary : colors.muted}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                Vaccination Alerts
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Warnings 7 days and 1 day before vaccinations expire
              </Text>
            </View>
            <Switch
              value={settings.vaccinationWarnings}
              onValueChange={(value) => handleToggle("vaccinationWarnings", value)}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.vaccinationWarnings ? colors.primary : colors.muted}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                Medication Reminders
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Daily reminders for scheduled medications
              </Text>
            </View>
            <Switch
              value={settings.medicationReminders}
              onValueChange={(value) => handleToggle("medicationReminders", value)}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.medicationReminders ? colors.primary : colors.muted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                Refill Reminders
              </Text>
              <Text style={[styles.settingSubtitle, { color: colors.muted }]}>
                Alerts when medications are running low
              </Text>
            </View>
            <Switch
              value={settings.refillReminders}
              onValueChange={(value) => handleToggle("refillReminders", value)}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.refillReminders ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Status Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <IconSymbol name="bell.fill" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              {scheduledCount} Scheduled Notifications
            </Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              Notifications are scheduled automatically when you add reminders or vaccinations.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  permissionText: {
    fontSize: 13,
    marginTop: 2,
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "transparent",
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 100,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  webNotice: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  webNoticeTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  webNoticeText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
