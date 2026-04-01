import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useGetCurrentAuthUser, useListModalities } from "@workspace/api-client-react";
import type { ModalityRecord } from "@workspace/api-client-react";

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

async function getToken() {
  return SecureStore.getItemAsync("auth_session_token");
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

function UnlockBadge({ score }: { score?: number }) {
  const unlocked = (score ?? 0) >= 60;
  if (unlocked) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
        <Feather name="unlock" size={10} color={COLORS.sage} />
        <Text style={[styles.badgeText, { color: COLORS.sage }]}>Unlocked</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: COLORS.amberPale, borderColor: COLORS.amber + "30" }]}>
      <Feather name="lock" size={10} color={COLORS.amber} />
      <Text style={[styles.badgeText, { color: COLORS.amber }]}>Reveal on Web</Text>
    </View>
  );
}

function ProviderCountChip({ count, isTelehealth }: { count?: number | null; isTelehealth?: boolean }) {
  if (isTelehealth) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
        <Feather name="globe" size={10} color={COLORS.sage} />
        <Text style={[styles.badgeText, { color: COLORS.sage }]}>Telehealth</Text>
      </View>
    );
  }
  if (count == null) return null;
  if (count === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: COLORS.off, borderColor: COLORS.border }]}>
        <Feather name="map-pin" size={10} color={COLORS.textMuted} />
        <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>No local providers</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: COLORS.sagePale, borderColor: COLORS.sage + "30" }]}>
      <Feather name="map-pin" size={10} color={COLORS.sage} />
      <Text style={[styles.badgeText, { color: COLORS.sage }]}>{count} near you</Text>
    </View>
  );
}

function PlanItemCard({
  item,
  modalityMap,
}: {
  item: PlanItem;
  modalityMap: Record<string, ModalityRecord>;
}) {
  const [expanded, setExpanded] = useState(false);
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
        <UnlockBadge score={item.score} />
        <ProviderCountChip count={item.nearbyProviderCount} isTelehealth={isTelehealth} />
      </View>

      {expanded && (
        <View style={styles.itemExpanded}>
          {item.rationale ? (
            <Text style={styles.itemRationale}>{item.rationale}</Text>
          ) : (
            <View style={styles.lockedRationale}>
              <Feather name="lock" size={14} color={COLORS.amber} />
              <Text style={styles.lockedText}>
                Unlock the full rationale on the HealthPlanFactory web app.
              </Text>
            </View>
          )}
          {item.isDeprioritized && (
            <View style={styles.deprioNote}>
              <Feather name="info" size={12} color={COLORS.textMuted} />
              <Text style={styles.deprioText}>
                {noLocalProviders
                  ? "No in-person providers found in your area"
                  : "Deprioritized based on your preferences"}
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

  const { data: modalities } = useListModalities(undefined, {
    query: { staleTime: 300_000 },
  });

  const modalityMap: Record<string, ModalityRecord> = Object.fromEntries(
    (modalities ?? []).map((m) => [m.id, m])
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plan</Text>
        {planData && (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{planData.plan.status}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
          <Text style={styles.loadingText}>Loading your plan…</Text>
        </View>
      ) : !planData ? (
        <View style={styles.emptyState}>
          <Feather name="clipboard" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyText}>
            Complete the questionnaire in the web app to generate your personalized wellness plan.
          </Text>
        </View>
      ) : (
        <FlatList
          data={priorityItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PlanItemCard item={item} modalityMap={modalityMap} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{priorityItems.length}</Text>
                <Text style={styles.summaryLabel}>Modalities</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>${planData.plan.budget}</Text>
                <Text style={styles.summaryLabel}>Budget/mo</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>${totalCost}</Text>
                <Text style={styles.summaryLabel}>Est. Cost</Text>
              </View>
            </View>
          }
          ListFooterComponent={
            <>
              {deprioItems.length > 0 && (
                <View style={styles.deprioSection}>
                  <Text style={styles.deprioSectionTitle}>Also Considered</Text>
                  {deprioItems.map((item) => (
                    <PlanItemCard key={item.id} item={item} modalityMap={modalityMap} />
                  ))}
                </View>
              )}
              <Text style={styles.footerText}>
                Tap any item for details. Not medical advice — discuss with your provider.
              </Text>
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.navy },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
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
