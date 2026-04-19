"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Star, ExternalLink } from "lucide-react";
import type { Stock } from "@/lib/types";
import { TradingViewChart } from "@/components/TradingViewChart";
import { pushRecent, onStorageChange } from "@/lib/storage";
import { useFavorites } from "@/lib/useFavorites";

function fmt(n: number | null, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function StockDetailPage({
  params,
}: {
  params: { symbol: string };
}) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();

  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    isFavorite,
    toggleFavorite,
    refresh: refreshFavorites,
  } = useFavorites();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      setStock(json.data as Stock);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pushRecent(symbol);
    refreshFavorites();
    load();
    const off = onStorageChange(() => refreshFavorites());
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const change = stock?.change ?? 0;
  const changePct = stock?.changePercent ?? 0;
  const up = change > 0;
  const down = change < 0;
  const fav = isFavorite(symbol);
  const priceColor = up
    ? "text-accent"
    : down
      ? "text-accent-down"
      : "text-gray-300";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="btn !p-2" aria-label="Back" title="Back">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{symbol}</h1>
            <p className="text-xs text-gray-500">Dhaka Stock Exchange</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="btn"
            title="Refresh price"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(symbol)}
            className={`btn ${fav ? "btn-primary" : ""}`}
          >
            <Star className={`w-4 h-4 ${fav ? "fill-black" : ""}`} />
            <span>{fav ? "Favorited" : "Add to favorites"}</span>
          </button>
        </div>
      </div>

      <div className="card p-5">
        {error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : loading && !stock ? (
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-32 bg-border rounded" />
            <div className="h-4 w-24 bg-border rounded" />
          </div>
        ) : stock ? (
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <div className="text-xs uppercase text-gray-500 tracking-wide">
                Last Traded Price
              </div>
              <div className={`text-4xl font-semibold ${priceColor}`}>
                {fmt(stock.ltp)}
              </div>
            </div>
            <div className={`text-sm font-medium ${priceColor}`}>
              {up ? "+" : ""}
              {fmt(change)} ({up ? "+" : ""}
              {fmt(changePct)}%)
            </div>
            <div className="ml-auto grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <Stat label="Open" value={fmt(stock.open)} />
              <Stat label="High" value={fmt(stock.high)} />
              <Stat label="Low" value={fmt(stock.low)} />
              <Stat label="Close" value={fmt(stock.close)} />
              <Stat label="YCP" value={fmt(stock.ycp)} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            Symbol <span className="text-gray-200">{symbol}</span> was not found
            in today's DSE list (it may be suspended or delisted). The chart
            below may still work if TradingView has historical data.
          </div>
        )}
      </div>

      <TradingViewChart symbol={symbol} />

      {stock && (
        <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="Volume" value={fmt(stock.volume, 0)} />
          <Stat label="Trades" value={fmt(stock.trade, 0)} />
          <Stat label="Value (mn)" value={fmt(stock.value)} />
          <Stat
            label="Updated"
            value={new Date(stock.updatedAt).toLocaleTimeString()}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <a
          href={`https://www.dsebd.org/displayCompany.php?name=${encodeURIComponent(
            symbol,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-gray-300"
        >
          DSE company page <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={`https://www.tradingview.com/symbols/DSEBD-${encodeURIComponent(
            symbol,
          )}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-gray-300"
        >
          Open in TradingView <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="tabular-nums">{value}</div>
    </div>
  );
}
