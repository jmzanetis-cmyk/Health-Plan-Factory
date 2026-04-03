import React, { useState, useEffect, useRef } from "react";
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
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListProgress } from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";
import { setupNotifications } from "@/lib/notifications";
import * as Haptics from "expo-haptics";
import { MilestoneShareModal, type MilestoneType } from "@/components/MilestoneShareModal";
import { getApiBaseUrl } from "@/lib/apiBase";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface GoalItem {
  id: string;
  label: string;
  icon: FeatherIconName;
  target: number;
  current: number;
}

const DAILY_COMMITMENTS = [
  { id: "c1", label: "Take medications / supplements", icon: "package" as FeatherIconName },
  { id: "c2", label: "Drink 8 glasses of water", icon: "droplet" as FeatherIconName },
  { id: "c3", label: "10 min mindful movement", icon: "activity" as FeatherIconName },
  { id: "c4", label: "Log today's journal entry", icon: "book" as FeatherIconName },
  { id: "c5", label: "2 min breathing exercise", icon: "wind" as FeatherIconName },
];

const TRIAL_DAYS = 30;

function getDaysLeftInTrial(createdAt?: string | null): number {
  const start = createdAt ? new Date(createdAt) : new Date("2026-03-01");
  const end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}


function GoalProgress({ label, icon, current, target }: GoalItem) {
  const pct = Math.min(1, target > 0 ? current / target : 0);
  const done = current >= target;

  return (
    <View style={styles.goalRow}>
      <View style={[styles.goalIcon, done && styles.goalIconDone]}>
        <Feather name={icon} size={16} color={done ? COLORS.white : COLORS.navy} />
      </View>
      <View style={styles.goalBody}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>{label}</Text>
          <Text style={[styles.goalCount, done && styles.goalCountDone]}>
            {current}/{target}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: pct, backgroundColor: done ? COLORS.sage : COLORS.amber }]} />
          <View style={{ flex: 1 - pct }} />
        </View>
      </View>
    </View>
  );
}

function DailyCommitmentList() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <View style={styles.goalsCard}>
      <View style={styles.commitHeader}>
        <Text style={styles.commitTitle}>Today's Commitments</Text>
        <Text style={styles.commitCount}>{doneCount}/{DAILY_COMMITMENTS.length}</Text>
      </View>
      {DAILY_COMMITMENTS.map((item, idx) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.commitRow,
            idx < DAILY_COMMITMENTS.length - 1 && styles.commitRowBorder,
          ]}
          onPress={() => toggle(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked[item.id] && styles.checkboxDone]}>
            {checked[item.id] && <Feather name="check" size={12} color={COLORS.white} />}
          </View>
          <Feather name={item.icon} size={15} color={checked[item.id] ? COLORS.textLight : COLORS.navy} />
          <Text style={[styles.commitLabel, checked[item.id] && styles.commitLabelDone]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function BuddyCheckInComingSoon() {
  return (
    <View style={styles.buddyComingSoonCard}>
      <View style={styles.buddyComingSoonIconWrap}>
        <Feather name="users" size={28} color={COLORS.navy} />
      </View>
      <Text style={styles.buddyComingSoonTitle}>Wellness Buddy Matching</Text>
      <Text style={styles.buddyComingSoonBody}>
        Get paired with an accountability buddy who shares your wellness goals.
        Check in together, celebrate streaks, and stay motivated as a team.
      </Text>
      <View style={styles.buddyComingSoonPill}>
        <Feather name="clock" size={12} color={COLORS.amber} />
        <Text style={styles.buddyComingSoonPillText}>Coming soon</Text>
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
  const weekDayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  const dayDots = weekDayLabels.map((_, idx) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (today.getDay() - idx));
    const dayStr = day.toDateString();
    const hasEntry = entries.some(
      (e) => new Date(e.createdAt).toDateString() === dayStr
    );
    const isToday = day.toDateString() === today.toDateString();
    return { label: weekDayLabels[idx], hasEntry, isToday };
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

const STREAK_MILESTONES: Array<{ streak: number; type: MilestoneType }> = [
  { streak: 3, type: "streak_3" },
  { streak: 7, type: "streak_7" },
  { streak: 14, type: "streak_14" },
  { streak: 30, type: "streak_30" },
];

const MILESTONE_STORAGE_KEY = "hpf_shown_milestones";

function getShownMilestones(): Set<string> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(MILESTONE_STORAGE_KEY) : null;
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function markMilestoneShown(key: string) {
  try {
    const shown = getShownMilestones();
    shown.add(key);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify([...shown]));
    }
  } catch {}
}

export default function AccountabilityScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const [remindersOn, setRemindersOn] = useState(false);

  // Milestone share modal state
  const [activeMilestone, setActiveMilestone] = useState<MilestoneType | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const prevStreakRef = useRef<number | null>(null);

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Fetch referral code for share card attribution
  useEffect(() => {
    if (!profileId) return;
    const base = getApiBaseUrl();
    import("expo-secure-store").then(async (SecureStore) => {
      const token = await SecureStore.getItemAsync("auth_session_token");
      const res = await fetch(`${base}/api/referrals/mine`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.referralCode) setReferralCode(data.referralCode);
      }
    }).catch(() => {});
  }, [profileId]);

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

  const trialDaysLeft = getDaysLeftInTrial(authData?.user?.createdAt);

  async function toggleReminders(val: boolean) {
    setRemindersOn(val);
    if (val) {
      const granted = await setupNotifications({ streak, trialDaysLeft });
      if (!granted) setRemindersOn(false);
    }
  }

  function calculateStreak(logs: ProgressLogRecord[]): number {
    if (!logs.length) return 0;
    const dates = logs
      .map((e) => new Date(e.createdAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let s = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === new Date(Date.now() - i * 86400000).toDateString()) s++;
      else break;
    }
    return s;
  }

  const streak = calculateStreak(entries);

  // Detect streak milestones and show share modal
  useEffect(() => {
    if (prevStreakRef.current === null) {
      prevStreakRef.current = streak;
      return;
    }
    const prev = prevStreakRef.current;
    prevStreakRef.current = streak;

    // Check if we just crossed a milestone
    for (const { streak: target, type } of STREAK_MILESTONES) {
      if (prev < target && streak >= target) {
        const milestoneKey = `${profileId}_${type}`;
        const shown = getShownMilestones();
        if (!shown.has(milestoneKey)) {
          markMilestoneShown(milestoneKey);
          setActiveMilestone(type);
          setShowMilestoneModal(true);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
        break;
      }
    }
  }, [streak, profileId]);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekEntries = entries.filter((e) => new Date(e.createdAt) >= weekStart);
  const uniqueDaysThisWeek = new Set(thisWeekEntries.map((e) => new Date(e.createdAt).toDateString())).size;
  const modalitiesThisWeek = new Set(thisWeekEntries.filter((e) => e.modalityId).map((e) => e.modalityId)).size;

  const goalProgress: GoalItem[] = [
    { id: "g1", label: "Journal entries this week", icon: "book", target: 3, current: uniqueDaysThisWeek },
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

      {/* Milestone share modal */}
      <MilestoneShareModal
        visible={showMilestoneModal}
        milestone={activeMilestone}
        referralCode={referralCode}
        onClose={() => setShowMilestoneModal(false)}
      />

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

          <DailyCommitmentList />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Goals</Text>
            <View style={styles.goalsCard}>
              {goalProgress.map((g) => (
                <GoalProgress key={g.id} {...g} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buddy Check-In</Text>
            <BuddyCheckInComingSoon />
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
              <View style={[styles.reminderRow, styles.reminderRowBorder]}>
                <View style={styles.reminderIcon}>
                  <Feather name="calendar" size={16} color={COLORS.navy} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>Streak at Risk</Text>
                  <Text style={styles.reminderSub}>9:30 PM if no entry logged</Text>
                </View>
                <Switch
                  value={remindersOn}
                  onValueChange={toggleReminders}
                  trackColor={{ true: COLORS.amber, false: COLORS.border }}
                  thumbColor={COLORS.white}
                />
              </View>
              <View style={[styles.reminderRow, styles.reminderRowBorder]}>
                <View style={styles.reminderIcon}>
                  <Feather name="users" size={16} color={COLORS.sage} />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>Buddy Check-In</Text>
                  <Text style={styles.reminderSub}>Every Thursday at 6:00 PM</Text>
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

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  title: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.navy },
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
  checkInTitle: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.white },
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
    fontFamily: FONTS.body,
    fontSize: 12,
    fontWeight: "600" as const,
    color: COLORS.amber,
  },
  dotRow: { flexDirection: "row", justifyContent: "space-between" },
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
  dayDotToday: { borderWidth: 2, borderColor: COLORS.amber, backgroundColor: "transparent" },
  dayLabel: { fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.5)" },
  dayLabelToday: { color: COLORS.amber, fontWeight: "600" as const },
  statsRow: { flexDirection: "row", gap: SPACING.sm },
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
    fontFamily: FONTS.body,
    fontSize: 22,
    fontWeight: "700" as const,
    color: COLORS.navy,
  },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
  section: {},
  sectionTitle: {
    fontFamily: FONTS.heading,
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
  commitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  commitTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.navy,
    fontWeight: "600" as const,
  },
  commitCount: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600" as const,
  },
  commitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  commitRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
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
  commitLabel: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.navy, flex: 1 },
  commitLabelDone: { color: COLORS.textLight, textDecorationLine: "line-through" },
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
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: "500" as const,
  },
  goalCount: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600" as const,
  },
  goalCountDone: { color: COLORS.sage },
  progressTrack: {
    height: 6,
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  progressFill: { borderRadius: RADIUS.full },
  buddyComingSoonCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
  },
  buddyComingSoonIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  buddyComingSoonTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.navy,
    textAlign: "center",
  },
  buddyComingSoonBody: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  buddyComingSoonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  buddyComingSoonPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: COLORS.amber,
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
  reminderRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
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
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  reminderSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
