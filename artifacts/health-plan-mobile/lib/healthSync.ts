import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "@/lib/apiBase";

export type HealthSource = "apple_health" | "google_fit";

export interface HealthConnectionState {
  appleHealth: boolean;
  googleFit: boolean;
  lastSynced: string | null;
}

export interface DailyHealthMetrics {
  date: string;
  steps: number | null;
  sleepMinutes: number | null;
  activeMinutes: number | null;
  mindfulnessMinutes: number | null;
  source: HealthSource;
}

function connectionKey(profileId?: string): string {
  return profileId ? `health_connections_v2_${profileId}` : "health_connections_v2_guest";
}

export async function loadConnectionState(profileId?: string): Promise<HealthConnectionState> {
  try {
    const raw = await SecureStore.getItemAsync(connectionKey(profileId));
    if (raw) return JSON.parse(raw) as HealthConnectionState;
  } catch {}
  return { appleHealth: false, googleFit: false, lastSynced: null };
}

export async function saveConnectionState(state: HealthConnectionState, profileId?: string): Promise<void> {
  await SecureStore.setItemAsync(connectionKey(profileId), JSON.stringify(state));
}

export async function requestHealthPermissions(source: HealthSource): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (source === "apple_health" && Platform.OS === "ios") {
    return await requestAppleHealthPermissions();
  }
  if (source === "google_fit" && Platform.OS === "android") {
    return await requestGoogleFitPermissions();
  }
  return false;
}

async function requestAppleHealthPermissions(): Promise<boolean> {
  try {
    // @ts-ignore - react-native-health is a native module, only available in native builds
    const HealthKit = await import("react-native-health").catch(() => null);
    if (!HealthKit) {
      return false;
    }
    const AppleHealthKit = HealthKit.default;
    const { Permissions } = HealthKit;

    return new Promise<boolean>((resolve) => {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: [
              Permissions.Steps,
              Permissions.SleepAnalysis,
              Permissions.ActiveEnergyBurned,
              Permissions.MindfulSession,
            ],
            write: [],
          },
        },
        (err: Error | null) => {
          resolve(!err);
        }
      );
    });
  } catch {
    return false;
  }
}

async function requestGoogleFitPermissions(): Promise<boolean> {
  try {
    // @ts-ignore - react-native-google-fit is a native module, only available in native builds
    const GoogleFit = await import("react-native-google-fit").catch(() => null);
    if (!GoogleFit) {
      return false;
    }
    const gf = GoogleFit.default;
    const { Scopes } = GoogleFit;

    const authResult = await gf.authorize({
      scopes: [
        Scopes.FITNESS_ACTIVITY_READ,
        Scopes.FITNESS_SLEEP_READ,
        Scopes.FITNESS_BODY_READ,
      ],
    });
    return authResult?.success ?? false;
  } catch {
    return false;
  }
}

export async function readTodaysHealthData(source: HealthSource): Promise<DailyHealthMetrics | null> {
  if (Platform.OS === "web") return null;

  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  if (source === "apple_health" && Platform.OS === "ios") {
    return readAppleHealthData(startOfDay, endOfDay);
  }
  if (source === "google_fit" && Platform.OS === "android") {
    return readGoogleFitData(startOfDay, endOfDay);
  }
  return null;
}

async function readAppleHealthData(start: Date, end: Date): Promise<DailyHealthMetrics | null> {
  try {
    // @ts-ignore - react-native-health is a native module, only available in native builds
    const HealthKit = await import("react-native-health").catch(() => null);
    if (!HealthKit) return null;
    const AppleHealthKit = HealthKit.default;

    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    const steps = await new Promise<number | null>((resolve) => {
      AppleHealthKit.getStepCount(options, (err: Error | null, result: { value?: number } | null) => {
        if (err || !result) resolve(null);
        else resolve(result.value ?? null);
      });
    });

    const sleepMinutes = await new Promise<number | null>((resolve) => {
      AppleHealthKit.getSleepSamples(
        { ...options, limit: 1 },
        (err: Error | null, results: Array<{ startDate: string; endDate: string; value: string }>) => {
          if (err || !results?.length) { resolve(null); return; }
          const totalMs = results.reduce((acc, s) => {
            if (s.value === "ASLEEP" || s.value === "INBED") {
              const diff = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
              return acc + diff;
            }
            return acc;
          }, 0);
          resolve(totalMs > 0 ? Math.round(totalMs / 60000) : null);
        }
      );
    });

    const activeMinutes = await new Promise<number | null>((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(options, (err: Error | null, results: Array<{ value: number; startDate: string; endDate: string }>) => {
        if (err || !results?.length) { resolve(null); return; }
        const totalMins = results.reduce((acc, s) => {
          const mins = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          return acc + (s.value > 0 ? mins : 0);
        }, 0);
        resolve(Math.round(totalMins));
      });
    });

    const mindfulnessMinutes = await new Promise<number | null>((resolve) => {
      AppleHealthKit.getMindfulSession(options, (err: Error | null, results: Array<{ startDate: string; endDate: string }>) => {
        if (err || !results?.length) { resolve(null); return; }
        const total = results.reduce((acc, s) => {
          return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
        }, 0);
        resolve(Math.round(total));
      });
    });

    return {
      date: start.toISOString().slice(0, 10),
      steps,
      sleepMinutes,
      activeMinutes,
      mindfulnessMinutes,
      source: "apple_health",
    };
  } catch {
    return null;
  }
}

async function readGoogleFitData(start: Date, end: Date): Promise<DailyHealthMetrics | null> {
  try {
    // @ts-ignore - react-native-google-fit is a native module, only available in native builds
    const GoogleFit = await import("react-native-google-fit").catch(() => null);
    if (!GoogleFit) return null;
    const gf = GoogleFit.default;

    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      bucketUnit: "DAY" as const,
      bucketInterval: 1,
    };

    const stepsRes = await gf.getDailyStepCountSamples(options).catch(() => null);
    const steps = stepsRes
      ? stepsRes.reduce((acc: number, s: { steps?: Array<{ value: number }> }) => {
          return acc + (s.steps?.[0]?.value ?? 0);
        }, 0)
      : null;

    const sleepRes = await gf.getSleepSamples(options).catch(() => null);
    const sleepMinutes = sleepRes?.length
      ? Math.round(sleepRes.reduce((acc: number, s: { startDate: string; endDate: string }) => {
          return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
        }, 0))
      : null;

    const actRes = await gf.getDailyActivitySamples(options).catch(() => null);
    const activeMinutes = actRes?.length
      ? actRes.reduce((acc: number, s: { duration?: number }) => acc + (s.duration ?? 0), 0)
      : null;

    return {
      date: start.toISOString().slice(0, 10),
      steps: steps || null,
      sleepMinutes,
      activeMinutes,
      mindfulnessMinutes: null,
      source: "google_fit",
    };
  } catch {
    return null;
  }
}

export async function syncHealthData(profileId: string): Promise<DailyHealthMetrics | null> {
  const state = await loadConnectionState(profileId);
  let metrics: DailyHealthMetrics | null = null;

  if (state.appleHealth && Platform.OS === "ios") {
    metrics = await readTodaysHealthData("apple_health");
  } else if (state.googleFit && Platform.OS === "android") {
    metrics = await readTodaysHealthData("google_fit");
  }

  if (metrics) {
    const pushed = await pushHealthMetricsToApi(profileId, metrics);
    if (pushed) {
      const updated = { ...state, lastSynced: new Date().toISOString() };
      await saveConnectionState(updated, profileId);
    }
  }

  return metrics;
}

async function pushHealthMetricsToApi(profileId: string, metrics: DailyHealthMetrics): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync("auth_session_token");
    if (!token) return false;
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/health-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profileId, ...metrics }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLatestHealthMetrics(profileId: string): Promise<DailyHealthMetrics | null> {
  try {
    const token = await SecureStore.getItemAsync("auth_session_token");
    if (!token) return null;
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/health-sync?profileId=${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data as DailyHealthMetrics;
  } catch {
    return null;
  }
}
