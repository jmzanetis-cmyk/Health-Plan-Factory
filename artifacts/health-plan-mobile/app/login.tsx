import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";

export default function LoginScreen() {
  const { signIn, signInWithMagicLink } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const featureKeys = [
    "login.features.plan",
    "login.features.coach",
    "login.features.tracking",
    "login.features.evidence",
  ] as const;

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setIsSigningIn(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert(
        "Sign in failed",
        err instanceof Error ? err.message : "Please check your credentials and try again."
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleMagicLink() {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter your email address to receive a magic link.");
      return;
    }
    setIsSendingLink(true);
    try {
      await signInWithMagicLink(email.trim().toLowerCase());
      setMagicLinkSent(true);
    } catch (err) {
      Alert.alert(
        "Could not send link",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setIsSendingLink(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#1b2d4f" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 40, paddingBottom: botPad + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
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

        {magicLinkSent ? (
          <View style={styles.magicLinkSentBox}>
            <Text style={styles.magicLinkSentTitle}>Check your email</Text>
            <Text style={styles.magicLinkSentBody}>
              We sent a sign-in link to {email}. Tap it to open the app.
            </Text>
            <TouchableOpacity onPress={() => setMagicLinkSent(false)}>
              <Text style={styles.resendLink}>Resend or use password instead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
            />

            <TouchableOpacity
              style={[styles.loginBtn, isSigningIn && styles.loginBtnDisabled]}
              onPress={handleSignIn}
              disabled={isSigningIn || isSendingLink}
              activeOpacity={0.85}
            >
              {isSigningIn ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginBtnText}>{t("login.signIn")}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.magicLinkBtn}
              onPress={handleMagicLink}
              disabled={isSigningIn || isSendingLink}
              activeOpacity={0.7}
            >
              {isSendingLink ? (
                <ActivityIndicator color="#d4a44c" size="small" />
              ) : (
                <Text style={styles.magicLinkText}>Send magic link instead</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>{t("login.disclaimer")}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#1b2d4f",
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
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  features: {
    gap: SPACING.md,
    marginVertical: SPACING.xl,
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
    color: "rgba(255,255,255,0.8)",
  },
  footer: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.white,
  },
  loginBtn: {
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.sm,
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
  magicLinkBtn: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  magicLinkText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#d4a44c",
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    lineHeight: 16,
  },
  magicLinkSentBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    gap: SPACING.md,
    alignItems: "center",
  },
  magicLinkSentTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    color: COLORS.white,
  },
  magicLinkSentBody: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 20,
  },
  resendLink: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.amber,
    textDecorationLine: "underline",
  },
});
