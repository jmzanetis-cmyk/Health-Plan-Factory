import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListProgress } from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";
import { setupNotifications } from "@/lib/notifications";

const WEEKLY_GOALS = [
  { id: "g1", label: "Complete 3 journal entries", icon: "book", target: 3 },
  { id: "g2", label: "Practice 2 plan modalities", icon: "activity", target: 2 },
  { id: "g3", label: "Maintain 7-day streak", icon: "zap", target: 7 },
];

function GoalProgress({ label, icon, current, target }: {
  label: string;
  icon: string;
  current: number;
  target: number;
}) {
  const pct = Math.min(1, current / target);
  const done = current >= target;

  return (
    <View style={styles.goalRow}>
      <View style={[styles.goalIcon, done && styles.goalIconDone]}>
        <Feather name={icon as any} size={16} color={done ? COLORS.white : COLORS.navy} />
      </View>
      <View style={styles.goalBody}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>{label}</Text>
          <Text style={[styles.goalCount, done && styles.goalCountDone]}>
            {current}/{target}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct * 100}%` as any,
                backgroundColor: done ? COLORS.sage : COLORS.amber,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function CheckInCard({
  entries,
  streak,
}: {
  entries: ProgressLogRecord[];
  streak: number;
}) {
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  const dayDots = weekDays.map((_, idx) => {
    const day = new Date(today);
    const diff = today.getDay() - idx;
    day.setDate(today.getDate() - diff);
    const dayStr = day.toDateString();
    const hasEntry = entries.some(
      (e) => new Date(e.createdAt).toDateString() === dayStr
    );
    const isToday = day.toDateString() === today.toDateString();
    return { label: weekDays[idx], hasEntry, isToday };
  });

  return (
    <View style={styles.checkInCard}>
      <View style={styles.checkInHeader}>
        <Text style={styles.checkInTitle}>This Week</Text>
        <View style={styles.streakPill}>
          <Feather name="zap" size={12} color={COLORS.amber} />
          <Text style={styles.streakPillText}>{streak} day streak</Text>
        </View>
      </View>
      <View style={styles.dotRow}>
        {dayDots.map((d, idx) => (
          <View key={idx} style={styles.dotCol}>
            <View
              style={[
                styles.dayDot,
                d.hasEntry && styles.dayDotFilled,
                d.isToday && !d.hasEntry && styles.dayDotToday,
              ]}
            >
              {d.hasEntry && <Feather name="check" size={10} color={COLORS.white} />}
            </View>
            <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>
              {d.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AccountabilityScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const { data: progressData, isLoading, refetch } = useListProgress(
    { profileId, limit: 50 },
    { query: { enabled: !!profileId } }
  );

  const entries = progressData ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function toggleReminders(val: boolean) {
    setRemindersOn(val);
    if (val) {
      const granted = await setupNotifications();
      if (!granted) setRemindersOn(false);
    }
  }

  function calculateStreak(logs: ProgressLogRecord[]): number {
    if (!logs.length) return 0;
    const dates = logs
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

  const streak = calculateStreak(entries);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekEntries = entries.filter(
    (e) => new Date(e.createdAt) >= weekStart
  );
  const uniqueDaysThisWeek = new Set(
    thisWeekEntries.map((e) => new Date(e.createdAt).toDateString())
  ).size;
  const modalitiesThisWeek = new Set(
    thisWeekEntries.filter((e) => e.modalityId).map((e) => e.modalityId)
  ).size;

  const goalProgress = [
    { id: "g1", label: "Journal entries", icon: "book", target: 3, current: uniqueDaysThisWeek },
    { id: "g2", label: "Modalities practiced", icon: "activity", target: 2, current: modalitiesThisWeek },
    { id: "g3", label: "Day streak", icon: "zap", target: 7, current: streak },
  ];

  const avgRating = entries.length
    ? entries
        .slice(0, 14)
        .filter((e) => e.rating != null)
        .reduce((acc, e, _, arr) => acc + (e.rating ?? 0) / arr.length, 0)
    : 0;

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Accountability</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
        >
          <CheckInCard entries={entries} streak={streak} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Goals</Text>
            <View style={styles.goalsCard}>
              {goalProgress.map((g) => (
                <GoalProgress
                  key={g.id}
                  label={g.label}
                  icon={g.icon}
                  current={g.current}
                  target={g.target}
                />
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{entries.length}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgRating > 0 ? avgRating.toFixed(1) : "—"}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            <View style={styles.reminderCard}>
              <View style={styles.reminderRow}>
                <View style={styles.reminderIcon}>
                  <Feather name="bell" size={16} color={COLORS.amber} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>Daily Check-In</Text>
                  <Text style={styles.reminderSub}>Every evening at 8:00 PM</Text>
                </View>
                <Switch
                  value={remindersOn}
                  onValueChange={toggleReminders}
                  trackColor={{ true: COLORS.amber, false: COLORS.border }}
                  thumbColor={COLORS.white}
                />
              </View>
              <View style={[styles.reminderRow, { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                <View style={styles.reminderIcon}>
                  <Feather name="calendar" size={16} color={COLORS.navy} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>Weekly Plan Review</Text>
                  <Text style={styles.reminderSub}>Every Monday at 9:00 AM</Text>
                </View>
                <Switch
                  value={remindersOn}
                  onValueChange={toggleReminders}
                  trackColor={{ true: COLORS.amber, false: COLORS.border }}
                  thumbColor={COLORS.white}
                />
              </View>
            </View>
          </View>

          {entries.length === 0 && (
            <View style={styles.emptyHint}>
              <Feather name="info" size={16} color={COLORS.textMuted} />
              <Text style={styles.emptyHintText}>
                Log your first journal entry to start tracking accountability.
              </Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: { fontFamily: "serif", fontSize: 28, color: COLORS.navy },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
  checkInCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  checkInHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  checkInTitle: {
    fontFamily: "serif",
    fontSize: 18,
    color: COLORS.white,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  streakPillText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "600" as const,
    color: COLORS.amber,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dotCol: { alignItems: "center", gap: 6 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dayDotFilled: { backgroundColor: COLORS.sage },
  dayDotToday: {
    borderWidth: 2,
    borderColor: COLORS.amber,
    backgroundColor: "transparent",
  },
  dayLabel: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  dayLabelToday: { color: COLORS.amber, fontWeight: "600" as const },
  section: {},
  sectionTitle: {
    fontFamily: "serif",
    fontSize: 20,
    color: COLORS.navy,
    marginBottom: SPACING.md,
  },
  goalsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.lg,
  },
  goalRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navy10,
  },
  goalIconDone: { backgroundColor: COLORS.sage },
  goalBody: { flex: 1 },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  goalLabel: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: "500" as const,
  },
  goalCount: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600" as const,
  },
  goalCountDone: { color: COLORS.sage },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: RADIUS.full },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  statValue: {
    fontFamily: "sans-serif",
    fontSize: 22,
    fontWeight: "700" as const,
    color: COLORS.navy,
  },
  statLabel: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  reminderCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.amberPale,
  },
  reminderInfo: { flex: 1 },
  reminderTitle: {
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  reminderSub: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: COLORS.navy10,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  emptyHintText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.navy,
    flex: 1,
    lineHeight: 18,
  },
});
