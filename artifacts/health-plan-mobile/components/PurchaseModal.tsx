import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';
import { Fabio } from '@/components/workers';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';

export interface PurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

const FEATURES = [
  {
    title: 'Unlimited provider reveals',
    body: 'Find and contact any provider in your wellness plan. No per-reveal fees.',
  },
  {
    title: 'Your AI wellness crew',
    body: 'Sydney, Sonia, Fabio, Franco, and Arnold know your plan and check in on you.',
  },
  {
    title: 'HSA/FSA spending tracker',
    body: 'Log qualifying wellness expenses. Some services may qualify with a physician LMN.',
  },
  {
    title: 'Daily check-ins + progress tracking',
    body: '60-second daily check-ins build your wellness score over time.',
  },
];

export function PurchaseModal({
  visible,
  onClose,
  onPurchaseSuccess,
}: PurchaseModalProps) {
  const queryClient = useQueryClient();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setOfferingsLoading(true);
    setPurchaseError('');
    getOfferings().then((offering) => {
      const monthly =
        offering?.availablePackages.find(
          (p) => p.packageType === 'MONTHLY'
        ) ?? offering?.availablePackages[0] ?? null;
      setPkg(monthly);
      setOfferingsLoading(false);
    });
  }, [visible]);

  async function handleApplePurchase() {
    if (!pkg || purchasing) return;
    setPurchasing(true);
    setPurchaseError('');
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) {
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      onPurchaseSuccess?.();
      onClose();
    } else {
      setPurchaseError('Purchase failed. Try again.');
    }
  }

  async function handleWebSubscribe() {
    Linking.openURL('https://healthplanfactory.com/pricing');
    onClose();
  }

  async function handleRestore() {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) {
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      onClose();
      Alert.alert('Purchases restored');
    } else {
      Alert.alert('No active purchases found');
    }
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
          {/* Handle + Close */}
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Hero */}
            <View style={styles.heroRow}>
              <Fabio
                pose="thumbsup"
                size={80}
                speechBubble="Let's get you set up."
                bubblePosition="above"
              />
            </View>

            <Text style={styles.title}>Health Plan Factory Plus</Text>
            <Text style={styles.tagline}>
              Your personalized wellness crew, built around your budget and goals.
            </Text>

            {/* What's included */}
            <Text style={styles.sectionLabel}>WHAT'S INCLUDED</Text>
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <View
                  key={f.title}
                  style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureRowBorder]}
                >
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureBody}>{f.body}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.pricingBlock}>
              <Text style={styles.price}>$9.99</Text>
              <Text style={styles.pricePer}>per month</Text>
              <Text style={styles.priceSave}>or $89.99/year — save 25%</Text>
              <Text style={styles.trial}>14-day free trial included</Text>
            </View>

            {/* Apple IAP button */}
            {(offeringsLoading || pkg) && (
              <>
                <TouchableOpacity
                  style={[styles.appleBtn, (purchasing || offeringsLoading) && styles.btnDisabled]}
                  onPress={handleApplePurchase}
                  disabled={purchasing || offeringsLoading || !pkg}
                  activeOpacity={0.85}
                >
                  {offeringsLoading || purchasing ? (
                    <ActivityIndicator color={COLORS.navy} />
                  ) : (
                    <Text style={styles.appleBtnText}>
                      Subscribe with Apple — $9.99/mo
                    </Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.appleNote}>
                  Billed via Apple. Cancel in App Store settings.
                </Text>
                {purchaseError ? (
                  <Text style={styles.errorText}>{purchaseError}</Text>
                ) : null}

                <Text style={styles.orDivider}>— or —</Text>
              </>
            )}

            {/* Web button */}
            <TouchableOpacity
              style={styles.webBtn}
              onPress={handleWebSubscribe}
              activeOpacity={0.85}
            >
              <Text style={styles.webBtnText}>Subscribe on the web — save 25%</Text>
            </TouchableOpacity>
            <Text style={styles.webNote}>
              No Apple fee — we pass the savings to you.
            </Text>

            {/* Restore */}
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={restoring}
              activeOpacity={0.7}
            >
              {restoring ? (
                <ActivityIndicator color="rgba(255,255,255,0.4)" size="small" />
              ) : (
                <Text style={styles.restoreText}>
                  Already subscribed? Restore purchases
                </Text>
              )}
            </TouchableOpacity>

            {/* Legal */}
            <Text style={styles.legal}>
              Subscription auto-renews. Cancel anytime. By subscribing you agree to our Terms of Service.
              {'\n'}Some HSA/FSA eligibility requires physician LMN.
            </Text>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const NAVY = '#1b2d4f';
const AMBER = '#d4a44c';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '95%',
    minHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.xl,
    padding: SPACING.sm,
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  heroRow: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: '#fff',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: AMBER,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  featureRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.lg + 4,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  featureTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#fff',
    marginBottom: 3,
  },
  featureBody: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },
  pricingBlock: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  price: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 32,
    color: AMBER,
    fontWeight: 'bold',
  },
  pricePer: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  priceSave: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  trial: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  appleBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.7 },
  appleBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: NAVY,
  },
  appleNote: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  orDivider: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginVertical: SPACING.md,
  },
  webBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  webBtnText: {
    fontFamily: FONTS.body,
    fontSize: 15,
    color: '#fff',
  },
  webNote: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  restoreBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  restoreText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  legal: {
    fontFamily: FONTS.body,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
});
