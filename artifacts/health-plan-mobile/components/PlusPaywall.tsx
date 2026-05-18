import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAuth } from "@/lib/auth";
import { COLORS, FONTS, SPACING, RADIUS } from "@/constants/theme";

export type PlusFeature =
  | "coach"
  | "journal"
  | "accountability"
  | "provider_details"
  | "messaging";

const FEATURE_DESCRIPTIONS: Record<PlusFeature, string> = {
  coach: "Get personalized accountability and answers from your AI wellness coach.",
  journal: "Track how you feel and what works with daily journaling.",
  accountability: "Build habits with streak tracking and progress insights.",
  provider_details: "See full contact details and book sessions directly.",
  messaging: "Message your providers directly through the app.",
};

interface Props {
  feature: PlusFeature;
}

/**
 * Plus paywall for mobile features.
 *
 * APPLE COMPLIANCE NOTES:
 * - We do NOT show pricing in-app (Apple's anti-steering rules around external payment)
 * - We do NOT include a "Subscribe on web" button or URL
 * - We DO allow users to log in with an existing Plus subscription
 * - We MAY include a single "Manage account" link per the post-Epic ruling (commented out below)
 *
 * Conversion happens on web. Users who hit this paywall either already have Plus
 * (sign in) or go to web through other channels (email, ads, SEO).
 */
export function PlusPaywall({ feature }: Props) {
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Plus Feature</Text>
        <Text style={styles.description}>{FEATURE_DESCRIPTIONS[feature]}</Text>
        <Text style={styles.subtext}>Sign in to your Plus account to continue.</Text>

        <Pressable style={styles.button} onPress={login}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>

        {/* Per Apple's anti-steering ruling (Epic v. Apple, Jan 2024), apps may include
            a single link to their website for account management. Uncomment if needed.
            Do NOT use this link to direct users to subscribe. */}
        {/*
        <Pressable onPress={() => Linking.openURL("https://healthplanfactory.com/account")}>
          <Text style={styles.link}>Manage account on the web</Text>
        </Pressable>
        */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.xxl,
    backgroundColor: COLORS.warm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: COLORS.navy,
    marginBottom: SPACING.md,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  subtext: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxl,
  },
  button: {
    backgroundColor: COLORS.navy,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  link: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.navy,
    textAlign: "center",
    marginTop: SPACING.lg,
    textDecorationLine: "underline",
  },
});
