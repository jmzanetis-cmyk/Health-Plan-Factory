import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "@/constants/theme";
import { useListProviders, useListModalities } from "@workspace/api-client-react";

const MODALITY_FILTERS = ["All", "Acupuncture", "Yoga", "Massage", "Nutrition", "Chiropractic"];

type Provider = {
  id: string;
  name: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  acceptsTelehealth?: boolean | null;
  acceptsHsa?: boolean | null;
  costLow?: number | null;
  costHigh?: number | null;
  website?: string | null;
  phone?: string | null;
  credentials?: string[];
};

function ProviderCard({ provider }: { provider: Provider }) {
  function handleContact() {
    const options = [];
    if (provider.website) options.push({ title: "Visit Website", fn: () => Linking.openURL(provider.website!) });
    if (provider.phone) options.push({ title: "Call", fn: () => Linking.openURL(`tel:${provider.phone}`) });

    if (!options.length) {
      Alert.alert("Contact", "No contact info available. Unlock on the web app.");
      return;
    }
    if (options.length === 1) {
      options[0].fn();
      return;
    }
    Alert.alert(
      "Contact Provider",
      provider.name,
      options.map((o) => ({ text: o.title, onPress: o.fn })).concat([{ text: "Cancel" }])
    );
  }

  const costRange =
    provider.costLow != null || provider.costHigh != null
      ? `$${provider.costLow ?? "?"}–$${provider.costHigh ?? "?"}/session`
      : null;

  return (
    <View style={styles.providerCard}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {provider.name?.charAt(0)?.toUpperCase() ?? "P"}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
            {provider.city && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={11} color={COLORS.textMuted} />
                <Text style={styles.locationText}>
                  {provider.city}{provider.state ? `, ${provider.state}` : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={handleContact}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={14} color={COLORS.navy} />
        </TouchableOpacity>
      </View>

      {provider.bio ? (
        <Text style={styles.bioText} numberOfLines={2}>
          {provider.bio}
        </Text>
      ) : null}

      <View style={styles.tagRow}>
        {provider.acceptsTelehealth && (
          <View style={[styles.tag, styles.tagTelehealth]}>
            <Feather name="video" size={10} color={COLORS.sky} />
            <Text style={[styles.tagText, { color: COLORS.sky }]}>Telehealth</Text>
          </View>
        )}
        {provider.acceptsHsa && (
          <View style={[styles.tag, styles.tagHsa]}>
            <Feather name="credit-card" size={10} color={COLORS.sage} />
            <Text style={[styles.tagText, { color: COLORS.sage }]}>HSA</Text>
          </View>
        )}
        {costRange && (
          <View style={[styles.tag, styles.tagCost]}>
            <Text style={[styles.tagText, { color: COLORS.amber }]}>{costRange}</Text>
          </View>
        )}
      </View>

      {provider.credentials && provider.credentials.length > 0 && (
        <View style={styles.credRow}>
          {provider.credentials.slice(0, 3).map((cred) => (
            <View key={cred} style={styles.credBadge}>
              <Text style={styles.credText}>{cred}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const { data: providers, isLoading, refetch } = useListProviders(
    {
      limit: 20,
      page,
      search: search.length >= 2 ? search : undefined,
    },
    { query: { enabled: true } }
  );

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const providerList: Provider[] = (providers ?? []).filter((p: any) => p.isActive !== false);

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Vetted wellness providers</Text>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.textMuted} />
        <TextInput
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
        data={MODALITY_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(f) => f}
        contentContainerStyle={styles.filterContent}
        style={styles.filterList}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading && !providerList.length ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={COLORS.amber} />
          <Text style={styles.loadingText}>Finding providers…</Text>
        </View>
      ) : providerList.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptyText}>Try adjusting your search</Text>
        </View>
      ) : (
        <FlatList
          data={providerList}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProviderCard provider={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!providerList.length}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.amber} />
          }
          ListFooterComponent={
            providerList.length >= 20 ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.warm },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  title: { fontFamily: "serif", fontSize: 28, color: COLORS.navy },
  subtitle: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.navy,
    padding: 0,
  },
  filterList: { maxHeight: 44 },
  filterContent: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  filterText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
  },
  filterTextActive: { color: COLORS.white },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  emptyTitle: { fontFamily: "serif", fontSize: 22, color: COLORS.navy },
  emptyText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 120,
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  providerCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: { flexDirection: "row", gap: SPACING.md, flex: 1 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.navy10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "serif",
    fontSize: 18,
    color: COLORS.navy,
    fontWeight: "700" as const,
  },
  cardInfo: { flex: 1 },
  providerName: {
    fontFamily: "sans-serif",
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.navy,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  contactBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.navy10,
    alignItems: "center",
    justifyContent: "center",
  },
  bioText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagTelehealth: {
    backgroundColor: COLORS.skyPale,
    borderColor: COLORS.sky + "30",
  },
  tagHsa: {
    backgroundColor: COLORS.sagePale,
    borderColor: COLORS.sage + "30",
  },
  tagCost: {
    backgroundColor: COLORS.amberPale,
    borderColor: COLORS.amber10,
  },
  tagText: {
    fontFamily: "sans-serif",
    fontSize: 11,
    fontWeight: "500" as const,
  },
  credRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs },
  credBadge: {
    backgroundColor: COLORS.off,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  credText: {
    fontFamily: "sans-serif",
    fontSize: 10,
    color: COLORS.textMuted,
  },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  loadMoreText: {
    fontFamily: "sans-serif",
    fontSize: 14,
    color: COLORS.amber,
    fontWeight: "500" as const,
  },
});
