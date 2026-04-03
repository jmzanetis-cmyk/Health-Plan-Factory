/**
 * Returns the base URL prefix for all API calls.
 *
 * In development (Replit): relative path, e.g. "" (same origin, proxied to port 8080)
 * In production (Netlify): VITE_API_BASE_URL if set, otherwise relative (same origin)
 *
 * Set VITE_API_BASE_URL in Netlify's environment variables to point at the
 * deployed API server, e.g. https://healthplanfactory.YOUR-REPL.repl.co
 */
export function getApiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, "");
  return import.meta.env.BASE_URL.replace(/\/+$/, "");
}
