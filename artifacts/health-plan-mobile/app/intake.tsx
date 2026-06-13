import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { Fabio } from "@/components/workers";

// ── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "hpf_intake_draft";
const BUDGET_MIN = 50;
const BUDGET_MAX = 1000;
const BUDGET_STEP = 25;
const TOTAL_STEPS = 7;
const TRUE_NAVY = "#1b2d4f";

const CONDITIONS = [
  "Back Pain", "Neck Pain", "Shoulder Pain", "Hip Pain", "Knee Pain",
  "Joint Pain", "Chronic Pain", "Sciatica", "Headaches / Migraines",
  "Fibromyalgia", "Anxiety", "Depression", "Stress & Burnout",
  "PTSD / Trauma", "Sleep Issues", "Fatigue / Low Energy", "Brain Fog",
  "Digestive Issues", "Autoimmune Condition", "Diabetes / Blood Sugar",
  "Heart Health", "High Blood Pressure", "Weight Management",
  "Hormonal Imbalance", "Menopause Symptoms", "Poor Flexibility",
  "Poor Posture", "Sedentary Lifestyle", "Athletic Recovery",
  "Post-Surgery Recovery", "Injury Rehabilitation",
];

const GOALS = [
  "Pain Relief", "Stress Reduction", "Better Sleep", "More Energy",
  "Weight Loss", "Improved Mobility", "Better Posture", "Injury Recovery",
  "Athletic Performance", "Mental Clarity", "Emotional Wellbeing",
  "Gut Health", "Heart Health", "Hormone Balance", "Preventive Care",
  "Nutrition Improvement", "Better Breathing", "Immune Support",
  "Skin Health", "General Wellness",
];

const ACTIVITY_OPTIONS = [
  "Sedentary (desk job, little movement)",
  "Lightly active (occasional walks/exercise)",
  "Moderately active (3-4x/week)",
  "Very active (daily exercise or physical job)",
];

const TIME_OPTIONS = [
  "Under 1 hour",
  "1-3 hours",
  "3-5 hours",
  "5+ hours",
];

const SESSION_OPTIONS = [
  "In-person only",
  "Remote / telehealth preferred",
  "Both work for me",
];

const STEP_META = [
  { title: "", subtitle: "" },
  {
    title: "What's your monthly budget?",
    subtitle: "We'll optimize your plan to this amount — no surprise costs.",
  },
  {
    title: "What are you dealing with?",
    subtitle: "Select all that apply. This helps us match evidence-based modalities to your situation.",
  },
  {
    title: "What are your wellness goals?",
    subtitle: "Select your top priorities.",
  },
  {
    title: "Tell us about your lifestyle.",
    subtitle: "This helps us recommend modalities that fit your schedule and preferences.",
  },
  {
    title: "Where are you located?",
    subtitle: "We use your zip code to find providers near you. We never share your location.",
  },
  {
    title: "Before we build your plan",
    subtitle: "Please read and confirm the following.",
  },
  {
    title: "Building your plan...",
    subtitle: "This usually takes less than 30 seconds.",
  },
];

function getBudgetTier(b: number): string {
  if (b < 100) return "Starter — 1 modality focus";
  if (b < 200) return "Essential — 1-2 modalities";
  if (b < 350) return "Moderate — solid 2-3 modality plan";
  if (b < 550) return "Committed — 3-4 modalities";
  if (b < 800) return "Premium — 4-5 modalities";
  return "Comprehensive — full modality stack";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  navy,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  navy?: boolean;
}) {
  const bg = selected ? (navy ? TRUE_NAVY : COLORS.pink) : COLORS.white;
  const borderColor = selected ? (navy ? TRUE_NAVY : COLORS.pink) : COLORS.border;
  const color = selected ? COLORS.white : COLORS.text;
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function OptionBtn({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionBtn, selected && styles.optionBtnSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionBtnText, selected && styles.optionBtnTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function IntakeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: authUser } = useGetCurrentAuthUser();
  const profileId = (authUser as { user?: { id?: string }; profile?: { id?: string } } | undefined)
    ?.profile?.id
    ?? (authUser as { user?: { id?: string } } | undefined)?.user?.id
    ?? null;

  // Form state
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState(250);
  const [conditions, setConditions] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [timePerWeek, setTimePerWeek] = useState<string | null>(null);
  const [sessionPref, setSessionPref] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);

  // Generation state
  const [genTrigger, setGenTrigger] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [genMsg, setGenMsg] = useState("Analyzing your goals...");

  // Location state
  const [locLoading, setLocLoading] = useState(false);

  // Slider
  const [trackWidth, setTrackWidth] = useState(1);
  const trackWidthRef = useRef(1);
  const initialTouchRatioRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackWidthRef.current));
        initialTouchRatioRef.current = ratio;
        const raw = BUDGET_MIN + ratio * (BUDGET_MAX - BUDGET_MIN);
        setBudget(Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, Math.round(raw / BUDGET_STEP) * BUDGET_STEP)));
      },
      onPanResponderMove: (_evt, gestureState) => {
        const newRatio = Math.max(
          0,
          Math.min(1, initialTouchRatioRef.current + gestureState.dx / trackWidthRef.current)
        );
        const raw = BUDGET_MIN + newRatio * (BUDGET_MAX - BUDGET_MIN);
        setBudget(Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, Math.round(raw / BUDGET_STEP) * BUDGET_STEP)));
      },
    })
  ).current;

  // Pulse animation for generating step
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Load draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const d = JSON.parse(raw) as {
            step?: number;
            budget?: number;
            conditions?: string[];
            goals?: string[];
            activityLevel?: string | null;
            timePerWeek?: string | null;
            sessionPref?: string | null;
            zipCode?: string;
            consentGiven?: boolean;
          };
          if (d.budget != null) setBudget(d.budget);
          if (d.conditions) setConditions(d.conditions);
          if (d.goals) setGoals(d.goals);
          if (d.activityLevel !== undefined) setActivityLevel(d.activityLevel ?? null);
          if (d.timePerWeek !== undefined) setTimePerWeek(d.timePerWeek ?? null);
          if (d.sessionPref !== undefined) setSessionPref(d.sessionPref ?? null);
          if (d.zipCode != null) setZipCode(d.zipCode);
          if (d.consentGiven != null) setConsentGiven(d.consentGiven);
          if (d.step && d.step >= 1 && d.step < 7) {
            setStep(d.step);
            setDraftBanner(true);
          }
        } catch {}
      })
      .catch(() => {});
  }, []);

  // ── Generating step effects ──────────────────────────────────────────────
  useEffect(() => {
    if (step !== 7) return;
    const messages = [
      "Analyzing your goals...",
      "Matching evidence-based modalities...",
      `Fitting your $${budget}/mo budget...`,
      "Finding providers near you...",
      "Building your personalized plan...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setGenMsg(messages[idx]);
    }, 2000);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => {
      clearInterval(interval);
      pulse.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Fire API call when genTrigger increments ─────────────────────────────
  useEffect(() => {
    if (genTrigger === 0) return;
    if (!profileId) return;

    let cancelled = false;
    const run = async () => {
      setGenError(null);
      try {
        const token = await SecureStore.getItemAsync("hpf_access_token");
        const base = getApiBaseUrl();
        const telehealth = sessionPref !== "In-person only";
        const preferences = [activityLevel, timePerWeek].filter(Boolean) as string[];
        const res = await fetch(`${base}/api/plans/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            profileId,
            budget,
            goals,
            conditions,
            preferences,
            exclusions: [],
            telehealth,
            zipCode: zipCode || undefined,
            radius: 25,
          }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error ?? `Server error ${res.status}`);
        }
        await AsyncStorage.removeItem(DRAFT_KEY);
        await queryClient.invalidateQueries({ queryKey: ["latest-plan", profileId] });
        router.replace("/(tabs)/plan");
      } catch (err) {
        if (!cancelled) {
          setGenError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genTrigger]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveAndExit() {
    await AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ step, budget, conditions, goals, activityLevel, timePerWeek, sessionPref, zipCode, consentGiven })
    ).catch(() => {});
    router.back();
  }

  function handleBack() {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }

  function handleContinue() {
    if (step === 6) {
      setStep(7);
      setGenTrigger((t) => t + 1);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleAutoLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const geo = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const postal = geo[0]?.postalCode;
      if (postal) setZipCode(postal.slice(0, 5));
    } catch {}
    setLocLoading(false);
  }

  function toggleCondition(c: string) {
    if (c === "None of the above") {
      setConditions((prev) => (prev.includes(c) ? [] : [c]));
      return;
    }
    setConditions((prev) => {
      const without = prev.filter((x) => x !== "None of the above");
      return without.includes(c) ? without.filter((x) => x !== c) : [...without, c];
    });
  }

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function isStepValid(): boolean {
    switch (step) {
      case 1: return budget >= BUDGET_MIN;
      case 2: return true;
      case 3: return goals.length > 0;
      case 4: return !!activityLevel && !!timePerWeek && !!sessionPref;
      case 5: return /^\d{5}$/.test(zipCode);
      case 6: return consentGiven;
      default: return true;
    }
  }

  // ── Step renderers ───────────────────────────────────────────────────────

  function renderStep1() {
    const fillPct = (budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN);
    const thumbLeft = Math.max(0, trackWidth * fillPct - 12);
    return (
      <View>
        <View style={styles.budgetDisplay}>
          <Text style={styles.budgetCurrency}>$</Text>
          <Text style={styles.budgetAmount}>{budget}</Text>
          <Text style={styles.budgetSuffix}>/mo</Text>
        </View>
        <Text style={styles.budgetTier}>{getBudgetTier(budget)}</Text>

        <View
          style={styles.sliderContainer}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            trackWidthRef.current = w;
            setTrackWidth(w);
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: trackWidth * fillPct }]} />
          </View>
          <View style={[styles.sliderThumb, { left: thumbLeft }]} />
        </View>

        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>$50</Text>
          <Text style={styles.sliderLabel}>$1,000</Text>
        </View>

        <View style={styles.tipCard}>
          <Feather name="info" size={14} color={COLORS.pink} style={styles.tipIcon} />
          <Text style={styles.tipText}>
            Tip: Some services may qualify for HSA/FSA — we'll flag these in your plan. Your budget is
            an estimate; actual costs depend on local providers.
          </Text>
        </View>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View>
        <View style={styles.chipGrid}>
          {CONDITIONS.map((c) => (
            <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => toggleCondition(c)} />
          ))}
          <Chip
            label="None of the above"
            selected={conditions.includes("None of the above")}
            onPress={() => toggleCondition("None of the above")}
          />
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={handleContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.chipGrid}>
        {GOALS.map((g) => (
          <Chip key={g} label={g} selected={goals.includes(g)} onPress={() => toggleGoal(g)} />
        ))}
      </View>
    );
  }

  function renderStep4() {
    return (
      <View>
        <Text style={styles.lifestyleQ}>How active are you currently?</Text>
        {ACTIVITY_OPTIONS.map((o) => (
          <OptionBtn key={o} label={o} selected={activityLevel === o} onPress={() => setActivityLevel(o)} />
        ))}
        <Text style={[styles.lifestyleQ, { marginTop: SPACING.xl }]}>
          How much time can you dedicate per week?
        </Text>
        {TIME_OPTIONS.map((o) => (
          <OptionBtn key={o} label={o} selected={timePerWeek === o} onPress={() => setTimePerWeek(o)} />
        ))}
        <Text style={[styles.lifestyleQ, { marginTop: SPACING.xl }]}>
          Do you prefer in-person or remote sessions?
        </Text>
        {SESSION_OPTIONS.map((o) => (
          <OptionBtn key={o} label={o} selected={sessionPref === o} onPress={() => setSessionPref(o)} />
        ))}
      </View>
    );
  }

  function renderStep5() {
    return (
      <View>
        <TextInput
          style={styles.zipInput}
          value={zipCode}
          onChangeText={(t) => setZipCode(t.replace(/\D/g, "").slice(0, 5))}
          placeholder="Enter your zip code"
          placeholderTextColor={COLORS.textLight}
          keyboardType="numeric"
          maxLength={5}
        />
        <TouchableOpacity
          style={styles.locationBtn}
          onPress={handleAutoLocation}
          disabled={locLoading}
          activeOpacity={0.7}
        >
          {locLoading ? (
            <ActivityIndicator size="small" color={COLORS.pink} />
          ) : (
            <>
              <Feather name="map-pin" size={16} color={COLORS.pink} />
              <Text style={styles.locationBtnText}>Use my current location</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.privacyNote}>
          Your zip code is used only to match you with local providers. We do not track or share your
          location.
        </Text>
      </View>
    );
  }

  function renderStep6() {
    return (
      <View>
        <ScrollView
          style={styles.disclaimerBox}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <Text style={styles.disclaimerText}>
            HealthPlanFactory is a wellness optimization and care navigation platform. It is not a
            licensed medical provider, diagnostic tool, or substitute for professional medical care.
            {"\n\n"}
            The wellness plan we generate is based on your stated goals and preferences. It is not
            medical advice, a diagnosis, or a treatment recommendation.
            {"\n\n"}
            Always consult a qualified healthcare professional before beginning any new wellness
            program, especially if you have existing health conditions.
            {"\n\n"}
            For medical emergencies, call 911.{"\n"}
            For mental health crisis support, call or text 988.
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setConsentGiven((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
            {consentGiven && <Feather name="check" size={14} color={COLORS.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand this is a wellness tool, not medical advice, and I will consult my doctor
            before starting any new health program.
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStep7() {
    if (genError) {
      return (
        <View style={styles.genCenter}>
          <Feather name="alert-circle" size={44} color={COLORS.amber} />
          <Text style={styles.genErrorTitle}>Something went wrong</Text>
          <Text style={styles.genErrorMsg}>{genError}</Text>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => setGenTrigger((t) => t + 1)}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.genCenter}>
        <Fabio pose="clipboard" size={100} isTyping />
        <Text style={styles.genMsg}>{genMsg}</Text>
      </View>
    );
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  const stepValid = isStepValid();
  const meta = STEP_META[step] ?? { title: "", subtitle: "" };
  const showFooter = step < 7;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerSideBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name={step === 1 ? "x" : "arrow-left"} size={22} color={COLORS.pink} />
        </TouchableOpacity>

        <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS}</Text>

        {step < 7 ? (
          <TouchableOpacity onPress={handleSaveAndExit} style={styles.headerSideBtn}>
            <Text style={styles.saveExitText}>Save & Exit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSideBtn} />
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      {/* Draft banner */}
      {draftBanner && (
        <View style={styles.banner}>
          <Feather name="bookmark" size={13} color={COLORS.pink} />
          <Text style={styles.bannerText}>
            We saved your progress. Continuing from where you left off.
          </Text>
          <TouchableOpacity
            onPress={() => setDraftBanner(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={13} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Step content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: showFooter ? 0 : Math.max(insets.bottom, SPACING.lg) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{meta.title}</Text>
        {meta.subtitle ? <Text style={styles.stepSubtitle}>{meta.subtitle}</Text> : null}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
      </ScrollView>

      {/* Footer nav */}
      {showFooter && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
          <TouchableOpacity
            style={[styles.continueBtn, !stepValid && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!stepValid}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {step === 6 ? "Generate My Plan" : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fafaf8",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  headerSideBtn: {
    minWidth: 72,
    alignItems: "flex-start",
  },
  headerStep: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  saveExitText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "right",
    minWidth: 72,
  },

  // Progress
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.pink20,
    marginHorizontal: 0,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.pink,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  // Draft banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.pink10,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bannerText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.text,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },

  // Step headings
  stepTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: TRUE_NAVY,
    marginBottom: SPACING.sm,
    lineHeight: 30,
  },
  stepSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxl,
    lineHeight: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    backgroundColor: "#fafaf8",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueBtn: {
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.pink20,
  },
  continueBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.white,
  },

  // ── Step 1: Budget ───────────────────────────────────────────────────────
  budgetDisplay: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  budgetCurrency: {
    fontFamily: FONTS.body,
    fontSize: 28,
    color: COLORS.pink,
    marginBottom: 8,
    marginRight: 2,
  },
  budgetAmount: {
    fontFamily: FONTS.heading,
    fontSize: 56,
    color: COLORS.pink,
    lineHeight: 60,
  },
  budgetSuffix: {
    fontFamily: FONTS.body,
    fontSize: 18,
    color: COLORS.textMuted,
    marginBottom: 10,
    marginLeft: 4,
  },
  budgetTier: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xxl,
  },
  sliderContainer: {
    height: 40,
    justifyContent: "center",
    marginVertical: SPACING.md,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: COLORS.parch,
    borderRadius: 3,
    overflow: "hidden",
  },
  sliderFill: {
    height: 6,
    backgroundColor: COLORS.pink,
    borderRadius: 3,
  },
  sliderThumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.pink,
    top: -9,
    shadowColor: COLORS.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.xxl,
  },
  sliderLabel: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textLight,
  },
  tipCard: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.pink10,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ── Steps 2 & 3: Chips ───────────────────────────────────────────────────
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  chipText: {
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  skipBtn: {
    marginTop: SPACING.xl,
    alignSelf: "center",
  },
  skipText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // ── Step 4: Lifestyle ────────────────────────────────────────────────────
  lifestyleQ: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: TRUE_NAVY,
    marginBottom: SPACING.md,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  optionBtnSelected: {
    backgroundColor: TRUE_NAVY,
    borderColor: TRUE_NAVY,
  },
  optionBtnText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text,
  },
  optionBtnTextSelected: {
    color: COLORS.white,
  },

  // ── Step 5: Location ─────────────────────────────────────────────────────
  zipInput: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.pink,
    fontSize: 32,
    fontFamily: FONTS.heading,
    color: TRUE_NAVY,
    textAlign: "center",
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xxl,
    letterSpacing: 6,
  },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    height: 48,
  },
  locationBtnText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.pink,
  },
  privacyNote: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Step 6: Consent ──────────────────────────────────────────────────────
  disclaimerBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  disclaimerText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
    borderWidth: 2,
    borderColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.pink,
    borderColor: COLORS.pink,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
  },

  // ── Step 7: Generating ───────────────────────────────────────────────────
  genCenter: {
    alignItems: "center",
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  genPulse: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.pink10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  genSpinner: {
    marginTop: SPACING.xl,
  },
  genMsg: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
  genErrorTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: TRUE_NAVY,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  genErrorMsg: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.xxl,
    lineHeight: 19,
  },
});
