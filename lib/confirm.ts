import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirmation dialog.
 * Uses window.confirm() on web (Alert.alert doesn't work), Alert.alert on native.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  destructive = true
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: destructive ? "Delete" : "OK", style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  }
}

/**
 * Cross-platform two-option dialog (e.g., "Yes, Given" / "Skip").
 * On web, uses window.confirm with the positive action on OK.
 */
export function confirmChoice(
  title: string,
  message: string,
  positiveText: string,
  negativeText: string,
  onPositive: () => void | Promise<void>,
  onNegative: () => void | Promise<void>
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}\n\nOK = ${positiveText}\nCancel = ${negativeText}`)) {
      onPositive();
    } else {
      onNegative();
    }
  } else {
    Alert.alert(title, message, [
      { text: negativeText, style: "cancel", onPress: onNegative },
      { text: positiveText, onPress: onPositive },
    ]);
  }
}
