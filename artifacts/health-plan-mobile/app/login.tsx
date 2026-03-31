import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad + 40, paddingBottom: botPad + 20 },
      ]}
    >
      <View style={styles.logoArea}>
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Build the health plan you actually need.</Text>
      </View>

      <View style={styles.features}>
        {[
          "Personalized wellness plan",
          "AI accountability coach",
          "Progress tracking & streaks",
          "Evidence-based modalities",
        ].map((feat) => (
          <View key={feat} style={styles.featureRow}>
            <View style={styles.dot} />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          onPress={login}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>
            {isLoading ? "Signing in..." : "Sign In to Continue"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By continuing, you agree that all content is for informational
          purposes only and not medical advice.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.xxl,
    justifyContent: "space-between",
  },
  logoArea: {
    alignItems: "center",
    gap: SPACING.lg,
  },
  logo: {
    width: 240,
    height: 200,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
  features: {
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
  featureText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
  },
  footer: {
    gap: SPACING.md,
  },
  loginBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: "center",
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 16,
  },
});
