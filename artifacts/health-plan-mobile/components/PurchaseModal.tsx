import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";

interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export function PurchaseModal({ visible, onClose }: PurchaseModalProps) {
  function handleSubscribe() {
    Linking.openURL("https://healthplanfactory.com/pricing");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="star" size={32} color={COLORS.amber} />
          </View>

          <Text style={styles.title}>Upgrade to Plus</Text>
          <Text style={styles.subtitle}>
            Unlock matched provider contacts, clinical evidence insights, and priority support.
          </Text>

          <View style={styles.featureList}>
            {[
              "Matched provider contacts & phone numbers",
              "Clinical evidence grades for every modality",
              "Nearby provider count in your area",
              "Priority email support",
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Feather name="check-circle" size={16} color={COLORS.sage} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.price}>$9.99/month or $89.99/year</Text>

          <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} activeOpacity={0.85}>
            <Text style={styles.subscribeBtnText}>Subscribe at healthplanfactory.com →</Text>
          </TouchableOpacity>

          <Text style={styles.alreadySubText}>
            Already subscribed? Sign in on the web first, then return to the app.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    marginBottom: SPACING.lg,
  },
  closeBtn: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.xl,
    padding: SPACING.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  featureList: {
    alignSelf: "stretch",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  featureText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.white,
    flex: 1,
  },
  price: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.amber,
    marginBottom: SPACING.lg,
  },
  subscribeBtn: {
    alignSelf: "stretch",
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  subscribeBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.navy,
  },
  alreadySubText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: SPACING.md,
  },
});
