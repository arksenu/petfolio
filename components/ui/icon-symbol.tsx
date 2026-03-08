// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation & tabs
  "house.fill": "home",
  "gearshape.fill": "settings",
  "bubble.left.and.bubble.right.fill": "forum",
  // Concierge
  "plus.message.fill": "add-comment",
  "mic.fill": "mic",
  "mic.slash.fill": "mic-off",
  "stop.fill": "stop",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "waveform": "graphic-eq",
  "arrow.up.circle.fill": "arrow-upward",
  // Providers
  "phone.fill": "phone",
  "mappin.circle.fill": "place",
  "stethoscope": "medical-services",
  // General actions
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "pencil": "edit",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "link": "link",
  "qrcode": "qr-code",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up.forward": "open-in-new",
  "magnifyingglass": "search",
  // Media
  "camera.fill": "camera-alt",
  "photo.fill": "photo-library",
  "doc.fill": "description",
  "doc.text.fill": "article",
  "folder.fill": "folder",
  // Status
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.circle.fill": "error",
  "exclamationmark.triangle.fill": "warning",
  "clock.fill": "schedule",
  // People & pets
  "person.fill": "person",
  "person.circle.fill": "account-circle",
  "pawprint.fill": "pets",
  "heart.fill": "favorite",
  // Notifications & calendar
  "calendar": "event",
  "bell.fill": "notifications",
  "envelope.fill": "email",
  // Security
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  // Health
  "pills.fill": "medication",
  // Cloud
  "icloud.fill": "cloud",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
