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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS, FONTS } from "@/constants/theme";
import { useListProviders, useListModalities } from "@workspace/api-client-react";
import type { ProviderRecord, ModalityRecord } from "@workspace/api-client-react";
import { EmergencyTextInput } from "@/components/EmergencyTextInput";

function ProviderCard({ provider }: { provider: ProviderRecord }) {
  function handleContact() {
    const options: Array<{ title: string; fn: () => void }> = [];
    if (provider.website)
      options.push({ title: "Visit Website", fn: () => Linking.openURL(provider.website!) });
    if (provider.phone)
      options.push({ title: "Call", fn: () => Linking.openURL(`tel:${provider.phone}`) });

    if (!options.length) {
      Alert.alert("Contact", "No contact info available. Unlock on the web app.");
      return;
    }
    if (options.length === 1) {
      options[0].fn();
      return;
    }
    Alert.alert("Contact " + provider.name, undefined, [
      ...options.map((o) => ({ text: o.title, onPress: o.fn })),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {provider.name.charAt(0).toUpperCase()}
          </Text>
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
                <Text style={[styles.tagText, { color: COLORS.sky }]}>Telehealth</Text>
              </View>
            )}
            {provider.acceptsInsurance && (
              <View style={[styles.tag, { backgroundColor: COLORS.sagePale }]}>
                <Feather name="shield" size={10} color={COLORS.sage} />
                <Text style={[styles.tagText, { color: COLORS.sage }]}>Insurance</Text>
              </View>
            )}
            {provider.costPerSession != null && (
              <View style={[styles.tag, { backgroundColor: COLORS.amberPale }]}>
                <Text style={[styles.tagText, { color: COLORS.amber }]}>
                  ${provider.costPerSession}/session
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {provider.bio ? (
        <Text style={styles.providerBio} numberOfLines={2}>{provider.bio}</Text>
      ) : null}
      <TouchableOpacity style={styles.contactBtn} onPress={handleContact} activeOpacity={0.85}>
        <Feather name="phone" size={14} color={COLORS.white} />
        <Text style={styles.contactBtnText}>Contact</Text>
      </TouchableOpacity>
    </View>
  );
}

function getModalityId(
  modalities: ModalityRecord[],
  filter: string
): string | undefined {
  if (filter === "All") return undefined;
  const found = modalities.find(
    (m) => m.name.toLowerCase() === filter.toLowerCase()
  );
  return found?.id;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [page] = useState(1);

  const { data: modalities } = useListModalities(undefined, {
    query: { staleTime: 300_000 },
  });

  const modalityFilters: string[] = ["All", ...(modalities ?? []).slice(0, 5).map((m) => m.name)];
  const selectedModalityId = getModalityId(modalities ?? [], selectedFilter);

  const { data: providers, isLoading, refetch } = useListProviders(
    {
      limit: 20,
      page,
      search: search.length >= 2 ? search : undefined,
      modalityId: selectedModalityId,
    },
    { query: { enabled: true } }
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const providerList: ProviderRecord[] = (providers ?? []).filter(
    (p) => p.status === "active" || p.status === "approved"
  );

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Vetted wellness providers</Text>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.textMuted} />
        <EmergencyTextInput
          style={styles.searchInput}
          placeholder="Search providers..."
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
        data={modalityFilters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContent}
        style={styles.filterList}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === filter && styles.filterChipActive]}
            onPress={() => setSelectedFilter(filter)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
          <Text style={styles.loadingText}>Loading providers…</Text>
        </View>
      ) : (
        <FlatList
          data={providerList}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProviderCard provider={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.amber}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={36} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No providers found</Text>
              <Text style={styles.emptyText}>
                {selectedFilter !== "All"
                  ? `No ${selectedFilter} providers listed yet.`
                  : "Try a different search."}
              </Text>
            </View>
          }
        />
      )}
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
  filterText: {
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  filterTextActive: { color: COLORS.white, fontWeight: "600" as const },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
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
});
