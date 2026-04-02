export interface NPIProvider {
  id: string;
  npi: string;
  name: string;
  credential: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hsaEligible: boolean;
  tags: string[];
}

interface NPIRawResult {
  number: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    credential?: string;
    authorized_official_first_name?: string;
    authorized_official_last_name?: string;
  };
  addresses?: Array<{
    address_purpose: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    telephone_number?: string;
  }>;
  taxonomies?: Array<{
    code: string;
    desc?: string;
    primary?: boolean;
  }>;
}

interface NPIApiResponse {
  result_count?: number;
  results?: NPIRawResult[];
  Errors?: unknown[];
}

export function parseNPIProvider(raw: NPIRawResult, hsaEligible: boolean): NPIProvider {
  const basic = raw.basic || {};
  const addresses = raw.addresses || [];
  const taxonomies = raw.taxonomies || [];

  const primary =
    addresses.find((a) => a.address_purpose === "LOCATION") || addresses[0] || {};
  const taxonomy = taxonomies.find((t) => t.primary) || taxonomies[0] || {};

  const firstName = basic.first_name || basic.authorized_official_first_name || "";
  const lastName = basic.last_name || basic.authorized_official_last_name || "";
  const orgName = basic.organization_name || "";
  const baseName = orgName || `${firstName} ${lastName}`.trim() || "Unknown Provider";
  const credential = basic.credential?.trim() || "";

  const street = [primary.address_1, primary.address_2].filter(Boolean).join(", ");

  return {
    id: raw.number,
    npi: raw.number,
    name: credential ? `${baseName}, ${credential}` : baseName,
    credential,
    specialty: taxonomy.desc || "",
    address: street,
    city: primary.city || "",
    state: primary.state || "",
    zip: (primary.postal_code || "").slice(0, 5),
    phone: primary.telephone_number || "",
    hsaEligible,
    tags: [taxonomy.desc].filter(Boolean) as string[],
  };
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

export interface NPISearchOptions {
  taxonomy: string;
  hsaEligible: boolean;
  taxonomyDesc?: string;
  /** Optional 2-letter US state code */
  state?: string;
  /** Optional city name */
  city?: string;
  /** Optional 5-digit ZIP (still supported for backward compat) */
  zip?: string;
  limit?: number;
}

/**
 * Fetch licensed practitioners from the CMS NPI Registry.
 * All location params (state, city, zip) are optional — omitting all performs
 * a nationwide search.
 * Routes through the backend proxy at /api/npi to avoid browser CORS restrictions.
 */
export async function fetchNPIProviders(options: NPISearchOptions): Promise<NPIProvider[]> {
  const { taxonomy, hsaEligible, taxonomyDesc, state, city, zip, limit = 50 } = options;

  const params = new URLSearchParams({
    taxonomy,
    limit: String(limit),
  });
  if (taxonomyDesc) params.set("taxonomyDesc", taxonomyDesc);
  if (state && state.length === 2) params.set("state", state);
  if (city && city.trim()) params.set("city", city.trim());
  if (zip && /^\d{5}$/.test(zip)) params.set("zip", zip);

  const res = await fetch(`${BASE}/api/npi?${params.toString()}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`NPI Registry returned HTTP ${res.status}.`);

  const data: NPIApiResponse = await res.json();
  if (data.Errors && Array.isArray(data.Errors) && data.Errors.length > 0) {
    return [];
  }

  const all: NPIRawResult[] = data.results || [];
  const prefix4 = taxonomy.slice(0, 4);

  const filtered = all.filter((r) =>
    (r.taxonomies || []).some(
      (t) => t.code === taxonomy || t.code?.startsWith(prefix4),
    ),
  );

  const results = filtered.length > 0 ? filtered : all;
  return results.map((r) => parseNPIProvider(r, hsaEligible));
}

/**
 * @deprecated Use fetchNPIProviders() instead.
 * Kept for backward compatibility with any callers that pass a ZIP.
 */
export async function fetchNPIByZipAndTaxonomy(
  zip: string,
  taxonomyCode: string,
  hsaEligible: boolean,
  taxonomyDesc?: string,
  limit = 50,
): Promise<NPIProvider[]> {
  return fetchNPIProviders({ taxonomy: taxonomyCode, hsaEligible, taxonomyDesc, zip, limit });
}
