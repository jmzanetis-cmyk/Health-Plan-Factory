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

/**
 * Fetch licensed practitioners from the CMS NPI Registry by ZIP code and taxonomy.
 * Routes through the backend proxy at /api/npi to avoid browser CORS restrictions.
 * The backend passes `taxonomy_description` to the NPI API for server-side filtering.
 */
export async function fetchNPIByZipAndTaxonomy(
  zip: string,
  taxonomyCode: string,
  hsaEligible: boolean,
  taxonomyDesc?: string,
  limit = 50,
): Promise<NPIProvider[]> {
  const zip5 = zip.replace(/\D/g, "").slice(0, 5);
  if (zip5.length < 5) throw new Error("Please enter a valid 5-digit ZIP code.");

  const params = new URLSearchParams({
    zip: zip5,
    taxonomy: taxonomyCode,
    limit: String(limit),
  });
  if (taxonomyDesc) {
    params.set("taxonomyDesc", taxonomyDesc);
  }

  const res = await fetch(`${BASE}/api/npi?${params.toString()}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`NPI Registry returned HTTP ${res.status}.`);

  const data: NPIApiResponse = await res.json();
  if (data.Errors && Array.isArray(data.Errors) && data.Errors.length > 0) {
    return [];
  }

  const all: NPIRawResult[] = data.results || [];
  const prefix4 = taxonomyCode.slice(0, 4);

  // Client-side filter by taxonomy code for extra precision (NPI API does desc keyword filtering)
  const filtered = all.filter((r) =>
    (r.taxonomies || []).some(
      (t) => t.code === taxonomyCode || t.code?.startsWith(prefix4),
    ),
  );

  // If server-side desc filtering returned results but none match the exact code,
  // return all server-side results (they matched the taxonomy_description keyword)
  const results = filtered.length > 0 ? filtered : all;
  return results.map((r) => parseNPIProvider(r, hsaEligible));
}
