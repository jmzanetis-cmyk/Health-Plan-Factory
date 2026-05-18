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
  Linking,
  Alert,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useListModalities, partialQuery } from "@workspace/api-client-react";
import type { ModalityRecord } from "@workspace/api-client-react";
import { EmergencyTextInput } from "@/components/EmergencyTextInput";
import { getApiBaseUrl } from "@/lib/apiBase";
import { PlusPaywall } from "@/components/PlusPaywall";
import { usePlusAccess } from "@/lib/subscription";

async function getToken() {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync("auth_session_token");
}

type ProviderRecord = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  bio?: string | null;
  phone?: string | null;
  website?: string | null;
  offersTelehealth?: boolean;
  acceptsInsurance?: boolean;
  costPerSession?: number | null;
  status?: string;
};

type ProvidersResponse = {
  locked: boolean;
  count: number;
  providers: ProviderRecord[];
};

async function fetchProviders(params: {
  search?: string;
  modalityId?: string;
  limit?: number;
  page?: number;
}): Promise<ProvidersResponse> {
  const token = await getToken();
  const base = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.modalityId) query.set("modalityId", params.modalityId);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.page) query.set("page", String(params.page));

  const res = await fetch(`${base}/api/providers?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load providers");
  const data = await res.json();
  if (Array.isArray(data)) {
    return { locked: false, count: data.length, providers: data };
  }
  return data as ProvidersResponse;
}

async function handleWebUpgrade(upgradeLabel: string, couldNotCheckout: string, noCheckoutUrl: string, couldNotConnect: string) {
  const token = await getToken();
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/subscriptions/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      Alert.alert(upgradeLabel, couldNotCheckout);
      return;
    }
    const { checkout_url } = await res.json();
    if (checkout_url) {
      await Linking.openURL(checkout_url);
    } else {
      Alert.alert(upgradeLabel, noCheckoutUrl);
    }
  } catch {
    Alert.alert(upgradeLabel, couldNotConnect);
  }
}

function LockedProvidersPlaceholder({ count, onOpenPaywall }: { count: number; onOpenPaywall: () => void }) {
  const [loading, setLoading] = useState(false);
  const isNative = Platform.OS === "ios" || Platform.OS === "android";
  const { t } = useTranslation();

  async function onUpgrade() {
    if (isNative) {
      onOpenPaywall();
      return;
    }
    setLoading(true);
    await handleWebUpgrade(
      t("discover.upgradeLabel"),
      t("discover.couldNotCheckout"),
      t("discover.noCheckoutUrl"),
      t("discover.couldNotConnect")
    );
    setLoading(false);
  }

  return (
    <View style={lockedStyles.container}>
      <View style={lockedStyles.iconWrap}>
        <Feather name="lock" size={32} color={COLORS.pink} />
      </View>
      <Text style={lockedStyles.title}>
        {count > 0 ? t("discover.matchedProviders", { count }) : t("discover.providersAvailable")}
      </Text>
      <Text style={lockedStyles.subtitle}>{t("discover.upgradeToView")}</Text>
      <TouchableOpacity
        style={lockedStyles.upgradeBtn}
        onPress={onUpgrade}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Feather name="star" size={15} color={COLORS.white} />
            <Text style={lockedStyles.upgradeBtnText}>{t("discover.upgradePlus")}</Text>
          </>
        )}
      </TouchableOpacity>
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <View key={i} style={lockedStyles.blurCard}>
          <View style={lockedStyles.blurAvatar} />
          <View style={lockedStyles.blurLines}>
            <View style={[lockedStyles.blurLine, { width: "60%" }]} />
            <View style={[lockedStyles.blurLine, { width: "40%", opacity: 0.5 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const lockedStyles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.pink10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  title: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.navy, textAlign: "center" },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.pink ?? COLORS.amber,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  upgradeBtnText: {
    fontFamily: FONTS.bodySemiBold ?? FONTS.body,
    fontSize: 15,
    color: COLORS.white,
    fontWeight: "600" as const,
  },
  blurCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: "100%",
    opacity: 0.4,
  },
  blurAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.navy20 ?? COLORS.border,
  },
  blurLines: { flex: 1, gap: SPACING.sm },
  blurLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.border },
});

function ProviderCard({ provider, isPlus }: { provider: ProviderRecord; isPlus: boolean }) {
  const { t } = useTranslation();

  function handleContact() {
    const options: Array<{ title: string; fn: () => void }> = [];
    if (provider.website)
      options.push({ title: t("discover.visitWebsite"), fn: () => Linking.openURL(provider.website!) });
    if (provider.phone)
      options.push({ title: t("discover.call"), fn: () => Linking.openURL(`tel:${provider.phone}`) });

    if (!options.length) {
      Alert.alert(t("discover.contact"), t("discover.noContactInfo"));
      return;
    }
    if (options.length === 1) {
      options[0].fn();
      return;
    }
    Alert.alert(t("discover.contact") + " " + provider.name, undefined, [
      ...options.map((o) => ({ text: o.title, onPress: o.fn })),
      { text: t("common.cancel"), style: "cancel" },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{provider.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.name}</Text>
          {(provider.city || provider.state) && (
            <Text style={styles.providerLocation}>
              {[provider.city, provider.state].filter(Boolean).join(", ")}
            </Text>
          )}
          <View style={styles.tagRow}>
            {provider.offersTelehealth && (
              <View style={styles.tag}>
                <Feather name="video" size={10} color={COLORS.sky} />
                <Text style={[styles.tagText, { color: COLORS.sky }]}>{t("discover.telehealth")}</Text>
              </View>
            )}
            {provider.acceptsInsurance && (
              <View style={[styles.tag, { backgroundColor: COLORS.sagePale }]}>
                <Feather name="shield" size={10} color={COLORS.sage} />
                <Text style={[styles.tagText, { color: COLORS.sage }]}>{t("discover.insurance")}</Text>
              </View>
            )}
            {provider.costPerSession != null && (
              <View style={[styles.tag, { backgroundColor: COLORS.amberPale }]}>
                <Text style={[styles.tagText, { color: COLORS.amber }]}>
                  ${provider.costPerSession}/{t("discover.session")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {provider.bio ? (
        <Text style={styles.providerBio} numberOfLines={2}>{provider.bio}</Text>
      ) : null}
      {isPlus ? (
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact} activeOpacity={0.85}>
          <Feather name="phone" size={14} color={COLORS.white} />
          <Text style={styles.contactBtnText}>{t("discover.contact")}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedContactHint}>
          <Feather name="lock" size={13} color={COLORS.textMuted} />
          <Text style={styles.lockedContactText}>Sign in with Plus to see contact details</Text>
        </View>
      )}
    </View>
  );
}

function getModalityId(modalities: ModalityRecord[], filter: string): string | undefined {
  if (filter === "All") return undefined;
  const found = modalities.find((m) => m.name.toLowerCase() === filter.toLowerCase());
  return found?.id;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [page] = useState(1);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { t } = useTranslation();

  const { data: modalities } = useListModalities(undefined, {
    query: partialQuery({ staleTime: 300_000 }),
  });

  const modalityFilters: string[] = ["All", ...(modalities ?? []).slice(0, 5).map((m) => m.name)];
  const selectedModalityId = getModalityId(modalities ?? [], selectedFilter);

  const queryParams = {
    search: search.length >= 2 ? search : undefined,
    modalityId: selectedModalityId,
    limit: 20,
    page,
  };

  const { data: providersData, isLoading, refetch } = useQuery({
    queryKey: ["providers", queryParams],
    queryFn: () => fetchProviders(queryParams),
    staleTime: 60_000,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const { isPlus } = usePlusAccess();
  const isLocked = providersData?.locked === true && !isPlus;
  const lockedCount = providersData?.count ?? 0;
  const providerList = (providersData?.providers ?? []).filter(
    (p) => p.status === "active" || p.status === "approved"
  );

  const allFilterLabel = t("discover.all");
  const displayFilters = modalityFilters.map((f) => (f === "All" ? allFilterLabel : f));

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("discover.title")}</Text>
        <Text style={styles.subtitle}>{t("discover.subtitle")}</Text>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.textMuted} />
        <EmergencyTextInput
          style={styles.searchInput}
          placeholder={t("discover.searchPlaceholder")}
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayFilters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContent}
        style={styles.filterList}
        renderItem={({ item: filter, index }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === modalityFilters[index] && styles.filterChipActive]}
            onPress={() => setSelectedFilter(modalityFilters[index] ?? "All")}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, selectedFilter === modalityFilters[index] && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
          <Text style={styles.loadingText}>{t("discover.loading")}</Text>
        </View>
      ) : isLocked ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyExtractor={() => ""}
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
          ListEmptyComponent={
            <LockedProvidersPlaceholder count={lockedCount} onOpenPaywall={() => setPaywallVisible(true)} />
          }

        />
      ) : (
        <FlatList
          data={providerList}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProviderCard provider={item} isPlus={isPlus} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>{t("discover.noResults")}</Text>
              <Text style={styles.emptyText}>
                {selectedFilter !== "All" && selectedFilter !== allFilterLabel
                  ? t("discover.noModalityProviders", { modality: selectedFilter })
                  : t("discover.tryDifferentSearch")}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={paywallVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPaywallVisible(false)}
      >
        <PlusPaywall feature="provider_details" />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm },
  title: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.navy },
  subtitle: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },
  filterList: { maxHeight: 44 },
  filterContent: { paddingHorizontal: SPACING.xl, gap: SPACING.sm, paddingVertical: SPACING.xs },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  filterText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.textMuted },
  filterTextActive: { color: COLORS.white, fontWeight: "600" as const },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.md },
  loadingText: { fontFamily: FONTS.body, fontSize: 14, color: COLORS.textMuted },
  listContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: 120, gap: SPACING.sm },
  emptyState: {
    alignItems: "center",
    paddingTop: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyTitle: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.navy },
  emptyText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  cardTop: { flexDirection: "row", gap: SPACING.md },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: FONTS.body,
    fontSize: 18,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  providerInfo: { flex: 1 },
  providerName: {
    fontFamily: FONTS.body,
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  providerLocation: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: SPACING.xs },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.skyPale,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    fontWeight: "600" as const,
  },
  providerBio: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
  },
  contactBtnText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.white,
  },
  lockedContactHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.off,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockedContactText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
