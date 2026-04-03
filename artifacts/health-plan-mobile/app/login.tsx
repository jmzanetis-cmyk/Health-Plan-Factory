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
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const featureKeys = [
    "login.features.plan",
    "login.features.coach",
    "login.features.tracking",
    "login.features.evidence",
  ] as const;

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
        <Text style={styles.tagline}>{t("login.tagline")}</Text>
      </View>

      <View style={styles.features}>
        {featureKeys.map((key) => (
          <View key={key} style={styles.featureRow}>
            <View style={styles.dot} />
            <Text style={styles.featureText}>{t(key)}</Text>
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
            {isLoading ? t("login.signingIn") : t("login.signIn")}
          </Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>{t("login.disclaimer")}</Text>
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
