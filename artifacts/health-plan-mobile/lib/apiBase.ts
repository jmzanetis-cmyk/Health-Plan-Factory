/**
 * Returns the base URL for the Health Plan Factory API.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL  — set in eas.json env for preview/production builds
 *  2. EXPO_PUBLIC_DOMAIN   — set automatically by Replit for dev environment
 *  3. Empty string         — indicates misconfiguration; API calls will fail
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}
