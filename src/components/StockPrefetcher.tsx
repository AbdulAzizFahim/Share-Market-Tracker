"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useStocks } from "@/lib/stockCache";

/**
 * Renders on every page (via the root layout) and triggers the initial
 * prefetch of the full DSE stock list into localStorage as soon as the
 * app starts. A small, dismissible status pill shows progress.
 */
export function StockPrefetcher() {
  const { stocks, loading, error, lastUpdated } = useStocks();
  const [showPill, setShowPill] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const cached = stocks.length > 0;

  // Show the pill only when we're fetching for the first time (no cache)
  // or when an error occurs. Once we have data, fade it out after 2s.
  useEffect(() => {
    if (error) {
      setShowPill(true);
      return;
    }
    if (!cached && loading) {
      setShowPill(true);
      return;
    }
    if (cached && showPill) {
      const t = setTimeout(() => setShowPill(false), 2500);
      return () => clearTimeout(t);
    }
  }, [loading, cached, error, showPill]);

  if (dismissed || !showPill) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
          error
            ? "border-red-900/60 bg-red-950/70 text-red-300"
            : cached
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-bg-card/80 text-gray-300"
        }`}
      >
        {error ? (
          <>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed to load stock list</span>
          </>
        ) : !cached && loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading DSE stock list…</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {stocks.length} symbols cached
              {lastUpdated
                ? ` · ${lastUpdated.toLocaleTimeString()}`
                : ""}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-1 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
