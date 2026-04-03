import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useSubscription, PURCHASES_ERROR_CODE } from "@/lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export function PurchaseModal({ visible, onClose, onPurchaseSuccess }: PurchaseModalProps) {
  const { offerings, purchase, isPurchasing } = useSubscription();

  const currentOffering = offerings?.current;
  const pkg: PurchasesPackage | undefined = currentOffering?.availablePackages[0];
  const priceString = pkg?.product?.priceString ?? "$9.99";
  const productDescription =
    pkg?.product?.description ??
    "Unlock matched provider contacts, clinical evidence insights, and priority support.";

  async function handlePurchase() {
    if (!pkg) return;
    try {
      await purchase(pkg);
      onPurchaseSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (
        err !== null &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        return;
      }
    }
  }

  function handleWebFallback() {
    Linking.openURL("https://healthplanfactory.com/upgrade");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Feather name="star" size={32} color={COLORS.pink} />
          </View>

          <Text style={styles.title}>Upgrade to Plus</Text>
          <Text style={styles.subtitle}>{productDescription}</Text>

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

          {pkg ? (
            <TouchableOpacity
              style={[styles.purchaseBtn, isPurchasing && styles.purchaseBtnDisabled]}
              onPress={handlePurchase}
              disabled={isPurchasing}
              activeOpacity={0.85}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.purchaseBtnText}>Subscribe — {priceString}/mo</Text>
                  <Text style={styles.purchaseBtnSub}>Cancel anytime in App Store settings</Text>
                </>
              )}
            </TouchableOpacity>
          ) : Platform.OS !== "ios" && Platform.OS !== "android" ? (
            <TouchableOpacity
              style={styles.purchaseBtn}
              onPress={handleWebFallback}
              activeOpacity={0.85}
            >
              <Text style={styles.purchaseBtnText}>Subscribe on the web →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.pink} />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </View>
          )}

          <Text style={styles.legalText}>
            Subscription auto-renews monthly. Manage in your{" "}
            {Platform.OS === "ios" ? "App Store" : "Play Store"} settings.
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
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
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
    backgroundColor: COLORS.amberPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  featureList: {
    alignSelf: "stretch",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
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
    color: COLORS.navy,
    flex: 1,
  },
  purchaseBtn: {
    alignSelf: "stretch",
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    gap: 4,
    marginBottom: SPACING.md,
  },
  purchaseBtnDisabled: {
    opacity: 0.7,
  },
  purchaseBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  purchaseBtnSub: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
  loadingWrap: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  legalText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
  },
});
