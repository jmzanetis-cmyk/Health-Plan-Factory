import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "plus";

function getRevenueCatApiKey(): string {
  if (!REVENUECAT_TEST_API_KEY) {
    throw new Error("RevenueCat test API key not configured");
  }

  const isStoreClient = Constants.executionEnvironment === "storeClient";

  if (__DEV__ || Platform.OS === "web" || isStoreClient) {
    return REVENUECAT_TEST_API_KEY;
  }

  if (
    Platform.OS === "ios" &&
    REVENUECAT_IOS_API_KEY &&
    REVENUECAT_IOS_API_KEY !== "REPLACE_WITH_IOS_KEY"
  ) {
    return REVENUECAT_IOS_API_KEY;
  }

  if (
    Platform.OS === "android" &&
    REVENUECAT_ANDROID_API_KEY &&
    REVENUECAT_ANDROID_API_KEY !== "REPLACE_WITH_ANDROID_KEY"
  ) {
    return REVENUECAT_ANDROID_API_KEY;
  }

  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  if (__DEV__) {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey });
}

export async function loginRevenueCat(appUserId: string): Promise<void> {
  try {
    await Purchases.logIn(appUserId);
    if (__DEV__) {
      console.log("[RevenueCat] User logged in");
    }
  } catch (e) {
    console.warn("[RevenueCat] logIn failed:", e);
  }
}

export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    if (__DEV__) {
      console.log("[RevenueCat] Logged out");
    }
  } catch (e) {
    console.warn("[RevenueCat] logOut failed:", e);
  }
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async (): Promise<CustomerInfo> => {
      return Purchases.getCustomerInfo();
    },
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      return Purchases.getOfferings();
    },
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage): Promise<CustomerInfo> => {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => {
      customerInfoQuery.refetch();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (): Promise<CustomerInfo> => {
      return Purchases.restorePurchases();
    },
    onSuccess: () => {
      customerInfoQuery.refetch();
    },
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    isOfferingsLoading: offeringsQuery.isLoading,
    customerInfoError: customerInfoQuery.error,
    offeringsError: offeringsQuery.error,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    refetchCustomerInfo: customerInfoQuery.refetch,
    refetchOfferings: offeringsQuery.refetch,
  };
}

export { PURCHASES_ERROR_CODE };

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
