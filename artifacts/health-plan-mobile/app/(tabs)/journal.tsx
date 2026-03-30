import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import {
  useListProgress,
  useCreateProgressLog,
  useGetCurrentAuthUser,
  useListModalities,
} from "@workspace/api-client-react";
import type { ProgressLogRecord } from "@workspace/api-client-react";

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

const RATING_LABELS = ["", "Rough", "Low", "Okay", "Good", "Great"];
const RATING_ICONS = ["", "😣", "😕", "😐", "🙂", "😄"];
const SLEEP_OPTIONS = ["< 5h", "5-6h", "6-7h", "7-8h", "8-9h", "9h+"];

function MiniInsightChart({ entries }: { entries: ProgressLogRecord[] }) {
  const recent = [...entries].slice(0, 10).reverse();
  if (recent.length < 2) return null;
  const maxH = 48;
  const w = 28;

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>Rating Trend</Text>
      <View style={chartStyles.bars}>
        {recent.map((e, i) => {
          const val = e.rating ?? 0;
          const h = val > 0 ? (val / 5) * maxH : 4;
          const color = val >= 4 ? COLORS.sage : val >= 3 ? COLORS.amber : COLORS.rose;
          return (
            <View key={e.id} style={chartStyles.barCol}>
              <View style={[chartStyles.bar, { height: h, backgroundColor: color }]} />
              <Text style={chartStyles.barLabel}>{RATING_ICONS[val] ?? "·"}</Text>
            </View>
          );
        })}
      </View>
      <View style={chartStyles.legend}>
        <View style={[chartStyles.dot, { backgroundColor: COLORS.sage }]} />
        <Text style={chartStyles.legendText}>Great/Good</Text>
        <View style={[chartStyles.dot, { backgroundColor: COLORS.amber }]} />
        <Text style={chartStyles.legendText}>Okay</Text>
        <View style={[chartStyles.dot, { backgroundColor: COLORS.rose }]} />
        <Text style={chartStyles.legendText}>Low/Rough</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: "serif",
    fontSize: 14,
    color: COLORS.navy,
    marginBottom: SPACING.md,
    fontWeight: "600" as const,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 60,
  },
  barCol: { alignItems: "center", gap: 4 },
  bar: { width: 20, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 12 },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    flexWrap: "wrap",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "sans-serif", fontSize: 11, color: COLORS.textMuted },
});

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const [rating, setRating] = useState(3);
  const [sleepIdx, setSleepIdx] = useState(3);
  const [note, setNote] = useState("");
  const [selectedModalityId, setSelectedModalityId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: progress, isLoading, refetch } = useListProgress(
    { profileId, limit: 50 },
    { query: { enabled: !!profileId } }
  );

  const { data: modalities } = useListModalities(undefined, {
    query: { staleTime: 300_000 },
  });

  const { mutate: createLog, isPending } = useCreateProgressLog();

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function submitEntry() {
    if (!profileId) {
      Alert.alert("Not signed in");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sleepNote = `[sleep:${SLEEP_OPTIONS[sleepIdx]}]`;
    const fullNote = note.trim() ? `${sleepNote} ${note.trim()}` : sleepNote;

    createLog(
      {
        data: {
          profileId,
          rating,
          note: fullNote,
          modalityId: selectedModalityId ?? undefined,
          planId: undefined,
          sessionDate: new Date().toISOString().split("T")[0],
        },
      },
      {
        onSuccess: () => {
          setNote("");
          setRating(3);
          setSleepIdx(3);
          setSelectedModalityId(null);
          setShowForm(false);
          refetch();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => Alert.alert("Error", "Could not save journal entry"),
      }
    );
  }

  const entries = progress ?? [];
  const showChart = entries.length >= 5;

  function parseSleep(note?: string | null): string | null {
    if (!note) return null;
    const m = note.match(/\[sleep:([^\]]+)\]/);
    return m ? m[1] : null;
  }

  function parseNote(note?: string | null): string {
    if (!note) return "";
    return note.replace(/\[sleep:[^\]]+\]\s*/, "").trim();
  }

  const popularModalities = (modalities ?? []).slice(0, 6);

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm((p) => !p)}
          activeOpacity={0.8}
        >
          <Feather name={showForm ? "x" : "plus"} size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
        }
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formHeading}>How are you doing?</Text>

            <Text style={styles.sectionLabel}>Overall Session Rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.ratingBtn, rating === v && styles.ratingBtnActive]}
                  onPress={() => {
                    setRating(v);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ratingEmoji}>{RATING_ICONS[v]}</Text>
                  <Text style={[styles.ratingLabel, rating === v && styles.ratingLabelActive]}>
                    {RATING_LABELS[v]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Sleep Last Night</Text>
            <View style={styles.sleepRow}>
              {SLEEP_OPTIONS.map((opt, idx) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.sleepChip, sleepIdx === idx && styles.sleepChipActive]}
                  onPress={() => {
                    setSleepIdx(idx);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sleepText, sleepIdx === idx && styles.sleepTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {popularModalities.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Modality Practiced (optional)</Text>
                <View style={styles.modalityRow}>
                  {popularModalities.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modalityChip,
                        selectedModalityId === m.id && styles.modalityChipActive,
                      ]}
                      onPress={() =>
                        setSelectedModalityId((prev) => (prev === m.id ? null : m.id))
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalityEmoji}>{m.emoji ?? "🌿"}</Text>
                      <Text
                        style={[
                          styles.modalityText,
                          selectedModalityId === m.id && styles.modalityTextActive,
                        ]}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)..."
              placeholderTextColor={COLORS.textLight}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
              onPress={submitEntry}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {showChart && <MiniInsightChart entries={entries} />}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={COLORS.amber} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={36} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>Tap + to log your first wellness check-in.</Text>
          </View>
        ) : (
          <View style={styles.entryList}>
            {entries.map((entry) => {
              const sleepLabel = parseSleep(entry.note);
              const cleanNote = parseNote(entry.note);
              const ratingVal = entry.rating ?? 0;
              const ratingColor =
                ratingVal >= 4 ? COLORS.sage : ratingVal >= 3 ? COLORS.amber : COLORS.rose;
              return (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryMeta}>
                    <View>
                      <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                      <Text style={styles.entryTime}>{formatTime(entry.createdAt)}</Text>
                    </View>
                    {ratingVal > 0 && (
                      <View style={[styles.ratingTag, { backgroundColor: ratingColor + "18" }]}>
                        <Text style={styles.ratingTagEmoji}>{RATING_ICONS[ratingVal]}</Text>
                        <Text style={[styles.ratingTagText, { color: ratingColor }]}>
                          {RATING_LABELS[ratingVal]}
                        </Text>
                      </View>
                    )}
                  </View>
                  {sleepLabel && (
                    <View style={styles.sleepTag}>
                      <Feather name="moon" size={12} color={COLORS.navy} />
                      <Text style={styles.sleepTagText}>Sleep: {sleepLabel}</Text>
                    </View>
                  )}
                  {cleanNote ? (
                    <Text style={styles.entryNote}>{cleanNote}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: { fontFamily: "serif", fontSize: 28, color: COLORS.navy },
  addBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.full,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  formHeading: {
    fontFamily: "serif",
    fontSize: 18,
    color: COLORS.navy,
    fontWeight: "600" as const,
  },
  sectionLabel: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "600" as const,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  ratingRow: {
    flexDirection: "row",
    gap: SPACING.xs,
    justifyContent: "space-between",
  },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  ratingBtnActive: {
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amberPale,
  },
  ratingEmoji: { fontSize: 20 },
  ratingLabel: {
    fontFamily: "sans-serif",
    fontSize: 10,
    color: COLORS.textMuted,
  },
  ratingLabelActive: { color: COLORS.amber },
  sleepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  sleepChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.warm,
  },
  sleepChipActive: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy10,
  },
  sleepText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sleepTextActive: { color: COLORS.navy, fontWeight: "600" as const },
  modalityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  modalityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.warm,
  },
  modalityChipActive: {
    borderColor: COLORS.sage,
    backgroundColor: COLORS.sagePale,
  },
  modalityEmoji: { fontSize: 14 },
  modalityText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalityTextActive: { color: COLORS.sage, fontWeight: "600" as const },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.text,
    minHeight: 72,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: "sans-serif",
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.white,
  },
  loadingState: { flex: 1, alignItems: "center", paddingTop: SPACING.xxxl },
  emptyState: {
    alignItems: "center",
    paddingTop: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyTitle: { fontFamily: "serif", fontSize: 20, color: COLORS.navy },
  emptyText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  entryList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  entryMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDate: {
    fontFamily: "sans-serif",
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  entryTime: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  ratingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  ratingTagEmoji: { fontSize: 14 },
  ratingTagText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  sleepTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.navy10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  sleepTagText: {
    fontFamily: "sans-serif",
    fontSize: 11,
    color: COLORS.navy,
    fontWeight: "500" as const,
  },
  entryNote: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
