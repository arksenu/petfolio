import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reminder, Vaccination, Medication, MedicationFrequency } from "@/shared/pet-types";

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
  medicationReminders: boolean;
  refillReminders: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  reminderNotifications: true,
  vaccinationWarnings: true,
  vaccinationWarningDays: 7,
  medicationReminders: true,
  refillReminders: true,
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
  
  // Apply time if specified
  if (reminder.time) {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    triggerDate.setHours(hours, minutes, 0, 0);
  }
  
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

  // Skip if no expiration date
  if (!vaccination.expirationDate) {
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
          body: `${petName}'s ${vaccination.name} vaccination expires in 7 days`,
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
          body: `${petName}'s ${vaccination.name} vaccination expires tomorrow!`,
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
          body: `${petName}'s ${vaccination.name} vaccination has expired. Please schedule a renewal.`,
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

// Get dose times based on frequency
function getDoseTimesForFrequency(frequency: MedicationFrequency): { hour: number; minute: number }[] {
  switch (frequency) {
    case "once_daily":
      return [{ hour: 9, minute: 0 }]; // 9 AM
    case "twice_daily":
      return [{ hour: 9, minute: 0 }, { hour: 21, minute: 0 }]; // 9 AM, 9 PM
    case "three_times_daily":
      return [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }]; // 8 AM, 2 PM, 8 PM
    case "every_other_day":
      return [{ hour: 9, minute: 0 }]; // 9 AM
    case "weekly":
      return [{ hour: 9, minute: 0 }]; // 9 AM
    case "monthly":
      return [{ hour: 9, minute: 0 }]; // 9 AM
    default:
      return [];
  }
}

// Schedule medication dose reminders
export async function scheduleMedicationReminders(
  medication: Medication,
  petName: string
): Promise<string[]> {
  if (Platform.OS === "web") {
    return [];
  }

  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.medicationReminders) {
    return [];
  }

  // Skip if as_needed frequency
  if (medication.frequency === "as_needed") {
    return [];
  }

  const notificationIds: string[] = [];
  const doseTimes = getDoseTimesForFrequency(medication.frequency);

  // Cancel existing notifications for this medication
  await cancelMedicationNotifications(medication.id);

  try {
    for (let i = 0; i < doseTimes.length; i++) {
      const doseTime = doseTimes[i];
      
      // Schedule daily repeating notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${petName}'s medication`,
          body: `Give ${medication.name} (${medication.dosage})${medication.instructions ? ` - ${medication.instructions}` : ""}`,
          data: { type: "medication", medicationId: medication.id, petId: medication.petId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: doseTime.hour,
          minute: doseTime.minute,
        },
        identifier: `med-dose-${medication.id}-${i}`,
      });
      notificationIds.push(id);
    }
  } catch (error) {
    console.error("Error scheduling medication reminders:", error);
  }

  return notificationIds;
}

// Schedule refill reminder notification
export async function scheduleRefillReminder(
  medication: Medication,
  petName: string
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const settings = await getNotificationSettings();
  if (!settings.enabled || !settings.refillReminders) {
    return null;
  }

  // Skip if no refill tracking
  if (medication.pillsRemaining === undefined || medication.refillReminderAt === undefined) {
    return null;
  }

  // Cancel existing refill notification
  await cancelNotification(`med-refill-${medication.id}`);

  // Check if we need to send a refill reminder now
  if (medication.pillsRemaining <= medication.refillReminderAt) {
    try {
      // Schedule for tomorrow morning as a reminder
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Refill Reminder: ${medication.name}`,
          body: `${petName}'s ${medication.name} is running low (${medication.pillsRemaining} pills remaining). Time to refill!`,
          data: { type: "refill", medicationId: medication.id, petId: medication.petId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrow,
        },
        identifier: `med-refill-${medication.id}`,
      });
      return id;
    } catch (error) {
      console.error("Error scheduling refill reminder:", error);
    }
  }

  return null;
}

// Cancel all notifications for a medication
export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  // Cancel up to 3 dose reminders
  for (let i = 0; i < 3; i++) {
    await cancelNotification(`med-dose-${medicationId}-${i}`);
  }
  await cancelNotification(`med-refill-${medicationId}`);
}
