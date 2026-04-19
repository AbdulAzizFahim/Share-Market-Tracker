"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import type { Stock } from "@/lib/types";
import { useStocks } from "@/lib/stockCache";

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "md";
  className?: string;
  maxSuggestions?: number;
  /** Called when a suggestion is chosen. Default: navigate to /stock/[symbol]. */
  onSelect?: (stock: Stock) => void;
}

function scoreMatch(symbol: string, q: string): number {
  // Lower is better. Prefix match wins, then contains, then nothing.
  if (symbol === q) return 0;
  if (symbol.startsWith(q)) return 1;
  const idx = symbol.indexOf(q);
  if (idx > 0) return 10 + idx;
  return Infinity;
}

export function StockAutocomplete({
  placeholder = "Search DSE ticker…",
  autoFocus = false,
  size = "md",
  className = "",
  maxSuggestions = 8,
  onSelect,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { stocks, loading } = useStocks();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Clear navigating state once the route actually changes
  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toUpperCase();

  const suggestions = useMemo<Stock[]>(() => {
    if (!q) return [];
    const scored = stocks
      .map((s) => ({ s, score: scoreMatch(s.symbol, q) }))
      .filter((x) => x.score !== Infinity)
      .sort((a, b) => a.score - b.score || a.s.symbol.localeCompare(b.s.symbol))
      .slice(0, maxSuggestions)
      .map((x) => x.s);
    return scored;
  }, [q, stocks, maxSuggestions]);

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlight(0);
  }, [q, suggestions.length]);

  // Click outside closes
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(stock: Stock) {
    setOpen(false);
    setQuery("");
    if (onSelect) {
      onSelect(stock);
    } else {
      setNavigating(true);
      router.push(`/stock/${encodeURIComponent(stock.symbol)}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlight]) {
        commit(suggestions[highlight]);
      } else if (q) {
        setNavigating(true);
        router.push(`/stock/${encodeURIComponent(q)}`);
        setQuery("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const inputSize = size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm";

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {navigating ? (
        <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-accent animate-spin pointer-events-none" />
      ) : (
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={`w-full rounded-lg border border-border bg-bg-soft pl-9 pr-8 ${inputSize} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60`}
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200"
          aria-label="Clear"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {open && q && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 rounded-lg border border-border bg-bg-card shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          {loading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              Loading stock list…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              No matches for{" "}
              <span className="text-gray-300 font-medium">{q}</span>.{" "}
              <button
                type="button"
                onClick={() => {
                  router.push(`/stock/${encodeURIComponent(q)}`);
                  setQuery("");
                  setOpen(false);
                }}
                className="text-accent hover:underline"
              >
                Try opening anyway →
              </button>
            </div>
          ) : (
            <ul>
              {suggestions.map((s, i) => {
                const change = s.change ?? 0;
                const up = change > 0;
                const down = change < 0;
                const highlighted = i === highlight;
                return (
                  <li
                    key={s.symbol}
                    role="option"
                    aria-selected={highlighted}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => {
                      // mousedown not click, so focus loss doesn't cancel
                      e.preventDefault();
                      commit(s);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                      highlighted ? "bg-bg-soft" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">
                        {highlightMatch(s.symbol, q)}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums">
                      {s.ltp?.toFixed(2) ?? "—"}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-xs tabular-nums w-20 justify-end ${
                        up
                          ? "text-accent"
                          : down
                            ? "text-accent-down"
                            : "text-gray-500"
                      }`}
                    >
                      {up && <TrendingUp className="w-3 h-3" />}
                      {down && <TrendingDown className="w-3 h-3" />}
                      <span>
                        {change ? `${up ? "+" : ""}${change.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-3 py-1.5 border-t border-border text-[10px] text-gray-500 bg-bg-soft/40 flex justify-between">
            <span>↑↓ to navigate · Enter to open · Esc to close</span>
            <span>{stocks.length} symbols cached</span>
          </div>
        </div>
      )}
    </div>
  );
}

function highlightMatch(symbol: string, q: string) {
  if (!q) return symbol;
  const idx = symbol.indexOf(q);
  if (idx === -1) return symbol;
  return (
    <>
      {symbol.slice(0, idx)}
      <span className="text-accent">{symbol.slice(idx, idx + q.length)}</span>
      {symbol.slice(idx + q.length)}
    </>
  );
}
