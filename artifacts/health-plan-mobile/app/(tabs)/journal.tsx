import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import {
  useListProgress,
  useListModalities,
  useGetCurrentAuthUser,
  useCreateProgressLog,
  partialQuery,
} from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";

type ExtProgressLog = ProgressLogRecord & { energy?: number | null; mood?: number | null; pain?: number | null };

const DEFAULT_ACTIVITIES = [
  "Movement",
  "Meditation",
  "Stretching",
  "Nutrition",
  "Sleep routine",
  "Breathwork",
];

const PAIN_OPTIONS = [
  { label: "None", value: 1 },
  { label: "Mild", value: 5 },
  { label: "Significant", value: 9 },
];

function scaleToTen(v: number | null): number | undefined {
  if (v === null) return undefined;
  return v * 2;
}

function todayDateString() {
  return new Date().toDateString();
}

function parseActivitiesFromNote(note: string | null | undefined): string {
  if (!note) return "";
  const m = note.match(/Activities: ([^|]+)/);
  return m ? m[1].trim() : "";
}

function ScaleButtons({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          style={[styles.scaleBtn, value === n && styles.scaleBtnSelected]}
          onPress={() => onChange(n)}
          activeOpacity={0.7}
        >
          <Text style={[styles.scaleBtnText, value === n && styles.scaleBtnTextSelected]}>
            {n}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CheckInQuestion({
  label,
  sublabelMin,
  sublabelMax,
  children,
}: {
  label: string;
  sublabelMin?: string;
  sublabelMax?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.questionLabel}>{label}</Text>
      {children}
      {(sublabelMin || sublabelMax) && (
        <View style={styles.sublabelRow}>
          <Text style={styles.sublabel}>{sublabelMin}</Text>
          <Text style={styles.sublabel}>{sublabelMax}</Text>
        </View>
      )}
    </View>
  );
}

function SummaryCard({ entry }: { entry: ExtProgressLog }) {
  const activitiesText = parseActivitiesFromNote(entry.note);
  const noteMatch = entry.note?.match(/Note: (.+)$/);
  const noteText = noteMatch ? noteMatch[1].trim() : "";

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Check-in complete for today</Text>
      <View style={styles.summaryRows}>
        {entry.energy != null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Energy</Text>
            <Text style={styles.summaryValue}>{entry.energy / 2}/5</Text>
          </View>
        )}
        {entry.mood != null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mood</Text>
            <Text style={styles.summaryValue}>{entry.mood / 2}/5</Text>
          </View>
        )}
        {entry.rating != null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sleep</Text>
            <Text style={styles.summaryValue}>{entry.rating / 2}/5</Text>
          </View>
        )}
        {entry.pain != null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pain</Text>
            <Text style={styles.summaryValue}>
              {entry.pain <= 2 ? "None" : entry.pain <= 6 ? "Mild" : "Significant"}
            </Text>
          </View>
        )}
        {activitiesText ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Activities</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: "right" }]}>{activitiesText}</Text>
          </View>
        ) : null}
        {noteText ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Note</Text>
            <Text style={[styles.summaryValue, { flex: 1, textAlign: "right" }]}>{noteText}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.summaryFooter}>Come back tomorrow</Text>
    </View>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const {
    data: progressData,
    isLoading: progressLoading,
    refetch,
  } = useListProgress(
    { profileId, limit: 10 },
    { query: partialQuery({ enabled: !!profileId }) }
  );

  const { data: modalitiesData } = useListModalities(undefined, {
    query: partialQuery({ staleTime: 300_000 }),
  });

  const { mutate: createLog, isPending: saving } = useCreateProgressLog();

  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [painValue, setPainValue] = useState<number | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState("");

  const progress = Array.isArray(progressData) ? progressData : [];
  const modalities = Array.isArray(modalitiesData) ? modalitiesData : [];

  const todayEntry = progress.find(
    (e) => new Date(e.createdAt).toDateString() === todayDateString()
  );

  const activityOptions =
    modalities.length > 0
      ? modalities.slice(0, 12).map((m) => m.name).filter(Boolean) as string[]
      : DEFAULT_ACTIVITIES;

  function toggleActivity(name: string) {
    setActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  const canSubmit =
    energy !== null && mood !== null && sleep !== null && painValue !== null;

  function handleSubmit() {
    if (!canSubmit || !profileId || saving) return;

    const noteParts: string[] = [];
    if (activities.length > 0) {
      noteParts.push(`Activities: ${activities.join(", ")}`);
    }
    if (quickNote.trim()) {
      noteParts.push(`Note: ${quickNote.trim()}`);
    }

    createLog(
      {
        data: {
          profileId,
          energy: scaleToTen(energy),
          mood: scaleToTen(mood),
          rating: scaleToTen(sleep),
          pain: painValue ?? undefined,
          note: noteParts.length > 0 ? noteParts.join(" | ") : undefined,
          sessionDate: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const recentEntries = progress.slice(0, 7);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPad + SPACING.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
      }
    >
      <Text style={styles.title}>Journal</Text>

      {progressLoading ? (
        <ActivityIndicator color={COLORS.amber} style={{ marginTop: SPACING.xl }} />
      ) : todayEntry ? (
        <SummaryCard entry={todayEntry} />
      ) : (
        <>
          <CheckInQuestion
            label="How is your energy today?"
            sublabelMin="Drained"
            sublabelMax="Energized"
          >
            <ScaleButtons value={energy} onChange={setEnergy} />
          </CheckInQuestion>

          <CheckInQuestion
            label="How are you feeling overall?"
            sublabelMin="Struggling"
            sublabelMax="Great"
          >
            <ScaleButtons value={mood} onChange={setMood} />
          </CheckInQuestion>

          <CheckInQuestion
            label="How did you sleep last night?"
            sublabelMin="Terrible"
            sublabelMax="Amazing"
          >
            <ScaleButtons value={sleep} onChange={setSleep} />
          </CheckInQuestion>

          <CheckInQuestion label="Any pain or physical discomfort today?">
            <View style={styles.painRow}>
              {PAIN_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.painBtn,
                    painValue === opt.value && styles.painBtnSelected,
                  ]}
                  onPress={() => setPainValue(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.painBtnText,
                      painValue === opt.value && styles.painBtnTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CheckInQuestion>

          <CheckInQuestion label="What did you work on today?">
            <View style={styles.chipsWrap}>
              {activityOptions.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.chip,
                    activities.includes(name) && styles.chipSelected,
                  ]}
                  onPress={() => toggleActivity(name)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      activities.includes(name) && styles.chipTextSelected,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </CheckInQuestion>

          <CheckInQuestion label="Anything to note? (optional)">
            <TextInput
              style={styles.noteInput}
              value={quickNote}
              onChangeText={setQuickNote}
              placeholder="One word or a quick thought..."
              placeholderTextColor={COLORS.textLight}
              maxLength={120}
              returnKeyType="done"
            />
          </CheckInQuestion>

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || saving) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Save Check-In</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {recentEntries.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Check-ins</Text>
          <View style={styles.historyCard}>
            {recentEntries.map((entry, idx) => {
              const ext = entry as ExtProgressLog;
              const dateLabel = new Date(entry.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              const acts = parseActivitiesFromNote(entry.note);
              return (
                <View
                  key={entry.id}
                  style={[
                    styles.historyRow,
                    idx < recentEntries.length - 1 && styles.historyRowBorder,
                  ]}
                >
                  <Text style={styles.historyDate}>{dateLabel}</Text>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyScores}>
                      {[
                        ext.energy != null ? `Energy ${ext.energy / 2}` : null,
                        ext.mood != null ? `Mood ${ext.mood / 2}` : null,
                        entry.rating != null ? `Sleep ${entry.rating / 2}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                    {acts ? (
                      <Text style={styles.historyActivities} numberOfLines={1}>
                        {acts}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: COLORS.navy,
    marginBottom: SPACING.xl,
  },
  question: {
    marginBottom: SPACING.xl,
  },
  questionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: "#e8306a",
    marginBottom: SPACING.md,
  },
  scaleRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  scaleBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  scaleBtnSelected: {
    borderColor: "#e8306a",
    backgroundColor: "#e8306a",
  },
  scaleBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.navy,
  },
  scaleBtnTextSelected: { color: "#fff" },
  sublabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  sublabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  painRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  painBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  painBtnSelected: {
    borderColor: "#1b2d4f",
    backgroundColor: "#1b2d4f",
  },
  painBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  painBtnTextSelected: { color: "#fff" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: "#1b2d4f",
    backgroundColor: "#1b2d4f",
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.navy,
  },
  chipTextSelected: { color: "#fff" },
  noteInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: "#e8306a",
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.xs,
    marginBottom: SPACING.xxl,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: "#fff",
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  summaryTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: "#e8306a",
  },
  summaryRows: { gap: SPACING.sm },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  summaryLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#8496b0",
  },
  summaryValue: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#333",
  },
  summaryFooter: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xs,
  },
  historySection: { marginBottom: SPACING.xxl },
  historyTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: "#e8306a",
    marginBottom: SPACING.md,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyDate: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: "#333",
    width: 52,
  },
  historyMeta: { flex: 1 },
  historyScores: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: "#333",
  },
  historyActivities: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "#8496b0",
    marginTop: 2,
  },
});
