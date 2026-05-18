import { useSubscription } from "./revenuecat";

/**
 * Returns whether the current user has Plus access.
 *
 * For Option C, Plus access is granted via a web-purchased Stripe subscription,
 * reflected in RevenueCat after the user signs in. In-app purchase is not active.
 * A RevenueCat entitlement named "plus" is the source of truth on mobile.
 */
export function usePlusAccess(): { isPlus: boolean; loading: boolean } {
  const { isSubscribed, isLoading } = useSubscription();
  return {
    isPlus: isSubscribed,
    loading: isLoading,
  };
}
