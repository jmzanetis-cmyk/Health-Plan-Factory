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
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListProgress } from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";
import { setupNotifications } from "@/lib/notifications";
import * as Haptics from "expo-haptics";

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

type BuddyMessage = {
  id: string;
  sender: "buddy" | "me";
  text: string;
  time: string;
};

const BUDDY_MESSAGES: BuddyMessage[] = [
  { id: "1", sender: "buddy", text: "How did your acupuncture session go yesterday?", time: "Mon 9:12 AM" },
  { id: "2", sender: "me", text: "It was great! My neck pain is down a lot. Did you try the breathwork?", time: "Mon 10:30 AM" },
  { id: "3", sender: "buddy", text: "Yes! 5 days in a row now. Feeling clearer in the mornings.", time: "Mon 11:05 AM" },
  { id: "4", sender: "buddy", text: "Don't forget your check-in tonight — we're both at 6 days!", time: "Today 8:00 AM" },
];

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

function BuddyChat() {
  return (
    <View style={styles.buddyChatCard}>
      <View style={styles.buddyHeader}>
        <View style={styles.buddyAvatar}>
          <Text style={styles.buddyAvatarText}>A</Text>
        </View>
        <View>
          <Text style={styles.buddyName}>Alex — Accountability Buddy</Text>
          <Text style={styles.buddyStatus}>Active · 6-day streak</Text>
        </View>
      </View>
      <View style={styles.messageList}>
        {BUDDY_MESSAGES.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === "me" ? styles.bubbleMe : styles.bubbleBuddy,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.sender === "me" ? styles.messageTextMe : styles.messageTextBuddy,
              ]}
            >
              {msg.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                msg.sender === "me" && { textAlign: "right" },
              ]}
            >
              {msg.time}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.buddyFooter}>
        <Feather name="lock" size={12} color={COLORS.textMuted} />
        <Text style={styles.buddyFooterText}>
          Full buddy chat available with Plus subscription
        </Text>
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
      const granted = await setupNotifications({ streak, trialDaysLeft: 2 });
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
            <BuddyChat />
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
  buddyChatCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  buddyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.navy,
  },
  buddyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  buddyAvatarText: {
    fontFamily: FONTS.body,
    fontSize: 16,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  buddyName: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.white,
  },
  buddyStatus: { fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  messageList: { padding: SPACING.md, gap: SPACING.sm },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 4,
  },
  bubbleBuddy: { alignSelf: "flex-start", backgroundColor: COLORS.off },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: COLORS.navy },
  messageText: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 19 },
  messageTextBuddy: { color: COLORS.navy },
  messageTextMe: { color: COLORS.white },
  messageTime: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  buddyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.off,
  },
  buddyFooterText: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
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
