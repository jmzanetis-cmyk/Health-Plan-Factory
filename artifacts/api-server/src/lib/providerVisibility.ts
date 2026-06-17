import { providers } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const REVIEWER_PROFILE_ID = "00000000-0000-0000-0000-000000000099";

function realProviderConditions(): SQL<unknown> {
  return and(
    eq(providers.status, "approved"),
    eq(providers.isDemo, false),
    eq(providers.verificationStatus, "verified"),
    eq(providers.listingConsent, true),
    eq(providers.isActive, true),
    eq(providers.lifecycleState, "verified"),
  ) as SQL<unknown>;
}

/**
 * Drizzle WHERE predicate enforcing the provider visibility wall.
 *
 * Normal members (any id, or unauthenticated null/undefined):
 *   status='approved' AND is_demo=false AND verification_status='verified'
 *   AND listing_consent=true AND is_active=true AND lifecycle_state='verified'
 *
 * Reviewer (00000000-0000-0000-0000-000000000099) only:
 *   The above conditions OR (status='approved' AND is_demo=true)
 *   — demo providers are visible exclusively to this account.
 *
 * Fail-closed: null/undefined identity falls through to the normal-member
 * predicate (demo providers stay hidden). Never trust client-supplied identity.
 */
export function visibilityWhere(viewerProfileId: string | null | undefined): SQL<unknown> {
  if (viewerProfileId === REVIEWER_PROFILE_ID) {
    return or(
      and(eq(providers.status, "approved"), eq(providers.isDemo, true)) as SQL<unknown>,
      realProviderConditions(),
    ) as SQL<unknown>;
  }
  return realProviderConditions();
}
