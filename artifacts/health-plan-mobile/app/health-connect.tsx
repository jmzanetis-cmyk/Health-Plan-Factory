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
  onConnect,
  onDisconnect,
}: {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
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
            <Text style={cardStyles.badgeText}>Connected</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.dataTypes}>
        {["Steps", "Sleep", "Active Minutes", "Mindfulness"].map((d) => (
          <View key={d} style={cardStyles.dataChip}>
            <Text style={cardStyles.dataChipText}>{d}</Text>
          </View>
        ))}
      </View>
      {connected ? (
        <TouchableOpacity
          style={cardStyles.disconnectBtn}
          onPress={onDisconnect}
          activeOpacity={0.8}
        >
          <Text style={cardStyles.disconnectBtnText}>Disconnect</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={cardStyles.connectBtn}
          onPress={onConnect}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={cardStyles.connectBtnText}>Connect</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.amberPale,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapConnected: {
    backgroundColor: COLORS.sage,
  },
  info: { flex: 1 },
  title: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.navy,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.sagePale,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.sage,
  },
  dataTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  dataChip: {
    backgroundColor: COLORS.navy10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  dataChipText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.navy,
  },
  connectBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  connectBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  disconnectBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  disconnectBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

export default function HealthConnectScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();
  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id;

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
      Alert.alert(
        "Not Available",
        "Health integration requires the native iOS or Android app."
      );
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
        Alert.alert(
          "Connected!",
          `${source === "apple_health" ? "Apple Health" : "Google Fit"} is now connected. Your steps, sleep, and activity data will sync automatically.`
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Health permissions are required to sync your data. You can enable them in your device settings."
        );
      }
    } finally {
      setLoadingSource(null);
    }
  }

  async function handleDisconnect(source: "apple_health" | "google_fit") {
    Alert.alert(
      "Disconnect",
      `Stop syncing data from ${source === "apple_health" ? "Apple Health" : "Google Fit"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
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

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connected Services</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.heroBanner}>
          <Feather name="activity" size={28} color={COLORS.amber} />
          <Text style={styles.heroTitle}>Sync Your Health Data</Text>
          <Text style={styles.heroBody}>
            Connect Apple Health or Google Fit to automatically log your daily steps,
            sleep, active minutes, and mindfulness — no manual tracking required.
          </Text>
        </View>

        {isWeb && (
          <View style={styles.webNotice}>
            <Feather name="info" size={16} color={COLORS.amber} />
            <Text style={styles.webNoticeText}>
              Health integration is available on the iOS and Android apps. Install the
              native app to connect your device health data.
            </Text>
          </View>
        )}

        {(isIos || isWeb) && (
          <HealthSourceCard
            title="Apple Health"
            subtitle="iOS · HealthKit"
            iconName="heart"
            connected={connections.appleHealth}
            loading={loadingSource === "apple_health"}
            onConnect={() => handleConnect("apple_health")}
            onDisconnect={() => handleDisconnect("apple_health")}
          />
        )}

        {(isAndroid || isWeb) && (
          <HealthSourceCard
            title="Google Fit"
            subtitle="Android · Health Connect"
            iconName="activity"
            connected={connections.googleFit}
            loading={loadingSource === "google_fit"}
            onConnect={() => handleConnect("google_fit")}
            onDisconnect={() => handleDisconnect("google_fit")}
          />
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What gets synced?</Text>
          <View style={styles.infoRows}>
            {[
              { icon: "trending-up", label: "Daily step count" },
              { icon: "moon", label: "Sleep duration" },
              { icon: "zap", label: "Active minutes" },
              { icon: "sun", label: "Mindfulness sessions" },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Feather name={item.icon as React.ComponentProps<typeof Feather>["name"]} size={16} color={COLORS.amber} />
                <Text style={styles.infoRowText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.privacyCard}>
          <Feather name="shield" size={16} color={COLORS.navy} />
          <Text style={styles.privacyText}>
            Health data is stored securely and only used to improve your wellness score.
            We never sell your health data. You can disconnect at any time.
          </Text>
        </View>

        {connections.lastSynced && (
          <Text style={styles.lastSynced}>
            Last synced: {new Date(connections.lastSynced).toLocaleString()}
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
  headerTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
    color: COLORS.navy,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  heroBanner: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.navy,
    textAlign: "center",
  },
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
  infoTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  infoRows: { gap: SPACING.sm },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  infoRowText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.navy,
  },
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
