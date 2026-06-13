import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListModalities, partialQuery } from "@workspace/api-client-react";
import type { ModalityRecord } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/apiBase";
import { PurchaseModal } from "@/components/PurchaseModal";

async function getToken() {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync("hpf_access_token");
}

async function fetchSubscriptionStatus(): Promise<{ isPlus: boolean; subscriptionStatus: string }> {
  const token = await getToken();
  const base = getApiBaseUrl();
  if (!token) return { isPlus: false, subscriptionStatus: "free" };
  try {
    const res = await fetch(`${base}/api/members/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { isPlus: false, subscriptionStatus: "free" };
    return res.json();
  } catch {
    return { isPlus: false, subscriptionStatus: "free" };
  }
}

type ModalityInfo = { id: string; name: string; emoji: string } | null;

type PlanItem = {
  id: string;
  modalityId?: string;
  modality?: ModalityInfo;
  frequency?: string;
  estimatedMonthlyCost?: number;
  rationale?: string;
  isDeprioritized?: boolean;
  sortOrder?: number;
  score?: number;
  nearbyProviderCount?: number | null;
};

type LatestPlan = {
  plan: {
    id: string;
    budget: number;
    totalMonthlyCost: number;
    status: string;
    createdAt: string;
  };
  items: PlanItem[];
};

async function fetchLatestPlan(profileId: string): Promise<LatestPlan | null> {
  const token = await getToken();
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/plans/${profileId}/latest`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load plan");
  return res.json();
}

const EVIDENCE_COLORS: Record<string, string> = {
  Strong: COLORS.sage,
  Moderate: COLORS.amber,
  Emerging: COLORS.sky,
  Limited: COLORS.textMuted,
};
const EVIDENCE_BG: Record<string, string> = {
  Strong: COLORS.sagePale,
  Moderate: COLORS.amberPale,
  Emerging: COLORS.skyPale,
  Limited: COLORS.off,
};

function EvidenceBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const color = EVIDENCE_COLORS[level] ?? COLORS.textMuted;
  const bg = EVIDENCE_BG[level] ?? COLORS.off;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + "30" }]}>
      <Text style={[styles.badgeText, { color }]}>{level}</Text>
    </View>
  );
}

function SubscriptionBadge({ isPlus, plusLabel, explorerLabel }: { isPlus: boolean; plusLabel: string; explorerLabel: string }) {
  if (isPlus) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
        <Feather name="star" size={10} color={COLORS.sage} />
        <Text style={[styles.badgeText, { color: COLORS.sage }]}>{plusLabel}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: COLORS.amberPale, borderColor: COLORS.amber + "30" }]}>
      <Feather name="lock" size={10} color={COLORS.amber} />
      <Text style={[styles.badgeText, { color: COLORS.amber }]}>{explorerLabel}</Text>
    </View>
  );
}

function ProviderCountChip({ count, isTelehealth, telehealthLabel, noLocalLabel, nearYouLabel }: {
  count?: number | null;
  isTelehealth?: boolean;
  telehealthLabel: string;
  noLocalLabel: string;
  nearYouLabel: (count: number) => string;
}) {
  if (isTelehealth) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
        <Feather name="globe" size={10} color={COLORS.sage} />
        <Text style={[styles.badgeText, { color: COLORS.sage }]}>{telehealthLabel}</Text>
      </View>
    );
  }
  if (count == null) return null;
  if (count === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.off, borderColor: COLORS.border }]}>
        <Feather name="map-pin" size={10} color={COLORS.textMuted} />
        <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>{noLocalLabel}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
      <Feather name="map-pin" size={10} color={COLORS.sage} />
      <Text style={[styles.badgeText, { color: COLORS.sage }]}>{nearYouLabel(count)}</Text>
    </View>
  );
}

function PlanItemCard({
  item,
  modalityMap,
  isPlus,
}: {
  item: PlanItem;
  modalityMap: Record<string, ModalityRecord>;
  isPlus: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const name = item.modality?.name ?? modalityMap[item.modalityId ?? ""]?.name ?? "Modality";
  const emoji = item.modality?.emoji ?? modalityMap[item.modalityId ?? ""]?.emoji ?? "🌿";
  const evidenceLevel = modalityMap[item.modalityId ?? ""]?.evidenceLevel;
  const category = modalityMap[item.modalityId ?? ""]?.category;
  const isTelehealth = category === "telehealth";

  const noLocalProviders = item.nearbyProviderCount === 0 && !isTelehealth;

  return (
    <TouchableOpacity
      style={[styles.itemCard, item.isDeprioritized && styles.itemCardDeprio]}
      onPress={() => setExpanded((p) => !p)}
      activeOpacity={0.8}
    >
      <View style={styles.itemTop}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemEmoji}>{emoji}</Text>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, item.isDeprioritized && styles.itemNameDeprio]}>
              {name}
            </Text>
            {item.frequency ? (
              <Text style={styles.itemFreq}>{item.frequency}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.itemRight}>
          {item.estimatedMonthlyCost != null && (
            <Text style={styles.itemCost}>${item.estimatedMonthlyCost}/mo</Text>
          )}
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={COLORS.textMuted}
          />
        </View>
      </View>

      <View style={styles.badgeRow}>
        <EvidenceBadge level={evidenceLevel} />
        <SubscriptionBadge
          isPlus={isPlus}
          plusLabel={t("settings.plus")}
          explorerLabel={t("settings.explorer")}
        />
        {isPlus && (
          <ProviderCountChip
            count={item.nearbyProviderCount}
            isTelehealth={isTelehealth}
            telehealthLabel={t("plan.telehealth")}
            noLocalLabel={t("plan.noLocalProvidersChip")}
            nearYouLabel={(c) => t("plan.nearYou", { count: c })}
          />
        )}
      </View>

      {expanded && (
        <View style={styles.itemExpanded}>
          {item.rationale ? (
            <Text style={styles.itemRationale}>{item.rationale}</Text>
          ) : (
            <View style={styles.lockedRationale}>
              <Feather name="lock" size={14} color={COLORS.amber} />
              <Text style={styles.lockedText}>{t("plan.lockedRationale")}</Text>
            </View>
          )}
          {item.isDeprioritized && (
            <View style={styles.deprioNote}>
              <Feather name="info" size={12} color={COLORS.textMuted} />
              <Text style={styles.deprioText}>
                {noLocalProviders
                  ? t("plan.noLocalProviders")
                  : t("plan.deprioritized")}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [refreshing, setRefreshing] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  const { data: authData } = useGetCurrentAuthUser();
  const profileId = authData?.user?.id ?? "";

  const {
    data: planData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["latest-plan", profileId],
    queryFn: () => fetchLatestPlan(profileId),
    enabled: !!profileId,
    staleTime: 60_000,
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 120_000,
  });

  const hasProviderAccess =
    (subscriptionData?.isPlus ?? false) ||
    subscriptionData?.subscriptionStatus === "employer";

  const { data: modalities } = useListModalities(undefined, {
    query: partialQuery({ staleTime: 300_000 }),
  });

  const modalityMap: Record<string, ModalityRecord> = Object.fromEntries(
    (Array.isArray(modalities) ? modalities : []).map((m) => [m.id, m])
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function onUpgrade() {
    setPaywallVisible(true);
  }

  const sortedItems = [...(planData?.items ?? [])].sort(
    (a, b) =>
      (a.isDeprioritized ? 1 : 0) - (b.isDeprioritized ? 1 : 0) ||
      (a.sortOrder ?? 99) - (b.sortOrder ?? 99)
  );

  const priorityItems = sortedItems.filter((i) => !i.isDeprioritized);
  const deprioItems = sortedItems.filter((i) => i.isDeprioritized);

  const totalCost = planData?.items.reduce(
    (acc, i) => acc + (i.estimatedMonthlyCost ?? 0),
    0
  ) ?? 0;

  const upgradeCard = !hasProviderAccess ? (
    <TouchableOpacity
      style={styles.upgradeCard}
      onPress={onUpgrade}
      activeOpacity={0.85}
    >
      <View style={styles.upgradeCardLeft}>
        <Feather name="star" size={18} color={COLORS.pink} />
        <View>
          <Text style={styles.upgradeCardTitle}>{t("plan.unlockProviders")}</Text>
          <Text style={styles.upgradeCardSub}>{t("plan.unlockProvidersSub")}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.pink} />
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("plan.title")}</Text>
        {planData && (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{planData.plan.status}</Text>
          </View>
        )}
      </View>

      <PurchaseModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchaseSuccess={() => refetch()}
      />

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
          <Text style={styles.loadingText}>{t("plan.loadingYourPlan")}</Text>
        </View>
      ) : !planData ? (
        <ScrollView contentContainerStyle={styles.emptyState} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyTitle}>{t("plan.noPlanYet")}</Text>
          <Text style={styles.emptyText}>{t("plan.noPlanText")}</Text>

          <TouchableOpacity
            style={styles.buildCard}
            onPress={() => router.push("/intake")}
            activeOpacity={0.85}
          >
            <Text style={styles.buildCardTitle}>Build Your Wellness Plan</Text>
            <Text style={styles.buildCardBody}>
              Complete the questionnaire on the web to generate your personalized wellness plan.
            </Text>
            <View style={styles.buildCardBtn}>
              <Text style={styles.buildCardBtnText}>Build My Plan</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.plusCard}>
            <Text style={styles.plusCardTitle}>Health Plan Factory Plus</Text>
            <Text style={styles.plusCardPrice}>$9.99/month or $89.99/year</Text>
            <View style={styles.plusFeatures}>
              {[
                "Unlimited provider reveals",
                "AI accountability coach",
                "HSA/FSA spending tracker",
                "Daily check-in and progress tracking",
                "Routine builder",
              ].map((f) => (
                <Text key={f} style={styles.plusFeatureItem}>{f}</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.plusCardBtn}
              onPress={() => Linking.openURL("https://healthplanfactory.com/pricing")}
              activeOpacity={0.85}
            >
              <Text style={styles.plusCardBtnText}>Subscribe at healthplanfactory.com</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={priorityItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PlanItemCard item={item} modalityMap={modalityMap} isPlus={hasProviderAccess} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
          ListHeaderComponent={
            <>
              <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{priorityItems.length}</Text>
                  <Text style={styles.summaryLabel}>{t("plan.modalities")}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>${planData.plan.budget}</Text>
                  <Text style={styles.summaryLabel}>{t("plan.budgetPerMonth")}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>${totalCost}</Text>
                  <Text style={styles.summaryLabel}>{t("plan.estCost")}</Text>
                </View>
              </View>
              {upgradeCard}
            </>
          }
          ListFooterComponent={
            <>
              {deprioItems.length > 0 && (
                <View style={styles.deprioSection}>
                  <Text style={styles.deprioSectionTitle}>{t("plan.alsoConsidered")}</Text>
                  {deprioItems.map((item) => (
                    <PlanItemCard key={item.id} item={item} modalityMap={modalityMap} isPlus={hasProviderAccess} />
                  ))}
                </View>
              )}
              <Text style={styles.footerText}>{t("plan.footerText")}</Text>
            </>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.navy },
  planBadge: {
    backgroundColor: COLORS.sagePale,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.sage + "30",
  },
  planBadgeText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.sage,
    fontWeight: "600" as const,
    textTransform: "capitalize",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  loadingText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },
  emptyState: {
    flexGrow: 1,
    alignItems: "stretch",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: 120,
    gap: SPACING.xl,
  },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy, textAlign: "center" },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  buildCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  buildCardTitle: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.navy },
  buildCardBody: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  buildCardBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  buildCardBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: COLORS.white },
  plusCard: {
    backgroundColor: "#1b2d4f",
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  plusCardTitle: { fontFamily: FONTS.heading, fontSize: 22, color: "#fff" },
  plusCardPrice: { fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,255,255,0.7)" },
  plusFeatures: { gap: SPACING.sm, marginVertical: SPACING.xs },
  plusFeatureItem: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  plusCardBtn: {
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xs,
  },
  plusCardBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: "#fff" },
  listContent: { paddingHorizontal: SPACING.xl, paddingBottom: 120, gap: SPACING.sm },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  summaryItem: { alignItems: "center" },
  summaryValue: {
    fontFamily: FONTS.body,
    fontSize: 20,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  summaryLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  itemCardDeprio: { opacity: 0.7 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flex: 1 },
  itemEmoji: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: FONTS.body,
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  itemNameDeprio: { color: COLORS.textMuted },
  itemFreq: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  itemRight: { alignItems: "flex-end", gap: 4 },
  itemCost: {
    fontFamily: FONTS.body,
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.amber,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontFamily: FONTS.body, fontSize: 11, fontWeight: "600" as const },
  itemExpanded: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  itemRationale: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  lockedRationale: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.amberPale,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  lockedText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.amber,
    flex: 1,
    lineHeight: 17,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.pink10,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.pink20,
    marginBottom: SPACING.sm,
  },
  upgradeCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    flex: 1,
  },
  upgradeCardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.navy,
  },
  upgradeCardSub: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  deprioNote: { flexDirection: "row", alignItems: "center", gap: 6 },
  deprioText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.textMuted },
  deprioSection: { marginTop: SPACING.xl, gap: SPACING.sm },
  deprioSectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  footerText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 16,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
});
