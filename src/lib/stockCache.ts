"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stock } from "./types";

const CACHE_KEY = "dse.stocks.cache.v1";
const FRESH_MS = 2 * 60 * 1000; // serve from cache without refresh for 2 min
const MAX_STALE_MS = 24 * 60 * 60 * 1000; // discard after 24h

interface CacheShape {
  data: Stock[];
  fetchedAt: number;
}

function readCache(): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed?.data || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.fetchedAt > MAX_STALE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: Stock[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheShape = { data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent("dse-stocks-updated", { detail: payload })
    );
  } catch {
    // ignore quota
  }
}

// Module-level in-flight promise so multiple simultaneous hooks share one fetch.
let inFlight: Promise<Stock[]> | null = null;

async function fetchStocks(): Promise<Stock[]> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch("/api/stocks", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load stocks");
      const data = json.data as Stock[];
      writeCache(data);
      return data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export interface UseStocksResult {
  stocks: Stock[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Hook that returns the full DSE stock list, backed by a localStorage cache.
 * - Returns cached data immediately on mount (if any)
 * - Fetches fresh data when the cache is older than FRESH_MS
 * - Shares fetches across components via a module-level in-flight promise
 * - Subscribes to updates from other tabs / other instances of this hook
 */
export function useStocks(): UseStocksResult {
  // NOTE: We intentionally do NOT read from localStorage inside the
  // useState initializer. That would diverge between the server render
  // (where localStorage is unavailable -> []) and the client hydration
  // (where localStorage may already contain data), triggering a React
  // hydration mismatch. Instead we start empty and hydrate from cache
  // in a useEffect, which only runs on the client after hydration.
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStocks();
      if (!mounted.current) return;
      setStocks(data);
      setLastUpdated(new Date());
    } catch (e: any) {
      if (!mounted.current) return;
      setError(e?.message ?? "Failed to load stocks");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const cached = readCache();
    if (cached) {
      setStocks(cached.data);
      setLastUpdated(new Date(cached.fetchedAt));
    }
    if (!cached || Date.now() - cached.fetchedAt > FRESH_MS) {
      refresh();
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CacheShape>).detail;
      if (detail?.data) {
        setStocks(detail.data);
        setLastUpdated(new Date(detail.fetchedAt));
      }
    };
    window.addEventListener("dse-stocks-updated", handler);
    // cross-tab sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === CACHE_KEY) {
        const c = readCache();
        if (c) {
          setStocks(c.data);
          setLastUpdated(new Date(c.fetchedAt));
        }
      }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      mounted.current = false;
      window.removeEventListener("dse-stocks-updated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, [refresh]);

  return { stocks, loading, error, lastUpdated, refresh };
}
