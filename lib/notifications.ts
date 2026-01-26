import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reminder, Vaccination, getVaccinationStatus } from "@/shared/pet-types";

const NOTIFICATION_SETTINGS_KEY = "petfolio_notification_settings";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  reminderNotifications: boolean;
  vaccinationWarnings: boolean;
  vaccinationWarningDays: number; // Days before expiration to warn
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  reminderNotifications: true,
  vaccinationWarnings: true,
  vaccinationWarningDays: 7,
};

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

// Get notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settingsJson) {
      return { ...defaultSettings, ...JSON.parse(settingsJson) };
    }
  } catch (error) {
    console.error("Error loading notification settings:", error);
  }
  return defaultSettings;
}

// Save notification settings
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving notification settings:", error);
  }
}

// Schedule a reminder notification
export async function scheduleReminderNotification(
  reminder: Reminder,
  petName: string
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.reminderNotifications) {
    return null;
  }

  const triggerDate = new Date(reminder.date);
  
  // Don't schedule if the date is in the past
  if (triggerDate <= new Date()) {
    return null;
  }

  try {
    // Cancel any existing notification for this reminder
    await cancelNotification(`reminder-${reminder.id}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${reminder.title}`,
        body: `Time for ${petName}'s ${reminder.title.toLowerCase()}`,
        data: { type: "reminder", reminderId: reminder.id, petId: reminder.petId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: `reminder-${reminder.id}`,
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling reminder notification:", error);
    return null;
  }
}

// Schedule vaccination expiration warning notifications
export async function scheduleVaccinationWarnings(
  vaccination: Vaccination,
  petName: string
): Promise<string[]> {
  if (Platform.OS === "web") {
    return [];
  }

  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.vaccinationWarnings) {
    return [];
  }

  const notificationIds: string[] = [];
  const expirationDate = new Date(vaccination.expirationDate);
  const now = new Date();

  // Cancel any existing notifications for this vaccination
  await cancelNotification(`vax-7day-${vaccination.id}`);
  await cancelNotification(`vax-1day-${vaccination.id}`);
  await cancelNotification(`vax-expired-${vaccination.id}`);

  try {
    // 7 days before expiration
    const sevenDaysBefore = new Date(expirationDate);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);
    sevenDaysBefore.setHours(9, 0, 0, 0);

    if (sevenDaysBefore > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Vaccination Expiring Soon",
          body: `${petName}'s ${vaccination.vaccineName} vaccination expires in 7 days`,
          data: { type: "vaccination", vaccinationId: vaccination.id, petId: vaccination.petId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: sevenDaysBefore,
        },
        identifier: `vax-7day-${vaccination.id}`,
      });
      notificationIds.push(id);
    }

    // 1 day before expiration
    const oneDayBefore = new Date(expirationDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);

    if (oneDayBefore > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Vaccination Expiring Tomorrow",
          body: `${petName}'s ${vaccination.vaccineName} vaccination expires tomorrow!`,
          data: { type: "vaccination", vaccinationId: vaccination.id, petId: vaccination.petId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
        },
        identifier: `vax-1day-${vaccination.id}`,
      });
      notificationIds.push(id);
    }

    // On expiration day
    const expirationDay = new Date(expirationDate);
    expirationDay.setHours(9, 0, 0, 0);

    if (expirationDay > now) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Vaccination Expired",
          body: `${petName}'s ${vaccination.vaccineName} vaccination has expired. Please schedule a renewal.`,
          data: { type: "vaccination", vaccinationId: vaccination.id, petId: vaccination.petId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: expirationDay,
        },
        identifier: `vax-expired-${vaccination.id}`,
      });
      notificationIds.push(id);
    }
  } catch (error) {
    console.error("Error scheduling vaccination warnings:", error);
  }

  return notificationIds;
}

// Cancel a specific notification
export async function cancelNotification(identifier: string): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    // Notification might not exist, ignore error
  }
}

// Cancel all notifications for a reminder
export async function cancelReminderNotifications(reminderId: string): Promise<void> {
  await cancelNotification(`reminder-${reminderId}`);
}

// Cancel all notifications for a vaccination
export async function cancelVaccinationNotifications(vaccinationId: string): Promise<void> {
  await cancelNotification(`vax-7day-${vaccinationId}`);
  await cancelNotification(`vax-1day-${vaccinationId}`);
  await cancelNotification(`vax-expired-${vaccinationId}`);
}

// Get all scheduled notifications (for debugging)
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === "web") {
    return [];
  }
  return Notifications.getAllScheduledNotificationsAsync();
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}
