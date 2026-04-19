"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, X, Star, RefreshCw } from "lucide-react";
import { StockAutocomplete } from "@/components/StockAutocomplete";
import { getRecent, clearRecent, onStorageChange } from "@/lib/storage";
import { useFavorites } from "@/lib/useFavorites";
import { useStocks } from "@/lib/stockCache";

export default function SearchPage() {
  const { stocks, loading, error, lastUpdated, refresh } = useStocks();
  const [query, setQuery] = useState("");
  const {
    favorites,
    refresh: refreshFavorites,
    toggleFavorite,
    isFavorite,
  } = useFavorites();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    refreshFavorites();
    setRecent(getRecent());
    const off = onStorageChange(() => {
      refreshFavorites();
      setRecent(getRecent());
    });
    return off;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return stocks.slice(0, 50);
    return stocks.filter((s) => s.symbol.includes(q)).slice(0, 200);
  }, [query, stocks]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Search DSE Stocks</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading && stocks.length === 0
              ? "Loading today's share list…"
              : stocks.length > 0
                ? `${stocks.length} symbols cached`
                : error
                  ? "Failed to load stocks — see error below"
                  : "No stocks loaded"}
            {lastUpdated && (
              <>
                {" · "}
                Updated {lastUpdated.toLocaleTimeString()}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="btn"
          title="Refresh stock list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Autocomplete
          </div>
          <StockAutocomplete
            autoFocus
            placeholder="Type to jump to a stock (Enter to open)"
          />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            Browse / filter list
          </div>
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter the list below…"
              className="input pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-400 border-red-900/50">
          {error}
        </div>
      )}

      {!query && recent.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent
            </h2>
            <button
              type="button"
              onClick={() => clearRecent()}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((sym) => (
              <Link
                key={sym}
                href={`/stock/${encodeURIComponent(sym)}`}
                className="chip hover:border-accent/60"
              >
                {sym}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        {loading && stocks.length === 0 ? (
          <div className="card p-6 text-sm text-gray-400">
            Fetching stock list from DSE…
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-6 text-sm text-gray-400">
            No matches for{" "}
            <span className="text-gray-200 font-medium">{query}</span>.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {filtered.map((s) => {
              const isFav = isFavorite(s.symbol);
              const change = s.change ?? 0;
              const up = change > 0;
              const down = change < 0;
              return (
                <li
                  key={s.symbol}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-card hover:bg-bg-soft transition"
                >
                  <button
                    type="button"
                    aria-label={isFav ? "Remove favorite" : "Add favorite"}
                    onClick={() => toggleFavorite(s.symbol)}
                    className="text-gray-500 hover:text-yellow-400"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isFav ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                  </button>
                  <Link
                    href={`/stock/${encodeURIComponent(s.symbol)}`}
                    className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto] items-center gap-3"
                  >
                    <span className="font-medium truncate">{s.symbol}</span>
                    <span className="text-sm tabular-nums">
                      {s.ltp?.toFixed(2) ?? "—"}
                    </span>
                    <span
                      className={`text-xs tabular-nums w-20 text-right ${
                        up
                          ? "text-accent"
                          : down
                            ? "text-accent-down"
                            : "text-gray-400"
                      }`}
                    >
                      {change ? (up ? "+" : "") + change.toFixed(2) : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
