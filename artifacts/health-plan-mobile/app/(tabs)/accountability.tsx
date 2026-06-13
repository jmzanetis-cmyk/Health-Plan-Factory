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
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useListProgress, useGetCurrentAuthUser, partialQuery } from "@workspace/api-client-react";
import { PlusPaywall } from "@/components/PlusPaywall";
import { usePlusAccess } from "@/lib/subscription";
import { useAuth } from "@/lib/auth";
import { loadConnectionState, syncHealthData, type DailyHealthMetrics } from "@/lib/healthSync";
import type { ProgressLogRecord } from "@workspace/api-client-react";
import { Franco } from "@/components/workers";
import { useWorker } from "@/hooks/useWorker";

const COMMITS_STORAGE_KEY = "hpf_daily_commits";

interface CommitState {
  date: string;
  done: Record<string, boolean>;
}

interface CommitmentItem {
  id: string;
  nameKey: string;
  emoji: string;
}

const BASE_COMMITMENTS: CommitmentItem[] = [
  { id: "hydrate", nameKey: "accountability.commitments.hydrate", emoji: "💧" },
  { id: "move", nameKey: "accountability.commitments.move", emoji: "🏃" },
  { id: "sleep", nameKey: "accountability.commitments.sleep", emoji: "😴" },
  { id: "mindful", nameKey: "accountability.commitments.mindful", emoji: "🧘" },
  { id: "nourish", nameKey: "accountability.commitments.nourish", emoji: "🥗" },
  { id: "connect", nameKey: "accountability.commitments.connect", emoji: "🤝" },
];

const MACRO_GOALS = { protein: 120, carbs: 150, fat: 60 };
const MACROS_KEY_PREFIX = "hpf_macros_";
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://api.healthplanfactory.com";

interface Booking {
  id: string;
  modalityType: string;
  providerName: string;
  date: string;
  time: string;
}

function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function WeekCalendar({
  entries,
  weekDayLabels,
  todayLabel,
}: {
  entries: ProgressLogRecord[];
  weekDayLabels: string[];
  todayLabel: string;
}) {
  const weekDates = getWeekDates();
  const todayStr = new Date().toDateString();
  const entryDays = new Set(entries.map((e) => new Date(e.createdAt).toDateString()));

  return (
    <View style={styles.weekCal}>
      {weekDates.map((date, i) => {
        const isToday = date.toDateString() === todayStr;
        const hasEntry = entryDays.has(date.toDateString());
        const dayLabel = weekDayLabels[i] ?? ["M", "T", "W", "T", "F", "S", "S"][i];

        return (
          <View key={i} style={styles.weekDay}>
            <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelActive]}>
              {isToday ? todayLabel : dayLabel}
            </Text>
            <View
              style={[
                styles.weekDot,
                hasEntry && styles.weekDotFilled,
                isToday && !hasEntry && styles.weekDotToday,
              ]}
            >
              {hasEntry && <Feather name="check" size={10} color={COLORS.white} />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MonthlyHeatmap({
  entries,
  monthLabel,
}: {
  entries: ProgressLogRecord[];
  monthLabel: string;
}) {
  const { t } = useTranslation();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const entryDayNums = new Set(
    entries
      .filter((e) => {
        const d = new Date(e.createdAt);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      })
      .map((e) => new Date(e.createdAt).getDate())
  );

  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.heatmapContainer}>
      <Text style={styles.heatmapMonth}>{monthLabel}</Text>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.heatmapRow}>
          {row.map((day, ci) => (
            <View
              key={ci}
              style={[
                styles.heatmapCell,
                day !== null && entryDayNums.has(day) && styles.heatmapCellFilled,
                day === today.getDate() && styles.heatmapCellToday,
                day === null && styles.heatmapCellEmpty,
              ]}
            >
              {day ? (
                <Text style={[styles.heatmapDayNum, entryDayNums.has(day) && styles.heatmapDayNumFilled]}>
                  {day}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.heatmapLegend}>{t("accountability.journalDays", { count: entryDayNums.size })}</Text>
    </View>
  );
}

export default function AccountabilityScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { isPlus, loading: plusLoading } = usePlusAccess();
  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();

  const [commitState, setCommitState] = useState<CommitState>({
    date: new Date().toDateString(),
    done: {},
  });
  const [refreshing, setRefreshing] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState<DailyHealthMetrics | null>(null);
  const [healthConnected, setHealthConnected] = useState(false);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [macroEditing, setMacroEditing] = useState<"protein" | "carbs" | "fat" | null>(null);
  const [macroInput, setMacroInput] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const { data: progress, isLoading, refetch } = useListProgress(
    { profileId, limit: 90 },
    { query: partialQuery({ enabled: !!profileId }) }
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(COMMITS_STORAGE_KEY);
        if (!raw) return;
        const saved: CommitState = JSON.parse(raw);
        const todayStr = new Date().toDateString();
        if (saved.date === todayStr) {
          setCommitState(saved);
        } else {
          setCommitState({ date: todayStr, done: {} });
        }
      } catch {}
    })();
  }, []);

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

  useEffect(() => {
    (async () => {
      try {
        const todayKey = `${MACROS_KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
        const raw = await AsyncStorage.getItem(todayKey);
        if (raw) setMacros(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!profileId) return;
    setBookingsLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/members/bookings?status=upcoming`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        }
      } catch {
      } finally {
        setBookingsLoading(false);
      }
    })();
  }, [profileId, getToken]);

  if (plusLoading) return (
    <View style={{ flex: 1, backgroundColor: COLORS.warm, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={COLORS.amber} />
    </View>
  );
  if (!isPlus) return <PlusPaywall feature="accountability" />;

  async function addMacro(key: "protein" | "carbs" | "fat") {
    const val = parseInt(macroInput, 10);
    setMacroEditing(null);
    setMacroInput("");
    if (isNaN(val) || val <= 0) return;
    const next = { ...macros, [key]: macros[key] + val };
    setMacros(next);
    try {
      const todayKey = `${MACROS_KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
      await AsyncStorage.setItem(todayKey, JSON.stringify(next));
    } catch {}
  }

  async function toggleCommit(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommitState((prev) => {
      const next = {
        date: new Date().toDateString(),
        done: { ...prev.done, [id]: !prev.done[id] },
      };
      AsyncStorage.setItem(COMMITS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const { message: francoMessage, isLoading: francoLoading } = useWorker({
    worker: "franco",
    trigger: "track_view",
    autoFetch: true,
    cacheDuration: 600_000,
  });

  const entries = progress ?? [];
  const streak = calculateStreak(entries);
  const todayHasEntry = entries.some(
    (e) => new Date(e.createdAt).toDateString() === new Date().toDateString()
  );
  const weeklyCount = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;
  const doneCount = Object.values(commitState.done).filter(Boolean).length;

  const locale = i18n.language === "es" ? "es-MX" : "en-US";
  const monthLabel = new Date().toLocaleDateString(locale, { month: "long", year: "numeric" });

  const weekDayLabels = [
    t("accountability.weekdays.mon"),
    t("accountability.weekdays.tue"),
    t("accountability.weekdays.wed"),
    t("accountability.weekdays.thu"),
    t("accountability.weekdays.fri"),
    t("accountability.weekdays.sat"),
    t("accountability.weekdays.sun"),
  ];

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("accountability.title")}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
        }
      >
        <View style={styles.francoRow}>
          <Franco
            pose="clipboard"
            size={64}
            speechBubble={francoMessage ?? undefined}
            isTyping={francoLoading}
            bubblePosition="right"
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>{t("accountability.dayStreak")}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{weeklyCount}</Text>
            <Text style={styles.statLabel}>{t("accountability.thisWeek")}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{entries.length}</Text>
            <Text style={styles.statLabel}>{t("accountability.totalDays")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("accountability.weekOverview")}</Text>
          {isLoading ? (
            <ActivityIndicator color={COLORS.amber} style={{ padding: SPACING.lg }} />
          ) : (
            <WeekCalendar entries={entries} weekDayLabels={weekDayLabels} todayLabel={t("accountability.today")} />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("accountability.dailyCommitments")}</Text>
          <Text style={styles.sectionSub}>{t("accountability.dailyCommitmentsSub")}</Text>
          <View style={styles.commitCard}>
            {BASE_COMMITMENTS.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.commitRow,
                  idx < BASE_COMMITMENTS.length - 1 && styles.commitRowBorder,
                ]}
                onPress={() => toggleCommit(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.commitEmoji}>{item.emoji}</Text>
                <Text style={[styles.commitName, commitState.done[item.id] && styles.commitNameDone]}>
                  {t(item.nameKey as Parameters<typeof t>[0])}
                </Text>
                <View style={[styles.checkbox, commitState.done[item.id] && styles.checkboxDone]}>
                  {commitState.done[item.id] && <Feather name="check" size={12} color={COLORS.white} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {doneCount === BASE_COMMITMENTS.length && (
            <View style={styles.completedBanner}>
              <Feather name="award" size={16} color={COLORS.sage} />
              <Text style={styles.completedText}>{t("accountability.allDone")}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("accountability.monthlyCalendar")}</Text>
          {isLoading ? (
            <ActivityIndicator color={COLORS.amber} style={{ padding: SPACING.lg }} />
          ) : (
            <MonthlyHeatmap entries={entries} monthLabel={monthLabel} />
          )}
        </View>

        {!todayHasEntry && (
          <View style={styles.nudgeCard}>
            <Feather name="edit-3" size={18} color={COLORS.amber} />
            <Text style={styles.nudgeText}>{t("accountability.noEntryToday")}</Text>
          </View>
        )}

        {/* Steps Today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePink}>Steps Today</Text>
          <View style={styles.trackCard}>
            {Platform.OS === "web" || !healthConnected ? (
              <View style={styles.trackCardInner}>
                <Text style={styles.trackPlaceholder}>
                  {Platform.OS === "web"
                    ? "Step tracking is not available on web"
                    : "Connect Apple Health or Google Fit in Settings to see your steps"}
                </Text>
              </View>
            ) : (
              <View style={styles.trackCardInner}>
                <Text style={styles.stepsNumber}>
                  {healthMetrics?.steps != null ? healthMetrics.steps.toLocaleString() : "--"}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, ((healthMetrics?.steps ?? 0) / 10000) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.trackMuted}>Weekly average: --</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePink}>Daily Macros</Text>
          <View style={styles.trackCard}>
            {(["protein", "carbs", "fat"] as const).map((key, idx) => {
              const goal = MACRO_GOALS[key];
              const current = macros[key];
              const pct = Math.min(100, (current / goal) * 100);
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <View key={key} style={[styles.macroRow, idx < 2 && styles.macroRowBorder]}>
                  <Text style={styles.macroLabel}>{label}</Text>
                  <Text style={styles.macroAmount}>{current}g / {goal}g</Text>
                  <View style={styles.macroBar}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                  {macroEditing === key ? (
                    <View style={styles.macroEditArea}>
                      <TextInput
                        style={styles.macroInput}
                        value={macroInput}
                        onChangeText={setMacroInput}
                        keyboardType="numeric"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={() => addMacro(key)}
                        placeholder="0"
                        placeholderTextColor={COLORS.textLight}
                      />
                      <TouchableOpacity style={styles.macroAddBtn} onPress={() => addMacro(key)}>
                        <Text style={styles.macroAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.macroPlusBtn}
                      onPress={() => { setMacroEditing(key); setMacroInput(""); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.macroPlusBtnText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePink}>Upcoming Appointments</Text>
          {bookingsLoading ? (
            <ActivityIndicator color={COLORS.amber} style={{ padding: SPACING.lg }} />
          ) : bookings.length === 0 ? (
            <View style={styles.trackCard}>
              <View style={styles.trackCardInner}>
                <Text style={styles.apptEmpty}>No upcoming appointments</Text>
                <Text style={styles.trackMuted}>Book sessions through your wellness plan</Text>
                <TouchableOpacity
                  style={styles.apptPlanBtn}
                  onPress={() => router.push("/(tabs)/plan" as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.apptPlanBtnText}>View My Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.trackCard}>
              {bookings.map((b, idx) => (
                <View
                  key={b.id}
                  style={[styles.apptRow, idx < bookings.length - 1 && styles.apptRowBorder]}
                >
                  <Text style={styles.apptModality}>{b.modalityType}</Text>
                  <Text style={styles.trackMuted}>{b.providerName} · {b.date} · {b.time}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t("accountability.disclaimer")}</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  title: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.navy },
  scroll: { flex: 1 },
  francoRow: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: "flex-start",
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontFamily: FONTS.mono, fontSize: 26, color: COLORS.navy },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxl },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.navy, marginBottom: SPACING.xs },
  sectionSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md },
  weekCal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekDay: { alignItems: "center", gap: SPACING.sm },
  weekDayLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  weekDayLabelActive: { fontFamily: FONTS.bodySemiBold, color: COLORS.navy },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDotFilled: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  weekDotToday: { borderColor: COLORS.amber, borderWidth: 2 },
  commitCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
  },
  commitRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  commitEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  commitName: { fontFamily: FONTS.body, fontSize: 15, color: COLORS.navy, flex: 1 },
  commitNameDone: { textDecorationLine: "line-through", color: COLORS.textMuted },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.sagePale,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  completedText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: COLORS.sage },
  heatmapContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  heatmapMonth: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
    textTransform: "capitalize",
  },
  heatmapRow: { flexDirection: "row", gap: SPACING.xs },
  heatmapCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.off,
  },
  heatmapCellFilled: { backgroundColor: COLORS.sage },
  heatmapCellToday: { borderWidth: 2, borderColor: COLORS.amber },
  heatmapCellEmpty: { backgroundColor: "transparent" },
  heatmapDayNum: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.textMuted },
  heatmapDayNumFilled: { color: COLORS.white },
  heatmapLegend: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  nudgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.amberPale,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.amber + "22",
  },
  nudgeText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.amber,
    flex: 1,
    lineHeight: 18,
  },
  disclaimer: {
    marginHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disclaimerText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 16,
    textAlign: "center",
  },
  sectionTitlePink: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: "#e8306a",
    marginBottom: SPACING.md,
  },
  trackCard: {
    backgroundColor: "#fafaf8",
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trackCardInner: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  stepsNumber: {
    fontFamily: FONTS.mono,
    fontSize: 40,
    color: "#333",
    lineHeight: 44,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#e0ddd6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#e8306a",
    borderRadius: 3,
  },
  trackMuted: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#8496b0",
    marginTop: 2,
  },
  trackPlaceholder: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#8496b0",
    lineHeight: 20,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  macroRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  macroLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#333",
    width: 60,
  },
  macroAmount: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#8496b0",
    width: 80,
  },
  macroBar: {
    flex: 1,
  },
  macroEditArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroInput: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    width: 56,
    textAlign: "center",
  },
  macroAddBtn: {
    backgroundColor: "#e8306a",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  macroAddBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: "#fff",
  },
  macroPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e8306a",
    alignItems: "center",
    justifyContent: "center",
  },
  macroPlusBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 18,
    color: "#e8306a",
    lineHeight: 22,
  },
  apptEmpty: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: "#333",
    marginBottom: SPACING.xs,
  },
  apptRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 2,
  },
  apptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  apptModality: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#333",
  },
  apptPlanBtn: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e8306a",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  apptPlanBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: "#e8306a",
  },
});
