import { useState, useEffect, useRef, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/apiBase";

export type WorkerName = "sydney" | "fabio" | "sonia" | "franco" | "arnold";

const DEFAULTS: Record<WorkerName, string> = {
  sydney: "Welcome back.",
  fabio: "Your plan is ready.",
  sonia: "How are you feeling today?",
  franco: "Check your numbers.",
  arnold: "Find a provider.",
};

interface CacheEntry {
  message: string;
  expiresAt: number;
}

const cache: Partial<Record<string, CacheEntry>> = {};

export interface UseWorkerOptions {
  worker: WorkerName;
  trigger?: string;
  autoFetch?: boolean;
  cacheDuration?: number;
}

export interface UseWorkerResult {
  message: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorker({
  worker,
  trigger = "default",
  autoFetch = false,
  cacheDuration = 300_000,
}: UseWorkerOptions): UseWorkerResult {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doFetch = useCallback(async () => {
    if (fetchingRef.current) return;
    if (Platform.OS === "web") {
      setMessage(DEFAULTS[worker]);
      return;
    }

    const cacheKey = `${worker}:${trigger}`;
    const cached = cache[cacheKey];
    if (cached && Date.now() < cached.expiresAt) {
      setMessage(cached.message);
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const token = await SecureStore.getItemAsync("hpf_access_token");
      if (!token) {
        if (mountedRef.current) {
          setMessage(DEFAULTS[worker]);
          setIsLoading(false);
        }
        fetchingRef.current = false;
        return;
      }

      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/workers/${worker}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ trigger }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as { message: string };
      const msg = data.message || DEFAULTS[worker];

      cache[cacheKey] = { message: msg, expiresAt: Date.now() + cacheDuration };

      if (mountedRef.current) setMessage(msg);
    } catch {
      if (mountedRef.current) {
        setError("Could not reach worker.");
        setMessage(DEFAULTS[worker]);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [worker, trigger, cacheDuration]);

  useEffect(() => {
    if (autoFetch) {
      doFetch();
    }
  }, [autoFetch, doFetch]);

  return { message, isLoading, error, refetch: doFetch };
}
