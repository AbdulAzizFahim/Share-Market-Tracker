"use client";

import Link from "next/link";
import { Star, Bell, BellOff, X } from "lucide-react";
import type { Stock } from "@/lib/types";
import { useAlerts } from "@/lib/useAlerts";
import { useFavorites } from "@/lib/useFavorites";
import { useState, useEffect } from "react";

function fmt(n: number | null, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function StockCard({ stock }: { stock: Stock }) {
  const [alertPrice, setAlertPrice] = useState("");
  const [showInput, setShowInput] = useState(false);
  const { alerts, setAlert, removeAlert, getAlert } = useAlerts();
  const { isFavorite, toggleFavorite } = useFavorites();

  const savedAlert = getAlert(stock.symbol);
  const alertFired = !!savedAlert?.firedAt;
  const fav = isFavorite(stock.symbol);

  const change = stock.change ?? 0;
  const changePct = stock.changePercent ?? 0;
  const up = change > 0;
  const down = change < 0;

  const color = up
    ? "text-accent"
    : down
      ? "text-accent-down"
      : "text-gray-400";

  function saveAlert() {
    const val = parseFloat(alertPrice);
    if (!isNaN(val) && val > 0) {
      setAlert(stock.symbol, val);
      setAlertPrice("");
      setShowInput(false);
    }
  }

  function clearAlert() {
    removeAlert(stock.symbol);
    setShowInput(false);
  }

  return (
    <div className="card p-4 hover:border-gray-600 transition">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/stock/${encodeURIComponent(stock.symbol)}`}
          className="font-semibold text-base hover:text-accent"
        >
          {stock.symbol}
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={savedAlert ? "Edit alert" : "Set price alert"}
            title={
              savedAlert
                ? `Alert: ৳${savedAlert.targetPrice} (tap to edit)`
                : "Set price alert"
            }
            onClick={() => setShowInput((v) => !v)}
            className={`transition ${
              alertFired
                ? "text-yellow-400"
                : savedAlert
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-gray-500 hover:text-blue-400"
            }`}
          >
            {savedAlert ? (
              <Bell className="w-4 h-4 fill-current" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            aria-label={fav ? "Remove favorite" : "Add favorite"}
            onClick={() => toggleFavorite(stock.symbol)}
            className="text-gray-500 hover:text-yellow-400 transition"
          >
            <Star
              className={`w-4 h-4 ${fav ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Alert input */}
      {showInput && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-gray-400">Alert ≤ ৳</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveAlert()}
            placeholder={savedAlert ? String(savedAlert.targetPrice) : "price"}
            className="w-24 bg-bg border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            type="button"
            onClick={saveAlert}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white"
          >
            Set
          </button>
          {savedAlert && (
            <button
              type="button"
              onClick={clearAlert}
              className="text-gray-500 hover:text-red-400"
              title="Remove alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Alert status badge */}
      {savedAlert && !showInput && (
        <div
          className={`mt-1 text-[11px] flex items-center gap-1 ${alertFired ? "text-yellow-400" : "text-blue-400"}`}
        >
          <Bell className="w-3 h-3" />
          {alertFired
            ? `Alert fired at ৳${savedAlert.targetPrice}`
            : `Alert at ৳${savedAlert.targetPrice}`}
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-semibold tracking-tight">
          {fmt(stock.ltp)}
        </div>
        <div className={`text-sm font-medium ${color}`}>
          {up ? "+" : ""}
          {fmt(change)} ({up ? "+" : ""}
          {fmt(changePct)}%)
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-400">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            High
          </div>
          <div>{fmt(stock.high)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            Low
          </div>
          <div>{fmt(stock.low)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            YCP
          </div>
          <div>{fmt(stock.ycp)}</div>
        </div>
      </div>
    </div>
  );
}
