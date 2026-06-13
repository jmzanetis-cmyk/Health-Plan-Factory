import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, RADIUS, SPACING } from '@/constants/theme';
import { Sydney, Fabio, Sonia, Franco, Arnold } from '@/components/workers';

const { width } = Dimensions.get('window');

const NAVY = '#1b2d4f';
const AMBER = '#d4a44c';
const AMBER_DARK = '#b8892a';
const MUTED = '#4a5e7a';
const WARM = '#fafaf8';

const MODALITY_PILLS = [
  ['Massage Therapy', 'Acupuncture'],
  ['Yoga & Movement', 'Nutrition Coaching'],
  ['Chiropractic', 'Personal Training'],
  ['Float Therapy', 'Meditation & MBSR'],
  ['Infrared Sauna', 'Breathwork'],
  ['Sleep Coaching', 'Functional Medicine'],
  ['Cold Plunge', 'Naturopathic Care'],
  ['Reiki', 'Sound Healing'],
];

const CREW = [
  {
    Component: Sydney,
    pose: 'waving' as const,
    name: 'Sydney — Your wellness concierge',
    desc: 'Greets you each day with what matters most.',
  },
  {
    Component: Fabio,
    pose: 'clipboard' as const,
    name: 'Fabio — Plan architect',
    desc: 'Builds your personalized wellness roadmap.',
  },
  {
    Component: Sonia,
    pose: 'default' as const,
    name: 'Sonia — Accountability coach',
    desc: 'Tracks how you\'re feeling and keeps you going.',
  },
  {
    Component: Franco,
    pose: 'thinking' as const,
    name: 'Franco — Data analyst',
    desc: 'Finds patterns in your progress data.',
  },
  {
    Component: Arnold,
    pose: 'pointing' as const,
    name: 'Arnold — Provider concierge',
    desc: 'Finds the right practitioners near you.',
  },
];

async function completeOnboarding() {
  await AsyncStorage.setItem('hpf_onboarding_complete', '1');
}

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dotStyles.dot, i === active && dotStyles.dotActive]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(27,45,79,0.18)',
  },
  dotActive: { backgroundColor: '#e8306a', width: 18 },
});

// ── Screen 1: The Problem ──────────────────────────────────────────────

function Screen1() {
  return (
    <ScrollView contentContainerStyle={s1.content} showsVerticalScrollIndicator={false}>
      <View style={s1.workerRow}>
        <Sydney
          pose="default"
          size={100}
          speechBubble="Most people never have a plan."
          bubblePosition="above"
        />
      </View>
      <Text style={s1.title}>Not your doctor's waiting room.</Text>
      <Text style={s1.body}>
        Health Plan Factory isn't about prescriptions, diagnoses, or insurance claims.
        {'\n\n'}
        It's about the space between appointments — the massage you never booked, the yoga class you kept putting off, the nutrition coaching your doctor can't bill for.
        {'\n\n'}
        We organize the wellness decisions that are entirely yours to make.
      </Text>
      <Text style={s1.stat}>
        75% of preventable health spending goes unmanaged.
      </Text>
    </ScrollView>
  );
}

const s1 = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  workerRow: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: MUTED,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  stat: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: AMBER_DARK,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

// ── Screen 2: The Solution ─────────────────────────────────────────────

function Screen2() {
  return (
    <ScrollView contentContainerStyle={s2.content} showsVerticalScrollIndicator={false}>
      <Image
        source={require('../assets/images/factory-hero.png')}
        style={s2.hero}
        resizeMode="contain"
      />
      <Text style={s2.title}>Your personalized wellness roadmap.</Text>
      <Text style={s2.body}>
        Tell us your budget, your goals, and what you are dealing with. We build you an evidence-ranked wellness plan — and connect you with real local providers who can actually help.
        {'\n\n'}
        No generic advice. No one-size-fits-all programs. A plan built around your life, your body, and what you can actually afford.
      </Text>
      <Text style={s2.keyPoint}>
        Evidence-ranked modalities. Real local providers. Booked and tracked in one place.
      </Text>
    </ScrollView>
  );
}

const s2 = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  hero: {
    width: width * 0.8,
    height: 180,
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: MUTED,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  keyPoint: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: NAVY,
    textAlign: 'center',
  },
});

// ── Screen 3: Not Clinical. Wellness. ────────────────────────────────

function Screen3() {
  return (
    <ScrollView contentContainerStyle={s3.content} showsVerticalScrollIndicator={false}>
      <Text style={s3.title}>The things that actually make you feel better.</Text>
      <Text style={s3.subtitle}>
        We focus on health and well-being approaches — not hospital-style medical treatment.
      </Text>
      <View style={s3.grid}>
        {MODALITY_PILLS.map((row, ri) => (
          <View key={ri} style={s3.gridRow}>
            {row.map((pill) => (
              <View key={pill} style={s3.pill}>
                <Text style={s3.pillText}>{pill}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={s3.more}>
        ...and 30+ more evidence-informed modalities, matched to your goals and budget.
      </Text>
      <View style={s3.noteBox}>
        <Text style={s3.note}>
          Some wellness services may qualify for HSA/FSA reimbursement with a physician's Letter of Medical Necessity. We help you navigate that too.
        </Text>
      </View>
    </ScrollView>
  );
}

const s3 = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  grid: { alignSelf: 'stretch', gap: 8, marginBottom: 16 },
  gridRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  pill: {
    borderWidth: 1,
    borderColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: NAVY,
  },
  more: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  noteBox: { paddingHorizontal: 16 },
  note: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#8496b0',
    textAlign: 'center',
    lineHeight: 16,
  },
});

// ── Screen 4: Meet the Team ───────────────────────────────────────────

function Screen4() {
  return (
    <ScrollView contentContainerStyle={s4.content} showsVerticalScrollIndicator={false}>
      <Text style={s4.title}>Meet your wellness crew.</Text>
      <Text style={s4.subtitle}>
        Five specialists. All powered by AI.{'\n'}All focused on you.
      </Text>
      <View style={s4.crewList}>
        {CREW.map((member) => (
          <View key={member.name} style={s4.crewRow}>
            <member.Component pose={member.pose} size={56} />
            <View style={s4.crewText}>
              <Text style={s4.crewName}>{member.name}</Text>
              <Text style={s4.crewDesc}>{member.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s4 = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  crewList: { alignSelf: 'stretch', gap: 12 },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(27,45,79,0.08)',
  },
  crewText: { flex: 1 },
  crewName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: NAVY,
  },
  crewDesc: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
    lineHeight: 17,
  },
});

// ── Screen 5: Get Started ─────────────────────────────────────────────

function Screen5({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <ScrollView contentContainerStyle={s5.content} showsVerticalScrollIndicator={false}>
      <View style={s5.workerRow}>
        <Sydney
          pose="waving"
          size={100}
          speechBubble="Ready when you are."
          bubblePosition="above"
        />
      </View>
      <Text style={s5.title}>Free to start.</Text>
      <Text style={s5.subtitle}>
        Build your first wellness plan at no cost. Upgrade to Plus when you're ready for unlimited provider access and your full AI wellness crew.
      </Text>

      {/* Comparison */}
      <View style={s5.comparison}>
        <View style={s5.col}>
          <Text style={s5.colHeader}>FREE</Text>
          {['Build a plan', 'Browse providers', '2 free reveals', 'Basic check-ins'].map((f) => (
            <Text key={f} style={s5.colItem}>• {f}</Text>
          ))}
        </View>
        <View style={s5.divider} />
        <View style={s5.col}>
          <Text style={s5.colHeaderPlus}>PLUS ($9.99/mo)</Text>
          {['Everything in Free', 'Unlimited reveals', 'Full AI wellness crew', 'HSA/FSA tracker', 'Daily check-ins', '14-day free trial'].map((f) => (
            <Text key={f} style={s5.colItemPlus}>• {f}</Text>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s5.primaryBtn} onPress={onGetStarted} activeOpacity={0.85}>
        <Text style={s5.primaryBtnText}>Build My Plan — Free</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s5.secondaryBtn} onPress={onSignIn} activeOpacity={0.85}>
        <Text style={s5.secondaryBtnText}>I already have an account — Sign In</Text>
      </TouchableOpacity>

      <Text style={s5.legal}>No credit card needed to start.</Text>
    </ScrollView>
  );
}

const s5 = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  workerRow: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  comparison: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: 12,
  },
  col: { flex: 1, gap: 6 },
  colHeader: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  colHeaderPlus: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: AMBER,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  colItem: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  colItemPlus: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: AMBER,
    lineHeight: 18,
  },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  primaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: NAVY,
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  secondaryBtnText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: '#fff',
  },
  legal: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

// ── Main Onboarding component ─────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const totalSteps = 5;
  const isLastStep = step === totalSteps - 1;
  const isNavyBg = step === totalSteps - 1;

  async function goToTabs() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  async function goToLogin() {
    await completeOnboarding();
    router.replace('/login');
  }

  async function goToIntake() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  function handleSkip() {
    setStep(totalSteps - 1);
  }

  function handleNext() {
    if (isLastStep) {
      goToTabs();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <View
      style={[
        styles.screen,
        isNavyBg && styles.screenNavy,
        { paddingTop: insets.top },
      ]}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep((s) => s - 1)}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={isNavyBg ? '#fff' : NAVY} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        {!isLastStep && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={[styles.skip, isNavyBg && styles.skipNavy]}>Skip</Text>
          </TouchableOpacity>
        )}
        {isLastStep && <View style={{ width: 40 }} />}
      </View>

      {/* Screen content */}
      <View style={styles.screenContent}>
        {step === 0 && <Screen1 />}
        {step === 1 && <Screen2 />}
        {step === 2 && <Screen3 />}
        {step === 3 && <Screen4 />}
        {step === 4 && (
          <Screen5 onGetStarted={goToIntake} onSignIn={goToLogin} />
        )}
      </View>

      {/* Bottom nav */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <ProgressDots total={totalSteps} active={step} />
        {!isLastStep && (
          <TouchableOpacity style={[styles.nextBtn, isNavyBg && styles.nextBtnNavy]} onPress={handleNext} activeOpacity={0.85}>
            <Text style={[styles.nextBtnText, isNavyBg && styles.nextBtnTextNavy]}>
              Next
            </Text>
            <Feather name="arrow-right" size={16} color={isNavyBg ? NAVY : '#fff'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WARM,
  },
  screenNavy: {
    backgroundColor: NAVY,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: MUTED,
  },
  skipNavy: { color: 'rgba(255,255,255,0.5)' },
  screenContent: { flex: 1 },
  bottom: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    gap: SPACING.lg,
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: NAVY,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  nextBtnNavy: {
    backgroundColor: '#fff',
  },
  nextBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
  nextBtnTextNavy: { color: NAVY },
});
