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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import { loadConnectionState, type HealthConnectionState } from "@/lib/healthSync";
import { getApiBaseUrl } from "@/lib/apiBase";
import { changeLanguage, type SupportedLang } from "@/lib/i18n";
import { restorePurchases } from "@/lib/revenuecat";

async function fetchSubscriptionStatus(): Promise<{ isPlus: boolean; subscriptionStatus: string }> {
  const base = getApiBaseUrl();
  try {
    let token: string | null = null;
    if (Platform.OS !== "web") {
      token = await SecureStore.getItemAsync("hpf_access_token");
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
  const { t } = useTranslation();

  const apiBase = getApiBaseUrl();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("hpf_access_token");
      if (!token) { setLoading(false); return; }
      try {
        const res = await fetch(`${apiBase}/api/profile/comms-prefs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.prefs) setPrefs(d.prefs);
        if (d.phone) setPhone(d.phone);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const token = await SecureStore.getItemAsync("hpf_access_token");
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
      Alert.alert(t("settings.saved"), t("settings.notifPrefsUpdated"));
    } catch {
      Alert.alert(t("common.error"), t("settings.failedToSave"));
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
        <Text style={notifStyles.label}>{t("settings.emailNotifications")}</Text>
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
        <Text style={notifStyles.label}>{t("settings.smsNotifications")}</Text>
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
          <Text style={notifStyles.saveBtnText}>{t("settings.savePreferences")}</Text>
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
  label: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.navy, flex: 1 },
  phoneInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14, color: COLORS.navy },
  saveBtn: {
    margin: SPACING.lg,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.white },
});

const CHECKIN_FREQ_KEY = "hpf_checkin_frequency";
const CHECKIN_TIME_KEY = "hpf_checkin_time";

type CheckInFrequency = "daily" | "every_other_day" | "weekdays" | "off";

const FREQ_LABELS: Record<CheckInFrequency, string> = {
  daily: "Daily",
  every_other_day: "Every other day",
  weekdays: "Weekdays only",
  off: "Off",
};

const WEEKDAY_MAP: Record<CheckInFrequency, number[]> = {
  daily: [1, 2, 3, 4, 5, 6, 7],
  every_other_day: [1, 3, 5, 7],
  weekdays: [2, 3, 4, 5, 6],
  off: [],
};

async function scheduleCheckInReminders(freq: CheckInFrequency, time: string) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  if (freq === "off") return;

  const [hourStr, minStr] = time.split(":");
  const hour = parseInt(hourStr ?? "8", 10);
  const minute = parseInt(minStr ?? "0", 10);
  const weekdays = WEEKDAY_MAP[freq];

  for (const weekday of weekdays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for your daily check-in",
        body: "How are you feeling today? It takes 60 seconds.",
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute },
    }).catch(() => {});
  }
}

function CheckInReminderSection() {
  const [freq, setFreq] = useState<CheckInFrequency>("daily");
  const [time, setTime] = useState("08:00");

  useEffect(() => {
    (async () => {
      const [savedFreq, savedTime] = await Promise.all([
        AsyncStorage.getItem(CHECKIN_FREQ_KEY),
        AsyncStorage.getItem(CHECKIN_TIME_KEY),
      ]);
      if (savedFreq) setFreq(savedFreq as CheckInFrequency);
      if (savedTime) setTime(savedTime);
    })();
  }, []);

  async function pickFrequency() {
    const options: CheckInFrequency[] = ["daily", "every_other_day", "weekdays", "off"];
    Alert.alert("Check-in Frequency", "How often would you like reminders?", [
      ...options.map((opt) => ({
        text: FREQ_LABELS[opt],
        onPress: async () => {
          setFreq(opt);
          await AsyncStorage.setItem(CHECKIN_FREQ_KEY, opt);
          await scheduleCheckInReminders(opt, time);
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={reminderStyles.card}>
      <TouchableOpacity style={reminderStyles.row} onPress={pickFrequency} activeOpacity={0.7}>
        <View style={reminderStyles.icon}>
          <Feather name="bell" size={16} color={COLORS.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={reminderStyles.label}>Reminder Frequency</Text>
          <Text style={reminderStyles.value}>{FREQ_LABELS[freq]}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={COLORS.textLight} />
      </TouchableOpacity>
      {freq !== "off" && (
        <View style={[reminderStyles.row, reminderStyles.rowBorder]}>
          <View style={reminderStyles.icon}>
            <Feather name="clock" size={16} color={COLORS.amber} />
          </View>
          <Text style={[reminderStyles.label, { flex: 1 }]}>Reminder Time</Text>
          <TextInput
            value={time}
            onChangeText={setTime}
            onBlur={async () => {
              await AsyncStorage.setItem(CHECKIN_TIME_KEY, time);
              await scheduleCheckInReminders(freq, time);
            }}
            style={reminderStyles.timeInput}
            keyboardType="numbers-and-punctuation"
            placeholder="08:00"
            maxLength={5}
          />
        </View>
      )}
    </View>
  );
}

const reminderStyles = StyleSheet.create({
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
  label: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.navy },
  value: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  timeInput: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.navy, textAlign: "right" },
});

function ConnectedServicesSection({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
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
            {isIos ? "Apple Health" : isAndroid ? "Google Fit" : t("settings.healthApps")}
          </Text>
          {anyConnected ? (
            <Text style={connStyles.statusConnected}>{t("settings.connected")}</Text>
          ) : (
            <Text style={connStyles.statusDisconnected}>{t("settings.notConnected")}</Text>
          )}
        </View>
        {anyConnected && <View style={connStyles.connectedDot} />}
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
  label: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.navy },
  statusConnected: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.sage, marginTop: 1 },
  statusDisconnected: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.sage },
});

function LanguageSection() {
  const { t, i18n } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const currentLang = i18n.language as SupportedLang;

  async function switchLang(lang: SupportedLang) {
    if (lang === currentLang || switching) return;
    setSwitching(true);
    await changeLanguage(lang);
    // Persist to server — fire-and-forget; local storage is authoritative if this fails
    const apiBase = getApiBaseUrl();
    if (apiBase) {
      let token: string | null = null;
      try {
        token = await SecureStore.getItemAsync("hpf_access_token");
      } catch { /* ignore */ }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(`${apiBase}/api/profile/language`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
    setSwitching(false);
  }

  return (
    <View style={langStyles.card}>
      <TouchableOpacity
        style={[langStyles.row, langStyles.rowBorder]}
        onPress={() => switchLang("en")}
        activeOpacity={0.7}
        disabled={switching}
      >
        <View style={langStyles.icon}>
          <Text style={langStyles.flag}>🇺🇸</Text>
        </View>
        <Text style={langStyles.label}>English</Text>
        {currentLang === "en" && <Feather name="check" size={16} color={COLORS.navy} />}
      </TouchableOpacity>
      <TouchableOpacity
        style={langStyles.row}
        onPress={() => switchLang("es")}
        activeOpacity={0.7}
        disabled={switching}
      >
        <View style={langStyles.icon}>
          <Text style={langStyles.flag}>🇲🇽</Text>
        </View>
        <Text style={langStyles.label}>Español</Text>
        {currentLang === "es" && <Feather name="check" size={16} color={COLORS.navy} />}
      </TouchableOpacity>
    </View>
  );
}

const langStyles = StyleSheet.create({
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
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.off,
  },
  flag: { fontSize: 18 },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.navy, flex: 1 },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut: logout } = useAuth();
  const { data: authData } = useGetCurrentAuthUser();
  const user = authData?.user;
  const { t } = useTranslation();
  const [restoring, setRestoring] = useState(false);

  async function handleRestorePurchases() {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      await queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      Alert.alert(t("settings.restoreSuccessTitle"), t("settings.restoreSuccessBody"));
    } else {
      Alert.alert(t("settings.restoreFailTitle"), t("settings.restoreFailBody"));
    }
  }

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 120_000,
  });

  const subscriptionStatus = subscriptionData?.subscriptionStatus ?? "free";
  const isPlus = subscriptionStatus === "plus";
  const membershipLabel =
    isPlus
      ? t("settings.plus")
      : subscriptionStatus === "employer"
        ? t("settings.employer")
        : t("settings.explorer");

  function handleSignOut() {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
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
      label: t("settings.email"),
      value: user?.email ?? "—",
    },
    {
      id: "plan",
      icon: "star",
      label: t("settings.membership"),
      value: membershipLabel,
    },
  ];

  const referralRow: SettingsRow = {
    id: "referral",
    icon: "gift",
    label: t("settings.referEarn"),
    onPress: () => router.push("/referral" as never),
  };

  const supportRows: SettingsRow[] = [
    {
      id: "privacy",
      icon: "shield",
      label: t("settings.privacyPolicy"),
      onPress: () => Linking.openURL("https://healthplanfactory.com/privacy"),
    },
    {
      id: "terms",
      icon: "file-text",
      label: t("settings.termsOfService"),
      onPress: () => Linking.openURL("https://healthplanfactory.com/terms"),
    },
    {
      id: "contact",
      icon: "help-circle",
      label: t("settings.contactSupport"),
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
                {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : t("settings.member")}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>{t("settings.account")}</Text>
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

        {Platform.OS === "ios" && (
          <>
            <Text style={styles.sectionLabel}>{t("settings.restorePurchases")}</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={handleRestorePurchases}
              disabled={restoring}
              activeOpacity={0.7}
            >
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  {restoring ? (
                    <ActivityIndicator size="small" color={COLORS.amber} />
                  ) : (
                    <Feather name="refresh-cw" size={16} color={COLORS.amber} />
                  )}
                </View>
                <Text style={styles.rowLabel}>{t("settings.restorePurchases")}</Text>
                <Feather name="chevron-right" size={16} color={COLORS.textLight} />
              </View>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionLabel}>{t("settings.language")}</Text>
        <LanguageSection />

        <Text style={styles.sectionLabel}>{t("settings.connectedServices")}</Text>
        <ConnectedServicesSection profileId={user?.id} />

        <Text style={styles.sectionLabel}>{t("settings.notifications")}</Text>
        <NotificationPrefsSection />

        <Text style={styles.sectionLabel}>Check-in Reminders</Text>
        <CheckInReminderSection />

        <Text style={styles.sectionLabel}>{t("settings.referEarn")}</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={referralRow.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Feather name="gift" size={16} color={COLORS.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t("settings.referEarnTitle")}</Text>
              <Text style={[styles.rowValue, { fontSize: 12, marginTop: 1 }]}>{t("settings.referEarnSub")}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.textLight} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t("settings.support")}</Text>
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
            <Text style={styles.disclaimerTitle}>{t("settings.medicalDisclaimerTitle")}</Text>
          </View>
          <Text style={styles.disclaimerBody}>{t("settings.medicalDisclaimer1")}</Text>
          <Text style={styles.disclaimerBody}>{t("settings.medicalDisclaimer2")}</Text>
          <Text style={styles.disclaimerBody}>{t("settings.medicalDisclaimer3")}</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Feather name="log-out" size={16} color={COLORS.rose} />
          <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
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
  headerLogo: { width: 120, height: 40 },
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
  avatarText: { fontFamily: FONTS.heading, fontSize: 24, color: COLORS.white },
  profileName: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.white },
  profileEmail: { fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 2 },
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
  rowLabel: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.navy, flex: 1 },
  rowValue: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },
  disclaimerCard: {
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.amber10,
    gap: SPACING.md,
  },
  disclaimerHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  disclaimerTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.navy },
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
  signOutText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.rose },
  version: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
