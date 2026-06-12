import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/lib/apiBase";

async function fetchPlusStatus(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const token = await SecureStore.getItemAsync("auth_session_token");
  if (!token) return false;
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/members/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isPlus === true || data.subscriptionStatus === "plus" || data.subscriptionStatus === "employer";
  } catch {
    return false;
  }
}

export function usePlusAccess(): { isPlus: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchPlusStatus,
    staleTime: 120_000,
  });
  return {
    isPlus: data ?? false,
    loading: isLoading,
  };
}
