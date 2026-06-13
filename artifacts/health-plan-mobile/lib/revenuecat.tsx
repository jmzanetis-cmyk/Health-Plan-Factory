import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_APPLE_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? '';

const ENTITLEMENT_ID = 'plus';

export function initializeRevenueCat() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!REVENUECAT_APPLE_KEY) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: REVENUECAT_APPLE_KEY });
}

export async function loginRevenueCat(userId: string) {
  try { await Purchases.logIn(userId); }
  catch { /* silent */ }
}

export async function logoutRevenueCat() {
  try { await Purchases.logOut(); }
  catch { /* silent */ }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch { return null; }
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch { return false; }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch { return false; }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try { return await Purchases.getCustomerInfo(); }
  catch { return null; }
}

export async function isSubscribedViaIAP(): Promise<boolean> {
  const info = await getCustomerInfo();
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
