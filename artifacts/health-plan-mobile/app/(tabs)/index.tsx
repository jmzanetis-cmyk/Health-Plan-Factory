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
import { useAuth } from "@/lib/auth";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListProgress } from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";
import { setupNotifications, scheduleSessionReminder } from "@/lib/notifications";

const RING_SIZE = 140;
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const TRIAL_START = new Date("2026-03-01");
const TRIAL_DAYS = 30;

function getDaysLeftInTrial(): number {
  const end = new Date(TRIAL_START.getTime() + TRIAL_DAYS * 86400000);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return Math.max(0, diff);
}

function WellnessRing({ score }: { score: number }) {
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
        <Text style={styles.ringLabel}>Wellness Score</Text>
      </View>
    </View>
  );
}

interface RoutineItem {
  id: string;
  name: string;
  emoji: string;
  done: boolean;
}

const QUICK_ROUTINES: RoutineItem[] = [
  { id: "1", name: "Morning walk (20 min)", emoji: "🚶", done: false },
  { id: "2", name: "Hydration check", emoji: "💧", done: false },
  { id: "3", name: "Mindful breathing (5 min)", emoji: "🧘", done: false },
  { id: "4", name: "Evening wind-down", emoji: "🌙", done: false },
];

const UPCOMING_SESSIONS = [
  { id: "1", name: "Acupuncture", day: "Tomorrow", time: "10:00 AM", emoji: "🪡" },
  { id: "2", name: "Yoga Flow", day: "Thursday", time: "7:00 AM", emoji: "🧘" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const router = useRouter();

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const { data: progressData, isLoading: progressLoading, refetch } = useListProgress(
    { profileId, limit: 30 },
    { query: { enabled: !!profileId } }
  );

  const [routines, setRoutines] = useState<RoutineItem[]>(QUICK_ROUTINES);
  const [refreshing, setRefreshing] = useState(false);

  const entries = progressData ?? [];
  const streak = calculateStreak(entries);
  const wellnessScore = calculateWellnessScore(entries);
  const trialDaysLeft = getDaysLeftInTrial();
  const todayStr = new Date().toDateString();
  const hasEntryToday = entries.some(
    (e) => new Date(e.createdAt).toDateString() === todayStr
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      setupNotifications({ streak, trialDaysLeft, hasEntryToday });
    }
  }, [streak, trialDaysLeft, hasEntryToday]);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
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
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.badges}>
          {trialDaysLeft > 0 && trialDaysLeft <= 7 && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>{trialDaysLeft}d trial</Text>
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
          <WellnessRing score={wellnessScore} />
          <View style={styles.scoreMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{streak}</Text>
              <Text style={styles.metaLabel}>Day Streak</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{entries.length}</Text>
              <Text style={styles.metaLabel}>Journal Entries</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{doneCount}/{routines.length}</Text>
              <Text style={styles.metaLabel}>Today</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        <View style={styles.sessionsCard}>
          {UPCOMING_SESSIONS.map((session, idx) => {
            const sessionDate = new Date();
            sessionDate.setDate(sessionDate.getDate() + (session.day === "Tomorrow" ? 1 : 3));
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
                  idx < UPCOMING_SESSIONS.length - 1 && styles.sessionRowBorder,
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
        <Text style={styles.sectionTitle}>Today's Routine</Text>
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
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {streak >= 3 && (
        <View style={styles.streakCard}>
          <Feather name="award" size={20} color={COLORS.amber} />
          <View style={styles.streakCardText}>
            <Text style={styles.streakCardTitle}>{streak}-Day Streak!</Text>
            <Text style={styles.streakCardSub}>You're building a real habit. Keep it going.</Text>
          </View>
        </View>
      )}

      {doneCount === routines.length && doneCount > 0 && (
        <View style={styles.completedBanner}>
          <Feather name="check-circle" size={16} color={COLORS.sage} />
          <Text style={styles.completedText}>All routines complete for today!</Text>
        </View>
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Content is for general wellness purposes only and not medical advice. Consult your healthcare provider for medical decisions.
        </Text>
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

function calculateWellnessScore(entries: ProgressLogRecord[]): number {
  if (!entries.length) return 62;
  const recent = entries.slice(0, 7);
  const ratings = recent.map((e) => e.rating).filter((v): v is number => v != null);
  if (!ratings.length) return 62;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const ratingScore = (avg / 5) * 70;
  const streakBonus = Math.min(entries.length * 2, 20);
  return Math.round(ratingScore + streakBonus + 10);
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
});
