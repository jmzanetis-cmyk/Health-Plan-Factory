import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";

export type MilestoneType =
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "first_session"
  | "wellness_score_70"
  | "wellness_score_90";

interface MilestoneConfig {
  emoji: string;
  title: string;
  subtitle: string;
  shareText: string;
  color: string;
}

const MILESTONE_CONFIGS: Record<MilestoneType, MilestoneConfig> = {
  streak_3: {
    emoji: "🔥",
    title: "3-Day Streak!",
    subtitle: "You're building momentum.",
    shareText: "I just hit a 3-day wellness streak on Health Plan Factory! Building healthy habits one day at a time. 🔥",
    color: COLORS.amber,
  },
  streak_7: {
    emoji: "⚡",
    title: "7-Day Streak!",
    subtitle: "A full week of consistency. You're unstoppable.",
    shareText: "7 days straight of tracking my wellness journey on Health Plan Factory! Feeling stronger every day. ⚡",
    color: COLORS.amber,
  },
  streak_14: {
    emoji: "🌟",
    title: "14-Day Streak!",
    subtitle: "Two weeks of building real habits.",
    shareText: "14-day wellness streak! My personalized health plan from Health Plan Factory is changing how I feel. 🌟",
    color: COLORS.primary,
  },
  streak_30: {
    emoji: "🏆",
    title: "30-Day Streak!",
    subtitle: "One month of consistent wellness. Incredible!",
    shareText: "I just completed a 30-day wellness streak on Health Plan Factory. One month of real, evidence-based self-care! 🏆",
    color: COLORS.sage,
  },
  first_session: {
    emoji: "🎉",
    title: "First Session Booked!",
    subtitle: "You're turning your plan into action.",
    shareText: "Just booked my first session from my personalized wellness plan on Health Plan Factory! Taking action on my health goals. 🎉",
    color: COLORS.primary,
  },
  wellness_score_70: {
    emoji: "💪",
    title: "Wellness Score: 70!",
    subtitle: "Your consistency is paying off.",
    shareText: "My wellness score just hit 70 on Health Plan Factory! Evidence-based habits are making a real difference. 💪",
    color: COLORS.sage,
  },
  wellness_score_90: {
    emoji: "🌿",
    title: "Wellness Score: 90!",
    subtitle: "You're thriving. Keep it up!",
    shareText: "Wellness score of 90 on Health Plan Factory! This personalized approach to health actually works. 🌿",
    color: COLORS.sage,
  },
};

interface Props {
  visible: boolean;
  milestone: MilestoneType | null;
  referralCode?: string | null;
  onClose: () => void;
}

export function MilestoneShareModal({ visible, milestone, referralCode, onClose }: Props) {
  if (!milestone) return null;

  const config = MILESTONE_CONFIGS[milestone];
  const shareUrl = referralCode
    ? `https://healthplanfactory.com/sign-up?ref=${encodeURIComponent(referralCode)}`
    : "https://healthplanfactory.com";

  const fullShareText = `${config.shareText}\n\nGet your own personalized wellness plan → ${shareUrl}`;

  async function handleShare() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Share.share({
        message: fullShareText,
        url: shareUrl,
        title: config.title,
      });
    } catch {
      // user cancelled or share failed — no-op
    }
  }

  function handleClose() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <Feather name="x" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Celebration card */}
          <View style={[styles.card, { backgroundColor: config.color }]}>
            <Text style={styles.cardEmoji}>{config.emoji}</Text>
            <Text style={styles.cardBrand}>Health Plan Factory</Text>
            <Text style={styles.cardTitle}>{config.title}</Text>
            <Text style={styles.cardSubtitle}>{config.subtitle}</Text>
            {referralCode && (
              <View style={styles.refPill}>
                <Text style={styles.refPillText}>Code: {referralCode}</Text>
              </View>
            )}
          </View>

          {/* Message */}
          <View style={styles.msgBlock}>
            <Text style={styles.msgText}>{config.shareText}</Text>
          </View>

          {/* Share button */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Feather name="share-2" size={16} color={COLORS.white} />
            <Text style={styles.shareBtnText}>Share Achievement</Text>
          </TouchableOpacity>

          {/* Referral attribution note */}
          {referralCode && (
            <Text style={styles.refNote}>
              Your referral code is embedded in the share link — you earn credit when friends sign up.
            </Text>
          )}

          {/* Skip */}
          <TouchableOpacity onPress={handleClose} style={styles.skipBtn}>
            <Text style={styles.skipText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  closeBtn: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.lg,
    padding: 4,
    zIndex: 10,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: "center",
    marginBottom: SPACING.xxl,
    marginTop: SPACING.sm,
  },
  cardEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  cardBrand: {
    fontSize: 10,
    fontFamily: FONTS.mono,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  refPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  refPillText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontFamily: FONTS.mono,
    letterSpacing: 0.5,
  },
  msgBlock: {
    backgroundColor: COLORS.off,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  msgText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  refNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
