import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '@/lib/apiBase';
import { getCustomerInfo } from '@/lib/revenuecat';

async function fetchPlusStatus(): Promise<boolean> {
  // Check RevenueCat first (offline-capable)
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const rcPlus = await getCustomerInfo()
      .then(info => info?.entitlements.active['plus'] !== undefined)
      .catch(() => false);
    if (rcPlus) return true;
  }
  if (Platform.OS === 'web') return false;
  const token = await SecureStore.getItemAsync('hpf_access_token');
  if (!token) return false;
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/members/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return (
      data.isPlus === true ||
      data.subscriptionStatus === 'plus' ||
      data.subscriptionStatus === 'employer'
    );
  } catch { return false; }
}

export function usePlusAccess(): { isPlus: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: fetchPlusStatus,
    staleTime: 120_000,
  });
  return { isPlus: data ?? false, loading: isLoading };
}
