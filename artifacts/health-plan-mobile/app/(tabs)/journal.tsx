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
} from "@workspace/api-client-react";

const MOODS = [
  { value: 1, icon: "😣", label: "Rough" },
  { value: 2, icon: "😕", label: "Low" },
  { value: 3, icon: "😐", label: "Okay" },
  { value: 4, icon: "🙂", label: "Good" },
  { value: 5, icon: "😄", label: "Great" },
];

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

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(2);
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: progress, isLoading, refetch } = useListProgress(
    { profileId, limit: 50 },
    { query: { enabled: !!profileId } }
  );

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
    createLog(
      {
        data: {
          profileId,
          mood,
          energy,
          pain,
          note: note.trim() || null,
          planId: null,
          modalityId: null,
          sleep: null,
        },
      },
      {
        onSuccess: () => {
          setNote("");
          setMood(3);
          setEnergy(3);
          setPain(2);
          setShowForm(false);
          refetch();
        },
        onError: () => Alert.alert("Error", "Could not save journal entry"),
      }
    );
  }

  const entries = progress ?? [];

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

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formHeading}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                onPress={() => {
                  setMood(m.value);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{m.icon}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    mood === m.value && styles.moodLabelActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderRow}>
              <View style={styles.sliderLabel}>
                <Feather name="zap" size={14} color={COLORS.amber} />
                <Text style={styles.sliderTitle}>Energy</Text>
              </View>
              <Text style={styles.sliderValue}>{energy}/5</Text>
            </View>
            <Slider
              value={energy}
              minimumValue={1}
              maximumValue={5}
              step={1}
              onValueChange={setEnergy}
              minimumTrackTintColor={COLORS.amber}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.amber}
            />
          </View>

          <View style={styles.sliderGroup}>
            <View style={styles.sliderRow}>
              <View style={styles.sliderLabel}>
                <Feather name="activity" size={14} color={COLORS.rose} />
                <Text style={styles.sliderTitle}>Pain / Discomfort</Text>
              </View>
              <Text style={styles.sliderValue}>{pain}/5</Text>
            </View>
            <Slider
              value={pain}
              minimumValue={1}
              maximumValue={5}
              step={1}
              onValueChange={setPain}
              minimumTrackTintColor={COLORS.rose}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.rose}
            />
          </View>

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

      <ScrollView
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
        }
      >
        {isLoading && !entries.length ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={COLORS.amber} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={36} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Tap + to log how you're feeling today
            </Text>
          </View>
        ) : (
          entries.map((entry, idx) => (
            <View
              key={entry.id ?? idx}
              style={[styles.entryCard, idx < entries.length - 1 && styles.entryCardBorder]}
            >
              <View style={styles.entryLeft}>
                <Text style={styles.entryMoodEmoji}>
                  {MOODS.find((m) => m.value === entry.mood)?.icon ?? "😐"}
                </Text>
              </View>
              <View style={styles.entryBody}>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryDate}>
                    {formatDate(entry.createdAt ?? "")}
                  </Text>
                  <Text style={styles.entryTime}>
                    {formatTime(entry.createdAt ?? "")}
                  </Text>
                </View>
                <View style={styles.entryStats}>
                  {entry.energy != null && (
                    <View style={styles.entryStat}>
                      <Feather name="zap" size={11} color={COLORS.amber} />
                      <Text style={styles.entryStatText}>{entry.energy}</Text>
                    </View>
                  )}
                  {entry.pain != null && (
                    <View style={styles.entryStat}>
                      <Feather name="activity" size={11} color={COLORS.rose} />
                      <Text style={styles.entryStatText}>{entry.pain}</Text>
                    </View>
                  )}
                </View>
                {entry.note ? (
                  <Text style={styles.entryNote} numberOfLines={2}>
                    {entry.note}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  formHeading: {
    fontFamily: "serif",
    fontSize: 18,
    color: COLORS.navy,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodBtn: {
    alignItems: "center",
    gap: 4,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    flex: 1,
  },
  moodBtnActive: {
    backgroundColor: COLORS.amberPale,
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: {
    fontFamily: "sans-serif",
    fontSize: 10,
    color: COLORS.textMuted,
  },
  moodLabelActive: { color: COLORS.amber, fontWeight: "600" as const },
  sliderGroup: { gap: 4 },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  sliderTitle: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.navy,
  },
  sliderValue: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600" as const,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.navy,
    minHeight: 72,
    textAlignVertical: "top",
    backgroundColor: COLORS.warm,
  },
  saveBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.full,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: "sans-serif",
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.white,
  },
  timeline: { flex: 1 },
  timelineContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontFamily: "serif",
    fontSize: 20,
    color: COLORS.navy,
  },
  emptyText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  entryCard: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryCardBorder: {},
  entryLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.off,
    alignItems: "center",
    justifyContent: "center",
  },
  entryMoodEmoji: { fontSize: 20 },
  entryBody: { flex: 1, gap: 4 },
  entryMeta: { flexDirection: "row", gap: SPACING.sm, alignItems: "center" },
  entryDate: {
    fontFamily: "sans-serif",
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  entryTime: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  entryStats: { flexDirection: "row", gap: SPACING.md },
  entryStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  entryStatText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  entryNote: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginTop: 2,
  },
});
