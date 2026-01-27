import { Text, View, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { loading, isAuthenticated } = useAuth();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    router.replace("/(tabs)");
    return null;
  }

  const handleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // On native platforms in Expo Go, show a message about the limitation
    if (Platform.OS !== "web" && isExpoGo) {
      Alert.alert(
        "Sign-In Not Available",
        "Sign-in is not available in Expo Go due to OAuth redirect limitations.\n\n" +
        "To use sign-in:\n" +
        "• Use the web preview at the provided URL\n" +
        "• Or build a standalone app\n\n" +
        "You can still use the app locally without signing in.",
        [
          { text: "Continue Without Account", onPress: () => router.replace("/(tabs)") },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

    await startOAuthLogin();
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.title, { color: colors.foreground }]}>Petfolio</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Keep all your pet's medical records in one place
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            icon="doc.fill"
            title="Medical Records"
            description="Store vet visits, prescriptions, and lab results"
            colors={colors}
          />
          <FeatureItem
            icon="heart.fill"
            title="Vaccination Tracking"
            description="Never miss a vaccination with smart reminders"
            colors={colors}
          />
          <FeatureItem
            icon="icloud.fill"
            title="Cloud Sync"
            description="Access your pet's data from any device"
            colors={colors}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Show Expo Go warning if applicable */}
          {Platform.OS !== "web" && isExpoGo && (
            <View style={[styles.warningBanner, { backgroundColor: colors.warning + "20", borderColor: colors.warning }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.foreground }]}>
                Sign-in requires the published app or web preview
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            style={[
              styles.loginButton, 
              { backgroundColor: colors.primary },
              Platform.OS !== "web" && isExpoGo && styles.loginButtonDisabled
            ]}
            activeOpacity={0.8}
          >
            <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
            <Text style={styles.loginButtonText}>
              {Platform.OS !== "web" && isExpoGo ? "Sign In (Not Available)" : "Sign In to Sync"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            style={[styles.skipButton, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: colors.foreground }]}>
              Continue Without Account
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            Your data stays on your device until you sign in.{"\n"}
            Sign in to enable cloud sync across devices.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

interface FeatureItemProps {
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.primary + "20" }]}>
        <IconSymbol name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.muted }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    paddingTop: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  featureDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    paddingBottom: 40,
    gap: 12,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  disclaimer: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
});
