import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListProgress, useListModalities, partialQuery } from "@workspace/api-client-react";
import type { ProgressLogRecord, ModalityRecord } from "@workspace/api-client-react";
import { setupNotifications, scheduleSessionReminder } from "@/lib/notifications";
import { loadConnectionState, syncHealthData, type DailyHealthMetrics } from "@/lib/healthSync";

const RING_SIZE = 140;
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const TRIAL_DAYS = 30;

function getDaysLeftInTrial(createdAt?: string | null): number {
  const start = createdAt ? new Date(createdAt) : new Date("2026-03-01");
  const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

const MODALITY_EMOJIS: Record<string, string> = {
  acupuncture: "🪡", yoga: "🧘", meditation: "🧘", massage: "💆",
  "breathwork": "🌬️", "cold therapy": "🧊", "infrared sauna": "🌡️",
  "float therapy": "🌊", chiropractic: "🦴", nutrition: "🥗",
  naturopath: "🌿", "functional medicine": "🔬", herbalist: "🌱",
  osteopath: "⚕️", "sound healing": "🔔", reiki: "✋",
};

function buildUpcomingSessions(
  modalities: ModalityRecord[],
  entries: ProgressLogRecord[],
  tomorrowLabel: string,
  weekDays: string[]
): Array<{ id: string; name: string; day: string; time: string; emoji: string }> {
  const safeModalities = Array.isArray(modalities) ? modalities : [];
  if (!safeModalities.length) return [];

  const threeDaysAgo = Date.now() - 3 * 86400000;
  const recentModalityIds = new Set(
    entries
      .filter((e) => new Date(e.createdAt).getTime() > threeDaysAgo)
      .map((e) => e.modalityId)
      .filter(Boolean)
  );

  const prioritized = safeModalities.filter((m) => !recentModalityIds.has(m.id));
  const pool = prioritized.length >= 2 ? prioritized : safeModalities;
  const top = pool.slice(0, 2);

  const today = new Date();
  return top.map((m, i) => {
    const dayOffset = i + 1;
    const d = new Date(today.getTime() + dayOffset * 86400000);
    const dayName = dayOffset === 1 ? tomorrowLabel : weekDays[d.getDay()];
    const hour = 9 + i * 2;
    const timeStr = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
    const nameLower = m.name?.toLowerCase() ?? "";
    const emoji = Object.entries(MODALITY_EMOJIS).find(([k]) => nameLower.includes(k))?.[1] ?? "✨";
    return { id: m.id, name: m.name ?? "Session", day: dayName, time: timeStr, emoji };
  });
}

function WellnessRing({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = RING_CIRC * (1 - pct);
  const color = score >= 75 ? COLORS.sage : score >= 50 ? COLORS.amber : COLORS.rose;

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke={COLORS.navy20}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke={color}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${RING_CIRC}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2},${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Text style={[styles.ringScore, { color }]}>{score}</Text>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    </View>
  );
}

interface RoutineItem {
  id: string;
  nameKey: string;
  emoji: string;
  done: boolean;
}

const BASE_ROUTINES: RoutineItem[] = [
  { id: "1", nameKey: "home.routines.morningWalk", emoji: "🚶", done: false },
  { id: "2", nameKey: "home.routines.hydrationCheck", emoji: "💧", done: false },
  { id: "3", nameKey: "home.routines.mindfulBreathing", emoji: "🧘", done: false },
  { id: "4", nameKey: "home.routines.eveningWindDown", emoji: "🌙", done: false },
];


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const { data: progressData, isLoading: progressLoading, refetch } = useListProgress(
    { profileId, limit: 30 },
    { query: partialQuery({ enabled: !!profileId }) }
  );

  const { data: modalitiesData } = useListModalities(undefined, {
    query: partialQuery({ staleTime: 5 * 60 * 1000 }),
  });

  const [routines, setRoutines] = useState<RoutineItem[]>(BASE_ROUTINES);
  const [refreshing, setRefreshing] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<DailyHealthMetrics | null>(null);
  const [healthConnected, setHealthConnected] = useState(false);

  const entries = progressData ?? [];
  const modalities = modalitiesData ?? [];
  const streak = calculateStreak(entries);
  const wellnessScore = calculateWellnessScore(entries, healthMetrics);
  const trialDaysLeft = getDaysLeftInTrial(authData?.user?.createdAt);
  const todayStr = new Date().toDateString();
  const hasEntryToday = entries.some(
    (e) => new Date(e.createdAt).toDateString() === todayStr
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      setupNotifications({ streak, trialDaysLeft, hasEntryToday });
    }
  }, [streak, trialDaysLeft, hasEntryToday]);

  useEffect(() => {
    if (!profileId || Platform.OS === "web") return;
    (async () => {
      const state = await loadConnectionState(profileId);
      const connected = state.appleHealth || state.googleFit;
      setHealthConnected(connected);
      if (connected) {
        const metrics = await syncHealthData(profileId);
        if (metrics) setHealthMetrics(metrics);
      }
    })();
  }, [profileId]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    if (profileId && Platform.OS !== "web") {
      const state = await loadConnectionState(profileId);
      if (state.appleHealth || state.googleFit) {
        const metrics = await syncHealthData(profileId);
        if (metrics) setHealthMetrics(metrics);
      }
    }
    setRefreshing(false);
  }

  function toggleRoutine(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    );
  }

  const firstName = user?.firstName ?? authData?.user?.firstName ?? "there";
  const doneCount = routines.filter((r) => r.done).length;

  const locale = i18n.language === "es" ? "es-MX" : "en-US";
  const weekDays = [
    t("home.sunday") || "Sunday",
    t("home.monday") || "Monday",
    t("home.tuesday") || "Tuesday",
    t("home.wednesday") || "Wednesday",
    t("home.thursday") || "Thursday",
    t("home.friday") || "Friday",
    t("home.saturday") || "Saturday",
  ];
  const upcomingSessions = buildUpcomingSessions(Array.isArray(modalities) ? modalities : [], entries, t("home.tomorrow"), weekDays);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPad + SPACING.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t("home.greeting")}</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.badges}>
          {trialDaysLeft > 0 && trialDaysLeft <= 7 && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>{t("home.trialDays", { count: trialDaysLeft })}</Text>
            </View>
          )}
          <View style={styles.streakBadge}>
            <Feather name="zap" size={14} color={COLORS.amber} />
            <Text style={styles.streakText}>{streak}d</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={18} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {progressLoading ? (
        <View style={styles.loadingRing}>
          <ActivityIndicator color={COLORS.amber} />
        </View>
      ) : (
        <View style={styles.scoreSection}>
          <WellnessRing score={wellnessScore} label={t("home.wellnessScore")} />
          <View style={styles.scoreMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{streak}</Text>
              <Text style={styles.metaLabel}>{t("home.dayStreak")}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{entries.length}</Text>
              <Text style={styles.metaLabel}>{t("home.journalEntries")}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{doneCount}/{routines.length}</Text>
              <Text style={styles.metaLabel}>{t("home.today")}</Text>
            </View>
          </View>
        </View>
      )}

      {Platform.OS !== "web" && !healthConnected && (
        <TouchableOpacity
          style={styles.healthPromptCard}
          onPress={() => router.push("/health-connect" as never)}
          activeOpacity={0.8}
        >
          <View style={styles.healthPromptIcon}>
            <Feather name="activity" size={18} color={COLORS.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.healthPromptTitle}>{t("home.connectHealthApp")}</Text>
            <Text style={styles.healthPromptSub}>{t("home.autoSync")}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      )}

      {healthMetrics && (
        <View style={styles.healthMetricsCard}>
          <View style={styles.healthMetricsHeader}>
            <Feather name="activity" size={14} color={COLORS.sage} />
            <Text style={styles.healthMetricsTitle}>
              {t("home.todayFrom", { source: healthMetrics.source === "apple_health" ? "Apple Health" : "Google Fit" })}
            </Text>
          </View>
          <View style={styles.healthMetricsRow}>
            {healthMetrics.steps != null && (
              <View style={styles.healthMetricItem}>
                <Text style={styles.healthMetricValue}>{healthMetrics.steps.toLocaleString(locale)}</Text>
                <Text style={styles.healthMetricLabel}>{t("home.steps")}</Text>
              </View>
            )}
            {healthMetrics.sleepMinutes != null && (
              <View style={styles.healthMetricItem}>
                <Text style={styles.healthMetricValue}>{Math.round(healthMetrics.sleepMinutes / 60 * 10) / 10}h</Text>
                <Text style={styles.healthMetricLabel}>{t("home.sleep")}</Text>
              </View>
            )}
            {healthMetrics.activeMinutes != null && (
              <View style={styles.healthMetricItem}>
                <Text style={styles.healthMetricValue}>{healthMetrics.activeMinutes}m</Text>
                <Text style={styles.healthMetricLabel}>{t("home.active")}</Text>
              </View>
            )}
            {healthMetrics.mindfulnessMinutes != null && (
              <View style={styles.healthMetricItem}>
                <Text style={styles.healthMetricValue}>{healthMetrics.mindfulnessMinutes}m</Text>
                <Text style={styles.healthMetricLabel}>{t("home.mindful")}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("home.upcomingSessions")}</Text>
        <View style={styles.sessionsCard}>
          {upcomingSessions.length === 0 ? (
            <View style={styles.sessionRow}>
              <Feather name="calendar" size={20} color={COLORS.textMuted} />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{t("home.noSessionsScheduled")}</Text>
                <Text style={styles.sessionTime}>{t("home.visitPlanToAdd")}</Text>
              </View>
            </View>
          ) : upcomingSessions.map((session, idx) => {
            const sessionDate = new Date();
            const dayOffset = session.day === t("home.tomorrow") ? 1 : idx + 2;
            sessionDate.setDate(sessionDate.getDate() + dayOffset);
            const [hours, minutes] = session.time.split(/[: ]/);
            const isPM = session.time.includes("PM");
            sessionDate.setHours(
              (parseInt(hours) % 12) + (isPM ? 12 : 0),
              parseInt(minutes ?? "0"),
              0
            );
            return (
              <View
                key={session.id}
                style={[
                  styles.sessionRow,
                  idx < upcomingSessions.length - 1 && styles.sessionRowBorder,
                ]}
              >
                <Text style={styles.sessionEmoji}>{session.emoji}</Text>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{session.name}</Text>
                  <Text style={styles.sessionTime}>{session.day} · {session.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.remindBtn}
                  onPress={() => {
                    scheduleSessionReminder(session.name, sessionDate);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="bell" size={14} color={COLORS.amber} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("home.todaysRoutine")}</Text>
        <View style={styles.routineCard}>
          {routines.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.routineRow,
                idx < routines.length - 1 && styles.routineRowBorder,
              ]}
              onPress={() => toggleRoutine(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                {item.done && <Feather name="check" size={12} color={COLORS.white} />}
              </View>
              <Text style={[styles.routineName, item.done && styles.routineNameDone]}>
                {t(item.nameKey as Parameters<typeof t>[0])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {streak >= 3 && (
        <View style={styles.streakCard}>
          <Feather name="award" size={20} color={COLORS.amber} />
          <View style={styles.streakCardText}>
            <Text style={styles.streakCardTitle}>{t("home.streakTitle", { count: streak })}</Text>
            <Text style={styles.streakCardSub}>{t("home.streakSub")}</Text>
          </View>
        </View>
      )}

      {doneCount === routines.length && doneCount > 0 && (
        <View style={styles.completedBanner}>
          <Feather name="check-circle" size={16} color={COLORS.sage} />
          <Text style={styles.completedText}>{t("home.allRoutinesDone")}</Text>
        </View>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{t("home.disclaimer")}</Text>
      </View>
    </ScrollView>
  );
}

function calculateStreak(entries: ProgressLogRecord[]): number {
  if (!entries.length) return 0;
  const dates = entries
    .map((e) => new Date(e.createdAt).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(Date.now() - i * 86400000).toDateString();
    if (dates[i] === expected) streak++;
    else break;
  }
  return streak;
}

function calculateWellnessScore(entries: ProgressLogRecord[], health?: DailyHealthMetrics | null): number {
  if (!entries.length && !health) return 62;

  const recent = entries.slice(0, 7);
  const ratings = recent.map((e) => e.rating).filter((v): v is number => v != null);
  const baseRatingScore = ratings.length
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length / 5) * 60
    : 50;
  const streakBonus = Math.min(entries.length * 2, 15);

  let healthBonus = 0;
  if (health) {
    if (health.steps != null) {
      healthBonus += Math.min((health.steps / 10000) * 10, 10);
    }
    if (health.sleepMinutes != null) {
      const sleepHours = health.sleepMinutes / 60;
      const sleepScore = sleepHours >= 7 && sleepHours <= 9 ? 5 : sleepHours >= 6 ? 3 : 1;
      healthBonus += sleepScore;
    }
    if (health.activeMinutes != null) {
      healthBonus += Math.min((health.activeMinutes / 30) * 5, 5);
    }
    if (health.mindfulnessMinutes != null && health.mindfulnessMinutes > 0) {
      healthBonus += 5;
    }
  }

  return Math.min(100, Math.round(baseRatingScore + streakBonus + healthBonus + 10));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: 120 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xxl,
  },
  greeting: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  name: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.navy, marginTop: 2 },
  badges: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: 6 },
  trialBadge: {
    backgroundColor: COLORS.navy10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.navy20,
  },
  trialText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.navy,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.amberPale,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.amber10,
  },
  streakText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: COLORS.amber,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navy10,
  },
  loadingRing: { height: 180, justifyContent: "center", alignItems: "center" },
  scoreSection: { alignItems: "center", marginBottom: SPACING.xxl, gap: SPACING.xl },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: { position: "absolute", alignItems: "center" },
  ringScore: {
    fontFamily: FONTS.mono,
    fontSize: 38,
    lineHeight: 42,
  },
  ringLabel: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scoreMeta: { flexDirection: "row", gap: SPACING.xl, alignItems: "center" },
  metaItem: { alignItems: "center" },
  metaValue: {
    fontFamily: FONTS.mono,
    fontSize: 20,
    color: COLORS.navy,
  },
  metaLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  metaDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  section: { marginBottom: SPACING.xxl },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.navy,
    marginBottom: SPACING.md,
  },
  sessionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sessionRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sessionEmoji: { fontSize: 20 },
  sessionInfo: { flex: 1 },
  sessionName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  sessionTime: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  remindBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberPale,
    borderWidth: 1,
    borderColor: COLORS.amber10,
  },
  routineCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
  },
  routineRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  routineName: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.navy, flex: 1 },
  routineNameDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.amber10,
    marginBottom: SPACING.xxl,
  },
  streakCardText: { flex: 1 },
  streakCardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.amber,
  },
  streakCardSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.sagePale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  completedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.sage,
  },
  disclaimer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  disclaimerText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 16,
    textAlign: "center",
  },
  healthPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  healthPromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.amberPale,
    alignItems: "center",
    justifyContent: "center",
  },
  healthPromptTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  healthPromptSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  healthMetricsCard: {
    backgroundColor: COLORS.sagePale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.sage + "33",
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  healthMetricsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  healthMetricsTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.sage,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  healthMetricsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  healthMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  healthMetricValue: {
    fontFamily: FONTS.mono,
    fontSize: 18,
    color: COLORS.navy,
  },
  healthMetricLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
