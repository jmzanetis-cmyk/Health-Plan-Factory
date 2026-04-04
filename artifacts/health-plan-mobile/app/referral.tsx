import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
  type DimensionValue,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { getApiBaseUrl } from "@/lib/apiBase";

const AUTH_TOKEN_KEY = "auth_session_token";

interface ReferralHistoryRow {
  id: string;
  status: "pending" | "rewarded";
  code: string;
  createdAt: string;
  rewardedAt?: string | null;
  referredMemberName: string | null;
  referredMemberEmail: string | null;
}

interface MilestoneInfo {
  id: string;
  label: string;
  emoji: string;
  threshold: number;
  bonusCents: number;
  earned: boolean;
  rewardedAt: string | null;
}

interface ReferralData {
  referralCode: string;
  referralHistory: ReferralHistoryRow[];
  creditSummary: {
    unusedCreditsCents: number;
    unusedCreditsFormatted: string;
  };
  milestones: MilestoneInfo[];
  rewardedCount: number;
  nextMilestone: { id: string; label: string; threshold: number; emoji: string } | null;
}

async function fetchReferralData(): Promise<ReferralData | null> {
  try {
    const base = getApiBaseUrl();
    let token: string | null = null;
    if (Platform.OS !== "web") {
      token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    }
    if (!token) return null;
    const res = await fetch(`${base}/api/referrals/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function StatusPill({ status }: { status: "pending" | "rewarded" }) {
  const { t } = useTranslation();
  const rewarded = status === "rewarded";
  return (
    <View
      style={[
        pillStyles.pill,
        { backgroundColor: rewarded ? "rgba(125,181,92,0.12)" : COLORS.crimson10 },
      ]}
    >
      <Text
        style={[
          pillStyles.text,
          { color: rewarded ? COLORS.sage : COLORS.crimson },
        ]}
      >
        {rewarded ? t("referral.rewarded") : t("referral.pending")}
      </Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: { fontFamily: FONTS.bodySemiBold, fontSize: 11 },
});

function MilestoneBadge({
  milestone,
  rewardedCount,
}: {
  milestone: MilestoneInfo;
  rewardedCount: number;
}) {
  const { t } = useTranslation();
  const progressPct = Math.min(rewardedCount / milestone.threshold, 1);
  const barWidth: DimensionValue = `${Math.round(progressPct * 100)}%`;

  return (
    <View
      style={[
        milestoneStyles.badge,
        {
          backgroundColor: milestone.earned ? "rgba(125,181,92,0.07)" : COLORS.off,
          borderColor: milestone.earned ? "rgba(125,181,92,0.25)" : COLORS.border,
          opacity: milestone.earned ? 1 : 0.75,
        },
      ]}
    >
      {milestone.earned && (
        <View style={milestoneStyles.checkDot}>
          <Feather name="check" size={8} color={COLORS.white} />
        </View>
      )}
      <Text style={milestoneStyles.emoji}>{milestone.emoji}</Text>
      <Text
        style={[
          milestoneStyles.label,
          { color: milestone.earned ? COLORS.sage : COLORS.navy },
        ]}
      >
        {milestone.label}
      </Text>
      <Text style={milestoneStyles.threshold}>
        {t("referral.milestoneTreshold", { count: milestone.threshold })}
      </Text>
      {milestone.bonusCents > 0 && (
        <Text style={milestoneStyles.bonus}>
          +${(milestone.bonusCents / 100).toFixed(0)}
        </Text>
      )}
      {!milestone.earned && (
        <View style={milestoneStyles.progressTrack}>
          <View style={[milestoneStyles.progressBar, { width: barWidth }]} />
        </View>
      )}
    </View>
  );
}

const milestoneStyles = StyleSheet.create({
  badge: {
    flex: 1,
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.xs,
    minWidth: 72,
    position: "relative",
  },
  checkDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 24 },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 11, textAlign: "center" },
  threshold: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.textMuted, textAlign: "center" },
  bonus: { fontFamily: FONTS.bodySemiBold, fontSize: 10, color: COLORS.pink, textAlign: "center" },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.pink10,
    overflow: "hidden",
    marginTop: SPACING.xs,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.pink20,
    borderRadius: 2,
  },
});

function HistoryItem({ item }: { item: ReferralHistoryRow }) {
  const { t } = useTranslation();
  return (
    <View style={historyStyles.row}>
      <View style={historyStyles.icon}>
        <Feather name="user" size={14} color={COLORS.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={historyStyles.name} numberOfLines={1}>
          {item.referredMemberName ?? item.referredMemberEmail ?? item.code}
        </Text>
        <Text style={historyStyles.date}>
          {t("referral.referredOn", {
            date: new Date(item.createdAt).toLocaleDateString(),
          })}
        </Text>
      </View>
      <StatusPill status={item.status} />
    </View>
  );
}

const historyStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.amberPale,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.navy },
  date: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
});

export default function ReferralScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const router = useRouter();

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchReferralData();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const referralLink = data?.referralCode
    ? `https://healthplanfactory.com/?ref=${data.referralCode}`
    : null;

  const unusedCents = data?.creditSummary.unusedCreditsCents ?? 0;
  const rewardedCount = data?.rewardedCount ?? 0;

  const nextProgressPct = data?.nextMilestone
    ? Math.min((rewardedCount / data.nextMilestone.threshold) * 100, 100)
    : 0;
  const nextProgressWidth: DimensionValue = `${Math.round(nextProgressPct)}%`;

  async function handleCopy() {
    if (!referralLink) return;
    try {
      await Clipboard.setStringAsync(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(t("referral.copyFailed"), t("referral.copyFailedDesc"));
    }
  }

  async function handleShare() {
    if (!referralLink) return;
    try {
      await Share.share({
        message: `${t("referral.subtitle")}\n\n${referralLink}`,
        url: referralLink,
      });
    } catch {}
  }

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
          accessibilityLabel="Health Plan Factory"
        />
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.navy} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Header */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Feather name="gift" size={24} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{t("referral.title")}</Text>
              <Text style={styles.heroSub}>{t("referral.subtitle")}</Text>
            </View>
          </View>

          {/* Credit Balance */}
          {unusedCents > 0 && (
            <View style={styles.creditCard}>
              <View style={styles.creditIcon}>
                <Feather name="star" size={18} color={COLORS.sage} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.creditAmount}>
                  {t("referral.creditBalance", {
                    amount: data?.creditSummary.unusedCreditsFormatted,
                  })}
                </Text>
                <Text style={styles.creditNote}>{t("referral.creditsAppliedNote")}</Text>
              </View>
            </View>
          )}

          {/* Your referral link */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t("referral.yourLink")}</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="tail">
                {referralLink ?? "—"}
              </Text>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, copied && styles.btnSuccess]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Feather name={copied ? "check" : "copy"} size={14} color={COLORS.white} />
                <Text style={styles.btnPrimaryText}>
                  {copied ? t("referral.copied") : t("referral.copy")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnOutline]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={14} color={COLORS.navy} />
                <Text style={styles.btnOutlineText}>{t("referral.share")}</Text>
              </TouchableOpacity>
            </View>
            {data?.referralCode && (
              <Text style={styles.codeNote}>
                {t("referral.codeLabel")}{" "}
                <Text style={styles.codeText}>{data.referralCode}</Text>
              </Text>
            )}
          </View>

          {/* How it works */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t("referral.howItWorks")}</Text>
            {(
              [
                "howItWorksStep1",
                "howItWorksStep2",
                "howItWorksStep3",
              ] as const
            ).map((key, idx) => (
              <View key={key} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.stepText}>{t(`referral.${key}`)}</Text>
              </View>
            ))}
          </View>

          {/* Milestone Progress */}
          {(data?.milestones ?? []).length > 0 && (
            <View style={styles.card}>
              <View style={styles.sectionRow}>
                <Feather name="award" size={14} color={COLORS.navy} />
                <Text style={styles.sectionLabel}>{t("referral.milestones")}</Text>
              </View>
              {data?.nextMilestone && (
                <View style={styles.progressSection}>
                  <View style={styles.nextMilestoneRow}>
                    <Text style={styles.nextMilestoneLabel}>
                      {data.nextMilestone.emoji} {data.nextMilestone.label}
                    </Text>
                    <Text style={styles.progressCounter}>
                      {rewardedCount} / {data.nextMilestone.threshold}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressBar, { width: nextProgressWidth }]}
                    />
                  </View>
                </View>
              )}
              <View style={styles.milestonesRow}>
                {(data?.milestones ?? []).map((m) => (
                  <MilestoneBadge key={m.id} milestone={m} rewardedCount={rewardedCount} />
                ))}
              </View>
            </View>
          )}

          {/* Referral History */}
          <View style={styles.card}>
            <View style={styles.sectionRow}>
              <Feather name="users" size={14} color={COLORS.navy} />
              <Text style={styles.sectionLabel}>{t("referral.history")}</Text>
            </View>
            {!data?.referralHistory.length ? (
              <Text style={styles.emptyText}>{t("referral.noHistory")}</Text>
            ) : (
              <FlatList
                data={data.referralHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <HistoryItem item={item} />}
                scrollEnabled={false}
              />
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.md },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.white,
    marginBottom: 2,
  },
  heroSub: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },

  creditCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: "rgba(125,181,92,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(125,181,92,0.22)",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  creditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(125,181,92,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  creditAmount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: 2,
  },
  creditNote: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.navy,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  linkRow: {
    backgroundColor: COLORS.pink10,
    borderWidth: 1,
    borderColor: COLORS.pink20,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  linkText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.navy,
  },
  btnRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
  },
  btnPrimary: {
    backgroundColor: COLORS.navy,
    flex: 1,
    justifyContent: "center",
  },
  btnSuccess: {
    backgroundColor: COLORS.sage,
  },
  btnPrimaryText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  btnOutline: {
    backgroundColor: COLORS.off,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    justifyContent: "center",
  },
  btnOutlineText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.navy,
  },
  codeNote: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  codeText: {
    fontFamily: FONTS.mono,
    color: COLORS.navy,
    fontWeight: "600",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.white,
  },
  stepText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 20,
  },

  progressSection: {
    gap: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  nextMilestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextMilestoneLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.navy,
  },
  progressCounter: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pink10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.pink,
    borderRadius: 4,
  },
  milestonesRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },

  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: SPACING.sm,
  },
});
