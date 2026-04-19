"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, Star, Bell, X } from "lucide-react";
import { StockCard } from "@/components/StockCard";
import { useAlerts, type PriceAlert } from "@/lib/useAlerts";
import { useFavorites } from "@/lib/useFavorites";
import { useNotifications } from "@/lib/useNotifications";
import { useStocks } from "@/lib/stockCache";

export default function DashboardPage() {
  const {
    stocks: allStocks,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useStocks();
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const { favorites, refresh: refreshFavorites } = useFavorites();
  const { alerts, removeAlert, refresh: refreshAlerts } = useAlerts();
  const {
    notifications,
    unreadCount,
    open: notifOpen,
    setOpen: setNotifOpen,
    markRead,
    markAllRead,
    deleteNotif,
    refresh: refreshNotifs,
  } = useNotifications();

  const firedAlerts = alerts.filter((a) => !!a.firedAt);

  useEffect(() => {
    refreshFavorites();
    refreshAlerts();
    refreshNotifs();
  }, []);

  const stocks = useMemo(() => {
    const want = new Set(favorites.map((s) => s.toUpperCase()));
    return allStocks.filter((s) => want.has(s.symbol));
  }, [allStocks, favorites]);

  // Auto-refresh every 24h + check price alerts
  useEffect(() => {
    async function checkAlerts() {
      const pending = alerts.filter((a) => !a.firedAt);
      console.log("[client] Checking alerts, pending:", pending.length);
      if (!pending.length) return;
      try {
        const res = await fetch("/api/alerts/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alerts: pending }),
        });
        const result = await res.json();
        console.log("[client] Alert check result:", result);
        refreshAlerts();
      } catch (e: any) {
        console.error("[client] Alert check failed:", e);
        // silent — alert check is best-effort
      }
    }

    const id = setInterval(() => {
      if (favorites.length > 0) {
        console.log("[client] Running scheduled refresh and alert check");
        refresh();
        checkAlerts();
      } else {
        console.log("[client] Skipping scheduled check - no favorites");
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [favorites, refresh, alerts, refreshAlerts]);

  async function manualAlertCheck() {
    setCheckingAlerts(true);
    const pending = alerts.filter((a) => !a.firedAt);
    console.log("[client] Manual alert check, pending:", pending.length);
    try {
      const res = await fetch("/api/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts: pending }),
      });
      const result = await res.json();
      console.log("[client] Manual alert check result:", result);
      refreshAlerts();
    } catch (e: any) {
      console.error("[client] Manual alert check failed:", e);
    } finally {
      setCheckingAlerts(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your Favorites</h1>
          <p className="text-sm text-gray-400 mt-1">
            Live prices from Dhaka Stock Exchange
            {lastUpdated && (
              <>
                {" · "}
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="btn"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={manualAlertCheck}
            disabled={checkingAlerts}
            className="btn"
            title="Check alerts now"
          >
            <Bell
              className={`w-4 h-4 ${checkingAlerts ? "animate-pulse" : ""}`}
            />
            <span className="hidden sm:inline">Check Alerts</span>
          </button>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="btn relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <Link href="/search" className="btn btn-primary">
            <Search className="w-4 h-4" />
            <span>Add stock</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-400 border-red-900/50">
          {error}
        </div>
      )}

      {favorites.length === 0 ? (
        <EmptyState />
      ) : stocks.length === 0 && loading ? (
        <LoadingGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map((s) => (
            <StockCard key={s.symbol} stock={s} />
          ))}
          {/* Favorites that weren't found in the current DSE list */}
          {favorites
            .filter(
              (sym) => !stocks.some((s) => s.symbol === sym.toUpperCase()),
            )
            .map((sym) => (
              <div key={sym} className="card p-4 text-sm text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200">{sym}</span>
                  <span className="text-xs">Not trading today</span>
                </div>
                <Link
                  href={`/stock/${encodeURIComponent(sym)}`}
                  className="text-xs text-accent hover:underline"
                >
                  View chart →
                </Link>
              </div>
            ))}
        </div>
      )}

      {/* Fired alerts history */}
      {firedAlerts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-400" />
            Alert History
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {firedAlerts.map((a) => (
              <div
                key={a.symbol}
                className="flex items-center gap-3 px-4 py-3 bg-bg-card text-sm"
              >
                <Bell className="w-4 h-4 text-yellow-400 shrink-0" />
                <Link
                  href={`/stock/${encodeURIComponent(a.symbol)}`}
                  className="font-semibold hover:text-accent"
                >
                  {a.symbol}
                </Link>
                <span className="text-gray-400">
                  hit ≤ ৳{a.targetPrice.toFixed(2)}
                </span>
                {a.firedAt && (
                  <span className="text-gray-500 text-xs ml-auto">
                    {new Date(a.firedAt).toLocaleString("en-US", {
                      timeZone: "Asia/Dhaka",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <button
                  type="button"
                  title="Dismiss"
                  onClick={() => {
                    removeAlert(a.symbol);
                    refreshAlerts();
                  }}
                  className="text-gray-600 hover:text-red-400 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notification panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNotifOpen(false)}
          />
          <div className="relative w-full max-w-md bg-bg-card rounded-xl border border-border shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Notifications</h2>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 hover:bg-bg-soft transition ${!n.readAt ? "bg-bg-soft/50" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <Bell
                          className={`w-4 h-4 mt-0.5 ${!n.readAt ? "text-blue-400" : "text-gray-500"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{n.title}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {n.message}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-2">
                            {new Date(n.createdAt).toLocaleString("en-US", {
                              timeZone: "Asia/Dhaka",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteNotif(n.id)}
                          className="text-gray-500 hover:text-red-400 ml-1"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {!n.readAt && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border flex justify-center">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/notifications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "clearAll" }),
                    });
                    refreshNotifs();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-8 text-center">
      <Star className="w-10 h-10 text-gray-600 mx-auto" />
      <h3 className="mt-3 font-medium text-lg">No favorites yet</h3>
      <p className="text-sm text-gray-400 mt-1">
        Search for a DSE stock and star it to track here.
      </p>
      <Link href="/search" className="btn btn-primary mt-4">
        <Search className="w-4 h-4" />
        Search stocks
      </Link>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 w-20 bg-border rounded" />
          <div className="h-8 w-28 bg-border rounded mt-4" />
          <div className="h-3 w-full bg-border rounded mt-3" />
        </div>
      ))}
    </div>
  );
}
