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
import { COLORS, SPACING, RADIUS } from "@/constants/theme";

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
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>HealthPlan</Text>
        <Text style={styles.wordmarkFactory}>FACTORY</Text>
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
    gap: SPACING.sm,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  wordmark: {
    fontFamily: "serif",
    fontSize: 32,
    color: COLORS.white,
    letterSpacing: 1,
  },
  wordmarkFactory: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.amber,
    letterSpacing: 6,
    marginTop: -4,
  },
  tagline: {
    fontFamily: "sans-serif",
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: SPACING.sm,
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
    fontFamily: "sans-serif",
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
    fontFamily: "sans-serif",
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 16,
  },
});
