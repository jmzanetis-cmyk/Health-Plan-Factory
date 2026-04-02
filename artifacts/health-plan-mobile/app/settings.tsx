import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import { loadConnectionState, type HealthConnectionState } from "@/lib/healthSync";

function getMobileApiBase(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function fetchSubscriptionStatus(): Promise<{ isPlus: boolean; subscriptionStatus: string }> {
  const base = getMobileApiBase();
  try {
    let token: string | null = null;
    if (Platform.OS !== "web") {
      token = await SecureStore.getItemAsync("auth_session_token");
    }
    if (!token) return { isPlus: false, subscriptionStatus: "free" };
    const res = await fetch(`${base}/api/members/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { isPlus: false, subscriptionStatus: "free" };
    return res.json();
  } catch {
    return { isPlus: false, subscriptionStatus: "free" };
  }
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface SettingsRow {
  id: string;
  icon: FeatherIconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function NotificationPrefsSection() {
  const [prefs, setPrefs] = useState({ email: true, sms: false });
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const apiBase = getMobileApiBase();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("auth_session_token");
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`${apiBase}/api/profile/comms-prefs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.prefs) setPrefs(d.prefs);
        if (d.phone) setPhone(d.phone);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const token = await SecureStore.getItemAsync("auth_session_token");
    if (!token) return;
    setSaving(true);
    try {
      await fetch(`${apiBase}/api/profile/comms-prefs`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...prefs, phone: phone || null }),
      });
      Alert.alert("Saved", "Notification preferences updated.");
    } catch {
      Alert.alert("Error", "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: SPACING.lg, alignItems: "center" }}>
        <ActivityIndicator color={COLORS.navy} />
      </View>
    );
  }

  return (
    <View style={notifStyles.card}>
      <View style={notifStyles.row}>
        <View style={notifStyles.icon}>
          <Feather name="mail" size={16} color={COLORS.amber} />
        </View>
        <Text style={notifStyles.label}>Email notifications</Text>
        <Switch
          value={prefs.email}
          onValueChange={(v) => setPrefs((p) => ({ ...p, email: v }))}
          trackColor={{ false: COLORS.border, true: COLORS.navy }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={[notifStyles.row, notifStyles.rowBorder]}>
        <View style={notifStyles.icon}>
          <Feather name="message-square" size={16} color={COLORS.amber} />
        </View>
        <Text style={notifStyles.label}>SMS notifications</Text>
        <Switch
          value={prefs.sms}
          onValueChange={(v) => setPrefs((p) => ({ ...p, sms: v }))}
          trackColor={{ false: COLORS.border, true: COLORS.navy }}
          thumbColor={COLORS.white}
        />
      </View>
      {prefs.sms && (
        <View style={[notifStyles.row, notifStyles.rowBorder]}>
          <View style={notifStyles.icon}>
            <Feather name="phone" size={16} color={COLORS.amber} />
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 000 0000"
            keyboardType="phone-pad"
            style={notifStyles.phoneInput}
          />
        </View>
      )}
      <TouchableOpacity
        style={notifStyles.saveBtn}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={notifStyles.saveBtnText}>Save preferences</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const notifStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberPale,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.navy,
    flex: 1,
  },
  phoneInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.navy,
  },
  saveBtn: {
    margin: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.white,
  },
});

function ConnectedServicesSection({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const [connections, setConnections] = useState<HealthConnectionState>({
    appleHealth: false,
    googleFit: false,
    lastSynced: null,
  });

  useEffect(() => {
    loadConnectionState(profileId).then(setConnections);
  }, [profileId]);

  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  const anyConnected = connections.appleHealth || connections.googleFit;

  return (
    <View style={connStyles.card}>
      <TouchableOpacity
        style={connStyles.row}
        onPress={() => router.push("/health-connect" as never)}
        activeOpacity={0.7}
      >
        <View style={connStyles.icon}>
          <Feather name="activity" size={16} color={COLORS.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={connStyles.label}>
            {isIos ? "Apple Health" : isAndroid ? "Google Fit" : "Health Apps"}
          </Text>
          {anyConnected ? (
            <Text style={connStyles.statusConnected}>Connected</Text>
          ) : (
            <Text style={connStyles.statusDisconnected}>Not connected</Text>
          )}
        </View>
        {anyConnected && (
          <View style={connStyles.connectedDot} />
        )}
        <Feather name="chevron-right" size={16} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
}

const connStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberPale,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.navy,
  },
  statusConnected: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.sage,
    marginTop: 1,
  },
  statusDisconnected: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.sage,
  },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { logout } = useAuth();
  const { data: authData } = useGetCurrentAuthUser();
  const user = authData?.user;

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 120_000,
  });

  const subscriptionStatus = subscriptionData?.subscriptionStatus ?? "free";
  const membershipLabel =
    subscriptionStatus === "plus"
      ? "Plus"
      : subscriptionStatus === "employer"
        ? "Employer"
        : "Explorer";

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const accountRows: SettingsRow[] = [
    {
      id: "email",
      icon: "mail",
      label: "Email",
      value: user?.email ?? "—",
    },
    {
      id: "plan",
      icon: "star",
      label: "Membership",
      value: membershipLabel,
    },
  ];

  const supportRows: SettingsRow[] = [
    {
      id: "privacy",
      icon: "shield",
      label: "Privacy Policy",
      onPress: () => Linking.openURL("https://healthplanfactory.com/privacy"),
    },
    {
      id: "terms",
      icon: "file-text",
      label: "Terms of Service",
      onPress: () => Linking.openURL("https://healthplanfactory.com/terms"),
    },
    {
      id: "contact",
      icon: "help-circle",
      label: "Contact Support",
      onPress: () => Linking.openURL("mailto:support@healthplanfactory.com"),
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Image
          source={require("../assets/logo.png")}
          style={styles.headerLogo}
          resizeMode="contain"
          accessibilityLabel="Health Plan Factory – Settings"
        />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {user && (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user.firstName ?? user.email ?? "?")[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>
                {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Member"}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {accountRows.map((row, idx) => (
            <TouchableOpacity
              key={row.id}
              style={[styles.row, idx < accountRows.length - 1 && styles.rowBorder]}
              onPress={row.onPress}
              disabled={!row.onPress}
              activeOpacity={row.onPress ? 0.7 : 1}
            >
              <View style={styles.rowIcon}>
                <Feather name={row.icon} size={16} color={COLORS.amber} />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              {row.value && <Text style={styles.rowValue}>{row.value}</Text>}
              {row.onPress && <Feather name="chevron-right" size={16} color={COLORS.textLight} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Connected Services</Text>
        <ConnectedServicesSection profileId={user?.id} />

        <Text style={styles.sectionLabel}>Notifications</Text>
        <NotificationPrefsSection />

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          {supportRows.map((row, idx) => (
            <TouchableOpacity
              key={row.id}
              style={[styles.row, idx < supportRows.length - 1 && styles.rowBorder]}
              onPress={row.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Feather name={row.icon} size={16} color={COLORS.navy} />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Feather name="chevron-right" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <Feather name="alert-circle" size={16} color={COLORS.amber} />
            <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          </View>
          <Text style={styles.disclaimerBody}>
            HealthPlan Factory provides general wellness information for educational purposes only.
            Content on this app is not intended to be a substitute for professional medical advice,
            diagnosis, or treatment. Always seek the advice of your physician or other qualified
            health provider with any questions you may have regarding a medical condition.
          </Text>
          <Text style={styles.disclaimerBody}>
            If you are experiencing a medical emergency, call 911 immediately.
          </Text>
          <Text style={styles.disclaimerBody}>
            If you are in mental health crisis, call or text 988 (Suicide & Crisis Lifeline) or
            text HOME to 741741 (Crisis Text Line).
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Feather name="log-out" size={16} color={COLORS.rose} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HealthPlan Factory · v1.0.0</Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.navy10,
  },
  headerLogo: {
    width: 120,
    height: 40,
  },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: COLORS.white,
  },
  profileName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  profileEmail: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberPale,
  },
  rowLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.navy,
    flex: 1,
  },
  rowValue: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  disclaimerCard: {
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.amber10,
    gap: SPACING.md,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  disclaimerTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  disclaimerBody: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.navy,
    lineHeight: 20,
    opacity: 0.8,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.rose,
    backgroundColor: COLORS.rosePale,
    marginTop: SPACING.sm,
  },
  signOutText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.rose,
  },
  version: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
