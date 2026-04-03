import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import {
  requestHealthPermissions,
  loadConnectionState,
  saveConnectionState,
  type HealthConnectionState,
} from "@/lib/healthSync";

const PLATFORM_SOURCE = Platform.OS === "ios" ? "apple_health" : "google_fit";

function HealthSourceCard({
  title,
  subtitle,
  iconName,
  connected,
  loading,
  connectedLabel,
  connectLabel,
  disconnectLabel,
  onConnect,
  onDisconnect,
}: {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  connected: boolean;
  loading: boolean;
  connectedLabel: string;
  connectLabel: string;
  disconnectLabel: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.iconWrap, connected && cardStyles.iconWrapConnected]}>
          <Feather name={iconName} size={22} color={connected ? COLORS.white : COLORS.navy} />
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.title}>{title}</Text>
          <Text style={cardStyles.subtitle}>{subtitle}</Text>
        </View>
        {connected && (
          <View style={cardStyles.badge}>
            <Feather name="check-circle" size={14} color={COLORS.sage} />
            <Text style={cardStyles.badgeText}>{connectedLabel}</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.dataTypes}>
        {[t("healthConnect.steps"), t("healthConnect.sleep"), t("healthConnect.activeMinutes"), t("healthConnect.mindfulness")].map((d) => (
          <View key={d} style={cardStyles.dataChip}>
            <Text style={cardStyles.dataChipText}>{d}</Text>
          </View>
        ))}
      </View>
      {connected ? (
        <TouchableOpacity style={cardStyles.disconnectBtn} onPress={onDisconnect} activeOpacity={0.8}>
          <Text style={cardStyles.disconnectBtnText}>{disconnectLabel}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={cardStyles.connectBtn} onPress={onConnect} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={cardStyles.connectBtnText}>{connectLabel}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.amberPale,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapConnected: { backgroundColor: COLORS.sage },
  info: { flex: 1 },
  title: { fontFamily: FONTS.bodySemiBold, fontSize: 16, color: COLORS.navy },
  subtitle: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.sagePale,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontFamily: FONTS.bodySemiBold, fontSize: 11, color: COLORS.sage },
  dataTypes: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  dataChip: {
    backgroundColor: COLORS.navy10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  dataChipText: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.navy },
  connectBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  connectBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.white },
  disconnectBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  disconnectBtnText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.textMuted },
});

export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id;
  const { t, i18n } = useTranslation();

  const [connections, setConnections] = useState<HealthConnectionState>({
    appleHealth: false,
    googleFit: false,
    lastSynced: null,
  });
  const [loadingSource, setLoadingSource] = useState<"apple_health" | "google_fit" | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadConnectionState(profileId).then((state) => {
      setConnections(state);
      setInitialized(true);
    });
  }, [profileId]);

  async function handleConnect(source: "apple_health" | "google_fit") {
    if (Platform.OS === "web") {
      Alert.alert(t("healthConnect.notAvailable"), t("healthConnect.requiresNative"));
      return;
    }
    setLoadingSource(source);
    try {
      const granted = await requestHealthPermissions(source);
      if (granted) {
        const updated: HealthConnectionState = {
          ...connections,
          appleHealth: source === "apple_health" ? true : connections.appleHealth,
          googleFit: source === "google_fit" ? true : connections.googleFit,
        };
        await saveConnectionState(updated, profileId);
        setConnections(updated);
        const sourceName = source === "apple_health" ? "Apple Health" : "Google Fit";
        Alert.alert(t("healthConnect.connectedTitle"), t("healthConnect.connectedBody", { source: sourceName }));
      } else {
        Alert.alert(t("healthConnect.permissionDenied"), t("healthConnect.permissionDeniedBody"));
      }
    } finally {
      setLoadingSource(null);
    }
  }

  async function handleDisconnect(source: "apple_health" | "google_fit") {
    const sourceName = source === "apple_health" ? "Apple Health" : "Google Fit";
    Alert.alert(
      t("healthConnect.disconnect"),
      t("healthConnect.disconnectConfirm", { source: sourceName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("healthConnect.disconnect"),
          style: "destructive",
          onPress: async () => {
            const updated: HealthConnectionState = {
              ...connections,
              appleHealth: source === "apple_health" ? false : connections.appleHealth,
              googleFit: source === "google_fit" ? false : connections.googleFit,
            };
            await saveConnectionState(updated, profileId);
            setConnections(updated);
          },
        },
      ]
    );
  }

  if (!initialized) {
    return (
      <View style={[styles.screen, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={COLORS.navy} />
      </View>
    );
  }

  const isIos = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  const locale = i18n.language === "es" ? "es-MX" : "en-US";

  const syncItems = [
    { icon: "trending-up", label: t("healthConnect.dailyStepCount") },
    { icon: "moon", label: t("healthConnect.sleepDuration") },
    { icon: "zap", label: t("healthConnect.activeMinutes") },
    { icon: "sun", label: t("healthConnect.mindfulnessSessions") },
  ];

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("healthConnect.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <Feather name="activity" size={28} color={COLORS.amber} />
          <Text style={styles.heroTitle}>{t("healthConnect.heroTitle")}</Text>
          <Text style={styles.heroBody}>{t("healthConnect.heroBody")}</Text>
        </View>

        {isWeb && (
          <View style={styles.webNotice}>
            <Feather name="info" size={16} color={COLORS.amber} />
            <Text style={styles.webNoticeText}>{t("healthConnect.webNotice")}</Text>
          </View>
        )}

        {(isIos || isWeb) && (
          <HealthSourceCard
            title="Apple Health"
            subtitle={t("healthConnect.appleSubtitle")}
            iconName="heart"
            connected={connections.appleHealth}
            loading={loadingSource === "apple_health"}
            connectedLabel={t("healthConnect.connected")}
            connectLabel={t("healthConnect.connect")}
            disconnectLabel={t("healthConnect.disconnect")}
            onConnect={() => handleConnect("apple_health")}
            onDisconnect={() => handleDisconnect("apple_health")}
          />
        )}

        {(isAndroid || isWeb) && (
          <HealthSourceCard
            title="Google Fit"
            subtitle={t("healthConnect.googleSubtitle")}
            iconName="activity"
            connected={connections.googleFit}
            loading={loadingSource === "google_fit"}
            connectedLabel={t("healthConnect.connected")}
            connectLabel={t("healthConnect.connect")}
            disconnectLabel={t("healthConnect.disconnect")}
            onConnect={() => handleConnect("google_fit")}
            onDisconnect={() => handleDisconnect("google_fit")}
          />
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t("healthConnect.whatGetsSynced")}</Text>
          <View style={styles.infoRows}>
            {syncItems.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Feather name={item.icon as React.ComponentProps<typeof Feather>["name"]} size={16} color={COLORS.amber} />
                <Text style={styles.infoRowText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.privacyCard}>
          <Feather name="shield" size={16} color={COLORS.navy} />
          <Text style={styles.privacyText}>{t("healthConnect.privacyNote")}</Text>
        </View>

        {connections.lastSynced && (
          <Text style={styles.lastSynced}>
            {t("healthConnect.lastSynced", {
              date: new Date(connections.lastSynced).toLocaleString(locale),
            })}
          </Text>
        )}

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
  headerTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 17, color: COLORS.navy },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  heroBanner: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
  },
  heroTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy, textAlign: "center" },
  heroBody: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  webNotice: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.amber10,
  },
  webNoticeText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.navy,
    flex: 1,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  infoTitle: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: COLORS.navy },
  infoRows: { gap: SPACING.sm },
  infoRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  infoRowText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.navy },
  privacyCard: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
    backgroundColor: COLORS.navy10,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  privacyText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.navy,
    flex: 1,
    lineHeight: 18,
    opacity: 0.85,
  },
  lastSynced: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
